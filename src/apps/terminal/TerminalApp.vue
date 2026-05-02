<template>
  <div class="terminal-app">
    <div ref="terminalContainer" class="terminal-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { webContainerManager } from '../../wasi/webcontainer.js'
import { clipboardManager } from '../../core/clipboard.js'

const props = defineProps({
  windowId: String
})

const TERMINAL_STORAGE_KEY = 'iris-webos:terminal-state'

const terminalContainer = ref(null)
let terminal = null
let fitAddon = null
let currentPath = '/home/user'
let webContainerReady = false
let commandHistory = []
let historyIndex = -1

const saveTerminalState = () => {
  try {
    const state = {
      currentPath,
      commandHistory: commandHistory.slice(-100),
      timestamp: Date.now()
    }
    localStorage.setItem(TERMINAL_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save terminal state:', error)
  }
}

const loadTerminalState = () => {
  try {
    const saved = localStorage.getItem(TERMINAL_STORAGE_KEY)
    if (saved) {
      const state = JSON.parse(saved)
      currentPath = state.currentPath || '/home/user'
      commandHistory = state.commandHistory || []
      historyIndex = commandHistory.length
      return true
    }
  } catch (error) {
    console.error('Failed to load terminal state:', error)
  }
  return false
}

const initTerminal = async () => {
  terminal = new Terminal({
    theme: {
      background: '#1e1e1e',
      foreground: '#ffffff',
      cursor: '#ffffff',
      green: '#00ff00',
      selectionBackground: 'rgba(255, 255, 255, 0.3)'
    },
    fontSize: 14,
    fontFamily: 'Consolas, Monaco, monospace',
    allowTransparency: true,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 10000,
    tabStopWidth: 2,
    convertEol: true,
    rightClickSelectsWord: true
  })
  
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  
  terminal.open(terminalContainer.value)
  fitAddon.fit()
  
  terminal.writeln('\x1b[36mIrisWebOS Terminal with WebContainer\x1b[0m')
  terminal.writeln('\x1b[36mPowered by WebContainers - Real Node.js in Browser\x1b[0m')
  terminal.writeln('')
  
  const status = webContainerManager.getStatus()
  
  if (status.status !== 'ready') {
    terminal.writeln('\x1b[31m✗ WebContainer 未初始化完成\x1b[0m')
    terminal.writeln('\x1b[33m终端功能需要等待 WebContainer 初始化完成后才能使用。\x1b[0m')
    terminal.writeln('')
    terminal.writeln('\x1b[90m当前状态: ' + status.status + '\x1b[0m')
    terminal.writeln('\x1b[90m' + status.progress.message + '\x1b[0m')
    terminal.writeln('')
    terminal.writeln('\x1b[90m请关闭此窗口，等待桌面左上角显示 "WebContainer 已就绪" 后再打开终端。\x1b[0m')
    return
  }
  
  terminal.onData((data) => {
    if (data === '\x1b[99;6u' || (data.charCodeAt(0) === 3 && data.length === 1)) {
      const selection = terminal.getSelection()
      if (selection) {
        navigator.clipboard.writeText(selection).then(() => {
          terminal.writeln('\x1b[32m[已复制到剪贴板]\x1b[0m')
        }).catch(err => {
          console.error('复制失败:', err)
        })
        return
      }
    }
    
    if (data === '\x1b[118;6u') {
      navigator.clipboard.readText().then(text => {
        if (text) {
          terminal.write(text)
        }
      }).catch(err => {
        terminal.writeln('\x1b[31m[粘贴失败: 无法访问剪贴板]\x1b[0m')
      })
      return
    }
  })
  
  terminalContainer.value.addEventListener('contextmenu', async (e) => {
    e.preventDefault()
    const selection = terminal.getSelection()
    
    if (selection) {
      const success = await clipboardManager.copy(selection)
      if (success) {
        terminal.writeln('\x1b[32m[已复制到剪切板]\x1b[0m')
      }
    } else {
      const text = await clipboardManager.paste()
      if (text) {
        terminal.write(text)
      }
    }
  })
  
  terminal.writeln('\x1b[33m┌──────────────────────────────────────────────┐\x1b[0m')
  terminal.writeln('\x1b[33m│ 💡 重要提示：                                 │\x1b[0m')
  terminal.writeln('\x1b[33m│ • localhost 指向 WebOS 内部虚拟服务器         │\x1b[0m')
  terminal.writeln('\x1b[33m│ • 在浏览器中输入 http://localhost:端口 访问   │\x1b[0m')
  terminal.writeln('\x1b[33m│ • 支持运行真实的 Node.js/npm/npx 命令         │\x1b[0m')
  terminal.writeln('\x1b[33m└──────────────────────────────────────────────┘\x1b[0m')
  terminal.writeln('\x1b[90m快捷键: Ctrl+Shift+C 复制 | Ctrl+Shift+V 粘贴\x1b[0m')
  terminal.writeln('\x1b[90m提示: 选中文本后右键也可复制/粘贴\x1b[0m')
  terminal.writeln('')
  
  initializeTerminal(true)
}

const initializeTerminal = async (useWebContainer) => {
  if (useWebContainer) {
    webContainerReady = webContainerManager.isInitialized()
    
    if (!webContainerReady) {
      terminal.writeln('\x1b[31m✗ WebContainer 未就绪\x1b[0m')
      terminal.writeln('')
      printPrompt()
      return
    }
    
    const initialFiles = {
      'package.json': {
        file: {
          contents: JSON.stringify({
            name: 'iris-webos-project',
            version: '1.0.0',
            type: 'module',
            scripts: {
              start: 'node index.js',
              test: 'node test.js'
            }
          }, null, 2)
        }
      },
      'index.js': {
        file: {
          contents: `// Welcome to IrisWebOS Node.js Environment\nconsole.log('Hello from WebContainer!');\nconsole.log('Node version:', process.version);\nconsole.log('Platform:', process.platform);`
        }
      }
    }
    
    try {
      await webContainerManager.mount(initialFiles)
      
      webContainerManager.onOutput((data) => {
        terminal.write(data)
      })
      
      terminal.writeln('\x1b[32m✓ WebContainer 已就绪\x1b[0m')
      terminal.writeln('\x1b[36m可用命令: npm, npx, node, dev-server\x1b[0m')
      terminal.writeln('\x1b[90m提示: dev-server 启动的服务器通过 http://localhost:端口 访问\x1b[0m')
      terminal.writeln('')
    } catch (error) {
      terminal.writeln(`\x1b[31m✗ 挂载文件系统失败: ${error.message}\x1b[0m`)
      terminal.writeln('')
      webContainerReady = false
    }
  } else {
    terminal.writeln('\x1b[33m模拟模式已启用\x1b[0m')
    terminal.writeln('\x1b[90m可用命令: ls, cd, pwd, mkdir, echo, clear, help\x1b[0m')
    terminal.writeln('')
  }
  
  printPrompt()
  
  const hadState = loadTerminalState()
  if (hadState && commandHistory.length > 0) {
    terminal.writeln(`\x1b[90m已恢复 ${commandHistory.length} 条命令历史\x1b[0m`)
    terminal.writeln('')
  }
  
  let currentLine = ''
  let cursorPosition = 0
  
  terminal.onData((data) => {
    const char = data.charCodeAt(0)
    
    if (char === 3) {
      terminal.write('^C')
      terminal.writeln('')
      currentLine = ''
      cursorPosition = 0
      printPrompt()
      return
    }
    
    if (char === 13) {
      terminal.writeln('')
      if (currentLine.trim()) {
        commandHistory.push(currentLine.trim())
        historyIndex = commandHistory.length
        saveTerminalState()
      }
      executeCommand(currentLine.trim())
      currentLine = ''
      cursorPosition = 0
      return
    }
    
    // 退格
    if (char === 127) {
      if (cursorPosition > 0) {
        currentLine = currentLine.slice(0, cursorPosition - 1) + currentLine.slice(cursorPosition)
        cursorPosition--
        terminal.write('\b')
        terminal.write(currentLine.slice(cursorPosition) + ' ')
        terminal.write('\b'.repeat(currentLine.length - cursorPosition + 1))
      }
      return
    }
    
    // 左箭头
    if (data === '\x1b[D') {
      if (cursorPosition > 0) {
        cursorPosition--
        terminal.write('\b')
      }
      return
    }
    
    // 右箭头
    if (data === '\x1b[C') {
      if (cursorPosition < currentLine.length) {
        cursorPosition++
        terminal.write('\x1b[C')
      }
      return
    }
    
    // 上箭头 (历史命令)
    if (data === '\x1b[A') {
      if (historyIndex > 0) {
        historyIndex--
        // 清除当前行
        terminal.write('\b'.repeat(cursorPosition) + ' '.repeat(currentLine.length) + '\b'.repeat(currentLine.length))
        currentLine = commandHistory[historyIndex] || ''
        cursorPosition = currentLine.length
        terminal.write(currentLine)
      }
      return
    }
    
    // 下箭头 (历史命令)
    if (data === '\x1b[B') {
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++
        // 清除当前行
        terminal.write('\b'.repeat(cursorPosition) + ' '.repeat(currentLine.length) + '\b'.repeat(currentLine.length))
        currentLine = commandHistory[historyIndex] || ''
        cursorPosition = currentLine.length
        terminal.write(currentLine)
      } else if (historyIndex === commandHistory.length - 1) {
        historyIndex = commandHistory.length
        terminal.write('\b'.repeat(cursorPosition) + ' '.repeat(currentLine.length) + '\b'.repeat(currentLine.length))
        currentLine = ''
        cursorPosition = 0
      }
      return
    }
    
    // Home键
    if (data === '\x1b[H' || data === '\x1b[1~') {
      terminal.write('\b'.repeat(cursorPosition))
      cursorPosition = 0
      return
    }
    
    // End键
    if (data === '\x1b[F' || data === '\x1b[4~') {
      terminal.write('\x1b[' + (currentLine.length - cursorPosition) + 'C')
      cursorPosition = currentLine.length
      return
    }
    
    // 普通字符输入
    if (char >= 32) {
      // 检查是否包含多行文本（粘贴操作）
      if (data.includes('\n') || data.includes('\r')) {
        // 处理多行粘贴
        handleMultilinePaste(data)
        return
      }
      
      // 插入字符到光标位置
      currentLine = currentLine.slice(0, cursorPosition) + data + currentLine.slice(cursorPosition)
      terminal.write(currentLine.slice(cursorPosition))
      cursorPosition += data.length
      // 如果不在行尾，需要移动光标回去
      if (cursorPosition < currentLine.length) {
        terminal.write('\b'.repeat(currentLine.length - cursorPosition))
      }
    }
  })
}

