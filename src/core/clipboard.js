class ClipboardManager {
  constructor() {
    this.eventBus = null
    this.fileClipboard = null
  }

  setEventBus(bus) {
    this.eventBus = bus
  }

  async copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      this.eventBus?.emit('clipboard:copy', { text, success: true })
      return true
    } catch (error) {
      console.error('Copy failed:', error)
      this.eventBus?.emit('clipboard:copy', { text: '', success: false, error })
      
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        return true
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError)
        return false
      }
    }
  }

  async paste() {
    try {
      const text = await navigator.clipboard.readText()
      this.eventBus?.emit('clipboard:paste', { text, success: true })
      return text
    } catch (error) {
      console.error('Paste failed:', error)
      this.eventBus?.emit('clipboard:paste', { text: '', success: false, error })
      return ''
    }
  }

  copyFile(fileData) {
    this.fileClipboard = {
      type: 'file',
      data: fileData,
      timestamp: Date.now()
    }
    this.eventBus?.emit('clipboard:copy-file', { 
      fileName: fileData.name, 
      success: true 
    })
    return true
  }

  pasteFile() {
    if (this.fileClipboard && this.fileClipboard.type === 'file') {
      this.eventBus?.emit('clipboard:paste-file', { 
        fileData: this.fileClipboard.data,
        success: true 
      })
      return this.fileClipboard.data
    }
    return null
  }

  hasFile() {
    return this.fileClipboard && this.fileClipboard.type === 'file'
  }

  getFileInfo() {
    if (this.hasFile()) {
      return {
        name: this.fileClipboard.data.name,
        path: this.fileClipboard.data.path,
        size: this.fileClipboard.data.size,
        type: this.fileClipboard.data.type
      }
    }
    return null
  }

  clearFileClipboard() {
    this.fileClipboard = null
  }

  async hasText() {
    try {
      const permission = await navigator.permissions.query({ name: 'clipboard-read' })
      if (permission.state === 'granted' || permission.state === 'prompt') {
        const text = await navigator.clipboard.readText()
        return text.length > 0
      }
    } catch (error) {
      console.error('Clipboard check failed:', error)
    }
    return false
  }

  showUnsupportedMessage() {
    if (this.eventBus) {
      this.eventBus.emit('clipboard:unsupported', {
        message: '暂不支持粘贴文件\n\n当前仅支持文本的复制和粘贴'
      })
    }
  }
}

export const clipboardManager = new ClipboardManager()
