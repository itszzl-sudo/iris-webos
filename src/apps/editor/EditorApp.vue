<template>
  <div class="editor-app">
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <button @click="newFile" class="toolbar-btn" title="新建">📄 新建</button>
        <button @click="openFile" class="toolbar-btn" title="打开">📁 打开</button>
        <button @click="saveFile" class="toolbar-btn" title="保存">💾 保存</button>
      </div>
      <div class="toolbar-center">
        <span class="file-name">{{ currentFile || '未命名' }}</span>
        <span v-if="modified" class="modified">●</span>
      </div>
      <div class="toolbar-right">
        <select v-model="language" @change="changeLanguage" class="lang-select">
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="json">JSON</option>
          <option value="markdown">Markdown</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="rust">Rust</option>
        </select>
      </div>
    </div>
    
    <div ref="editorContainer" class="editor-container"></div>
    
    <div class="status-bar">
      <span>行 {{ cursorLine }}, 列 {{ cursorColumn }}</span>
      <span>{{ language }}</span>
      <span>UTF-8</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { webContainerManager } from '../../wasi/webcontainer.js'
import { clipboardManager } from '../../core/clipboard.js'

const props = defineProps({
  windowId: String
})

const EDITOR_STORAGE_KEY = 'iris-webos:editor-state'

const editorContainer = ref(null)
let editor = null
let monaco = null
const currentFile = ref('')
const modified = ref(false)
const language = ref('javascript')
const cursorLine = ref(1)
const cursorColumn = ref(1)

const defaultCode = `// 欢迎使用 IrisWebOS 代码编辑器
// Monaco Editor - 强大的代码编辑器

function hello() {
    console.log('Hello from Monaco Editor!');
    console.log('这是 IrisWebOS 集成的代码编辑器');
}

// 示例：异步函数
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
}

// 示例：类定义
class Example {
    constructor(name) {
        this.name = name;
    }
    
    greet() {
        return \`Hello, \${this.name}!\`;
    }
}

hello();
`

const saveEditorState = () => {
  try {
    if (editor && currentFile.value) {
      const state = {
        currentFile: currentFile.value,
        content: editor.getValue(),
        language: language.value,
        cursorPosition: editor.getPosition(),
        timestamp: Date.now()
      }
      localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(state))
    }
  } catch (error) {
    console.error('Failed to save editor state:', error)
  }
}

const loadEditorState = () => {
  try {
    const saved = localStorage.getItem(EDITOR_STORAGE_KEY)
    if (saved) {
      const state = JSON.parse(saved)
      return state
    }
  } catch (error) {
    console.error('Failed to load editor state:', error)
  }
  return null
}

const loadMonaco = () => {
  return new Promise((resolve, reject) => {
    if (window.monaco) {
      resolve(window.monaco)
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js'
    script.onload = () => {
      require.config({ 
        paths: { 
          'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' 
        }
      })
      
      require(['vs/editor/editor.main'], () => {
        monaco = window.monaco
        resolve(monaco)
      })
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

const initEditor = async () => {
  try {
    monaco = await loadMonaco()
    
    monaco.editor.defineTheme('iris-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editorCursor.foreground': '#ffffff',
      }
    })
    
    editor = monaco.editor.create(editorContainer.value, {
      value: defaultCode,
      language: language.value,
      theme: 'iris-dark',
      fontSize: 14,
      fontFamily: 'Consolas, Monaco, monospace',
      minimap: { enabled: true },
      automaticLayout: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      tabSize: 2,
      insertSpaces: true,
      folding: true,
      foldingHighlight: true,
      showFoldingControls: 'always',
      matchBrackets: 'always',
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      formatOnPaste: true,
      formatOnType: true,
    })
    
    editor.onDidChangeModelContent(() => {
      modified.value = true
      saveEditorState()
    })
    
    editor.onDidChangeCursorPosition((e) => {
      cursorLine.value = e.position.lineNumber
      cursorColumn.value = e.position.column
    })
    
    const savedState = loadEditorState()
    if (savedState && savedState.content) {
      editor.setValue(savedState.content)
      currentFile.value = savedState.currentFile || ''
      language.value = savedState.language || 'javascript'
      monaco.editor.setModelLanguage(editor.getModel(), language.value)
      
      if (savedState.cursorPosition) {
        editor.setPosition(savedState.cursorPosition)
      }
      
      modified.value = false
    }
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
      const selection = editor.getSelection()
      if (selection) {
        const selectedText = editor.getModel().getValueInRange(selection)
        clipboardManager.copy(selectedText)
      }
    })
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, async () => {
      const text = await clipboardManager.paste()
      if (text) {
        const position = editor.getPosition()
        editor.executeEdits('', [{
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: text
        }])
      }
    })
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile()
    })
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, () => {
      newFile()
    })
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO, () => {
      openFile()
    })
  } catch (error) {
    console.error('Failed to load Monaco Editor:', error)
    editorContainer.value.innerHTML = `
      <div style="padding: 20px; color: #fff;">
        <h3>Monaco Editor 加载失败</h3>
        <p>请检查网络连接</p>
        <p>错误: ${error.message}</p>
      </div>
    `
  }
}

