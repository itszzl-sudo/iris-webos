<template>
  <div class="browser-app">
    <div class="browser-toolbar">
      <button @click="goBack" class="nav-btn" :disabled="historyIndex <= 0">←</button>
      <button @click="goForward" class="nav-btn" :disabled="historyIndex >= history.length - 1">→</button>
      <button @click="refresh" class="nav-btn">⟳</button>
      <input 
        v-model="url"
        @keyup.enter="navigate"
        class="url-input"
        placeholder="输入完整URL (如: http://localhost:5173)"
      />
      <button @click="navigate" class="go-btn">转到</button>
      <div v-if="isVirtualServer" class="virtual-badge">⚡ 虚拟服务器</div>
    </div>
    
    <div class="browser-content">
      <!-- 虚拟服务器内容 -->
      <div v-if="isVirtualServer && renderedContent" class="virtual-content">
        <div class="server-header">
          <span class="server-info">🚀 虚拟开发服务器运行在端口 {{ currentPort }}</span>
        </div>
        <div v-html="renderedContent" class="rendered-page"></div>
      </div>
      
      <!-- 虚拟服务器未运行 -->
      <div v-else-if="isVirtualServer && !renderedContent" class="virtual-placeholder">
        <h2>⚠️ 虚拟服务器未运行</h2>
        <p>端口 {{ currentPort }} 没有活动的开发服务器</p>
        <div class="instructions">
          <h3>在终端中启动服务器：</h3>
          <code>dev-server vite {{ currentPort }}</code>
          <h3>或者创建项目：</h3>
          <code>npm create vite@latest my-app</code>
          <code>cd my-app && npm install</code>
          <code>dev-server vite {{ currentPort }}</code>
        </div>
      </div>
      
      <!-- 外部URL -->
      <iframe 
        v-else
        ref="browserFrame"
        :src="currentUrl"
        class="browser-frame"
        sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-top-navigation"
        allow="gpu; clipboard-read; clipboard-write"
        @load="handleLoad"
      ></iframe>
    </div>
    
    <div class="status-bar">
      <span>{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  windowId: String
})

const url = ref('')
const currentUrl = ref('')
const browserFrame = ref(null)
const history = ref([])
const historyIndex = ref(-1)
const statusText = ref('就绪')
const renderedContent = ref('')
const currentPort = ref(null)

const isVirtualServer = ref(false)

const navigate = async () => {
  let targetUrl = url.value.trim()
  
  if (!targetUrl) return
  
  const localhostMatch = targetUrl.match(/^https?:\/\/localhost:(\d+)/)
  if (localhostMatch) {
    const port = parseInt(localhostMatch[1])
    try {
      const { devServerManager } = await import('../../core/dev-server.js')
      const servers = devServerManager.getServers()
      if (servers.find(s => s.port === port)) {
        await connectVirtualServer(port)
        return
      }
    } catch {
    }
  }
  
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    if (targetUrl.match(/^localhost:\d+/) || targetUrl.match(/^:\d+/)) {
      targetUrl = 'http://' + targetUrl
    } else {
      targetUrl = 'https://' + targetUrl
    }
  }
  
  const localhostMatch2 = targetUrl.match(/^http:\/\/localhost:(\d+)/)
  if (localhostMatch2) {
    const port = parseInt(localhostMatch2[1])
    try {
      const { devServerManager } = await import('../../core/dev-server.js')
      const servers = devServerManager.getServers()
      if (servers.find(s => s.port === port)) {
        await connectVirtualServer(port)
        return
      }
    } catch {
    }
  }
  
  currentUrl.value = targetUrl
  url.value = targetUrl
  isVirtualServer.value = false
  renderedContent.value = ''
  statusText.value = '加载中...'
  
  history.value = history.value.slice(0, historyIndex.value + 1)
  history.value.push(targetUrl)
  historyIndex.value = history.value.length - 1
}

