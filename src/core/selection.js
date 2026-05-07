class SelectionManager {
  constructor() {
    this.eventBus = null
  }

  setEventBus(bus) {
    this.eventBus = bus
  }

  getSelection() {
    const selection = window.getSelection()
    return selection ? selection.toString() : ''
  }

  hasSelection() {
    return this.getSelection().length > 0
  }

  clearSelection() {
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
    }
  }

  selectAll(element) {
    if (!element) {
      element = document.body
    }

    const selection = window.getSelection()
    const range = document.createRange()

    if (element.select) {
      element.select()
    } else {
      range.selectNodeContents(element)
      selection.removeAllRanges()
      selection.addRange(range)
    }

    this.eventBus?.emit('selection:select-all', { element })
    return true
  }

  getSelectionInfo() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return null
    }

    const range = selection.getRangeAt(0)
    const text = selection.toString()

    return {
      text,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      startContainer: range.startContainer,
      endContainer: range.endContainer
    }
  }

  isEditableElement(element) {
    if (!element) return false
    const tagName = element.tagName?.toLowerCase()
    return tagName === 'input' || 
           tagName === 'textarea' || 
           element.isContentEditable
  }

  getEditableElement() {
    const activeElement = document.activeElement
    if (this.isEditableElement(activeElement)) {
      return activeElement
    }

    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      let container = selection.getRangeAt(0).commonAncestorContainer
      while (container && container !== document) {
        if (container.nodeType === Node.ELEMENT_NODE && 
            this.isEditableElement(container)) {
          return container
        }
        container = container.parentNode
      }
    }

    return null
  }
}

export const selectionManager = new SelectionManager()
