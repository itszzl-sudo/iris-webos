import { WebContainer } from '@webcontainer/api'
import mitt from 'mitt'

const STORAGE_KEY = 'iris-webos:webcontainer-state'

class WebContainerManager {
  constructor() {
    this.container = null
    this.initialized = false
    this.eventBus = mitt()
    this.initStatus = 'idle' // idle, initializing, ready, error
    this.initProgress = {
      step: 0,
      total: 3,
      message: '等待初始化...'
    }
    this.loadPersistedState()
  }

  loadPersistedState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const state = JSON.parse(saved)
        if (state.wasInitialized) {
          this.initStatus = 'idle'
          this.initProgress = {
            step: 0,
            total: 3,
            message: '重新初始化中...'
          }
        }
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error)
    }
  }

  savePersistedState() {
    try {
      const state = {
        wasInitialized: this.initialized,
        timestamp: Date.now()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save persisted state:', error)
    }
  }

  getStatus() {
    return {
      initialized: this.initialized,
      status: this.initStatus,
      progress: this.initProgress
    }
  }

  on(event, handler) {
    this.eventBus.on(event, handler)
  }

  off(event, handler) {
    this.eventBus.off(event, handler)
  }

  updateProgress(step, message) {
    this.initProgress = { step, total: 3, message }
    this.eventBus.emit('progress', this.initProgress)
  }

  async init() {
    if (this.initialized) {
      return true
    }

    if (this.initStatus === 'initializing') {
      return new Promise((resolve) => {
        const handler = (status) => {
          if (status === 'ready') {
            this.eventBus.off('status-change', handler)
            resolve(true)
          } else if (status === 'error') {
            this.eventBus.off('status-change', handler)
            resolve(false)
          }
        }
        this.eventBus.on('status-change', handler)
      })
    }

    this.initStatus = 'initializing'
    this.updateProgress(1, '加载 WASM 运行时...')
    this.eventBus.emit('status-change', this.initStatus)

    try {
      this.updateProgress(2, '初始化 Node.js 环境...')
      this.container = await WebContainer.boot()
      
      this.updateProgress(3, '准备就绪')
      this.initialized = true
      this.initStatus = 'ready'
      this.savePersistedState()
      this.eventBus.emit('status-change', this.initStatus)
      console.log('WebContainer initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize WebContainer:', error)
      this.initStatus = 'error'
      
      let errorMessage = error.message
      if (error.message && error.message.includes('only once')) {
        errorMessage = 'WebContainer 只能初始化一次，请刷新页面重试'
      }
      
      this.initProgress.message = `初始化失败: ${errorMessage}`
      this.eventBus.emit('status-change', this.initStatus)
      return false
    }
  }

  async mount(files) {
    if (!this.container) {
      throw new Error('WebContainer not initialized')
    }
    
    await this.container.mount(files)
  }

  async runCommand(command, args = []) {
    if (!this.container) {
      throw new Error('WebContainer not initialized')
    }

    const process = await this.container.spawn(command, args)
    
    // 返回一个包装对象，确保stdout和stderr存在
    return {
      stdout: process.stdout,
      stderr: process.stderr,
      exit: process.exit
    }
  }

  async runNpm(args = []) {
    return await this.runCommand('npm', args)
  }

  async runNpx(args = []) {
    return await this.runCommand('npx', args)
  }

  async runNode(args = []) {
    return await this.runCommand('node', args)
  }

  onOutput(callback) {
    if (!this.container) {
      throw new Error('WebContainer not initialized')
    }

    this.container.on('stdout', callback)
    this.container.on('stderr', callback)
  }

  async readFile(path) {
    if (!this.container) {
      throw new Error('WebContainer not initialized')
    }

    const file = await this.container.fs.readFile(path, 'utf-8')
    return file
  }

  async writeFile(path, content) {
    if (!this.container) {
      throw new Error('WebContainer not initialized')
    }

    await this.container.fs.writeFile(path, content)
  }

  async mkdir(path) {
    if (!this.container) {
      throw new Error('WebContainer not initialized')
    }

    await this.container.fs.mkdir(path, { recursive: true })
  }

  async readdir(path) {
    if (!this.container) {
      throw new Error('WebContainer not initialized')
    }

    const files = await this.container.fs.readdir(path, { withFileTypes: true })
    return files
  }

  async exists(path) {
    try {
      await this.container.fs.stat(path)
      return true
    } catch {
      return false
    }
  }

  getContainer() {
    return this.container
  }

  isInitialized() {
    return this.initialized
  }
}

export const webContainerManager = new WebContainerManager()