const connectVirtualServer = async (port) => {
  try {
    statusText.value = `连接虚拟服务器 :${port}...`
    currentPort.value = port
    isVirtualServer.value = true
    
    const { devServerManager } = await import('../../core/dev-server.js')
    const servers = devServerManager.getServers()
    const server = servers.find(s => s.port === port)
    
    if (!server) {
      renderedContent.value = ''
      statusText.value = `端口 ${port} 无运行的服务器`
      url.value = `http://localhost:${port}`
      
      history.value = history.value.slice(0, historyIndex.value + 1)
      history.value.push(`http://localhost:${port}`)
      historyIndex.value = history.value.length - 1
      return
    }
    
    const response = await devServerManager.routeRequest(port, {
      method: 'GET',
      path: '/',
      headers: {},
      body: null
    })
    
    renderedContent.value = response.body
    statusText.value = `已连接 :${port} (${server.type})`
    url.value = `http://localhost:${port}`
    
    history.value = history.value.slice(0, historyIndex.value + 1)
    history.value.push(`http://localhost:${port}`)
    historyIndex.value = history.value.length - 1
    
  } catch (error) {
    renderedContent.value = `
      <div style="padding: 40px; text-align: center;">
        <h2 style="color: #e74c3c;">连接失败</h2>
        <p>${error.message}</p>
      </div>
    `
    statusText.value = '连接失败'
  }
}

const goBack = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    const historyUrl = history.value[historyIndex.value]
    url.value = historyUrl
    
    const portMatch = historyUrl.match(/^http:\/\/localhost:(\d+)/)
    if (portMatch) {
      connectVirtualServer(parseInt(portMatch[1]))
    } else {
      currentUrl.value = historyUrl
      isVirtualServer.value = false
      renderedContent.value = ''
    }
  }
}

const goForward = () => {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    const historyUrl = history.value[historyIndex.value]
    url.value = historyUrl
    
    const portMatch = historyUrl.match(/^http:\/\/localhost:(\d+)/)
    if (portMatch) {
      connectVirtualServer(parseInt(portMatch[1]))
    } else {
      currentUrl.value = historyUrl
      isVirtualServer.value = false
      renderedContent.value = ''
    }
  }
}

const refresh = () => {
  if (isVirtualServer.value && currentPort.value) {
    connectVirtualServer(currentPort.value)
  } else if (browserFrame.value) {
    browserFrame.value.src = currentUrl.value
  }
}

const handleLoad = () => {
  statusText.value = '加载完成'
}

onMounted(() => {
  statusText.value = '提示: localhost 指向 WebOS 内部虚拟服务器'
})
</script>

<style scoped>
.browser-app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.browser-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
}

.nav-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.url-input {
  flex: 1;
  padding: 6px 12px;
}

.go-btn {
  padding: 6px 16px;
  background: var(--active-color);
  color: white;
  border-radius: 4px;
}

.virtual-badge {
  padding: 4px 8px;
  background: #10b981;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.browser-content {
  flex: 1;
  position: relative;
  background: white;
  overflow: auto;
}

.virtual-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.server-header {
  padding: 8px 16px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
}

.server-info {
  font-size: 14px;
  color: #10b981;
  font-weight: bold;
}

.rendered-page {
  flex: 1;
  padding: 0;
}

.virtual-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.virtual-placeholder h2 {
  color: #f59e0b;
  margin-bottom: 20px;
}

.instructions {
  margin-top: 20px;
  text-align: left;
  max-width: 500px;
}

.instructions h3 {
  font-size: 14px;
  margin: 15px 0 10px 0;
  color: #666;
}

.instructions code {
  display: block;
  padding: 10px;
  margin: 5px 0;
  background: #f3f4f6;
  border-radius: 4px;
  font-family: monospace;
}

.browser-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.status-bar {
  padding: 4px 12px;
  background: var(--bg-color);
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-color);
}
</style>
