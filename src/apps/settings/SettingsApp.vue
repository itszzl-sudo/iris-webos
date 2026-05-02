<template>
  <div class="settings-app">
    <div class="settings-container">
      <div class="settings-section">
        <h3>AI配置</h3>
        <div class="form-group">
          <label>接口地址:</label>
          <input 
            v-model="aiConfig.endpoint"
            placeholder="https://api.openai.com/v1/chat/completions"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>API Key:</label>
          <input 
            v-model="aiConfig.apiKey"
            type="password"
            placeholder="sk-..."
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>模型:</label>
          <input 
            v-model="aiConfig.model"
            placeholder="gpt-3.5-turbo"
            class="form-input"
          />
        </div>
        <button @click="saveAIConfig" class="save-btn">保存AI配置</button>
      </div>
      
      <div class="settings-section">
        <h3>主题设置</h3>
        <div class="form-group">
          <label>当前主题: {{ theme }}</label>
          <div class="theme-buttons">
            <button @click="setTheme('light')" class="theme-btn">浅色</button>
            <button @click="setTheme('dark')" class="theme-btn">深色</button>
          </div>
        </div>
      </div>
      
      <div class="settings-section">
        <h3>数据管理</h3>
        <button @click="clearCache" class="clear-btn">清空缓存</button>
        <button @click="clearAllData" class="clear-all-btn">清空所有数据</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { systemManager } from '../../core/system.js'
import { desktopManager } from '../../core/desktop.js'

const aiConfig = ref({
  endpoint: '',
  apiKey: '',
  model: 'gpt-3.5-turbo'
})

const theme = ref('dark')

onMounted(() => {
  const savedAIConfig = systemManager.getConfig('ai')
  if (savedAIConfig) {
    aiConfig.value = { ...aiConfig.value, ...savedAIConfig }
  }
  
  theme.value = desktopManager.theme
})

const saveAIConfig = () => {
  systemManager.setConfig('ai', { ...aiConfig.value })
  alert('AI配置已保存')
}

const setTheme = (newTheme) => {
  desktopManager.setTheme(newTheme)
  theme.value = newTheme
}

const clearCache = () => {
  if (confirm('确定要清空缓存吗？')) {
    localStorage.clear()
    alert('缓存已清空')
  }
}

const clearAllData = () => {
  if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    systemManager.clearAllData()
    alert('所有数据已清空，请刷新页面')
    location.reload()
  }
}
</script>

<style scoped>
.settings-app {
  width: 100%;
  height: 100%;
  padding: 16px;
  overflow: auto;
}

.settings-container {
  max-width: 600px;
  margin: 0 auto;
}

.settings-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.settings-section h3 {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
}

.save-btn, .clear-btn, .clear-all-btn, .theme-btn {
  padding: 8px 16px;
  margin-right: 8px;
  border-radius: 4px;
}

.save-btn, .theme-btn {
  background: var(--active-color);
  color: white;
}

.clear-btn {
  background: #f0ad4e;
  color: white;
}

.clear-all-btn {
  background: #d9534f;
  color: white;
}

.theme-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
