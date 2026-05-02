<template>
  <div 
    class="desktop"
    :style="{ backgroundImage: `url(${desktopManager.wallpaper})` }"
    @contextmenu.prevent="handleContextMenu"
    @click="handleClick"
  >
    <div 
      v-for="icon in desktopManager.icons" 
      :key="icon.id"
      class="desktop-icon"
      :style="{ left: icon.x + 'px', top: icon.y + 'px' }"
      @dblclick="handleIconDoubleClick(icon)"
    >
      <img :src="icon.icon" :alt="icon.name" class="icon-image" />
      <span class="icon-name">{{ icon.name }}</span>
    </div>
    
    <div class="localhost-notice">
      <div class="notice-content">
        <span class="notice-icon">💡</span>
        <span class="notice-text">
          <strong>localhost</strong> 指向 WebOS 内部虚拟服务器<br/>
          <small>浏览器访问: http://localhost:端口</small><br/>
          <small>支持与宿主机共享剪切板（仅文本）</small>
        </span>
      </div>
    </div>
    
    <div class="quick-reference">
      <div class="reference-header">
        <span class="reference-icon">📝</span>
        <span class="reference-title">测试命令快速参考</span>
      </div>
      <div class="reference-content">
        <div class="command-section">
          <div class="section-title">创建并运行 Vite 项目：</div>
          <div class="command-item">
            <code>npm create vite@latest my-app</code>
          </div>
          <div class="command-item">
            <code>cd my-app</code>
          </div>
          <div class="command-item">
            <code>npm install</code>
          </div>
          <div class="command-item">
            <code>dev-server vite 5173</code>
          </div>
        </div>
        <div class="command-section">
          <div class="section-title">访问地址（在内置浏览器输入）：</div>
          <div class="command-item highlight">
            <code>http://localhost:5173</code>
          </div>
        </div>
        <div class="command-section">
          <div class="section-title">项目文件：</div>
          <div class="file-info">
            <span>✓ index.html</span>
            <span>✓ src/main.js</span>
            <span>✓ src/style.css</span>
            <span>✓ vite.config.js</span>
          </div>
        </div>
        <div class="command-section">
          <div class="section-title">其他命令：</div>
          <div class="command-item">
            <code>dev-server list</code>
            <span class="cmd-desc">查看服务器</span>
          </div>
          <div class="command-item">
            <code>ls</code>
            <span class="cmd-desc">列出文件</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="webcontainer-status" v-if="webcontainerStatus !== 'ready'">
      <div class="status-content">
        <div class="status-header">
          <div class="loading-spinner" v-if="webcontainerStatus === 'initializing'"></div>
          <div class="status-icon" v-else-if="webcontainerStatus === 'error'">❌</div>
          <div class="status-icon" v-else>⏳</div>
          <span class="status-title">
            {{ statusTitle }}
          </span>
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: progressPercent + '%' }"
          ></div>
        </div>
        <div class="status-message">
          {{ webcontainerProgress.message }}
        </div>
        <div class="status-detail" v-if="webcontainerStatus === 'initializing'">
          {{ webcontainerProgress.step }} / {{ webcontainerProgress.total }}
        </div>
      </div>
    </div>
    
    <ContextMenu 
      v-if="desktopManager.contextMenu.visible"
      :x="desktopManager.contextMenu.x"
      :y="desktopManager.contextMenu.y"
      :items="desktopManager.contextMenu.items"
      @close="desktopManager.hideContextMenu()"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { desktopManager } from '../core/desktop.js'
import { windowManager } from '../core/window-manager.js'
import { webContainerManager } from '../wasi/webcontainer.js'
import { clipboardManager } from '../core/clipboard.js'
import ContextMenu from './ContextMenu.vue'

const props = defineProps({
  webcontainerStatus: {
    type: String,
    default: 'idle'
  },
  webcontainerProgress: {
    type: Object,
    default: () => ({ step: 0, total: 3, message: '等待初始化...' })
  }
})

const statusTitle = computed(() => {
  switch (props.webcontainerStatus) {
    case 'idle':
      return 'WebContainer 等待初始化'
    case 'initializing':
      return 'WebContainer 初始化中...'
    case 'ready':
      return 'WebContainer 已就绪'
    case 'error':
      return 'WebContainer 初始化失败'
    default:
      return 'WebContainer'
  }
})