// 处理多行文本粘贴
const handleMultilinePaste = async (text) => {
  // 规范化换行符
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  
  // 分割成多行
  const lines = normalizedText.split('\n').filter(line => line.trim())
  
  if (lines.length === 0) return
  
  if (lines.length === 1) {
    // 单行，正常处理
    const line = lines[0]
    currentLine = currentLine.slice(0, cursorPosition) + line + currentLine.slice(cursorPosition)
    terminal.write(currentLine.slice(cursorPosition))
    cursorPosition += line.length
    if (cursorPosition < currentLine.length) {
      terminal.write('\b'.repeat(currentLine.length - cursorPosition))
    }
    return
  }
  
  // 多行文本
  terminal.writeln('')
  terminal.writeln(`\x1b[36m📋 检测到多行输入 (${lines.length} 行)，开始逐行执行...\x1b[0m`)
  terminal.writeln('')
  
  // 逐行执行
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // 显示提示符和命令
    printPrompt()
    terminal.writeln(line)
    
    // 添加到历史
    commandHistory.push(line)
    historyIndex = commandHistory.length
    
    // 执行命令
    await executeCommand(line)
  }
  
  // 重置当前行
  currentLine = ''
  cursorPosition = 0
}

const printPrompt = () => {
  terminal.write(`\x1b[32muser@iris\x1b[0m:\x1b[34m${currentPath}\x1b[0m$ `)
}