const newFile = () => {
  if (modified.value) {
    if (!confirm('当前文件未保存，是否继续？')) {
      return
    }
  }
  
  editor.setValue('')
  currentFile.value = ''
  modified.value = false
}

const openFile = async () => {
  const fileName = prompt('输入文件名 (例如: index.js):', 'index.js')
  if (!fileName) return
  
  try {
    if (webContainerManager.isInitialized()) {
      const content = await webContainerManager.readFile(fileName)
      editor.setValue(content)
      currentFile.value = fileName
      modified.value = false
      
      const ext = fileName.split('.').pop()
      const langMap = {
        'js': 'javascript',
        'ts': 'typescript',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'rs': 'rust',
      }
      
      language.value = langMap[ext] || 'plaintext'
      monaco.editor.setModelLanguage(editor.getModel(), language.value)
    } else {
      alert('WebContainer 未初始化，无法打开文件')
    }
  } catch (error) {
    alert(`无法打开文件: ${error.message}\n\n提示：编辑器只能访问 WebOS 内部文件系统`)
  }
}

const saveFile = async () => {
  const fileName = currentFile.value || prompt('输入文件名 (例如: index.js):')
  if (!fileName) return
  
  try {
    const content = editor.getValue()
    
    if (webContainerManager.isInitialized()) {
      await webContainerManager.writeFile(fileName, content)
      currentFile.value = fileName
      modified.value = false
      saveEditorState()
      alert(`文件已保存: ${fileName}`)
    } else {
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
      
      currentFile.value = fileName
      modified.value = false
      saveEditorState()
    }
  } catch (error) {
    alert(`保存失败: ${error.message}`)
  }
}

const changeLanguage = () => {
  if (editor && monaco) {
    monaco.editor.setModelLanguage(editor.getModel(), language.value)
  }
}

onMounted(() => {
  initEditor()
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
  }
})
</script>

<style scoped>
.editor-app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  height: 40px;
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  padding: 4px 12px;
  background: #0e639c;
  color: white;
  border-radius: 3px;
  font-size: 13px;
}

.toolbar-btn:hover {
  background: #1177bb;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 4px;
}

.file-name {
  color: #cccccc;
  font-size: 13px;
}

.modified {
  color: #e2c08d;
  font-size: 16px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.lang-select {
  padding: 4px 8px;
  background: #3c3c3c;
  color: #cccccc;
  border: 1px solid #3c3c3c;
  border-radius: 3px;
  font-size: 13px;
}

.lang-select:hover {
  background: #505050;
}

.editor-container {
  flex: 1;
  overflow: hidden;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: #007acc;
  color: white;
  font-size: 12px;
  height: 24px;
}

.status-bar span {
  padding: 0 8px;
}
</style>
