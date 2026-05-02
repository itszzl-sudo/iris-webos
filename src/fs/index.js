const DB_NAME = 'iris-webos-fs'
const DB_VERSION = 1
const STORE_NAME = 'files'

class VirtualFileSystem {
  constructor() {
    this.db = null
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      request.onerror = () => reject(request.error)
      
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'path' })
          store.createIndex('modifiedAt', 'modifiedAt')
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

  async transaction(mode, callback) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, mode)
      const store = tx.objectStore(STORE_NAME)
      
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      
      callback(store)
    })
  }

  async readFile(path) {
    path = this.normalizePath(path)
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(path)
      
      request.onsuccess = () => {
        if (request.result) {
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
    
    return this.transaction('readwrite', (store) => {
      const data = {
        path,
        type: 'file',
        content,
        size: content.length,
        modifiedAt: new Date().toISOString(),
        permissions: 'rw-r--r--'
      }
      store.put(data)
    })
  }

  async mkdir(path) {
    path = this.normalizePath(path)
    
    return this.transaction('readwrite', (store) => {
      const data = {
        path,
        type: 'directory',
        content: null,
        size: 0,
        modifiedAt: new Date().toISOString(),
        permissions: 'rwxr-xr-x'
      }
      store.put(data)
    })
  }

  async readdir(path) {
    path = this.normalizePath(path)
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
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
    
    return this.transaction('readwrite', (store) => {
      store.delete(path)
    })
  }

  async stat(path) {
    path = this.normalizePath(path)
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
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
      const tx = this.db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(path)
      
      request.onsuccess = () => resolve(!!request.result)
      request.onerror = () => resolve(false)
    })
  }

  async initDefaultStructure() {
    const dirs = ['/', '/home', '/home/user', '/tmp', '/var']
    
    for (const dir of dirs) {
      if (!(await this.exists(dir))) {
        await this.mkdir(dir)
      }
    }
  }
}

export const vfs = new VirtualFileSystem()
