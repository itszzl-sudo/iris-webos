import { reactive } from 'vue'
import { systemManager } from './system.js'

class DesktopManager {
  constructor() {
    this.icons = reactive([])
    this.wallpaper = '/static/wallpapers/default.jpg'
    this.theme = 'dark'
    this.contextMenu = reactive({
      visible: false,
      x: 0,
      y: 0,
      items: []
    })
    
    this.loadConfig()
    this.initDefaultIcons()
  }

  loadConfig() {
    const savedTheme = systemManager.getConfig('theme')
    const savedWallpaper = systemManager.getConfig('wallpaper')
    
    if (savedTheme) this.theme = savedTheme
    if (savedWallpaper) this.wallpaper = savedWallpaper
  }

  initDefaultIcons() {
    const defaultIcons = [
      {
        id: 'terminal',
        name: '终端',
        icon: '/static/icons/terminal.svg',
        appId: 'terminal',
        x: 20,
        y: 20
      },
      {
        id: 'editor',
        name: '代码编辑器',
        icon: '/static/icons/editor.svg',
        appId: 'editor',
        x: 20,
        y: 100
      },
      {
        id: 'iris-ai',
        name: 'Iris AI',
        icon: '/static/icons/ai.svg',
        appId: 'iris-ai',
        x: 20,
        y: 180
      },
      {
        id: 'browser',
        name: '浏览器',
        icon: '/static/icons/browser.svg',
        appId: 'browser',
        x: 20,
        y: 260
      },
      {
        id: 'webgpu-demo',
        name: 'WebGPU Demo',
        icon: '/static/icons/gpu.svg',
        appId: 'webgpu-demo',
        x: 20,
        y: 340
      },
      {
        id: 'downloader',
        name: '下载器',
        icon: '/static/icons/download.svg',
        appId: 'downloader',
        x: 20,
        y: 420
      },
      {
        id: 'settings',
        name: '设置',
        icon: '/static/icons/settings.svg',
        appId: 'settings',
        x: 20,
        y: 500
      }
    ]

    defaultIcons.forEach(icon => this.icons.push(icon))
  }

  addIcon(icon) {
    this.icons.push(icon)
  }

  removeIcon(iconId) {
    const index = this.icons.findIndex(i => i.id === iconId)
    if (index !== -1) {
      this.icons.splice(index, 1)
    }
  }

  updateIconPosition(iconId, position) {
    const icon = this.icons.find(i => i.id === iconId)
    if (icon) {
      icon.x = position.x
      icon.y = position.y
    }
  }

  setWallpaper(wallpaperPath) {
    this.wallpaper = wallpaperPath
    systemManager.setConfig('wallpaper', wallpaperPath)
  }

  setTheme(theme) {
    this.theme = theme
    systemManager.setConfig('theme', theme)
    systemManager.emit('theme:changed', theme)
  }

  showContextMenu(x, y, items) {
    this.contextMenu.visible = true
    this.contextMenu.x = x
    this.contextMenu.y = y
    this.contextMenu.items = items || this.getDefaultMenuItems()
  }

  hideContextMenu() {
    this.contextMenu.visible = false
  }

  getDefaultMenuItems() {
    return [
      { label: '刷新', action: () => location.reload() },
      { type: 'separator' },
      { label: '显示设置', action: () => this.openApp('settings') },
      { label: '个性化', action: () => this.openApp('settings') }
    ]
  }

  openApp(appId) {
    systemManager.emit('app:open', appId)
  }
}

export const desktopManager = new DesktopManager()
