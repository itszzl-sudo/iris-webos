import { reactive } from 'vue'
import { systemManager } from './system.js'

class EnhancedVirtualFS {
  constructor() {
    this.db = null
    this.watchers = new Map()
    this.fileCache = reactive(new Map())
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('iris-webos-enhanced-fs', 2)
      
      request.onerror = () => reject(request.error)
      
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        if (!db.objectStoreNames.contains('files')) {
          const store = db.createObjectStore('files', { keyPath: 'path' })
          store.createIndex('modifiedAt', 'modifiedAt')
          store.createIndex('type', 'type')
        }
        
        if (!db.objectStoreNames.contains('watchers')) {
          db.createObjectStore('watchers', { keyPath: 'id' })
        }
      }
    })
  }

  normalizePath(path) {
    path = path.replace(/\/+/g, '/')
    const parts = path.split('/').filter(p => p && p !== '.')
    const result = []
    
    for (const part of parts) {
      if (part === '..') {
        result.pop()
      } else {
        result.push(part)
      }
    }
    
    return '/' + result.join('/')
  }

  // 文件监听（热更新支持）
  watch(path, callback) {
    const watchId = Date.now() + '-' + Math.random()
    
    const watcher = {
      id: watchId,
      path,
      callback,
      active: true
    }
    
    this.watchers.set(watchId, watcher)
    
    console.log(`[文件监听] 开始监听: ${path}`)
    
    return {
      id: watchId,
      close: () => {
        watcher.active = false
        this.watchers.delete(watchId)
        console.log(`[文件监听] 停止监听: ${path}`)
      }
    }
  }

  // 触发文件变更事件
  triggerWatchers(path, event) {
    this.watchers.forEach(watcher => {
      if (!watcher.active) return
      
      // 检查路径匹配
      if (watcher.path === path || 
          path.startsWith(watcher.path) ||
          watcher.path === '*') {
        watcher.callback({ path, event, timestamp: Date.now() })
      }
    })
  }

  async readFile(path) {
    path = this.normalizePath(path)
    
    // 检查缓存
    if (this.fileCache.has(path)) {
      return this.fileCache.get(path)
    }
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readonly')
      const store = tx.objectStore('files')
      const request = store.get(path)
      
      request.onsuccess = () => {
        if (request.result) {
          // 更新缓存
          this.fileCache.set(path, request.result.content)
          resolve(request.result.content)
        } else {
          reject(new Error(`File not found: ${path}`))
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async writeFile(path, content) {
    path = this.normalizePath(path)
    
    const data = {
      path,
      type: 'file',
      content,
      size: content.length,
      modifiedAt: new Date().toISOString(),
      permissions: 'rw-r--r--'
    }
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readwrite')
      const store = tx.objectStore('files')
      const request = store.put(data)
      
      request.onsuccess = () => {
        // 更新缓存
        this.fileCache.set(path, content)
        // 触发监听器
        this.triggerWatchers(path, 'change')
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  async mkdir(path) {
    path = this.normalizePath(path)
    
    const data = {
      path,
      type: 'directory',
      content: null,
      size: 0,
      modifiedAt: new Date().toISOString(),
      permissions: 'rwxr-xr-x'
    }
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readreadwrite')
      const store = tx.objectStore('files')
      const request = store.put(data)
      
      request.onsuccess = () => {
        this.triggerWatchers(path, 'mkdir')
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  async readdir(path) {
    path = this.normalizePath(path)
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readonly')
      const store = tx.objectStore('files')
      const request = store.getAll()
      
      request.onsuccess = () => {
        const allFiles = request.result || []
        const files = allFiles.filter(f => {
          const parentPath = f.path.substring(0, f.path.lastIndexOf('/')) || '/'
          return parentPath === path && f.path !== path
        })
        resolve(files.map(f => ({
          name: f.path.substring(f.path.lastIndexOf('/') + 1),
          type: f.type,
          size: f.size,
          modifiedAt: f.modifiedAt
        })))
      }
      request.onerror = () => reject(request.error)
    })
  }

  async unlink(path) {
    path = this.normalizePath(path)
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readwrite')
      const store = tx.objectStore('files')
      const request = store.delete(path)
      
      request.onsuccess = () => {
        // 清除缓存
        this.fileCache.delete(path)
        // 触发监听器
        this.triggerWatchers(path, 'unlink')
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  async stat(path) {
    path = this.normalizePath(path)
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readonly')
      const store = tx.objectStore('files')
      const request = store.get(path)
      
      request.onsuccess = () => {
        if (request.result) {
          resolve({
            type: request.result.type,
            size: request.result.size,
            modifiedAt: request.result.modifiedAt,
            permissions: request.result.permissions
          })
        } else {
          reject(new Error(`File not found: ${path}`))
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async exists(path) {
    path = this.normalizePath(path)
    
    return new Promise((resolve) => {
      const tx = this.db.transaction('files', 'readonly')
      const store = tx.objectStore('files')
      const request = store.get(path)
      
      request.onsuccess = () => resolve(!!request.result)
      request.onerror = () => resolve(false)
    })
  }

  // 批量写入（用于项目创建）
  async writeBatch(files) {
    const promises = Object.entries(files).map(([path, content]) => 
      this.writeFile(path, content)
    )
    await Promise.all(promises)
  }

  // 清除缓存
  clearCache() {
    this.fileCache.clear()
  }

  // 导出文件系统
  async exportFS() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readonly')
      const store = tx.objectStore('files')
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async initDefaultStructure() {
    const dirs = ['/', '/home', '/home/user', '/tmp', '/var', '/projects']
    
    for (const dir of dirs) {
      if (!(await this.exists(dir))) {
        await this.mkdir(dir)
      }
    }
  }
}

export const enhancedFS = new EnhancedVirtualFS()