const executeCommand = async (commandLine) => {
  if (!commandLine) {
    printPrompt()
    return
  }
  
  const [command, ...args] = parseCommandLine(commandLine)
  
  try {
    if (webContainerReady) {
      await executeWithWebContainer(command, args)
    } else {
      await executeWithSimulation(command, args)
    }
  } catch (error) {
    terminal.writeln(`\x1b[31m错误: ${error.message}\x1b[0m`)
  }
  
  printPrompt()
}

const parseCommandLine = (line) => {
  const args = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }
  
  if (current) {
    args.push(current)
  }
  
  return args
}

const executeWithWebContainer = async (command, args) => {
  switch (command) {
    case 'npm':
      await handleNpm(args)
      break
    case 'npx':
      await handleNpx(args)
      break
    case 'node':
      await handleNode(args)
      break
    case 'ls':
      await handleLs(args)
      break
    case 'cat':
      await handleCat(args)
      break
    case 'cp':
      await handleCp(args)
      break
    case 'paste':
      await handlePaste(args)
      break
    case 'pwd':
      terminal.writeln(currentPath)
      break
    case 'clear':
      terminal.clear()
      break
    case 'echo':
      terminal.writeln(args.join(' '))
      break
    case 'help':
      handleHelp()
      break
    case 'dev-server':
      await handleDevServer(args)
      break
    default:
      terminal.writeln(`\x1b[31m命令未找到: ${command}\x1b[0m`)
  }
}

