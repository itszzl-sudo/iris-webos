<template>
  <div class="taskbar">
    <div class="taskbar-left">
      <button class="start-button" @click="toggleStartMenu">
        <img src="/static/icons/logo.svg" alt="Iris" class="start-icon" />
      </button>
      
      <div v-if="startMenuOpen" class="start-menu">
        <div 
          v-for="app in apps" 
          :key="app.id"
          class="menu-app-item"
          @click="openApp(app.id)"
        >
          <img :src="app.icon" :alt="app.name" class="app-icon" />
          <span>{{ app.name }}</span>
        </div>
      </div>
    </div>
    
    <div class="taskbar-center">
      <div 
        v-for="window in windows" 
        :key="window.id"
        class="taskbar-item"
        :class="{ active: window.id === activeWindowId }"
        @click="handleTaskbarItemClick(window)"
      >
        <img :src="getAppIcon(window.appId)" :alt="window.title" class="item-icon" />
        <span class="item-title">{{ window.title }}</span>
      </div>
    </div>
    
    <div class="taskbar-right">
      <div class="system-tray">
        <span class="tray-icon">🔊</span>
        <span class="tray-icon">📶</span>
      </div>
      <div class="clock">{{ currentTime }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { windowManager } from '../core/window-manager.js'

const startMenuOpen = ref(false)
const currentTime = ref('')
let timeInterval = null

const apps = [
  { id: 'terminal', name: '终端', icon: '/static/icons/terminal.svg' },
  { id: 'editor', name: '代码编辑器', icon: '/static/icons/editor.svg' },
  { id: 'iris-ai', name: 'Iris AI助手', icon: '/static/icons/ai.svg' },
  { id: 'browser', name: '浏览器', icon: '/static/icons/browser.svg' },
  { id: 'downloader', name: '文件下载器', icon: '/static/icons/download.svg' },
  { id: 'settings', name: '系统设置', icon: '/static/icons/settings.svg' }
]

const windows = computed(() => windowManager.getAllWindows())
const activeWindowId = computed(() => windowManager.activeWindowId)

const updateTime = () => {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  currentTime.value = `${hours}:${minutes}`
}

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})

const toggleStartMenu = () => {
  startMenuOpen.value = !startMenuOpen.value
}

const openApp = (appId) => {
  windowManager.createWindow(appId)
  startMenuOpen.value = false
}

const handleTaskbarItemClick = (window) => {
  if (window.state === 'minimized') {
    windowManager.restoreWindow(window.id)
  } else if (window.id === activeWindowId.value) {
    windowManager.minimizeWindow(window.id)
  } else {
    windowManager.focusWindow(window.id)
  }
}

const getAppIcon = (appId) => {
  const app = apps.find(a => a.id === appId)
  return app ? app.icon : '/static/icons/default.svg'
}
</script>

<style scoped>
.taskbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: var(--taskbar-bg);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  z-index: 9999;
}

.taskbar-left {
  position: relative;
  display: flex;
  align-items: center;
}

.start-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.start-icon {
  width: 24px;
  height: 24px;
}

.start-menu {
  position: absolute;
  bottom: 52px;
  left: 0;
  background: var(--window-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 8px;
  min-width: 200px;
}

.menu-app-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
}

.menu-app-item:hover {
  background: var(--hover-color);
}

.app-icon {
  width: 24px;
  height: 24px;
}

.taskbar-center {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 16px;
  overflow-x: auto;
}

.taskbar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--bg-color);
  border-radius: 4px;
  cursor: pointer;
  min-width: 120px;
  max-width: 200px;
}

.taskbar-item:hover {
  background: var(--hover-color);
}

.taskbar-item.active {
  background: var(--active-color);
}

.item-icon {
  width: 20px;
  height: 20px;
}

.item-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.taskbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.system-tray {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tray-icon {
  font-size: 16px;
}

.clock {
  font-size: 13px;
  padding: 0 8px;
}
</style>
