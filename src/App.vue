<template>
  <div id="iris-webos" :class="theme">
    <Desktop 
      :webcontainer-status="webcontainerStatus"
      :webcontainer-progress="webcontainerProgress"
    />
    <Taskbar />
    <WindowManager />
    
    <div v-if="showAlert" class="webos-alert">
      <div class="alert-content">
        <div class="alert-icon">⚠️</div>
        <div class="alert-message">{{ alertMessage }}</div>
        <button class="alert-btn" @click="closeAlert">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Desktop from './components/Desktop.vue'
import Taskbar from './components/Taskbar.vue'
import WindowManager from './components/WindowManager.vue'
import { systemManager } from './core/system.js'
import { webContainerManager } from './wasi/webcontainer.js'
import { clipboardManager } from './core/clipboard.js'

const theme = ref('dark')
const webcontainerStatus = ref('idle')
const webcontainerProgress = ref({ step: 0, total: 3, message: '等待初始化...' })
const showAlert = ref(false)
const alertMessage = ref('')

const showAlertDialog = (message) => {
  alertMessage.value = message
  showAlert.value = true
}

const closeAlert = () => {
  showAlert.value = false
}

onMounted(async () => {
  const savedConfig = systemManager.getConfig('theme')
  if (savedConfig) {
    theme.value = savedConfig
  }
  
  systemManager.on('theme:changed', (newTheme) => {
    theme.value = newTheme
  })
  
  webContainerManager.on('status-change', (status) => {
    webcontainerStatus.value = status
  })
  
  webContainerManager.on('progress', (progress) => {
    webcontainerProgress.value = progress
  })
  
  clipboardManager.setEventBus(systemManager.eventBus)
  
  document.addEventListener('copy', async (e) => {
    const selection = window.getSelection()
    if (selection && selection.toString()) {
      const text = selection.toString()
      await clipboardManager.copy(text)
    }
  })
  
  document.addEventListener('paste', async (e) => {
    if (e.clipboardData) {
      const items = e.clipboardData.items
      
      for (let item of items) {
        if (item.kind === 'file') {
          e.preventDefault()
          clipboardManager.showUnsupportedMessage()
          return
        }
      }
      
      for (let item of items) {
        if (item.kind === 'string' && item.type === 'text/plain') {
          item.getAsString(async (text) => {
            await clipboardManager.copy(text)
          })
        }
      }
    }
  })
  
  systemManager.on('clipboard:unsupported', (data) => {
    showAlertDialog(data.message)
  })
  
  webContainerManager.init().catch(err => {
    console.error('WebContainer init error:', err)
  })
  
  window.$webos = {
    showAlertDialog,
    getWebContainerStatus: () => webContainerManager.getStatus(),
    clipboard: clipboardManager
  }
})

onUnmounted(() => {
  delete window.$webos
})
</script>

<style>
#iris-webos {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

#iris-webos.dark {
  --bg-color: #1e1e1e;
  --text-color: #ffffff;
  --window-bg: #2d2d2d;
  --border-color: #3d3d3d;
  --taskbar-bg: #252525;
  --hover-color: #3d3d3d;
  --active-color: #0078d4;
}

#iris-webos.light {
  --bg-color: #f3f3f3;
  --text-color: #000000;
  --window-bg: #ffffff;
  --border-color: #e0e0e0;
  --taskbar-bg: #f9f9f9;
  --hover-color: #e0e0e0;
  --active-color: #0078d4;
}

.webos-alert {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.alert-content {
  background: var(--window-bg);
  border-radius: 8px;
  padding: 24px 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-width: 300px;
}

.alert-icon {
  font-size: 48px;
}

.alert-message {
  color: var(--text-color);
  font-size: 14px;
  text-align: center;
  line-height: 1.6;
}

.alert-btn {
  background: var(--active-color);
  color: white;
  border: none;
  padding: 8px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}

.alert-btn:hover {
  opacity: 0.9;
}
</style>