const handleNpm = async (args) => {
  if (args.length === 0) {
    terminal.writeln('用法: npm <command>')
    terminal.writeln('可用命令: init, install, run, list, uninstall, create')
    return
  }
  
  const subCommand = args[0]
  const subArgs = args.slice(1)
  
  if (subCommand === 'create' && subArgs[0] && subArgs[0].includes('vite')) {
    const projectName = subArgs[1] || 'my-app'
    terminal.writeln(`\x1b[36m> npm create vite ${projectName}\x1b[0m`)
    terminal.writeln('\x1b[90m正在创建 Vite 项目模板...\x1b[0m')
    
    try {
      await createViteTemplate(projectName)
      terminal.writeln(`\x1b[32m✓ Vite 项目 "${projectName}" 创建成功\x1b[0m`)
      terminal.writeln(`\x1b[36m下一步:\x1b[0m`)
      terminal.writeln(`  cd ${projectName}`)
      terminal.writeln(`  npm install`)
      terminal.writeln(`  dev-server vite 5173`)
    } catch (error) {
      terminal.writeln(`\x1b[31m创建失败: ${error.message}\x1b[0m`)
    }
    return
  }
  
  if (subCommand === 'install' || subCommand === 'i') {
    for (const arg of subArgs) {
      if (arg.startsWith('-')) continue
      
      if (arg.startsWith('@')) {
        const parts = arg.substring(1).split('@')
        if (parts.length > 1 && !parts[0].includes('/')) {
          terminal.writeln(`\x1b[31m错误: 无效的包名格式 "${arg}"\x1b[0m`)
          terminal.writeln(`\x1b[33m提示: 作用域包应使用斜杠 "/" 分隔作用域和包名\x1b[0m`)
          terminal.writeln(`\x1b[36m正确格式: npm install @irisverse/iris\x1b[0m`)
          terminal.writeln(`\x1b[36m或者: npm install @irisverse/iris@1.0.0\x1b[0m`)
          printPrompt()
          return
        }
        
        if (!arg.includes('/')) {
          terminal.writeln(`\x1b[31m错误: 作用域包名缺少包名部分 "${arg}"\x1b[0m`)
          terminal.writeln(`\x1b[36m正确格式: npm install @irisverse/iris\x1b[0m`)
          printPrompt()
          return
        }
      }
    }
  }
  
  terminal.writeln(`\x1b[36m> npm ${subCommand} ${subArgs.join(' ')}\x1b[0m`)
  
  try {
    const process = await webContainerManager.runNpm([subCommand, ...subArgs])
    
    if (process.stdout) {
      process.stdout.pipeTo(new WritableStream({
        write(data) {
          terminal.write(data)
        }
      }))
    }
    
    if (process.stderr) {
      process.stderr.pipeTo(new WritableStream({
        write(data) {
          terminal.write('\x1b[31m' + data + '\x1b[0m')
        }
      }))
    }
    
    const exitCode = await process.exit
    if (exitCode !== 0) {
      terminal.writeln(`\x1b[33m进程退出码: ${exitCode}\x1b[0m`)
      if (subCommand === 'install') {
        terminal.writeln(`\x1b[33m提示: 请检查包名是否正确，或网络连接是否正常\x1b[0m`)
      }
    }
  } catch (error) {
    terminal.writeln(`\x1b[31mnpm 执行失败: ${error.message}\x1b[0m`)
  }
}

