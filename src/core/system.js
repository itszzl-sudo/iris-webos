import { reactive } from 'vue'
import mitt from 'mitt'

const STORAGE_KEYS = {
  SYSTEM_CONFIG: 'iris-webos:config',
  AI_CONFIG: 'iris-webos:ai-config',
  WINDOW_STATES: 'iris-webos:window-states'
}

class SystemManager {
  constructor() {
    this.eventBus = mitt()
    this.config = reactive({})
    this.loadConfig()
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SYSTEM_CONFIG)
      if (saved) {
        const data = JSON.parse(saved)
        Object.assign(this.config, data)
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEYS.SYSTEM_CONFIG, JSON.stringify(this.config))
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  getConfig(key) {
    return this.config[key]
  }

  setConfig(key, value) {
    this.config[key] = value
    this.saveConfig()
    this.eventBus.emit('config:updated', { key, value })
  }

  clearConfig() {
    this.config = reactive({})
    localStorage.removeItem(STORAGE_KEYS.SYSTEM_CONFIG)
  }

  clearAllData() {
    localStorage.clear()
    indexedDB.databases().then(dbs => {
      dbs.forEach(db => {
        if (db.name && db.name.startsWith('iris-webos')) {
          indexedDB.deleteDatabase(db.name)
        }
      })
    })
    this.config = reactive({})
  }

  on(event, handler) {
    this.eventBus.on(event, handler)
  }

  off(event, handler) {
    this.eventBus.off(event, handler)
  }

  emit(event, data) {
    this.eventBus.emit(event, data)
  }
}

export const systemManager = new SystemManager()
export { STORAGE_KEYS }
