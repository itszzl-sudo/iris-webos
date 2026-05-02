<template>
  <div
    v-if="window.visible"
    class="window"
    :style="windowStyle"
    @mousedown="handleFocus"
  >
    <div 
      class="window-header"
      @mousedown="handleDragStart"
    >
      <span class="window-title">{{ window.title }}</span>
      <div class="window-controls">
        <button class="control-btn minimize" @click="handleMinimize">─</button>
        <button class="control-btn maximize" @click="handleMaximize">□</button>
        <button class="control-btn close" @click="handleClose">✕</button>
      </div>
    </div>
    
    <div class="window-content">
      <component :is="appComponent" :window-id="window.id" />
    </div>
    
    <div 
      v-if="window.resizable && window.state !== 'maximized'"
      class="resize-handle"
      @mousedown="handleResizeStart"
    ></div>
  </div>
</template>

<script setup>
import { computed, shallowRef } from 'vue'
import { windowManager } from '../core/window-manager.js'
import TerminalApp from '../apps/terminal/TerminalApp.vue'
import AIAssistantApp from '../apps/iris-ai/AIAssistantApp.vue'
import DownloaderApp from '../apps/downloader/DownloaderApp.vue'
import BrowserApp from '../apps/browser/BrowserApp.vue'
import SettingsApp from '../apps/settings/SettingsApp.vue'
import EditorApp from '../apps/editor/EditorApp.vue'
import WebGPUApp from '../apps/webgpu-demo/WebGPUApp.vue'

const props = defineProps({
  window: Object
})

const appComponents = {
  'terminal': TerminalApp,
  'iris-ai': AIAssistantApp,
  'downloader': DownloaderApp,
  'browser': BrowserApp,
  'settings': SettingsApp,
  'editor': EditorApp,
  'webgpu-demo': WebGPUApp
}

const appComponent = shallowRef(appComponents[props.window.appId] || null)

const windowStyle = computed(() => ({
  left: `${props.window.position.x}px`,
  top: `${props.window.position.y}px`,
  width: `${props.window.size.width}px`,
  height: `${props.window.size.height}px`,
  zIndex: props.window.zIndex,
  pointerEvents: 'auto'
}))

let isDragging = false
let dragStartX = 0
let dragStartY = 0
let windowStartX = 0
let windowStartY = 0

const handleDragStart = (e) => {
  if (!props.window.draggable || props.window.state === 'maximized') return
  
  isDragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  windowStartX = props.window.position.x
  windowStartY = props.window.position.y
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', handleDragEnd)
}

const handleDrag = (e) => {
  if (!isDragging) return
  
  const deltaX = e.clientX - dragStartX
  const deltaY = e.clientY - dragStartY
  
  const newX = windowStartX + deltaX
  const newY = windowStartY + deltaY
  
  windowManager.updateWindowPosition(props.window.id, { x: newX, y: newY })
}

const handleDragEnd = () => {
  isDragging = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', handleDragEnd)
}

let isResizing = false
let resizeStartX = 0
let resizeStartY = 0
let windowStartWidth = 0
let windowStartHeight = 0

const handleResizeStart = (e) => {
  if (props.window.state === 'maximized') return
  
  isResizing = true
  resizeStartX = e.clientX
  resizeStartY = e.clientY
  windowStartWidth = props.window.size.width
  windowStartHeight = props.window.size.height
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', handleResizeEnd)
}

const handleResize = (e) => {
  if (!isResizing) return
  
  const deltaX = e.clientX - resizeStartX
  const deltaY = e.clientY - resizeStartY
  
  const newWidth = windowStartWidth + deltaX
  const newHeight = windowStartHeight + deltaY
  
  windowManager.updateWindowSize(props.window.id, { width: newWidth, height: newHeight })
}

const handleResizeEnd = () => {
  isResizing = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', handleResizeEnd)
}

const handleFocus = () => {
  windowManager.focusWindow(props.window.id)
}

const handleMinimize = () => {
  windowManager.minimizeWindow(props.window.id)
}

const handleMaximize = () => {
  windowManager.maximizeWindow(props.window.id)
}

const handleClose = () => {
  windowManager.closeWindow(props.window.id)
}
</script>

<style scoped>
.window {
  position: absolute;
  background: var(--window-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.window-header {
  height: 32px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  cursor: move;
  user-select: none;
}

.window-title {
  font-size: 13px;
  font-weight: 500;
}

.window-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  width: 28px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  border-radius: 2px;
  transition: background 0.2s;
}

.control-btn.close:hover {
  background: #e81123;
  color: white;
}

.window-content {
  flex: 1;
  overflow: auto;
  position: relative;
}

.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, var(--border-color) 50%);
}
</style>