const createViteTemplate = async (projectName) => {
  const indexHtml = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '    <title>Vite App</title>',
    '  </head>',
    '  <body>',
    '    <div id="app"></div>',
    '    <script type="module" src="/src/main.js"><\/script>',
    '  </body>',
    '</html>'
  ].join('\n')
  
  const mainJs = [
    "import './style.css'",
    '',
    "document.querySelector('#app').innerHTML = `",
    '  <div style="text-align: center; padding: 2rem;">',
    '    <h1>Hello Vite!</h1>',
    '    <p>Edit src/main.js to make changes.</p>',
    '    <p>Count: <span id="count">0</span></p>',
    '    <button id="btn">Click me</button>',
    '  </div>',
    '`',
    '',
    'let count = 0',
    "document.querySelector('#btn').addEventListener('click', () => {",
    '  count++',
    "  document.querySelector('#count').textContent = count",
    '})'
  ].join('\n')
  
  const styleCss = [
    ':root {',
    '  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;',
    '  color: #213547;',
    '  background-color: #ffffff;',
    '}',
    '',
    'body {',
    '  margin: 0;',
    '  display: flex;',
    '  place-items: center;',
    '  min-width: 320px;',
    '  min-height: 100vh;',
    '}',
    '',
    '#app {',
    '  max-width: 1280px;',
    '  margin: 0 auto;',
    '  padding: 2rem;',
    '  text-align: center;',
    '}',
    '',
    'h1 {',
    '  font-size: 3.2em;',
    '  line-height: 1.1;',
    '}',
    '',
    'button {',
    '  border-radius: 8px;',
    '  border: 1px solid transparent;',
    '  padding: 0.6em 1.2em;',
    '  font-size: 1em;',
    '  font-weight: 500;',
    '  font-family: inherit;',
    '  background-color: #1a1a1a;',
    '  color: #ffffff;',
    '  cursor: pointer;',
    '  transition: border-color 0.25s;',
    '}',
    '',
    'button:hover {',
    '  border-color: #646cff;',
    '}'
  ].join('\n')
  
  const viteConfig = [
    "import { defineConfig } from 'vite'",
    '',
    'export default defineConfig({',
    '  server: {',
    '    port: 5173',
    '  }',
    '})'
  ].join('\n')
  
  const packageJson = JSON.stringify({
    name: projectName,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview'
    },
    dependencies: {
      vite: '^5.0.0'
    }
  }, null, 2)
  
  const files = {
    [`${projectName}/package.json`]: {
      file: { contents: packageJson }
    },
    [`${projectName}/index.html`]: {
      file: { contents: indexHtml }
    },
    [`${projectName}/src/main.js`]: {
      file: { contents: mainJs }
    },
    [`${projectName}/src/style.css`]: {
      file: { contents: styleCss }
    },
    [`${projectName}/vite.config.js`]: {
      file: { contents: viteConfig }
    }
  }
  
  await webContainerManager.mount(files)
}

const handleNpx = async (args) => {
  if (args.length === 0) {
    terminal.writeln('用法: npx <package> [args]')
    return
  }
  
  terminal.writeln(`\x1b[36m> npx ${args.join(' ')}\x1b[0m`)
  
  try {
    const process = await webContainerManager.runNpx(args)
    
    if (process.stdout) {
      process.stdout.pipeTo(new WritableStream({
        write(data) {
          terminal.write(data)
        }
      }))
    }
    
    if (process.stderr) {
      process.stderr.pipeTo(new WritableStream({
        write(data) {
          terminal.write('\x1b[31m' + data + '\x1b[0m')
        }
      }))
    }
    
    await process.exit
  } catch (error) {
    terminal.writeln(`\x1b[31mnpx 执行失败: ${error.message}\x1b[0m`)
  }
}

