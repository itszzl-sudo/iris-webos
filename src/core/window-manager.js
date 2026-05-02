import { reactive } from 'vue'
import { systemManager, STORAGE_KEYS } from './system.js'

class WindowManager {
  constructor() {
    this.windows = reactive(new Map())
    this.activeWindowId = null
    this.zIndexCounter = 100
    this.loadWindowStates()
  }

  generateId() {
    return `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  createWindow(appId, config = {}) {
    const id = this.generateId()
    const defaultConfig = {
      title: config.title || 'Window',
      width: config.width || 800,
      height: config.height || 600,
      minWidth: config.minWidth || 400,
      minHeight: config.minHeight || 300,
      x: config.x || Math.random() * (window.innerWidth - 800),
      y: config.y || Math.random() * (window.innerHeight - 600 - 48),
      resizable: config.resizable !== false,
      draggable: config.draggable !== false
    }

    const windowInstance = reactive({
      id,
      appId,
      title: defaultConfig.title,
      position: { x: defaultConfig.x, y: defaultConfig.y },
      size: { width: defaultConfig.width, height: defaultConfig.height },
      minSize: { width: defaultConfig.minWidth, height: defaultConfig.minHeight },
      state: 'normal',
      zIndex: ++this.zIndexCounter,
      resizable: defaultConfig.resizable,
      draggable: defaultConfig.draggable,
      visible: true
    })

    this.windows.set(id, windowInstance)
    this.focusWindow(id)
    systemManager.emit('window:created', windowInstance)
    this.saveWindowStates()
    
    return id
  }

  closeWindow(windowId) {
    const windowInstance = this.windows.get(windowId)
    if (!windowInstance) return

    this.windows.delete(windowId)
    if (this.activeWindowId === windowId) {
      this.activeWindowId = null
    }
    
    systemManager.emit('window:closed', windowInstance)
    this.saveWindowStates()
  }

  focusWindow(windowId) {
    const windowInstance = this.windows.get(windowId)
    if (!windowInstance) return

    windowInstance.zIndex = ++this.zIndexCounter
    this.activeWindowId = windowId
    systemManager.emit('window:focused', windowInstance)
    this.saveWindowStates()
  }

  minimizeWindow(windowId) {
    const windowInstance = this.windows.get(windowId)
    if (!windowInstance) return

    windowInstance.state = 'minimized'
    windowInstance.visible = false
    this.saveWindowStates()
  }

  maximizeWindow(windowId) {
    const windowInstance = this.windows.get(windowId)
    if (!windowInstance) return

    if (windowInstance.state === 'maximized') {
      windowInstance.state = 'normal'
      windowInstance.size = { 
        width: windowInstance.prevSize?.width || 800, 
        height: windowInstance.prevSize?.height || 600 
      }
      windowInstance.position = { 
        x: windowInstance.prevPos?.x || 0, 
        y: windowInstance.prevPos?.y || 0 
      }
    } else {
      windowInstance.prevSize = { ...windowInstance.size }
      windowInstance.prevPos = { ...windowInstance.position }
      windowInstance.state = 'maximized'
      windowInstance.size = { width: window.innerWidth, height: window.innerHeight - 48 }
      windowInstance.position = { x: 0, y: 0 }
    }
    
    this.saveWindowStates()
  }

  restoreWindow(windowId) {
    const windowInstance = this.windows.get(windowId)
    if (!windowInstance) return

    windowInstance.state = 'normal'
    windowInstance.visible = true
    this.focusWindow(windowId)
    this.saveWindowStates()
  }

  updateWindowPosition(windowId, position) {
    const windowInstance = this.windows.get(windowId)
    if (!windowInstance) return

    windowInstance.position.x = Math.max(0, Math.min(position.x, window.innerWidth - 100))
    windowInstance.position.y = Math.max(0, Math.min(position.y, window.innerHeight - 100))
    this.saveWindowStates()
  }

  updateWindowSize(windowId, size) {
    const windowInstance = this.windows.get(windowId)
    if (!windowInstance) return

    windowInstance.size.width = Math.max(windowInstance.minSize.width, size.width)
    windowInstance.size.height = Math.max(windowInstance.minSize.height, size.height)
    this.saveWindowStates()
  }

  getWindow(windowId) {
    return this.windows.get(windowId)
  }

  getAllWindows() {
    return Array.from(this.windows.values())
  }

  getActiveWindow() {
    return this.activeWindowId ? this.windows.get(this.activeWindowId) : null
  }

  saveWindowStates() {
    try {
      const states = Array.from(this.windows.values()).map(w => ({
        windowId: w.id,
        appId: w.appId,
        position: w.position,
        size: w.size,
        state: w.state,
        zIndex: w.zIndex
      }))
      localStorage.setItem(STORAGE_KEYS.WINDOW_STATES, JSON.stringify({ windows: states }))
    } catch (error) {
      console.error('Failed to save window states:', error)
    }
  }

  loadWindowStates() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WINDOW_STATES)
      if (saved) {
        const { windows } = JSON.parse(saved)
        windows.forEach(w => {
          const instance = reactive({
            id: w.windowId,
            appId: w.appId,
            title: this.getAppTitle(w.appId),
            position: w.position,
            size: w.size,
            minSize: { width: 400, height: 300 },
            state: w.state,
            zIndex: w.zIndex,
            resizable: true,
            draggable: true,
            visible: w.state !== 'minimized'
          })
          this.windows.set(w.windowId, instance)
          if (w.zIndex > this.zIndexCounter) {
            this.zIndexCounter = w.zIndex
          }
          
          this.restoreWindowState(w.windowId, w.appId)
        })
      }
    } catch (error) {
      console.error('Failed to load window states:', error)
    }
  }
  
  restoreWindowState(windowId, appId) {
    setTimeout(() => {
      const appStateKeys = {
        'terminal': 'iris-webos:terminal-state',
        'editor': 'iris-webos:editor-state'
      }
      
      const stateKey = appStateKeys[appId]
      if (stateKey) {
        const hasState = localStorage.getItem(stateKey)
        if (hasState) {
          console.log(`Restoring state for ${appId} window`)
        }
      }
    }, 100)
  }

  getAppTitle(appId) {
    const titles = {
      'terminal': '终端',
      'editor': '代码编辑器',
      'iris-ai': 'Iris AI助手',
      'downloader': '文件下载器',
      'browser': '浏览器',
      'settings': '系统设置',
      'webgpu-demo': 'WebGPU Demo'
    }
    return titles[appId] || '窗口'
  }
}

export const windowManager = new WindowManager()
