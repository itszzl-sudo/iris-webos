<template>
  <div class="downloader-app">
    <div class="file-list">
      <div class="file-header">
        <span class="col-name">文件名</span>
        <span class="col-size">大小</span>
        <span class="col-date">更新时间</span>
        <span class="col-action">操作</span>
      </div>
      
      <div 
        v-for="file in files" 
        :key="file.name"
        class="file-item"
      >
        <span class="col-name">{{ file.name }}</span>
        <span class="col-size">{{ file.size }} {{ file.unit }}</span>
        <span class="col-date">{{ file.updatedAt }}</span>
        <span class="col-action">
          <button @click="downloadFile(file)" class="download-btn">下载</button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const files = ref([
  {
    name: 'iris-wasm-llm.wasm',
    version: 'v1.0.0',
    size: 15,
    unit: 'MB',
    updatedAt: '2025-05-01',
    path: '/wasm/iris-wasm-llm.wasm',
    type: 'wasm'
  },
  {
    name: 'config-templates.zip',
    version: 'v1.0.0',
    size: 2,
    unit: 'KB',
    updatedAt: '2025-05-01',
    path: '/download/config-templates.zip',
    type: 'zip'
  },
  {
    name: 'iris-source.tar.gz',
    version: 'v1.0.0',
    size: 8,
    unit: 'MB',
    updatedAt: '2025-05-01',
    path: '/download/iris-source.tar.gz',
    type: 'tar.gz'
  }
])

const downloadFile = (file) => {
  const link = document.createElement('a')
  link.href = file.path
  link.download = file.name
  link.click()
}

onMounted(async () => {
  try {
    const response = await fetch('/download/files.json')
    if (response.ok) {
      const data = await response.json()
      if (data.files) {
        files.value = data.files
      }
    }
  } catch (error) {
    console.error('Failed to load file list:', error)
  }
})
</script>

<style scoped>
.downloader-app {
  width: 100%;
  height: 100%;
  padding: 16px;
  overflow: auto;
}

.file-list {
  width: 100%;
}

.file-header, .file-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 12px 8px;
  align-items: center;
}

.file-header {
  background: var(--hover-color);
  font-weight: 600;
  border-radius: 4px;
}

.file-item {
  border-bottom: 1px solid var(--border-color);
}

.file-item:hover {
  background: var(--hover-color);
}

.col-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.download-btn {
  padding: 4px 12px;
  background: var(--active-color);
  color: white;
  border-radius: 4px;
}

.download-btn:hover {
  opacity: 0.9;
}
</style>