const handleNode = async (args) => {
  if (args.length === 0) {
    terminal.writeln('Node.js (WebContainer)')
    terminal.writeln('用法: node <script.js>')
    terminal.writeln('用法: node -e "code"')
    return
  }
  
  terminal.writeln(`\x1b[36m> node ${args.join(' ')}\x1b[0m`)
  
  try {
    const process = await webContainerManager.runNode(args)
    
    if (process.stdout) {
      process.stdout.pipeTo(new WritableStream({
        write(data) {
          terminal.write(data)
        }
      }))
    }
    
    if (process.stderr) {
      process.stderr.pipeTo(new WritableStream({
        write(data) {
          terminal.write('\x1b[31m' + data + '\x1b[0m')
        }
      }))
    }
    
    await process.exit
  } catch (error) {
    terminal.writeln(`\x1b[31mnode 执行失败: ${error.message}\x1b[0m`)
  }
}

const handleDevServer = async (args) => {
  const { devServerManager } = await import('../../core/dev-server.js')
  
  if (args.length === 0) {
    terminal.writeln('\x1b[36m虚拟开发服务器管理器\x1b[0m')
    terminal.writeln('')
    terminal.writeln('用法: dev-server <command>')
    terminal.writeln('')
    terminal.writeln('命令:')
    terminal.writeln('  list              列出所有运行的服务器')
    terminal.writeln('  start [port]      启动开发服务器')
    terminal.writeln('  stop <port>       停止服务器')
    terminal.writeln('  vite [port]       创建Vite开发服务器')
    return
  }
  
  const subCommand = args[0]
  const subArgs = args.slice(1)
  
  switch (subCommand) {
    case 'list':
      const servers = devServerManager.getServers()
      if (servers.length === 0) {
        terminal.writeln('没有运行的服务器')
      } else {
        terminal.writeln('\x1b[36m运行中的服务器:\x1b[0m')
        servers.forEach(server => {
          terminal.writeln(`  端口 ${server.port} - ${server.type} (${server.status})`)
          if (server.projectPath) {
            terminal.writeln(`    路径: ${server.projectPath}`)
          }
        })
      }
      break
      
    case 'vite':
      const port = parseInt(subArgs[0]) || 5173
      terminal.writeln(`创建Vite开发服务器在端口 ${port}...`)
      try {
        const server = await devServerManager.createViteServer(currentPath, port)
        terminal.writeln(`\x1b[32m✓ Vite服务器已启动\x1b[0m`)
        terminal.writeln(`\x1b[36m┌────────────────────────────────────────┐\x1b[0m`)
        terminal.writeln(`\x1b[36m│ 访问地址: http://localhost:${port}        │\x1b[0m`)
        terminal.writeln(`\x1b[36m│ 在WebOS浏览器输入上述地址即可访问     │\x1b[0m`)
        terminal.writeln(`\x1b[36m└────────────────────────────────────────┘\x1b[0m`)
      } catch (error) {
        terminal.writeln(`\x1b[31m错误: ${error.message}\x1b[0m`)
      }
      break
      
    case 'stop':
      const stopPort = parseInt(subArgs[0])
      if (!stopPort) {
        terminal.writeln('用法: dev-server stop <port>')
        return
      }
      devServerManager.closeServer(stopPort)
      terminal.writeln(`\x1b[32m✓ 服务器已关闭\x1b[0m`)
      break
      
    default:
      terminal.writeln(`\x1b[31m未知命令: ${subCommand}\x1b[0m`)
  }
}

const handleLs = async (args) => {
  const path = args[0] || '.'
  
  try {
    const files = await webContainerManager.readdir(path)
    
    if (files.length === 0) {
      terminal.writeln('(空目录)')
    } else {
      for (const file of files) {
        const color = file.isDirectory() ? '\x1b[34m' : '\x1b[0m'
        const suffix = file.isDirectory() ? '/' : ''
        terminal.writeln(`${color}${file.name}${suffix}\x1b[0m`)
      }
    }
  } catch (error) {
    terminal.writeln(`\x1b[31m无法读取目录: ${error.message}\x1b[0m`)
  }
}

const handleCat = async (args) => {
  if (args.length === 0) {
    terminal.writeln('用法: cat <file>')
    return
  }
  
  try {
    const content = await webContainerManager.readFile(args[0])
    terminal.writeln(content)
  } catch (error) {
    terminal.writeln(`\x1b[31m无法读取文件: ${error.message}\x1b[0m`)
  }
}