const progressPercent = computed(() => {
  if (props.webcontainerProgress.total === 0) return 0
  return (props.webcontainerProgress.step / props.webcontainerProgress.total) * 100
})

const handleContextMenu = (e) => {
  const menuItems = [
    { label: '刷新桌面', action: () => location.reload() },
    { type: 'separator' }
  ]
  
  if (clipboardManager.hasFile()) {
    const fileInfo = clipboardManager.getFileInfo()
    menuItems.push({
      label: `粘贴 ${fileInfo.name}`,
      action: () => pasteFile()
    })
    menuItems.push({ type: 'separator' })
  }
  
  menuItems.push(
    { label: '显示设置', action: () => openApp('settings') },
    { label: '个性化', action: () => openApp('settings') },
    { type: 'separator' },
    { label: '打开终端', action: () => openApp('terminal') },
    { label: '打开编辑器', action: () => openApp('editor') }
  )
  
  desktopManager.showContextMenu(e.clientX, e.clientY, menuItems)
}

const pasteFile = async () => {
  const fileData = clipboardManager.pasteFile()
  if (!fileData) return
  
  try {
    if (webContainerManager.isInitialized()) {
      const targetPath = fileData.name
      await webContainerManager.writeFile(targetPath, fileData.content)
      window.$webos?.showAlertDialog(`文件已粘贴: ${targetPath}`)
    }
  } catch (error) {
    window.$webos?.showAlertDialog(`粘贴失败: ${error.message}`)
  }
}

const openApp = (appId) => {
  windowManager.createWindow(appId, {
    title: desktopManager.getAppTitle(appId)
  })
}

const handleClick = () => {
  desktopManager.hideContextMenu()
}

const handleIconDoubleClick = (icon) => {
  const status = window.$webos?.getWebContainerStatus()
  
  if (icon.appId === 'terminal') {
    if (!status || status.status !== 'ready') {
      window.$webos?.showAlertDialog(
        'WebContainer 正在初始化中\n\n终端功能需要等待 WebContainer 初始化完成后才能使用。\n请稍候再试。'
      )
      return
    }
  } else if (['editor', 'browser'].includes(icon.appId)) {
    if (!status || status.status !== 'ready') {
      window.$webos?.showAlertDialog(
        'WebContainer 正在初始化中\n\n部分功能需要等待 WebContainer 初始化完成。\n请稍候再试。'
      )
      return
    }
  }
  
  windowManager.createWindow(icon.appId, {
    title: icon.name
  })
}
</script>

<style scoped>
.desktop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 48px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.desktop-icon {
  position: absolute;
  width: 80px;
  height: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.desktop-icon:hover {
  background: rgba(255, 255, 255, 0.1);
}

.icon-image {
  width: 48px;
  height: 48px;
  margin-bottom: 4px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.icon-name {
  color: white;
  font-size: 12px;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  word-wrap: break-word;
  max-width: 100%;
}

.localhost-notice {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}

.notice-content {
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: flex-start;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.notice-icon {
  font-size: 20px;
  line-height: 1;
}

.notice-text {
  color: white;
  font-size: 13px;
  line-height: 1.5;
}

.notice-text strong {
  color: #10b981;
  font-weight: 600;
}

.notice-text small {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
}

.webcontainer-status {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
}

.status-content {
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  min-width: 280px;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.status-icon {
  font-size: 24px;
  line-height: 1;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-title {
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #3b82f6);
  transition: width 0.3s ease;
}

.status-message {
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  line-height: 1.5;
}

.status-detail {
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  margin-top: 4px;
}

.quick-reference {
  position: absolute;
  bottom: 100px;
  right: 20px;
  z-index: 100;
  max-width: 420px;
}

.reference-header {
  background: rgba(16, 185, 129, 0.9);
  backdrop-filter: blur(10px);
  padding: 10px 16px;
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.2);
}

.reference-icon {
  font-size: 16px;
}

.reference-content {
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  padding: 16px;
  border-radius: 0 0 8px 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-top: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.command-section {
  margin-bottom: 12px;
}

.command-section:last-child {
  margin-bottom: 0;
}

.section-title {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.command-item {
  background: rgba(255, 255, 255, 0.08);
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;
}

.command-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

.command-item.highlight {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.command-item.highlight:hover {
  background: rgba(16, 185, 129, 0.3);
}

.command-item code {
  color: #10b981;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  user-select: all;
}

.cmd-desc {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  margin-left: 8px;
}

.file-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.file-info span {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', monospace;
}
</style>
