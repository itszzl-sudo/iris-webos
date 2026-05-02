<template>
  <div class="ai-assistant-app">
    <div class="chat-container">
      <div ref="messageList" class="message-list">
        <div 
          v-for="msg in messages" 
          :key="msg.id"
          class="message"
          :class="msg.role"
        >
          <div class="message-content">{{ msg.content }}</div>
        </div>
      </div>
      
      <div class="input-area">
        <input 
          v-model="inputText"
          @keyup.enter="sendMessage"
          placeholder="输入消息..."
          class="message-input"
        />
        <button @click="sendMessage" class="send-btn">发送</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { systemManager } from '../../core/system.js'

const messages = ref([])
const inputText = ref('')
const messageList = ref(null)

const sendMessage = async () => {
  if (!inputText.value.trim()) return
  
  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: inputText.value
  }
  
  messages.value.push(userMessage)
  const userInput = inputText.value
  inputText.value = ''
  
  await nextTick()
  scrollToBottom()
  
  const aiConfig = systemManager.getConfig('ai') || {}
  
  if (!aiConfig.endpoint || !aiConfig.apiKey) {
    const aiMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '请先在设置中配置AI接口地址和API Key'
    }
    messages.value.push(aiMessage)
    await nextTick()
    scrollToBottom()
    return
  }
  
  try {
    const response = await fetch(aiConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: aiConfig.model || 'gpt-3.5-turbo',
        messages: messages.value.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    })
    
    const data = await response.json()
    
    const aiMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: data.choices[0].message.content
    }
    
    messages.value.push(aiMessage)
    await nextTick()
    scrollToBottom()
  } catch (error) {
    const errorMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: `请求失败: ${error.message}`
    }
    messages.value.push(errorMessage)
    await nextTick()
    scrollToBottom()
  }
}

const scrollToBottom = () => {
  if (messageList.value) {
    messageList.value.scrollTop = messageList.value.scrollHeight
  }
}

onMounted(() => {
  messages.value.push({
    id: Date.now(),
    role: 'assistant',
    content: '你好！我是Iris AI助手。请先在设置中配置你的AI接口地址和API Key，然后就可以开始对话了。'
  })
})
</script>

<style scoped>
.ai-assistant-app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.message {
  margin-bottom: 12px;
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--hover-color);
}

.message.user .message-content {
  background: var(--active-color);
  color: white;
}

.input-area {
  display: flex;
  gap: 8px;
  padding-top: 12px;
}

.message-input {
  flex: 1;
  padding: 8px 12px;
}

.send-btn {
  padding: 8px 20px;
  background: var(--active-color);
  color: white;
  border-radius: 4px;
}

.send-btn:hover {
  opacity: 0.9;
}
</style>