const handleCp = async (args) => {
  if (args.length < 1) {
    terminal.writeln('用法: cp <源文件>')
    terminal.writeln('功能: 复制文件到剪切板')
    return
  }
  
  const sourcePath = args[0]
  
  try {
    const content = await webContainerManager.readFile(sourcePath)
    const fileName = sourcePath.split('/').pop()
    
    clipboardManager.copyFile({
      name: fileName,
      path: sourcePath,
      content: content,
      size: content.length,
      type: 'file'
    })
    
    terminal.writeln(`\x1b[32m✓ 已复制文件: ${fileName}\x1b[0m`)
    terminal.writeln(`\x1b[90m提示: 右键桌面或在终端使用 paste 命令粘贴\x1b[0m`)
  } catch (error) {
    terminal.writeln(`\x1b[31m复制失败: ${error.message}\x1b[0m`)
  }
}

const handlePaste = async (args) => {
  const targetPath = args[0]
  
  if (!clipboardManager.hasFile()) {
    terminal.writeln('\x1b[33m剪切板中没有文件\x1b[0m')
    return
  }
  
  const fileData = clipboardManager.pasteFile()
  if (!fileData) {
    terminal.writeln('\x1b[31m粘贴失败\x1b[0m')
    return
  }
  
  try {
    const destPath = targetPath || fileData.name
    await webContainerManager.writeFile(destPath, fileData.content)
    terminal.writeln(`\x1b[32m✓ 已粘贴: ${destPath}\x1b[0m`)
  } catch (error) {
    terminal.writeln(`\x1b[31m粘贴失败: ${error.message}\x1b[0m`)
  }
}

const executeWithSimulation = async (command, args) => {
  terminal.writeln(`\x1b[33m[模拟模式] ${command} ${args.join(' ')}\x1b[0m`)
  
  switch (command) {
    case 'npm':
      terminal.writeln('npm 命令需要 WebContainer 支持')
      break
    case 'npx':
      terminal.writeln('npx 命令需要 WebContainer 支持')
      break
    case 'node':
      terminal.writeln('node 命令需要 WebContainer 支持')
      break
    case 'help':
      handleHelp()
      break
    default:
      terminal.writeln(`\x1b[31m命令未找到: ${command}\x1b[0m`)
  }
}

const handleHelp = () => {
  terminal.writeln('\x1b[36m═══════════════════════════════════════\x1b[0m')
  terminal.writeln('\x1b[36m   IrisWebOS Terminal - WebContainer\x1b[0m')
  terminal.writeln('\x1b[36m═══════════════════════════════════════\x1b[0m')
  terminal.writeln('')
  terminal.writeln('\x1b[33m文件系统命令:\x1b[0m')
  terminal.writeln('  ls [path]         列出目录内容')
  terminal.writeln('  cat <file>        显示文件内容')
  terminal.writeln('  pwd               显示当前目录')
  terminal.writeln('')
  terminal.writeln('\x1b[33mNode.js 环境:\x1b[0m')
  terminal.writeln('  node <script>     运行Node.js脚本')
  terminal.writeln('  node -e "code"    执行代码')
  terminal.writeln('')
  terminal.writeln('\x1b[33m包管理:\x1b[0m')
  terminal.writeln('  npm init          初始化项目')
  terminal.writeln('  npm install       安装依赖')
  terminal.writeln('  npm run <script>  运行脚本')
  terminal.writeln('  npm create        创建项目')
  terminal.writeln('')
  terminal.writeln('\x1b[33m其他:\x1b[0m')
  terminal.writeln('  npx <cmd>         执行包命令')
  terminal.writeln('  echo <text>       输出文本')
  terminal.writeln('  clear             清屏')
  terminal.writeln('  help              显示帮助')
  terminal.writeln('')
  terminal.writeln('\x1b[36m═══════════════════════════════════════\x1b[0m')
}

onMounted(() => {
  initTerminal()
})

onUnmounted(() => {
  if (terminal) {
    terminal.dispose()
  }
})
</script>

<style scoped>
.terminal-app {
  width: 100%;
  height: 100%;
  background: #1e1e1e;
}

.terminal-container {
  width: 100%;
  height: 100%;
  padding: 8px;
}
</style>
