<template>
  <div class="app">
    <header>
      <h1>🚀 Demo Vite App</h1>
      <p class="subtitle">运行在 WebOS 虚拟服务器中</p>
    </header>

    <main>
      <section class="counter">
        <h2>计数器示例</h2>
        <p class="count">{{ count }}</p>
        <div class="buttons">
          <button @click="decrement" class="btn">-</button>
          <button @click="increment" class="btn primary">+</button>
        </div>
      </section>

      <section class="features">
        <h2>✨ 功能特性</h2>
        <ul>
          <li v-for="feature in features" :key="feature">
            {{ feature }}
          </li>
        </ul>
      </section>

      <section class="info">
        <h2>📊 运行信息</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">环境:</span>
            <span class="value">WebOS 虚拟服务器</span>
          </div>
          <div class="info-item">
            <span class="label">端口:</span>
            <span class="value">5173</span>
          </div>
          <div class="info-item">
            <span class="label">框架:</span>
            <span class="value">Vue 3 + Vite</span>
          </div>
          <div class="info-item">
            <span class="label">热更新:</span>
            <span class="value status">✓ 已启用</span>
          </div>
        </div>
      </section>
    </main>

    <footer>
      <p>由 IrisWebOS 提供支持 | 虚拟HTTP栈 + 文件监听 + 热更新</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)

const increment = () => {
  count.value++
}

const decrement = () => {
  count.value--
}

const features = ref([
  '✅ 真实Node.js环境 (WebContainer)',
  '✅ 完整的npm包管理',
  '✅ Vite开发服务器模拟',
  '✅ 文件监听与热更新',
  '✅ 虚拟端口监听',
  '✅ 内部HTTP通信',
  '✅ Monaco代码编辑器',
  '✅ 实时预览'
])
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #333;
}

header {
  text-align: center;
  margin-bottom: 40px;
}

h1 {
  font-size: 3em;
  color: #42b883;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 1.2em;
  color: #666;
}

main {
  display: grid;
  gap: 30px;
}

section {
  background: #f9f9f9;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

h2 {
  color: #42b883;
  margin-bottom: 20px;
  font-size: 1.5em;
}

.counter {
  text-align: center;
}

.count {
  font-size: 4em;
  font-weight: bold;
  color: #42b883;
  margin: 20px 0;
}

.buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.btn {
  width: 60px;
  height: 60px;
  font-size: 2em;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  background: #e0e0e0;
  transition: all 0.3s;
}

.btn:hover {
  transform: scale(1.1);
}

.btn.primary {
  background: #42b883;
  color: white;
}

ul {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

li {
  padding: 12px;
  background: white;
  border-radius: 8px;
  border-left: 4px solid #42b883;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  background: white;
  border-radius: 8px;
}

.label {
  font-weight: bold;
  color: #666;
}

.value {
  color: #42b883;
}

.value.status {
  color: #10b981;
  font-weight: bold;
}

footer {
  text-align: center;
  margin-top: 40px;
  padding: 20px;
  color: #666;
  border-top: 2px solid #e0e0e0;
}

@media (max-width: 768px) {
  ul, .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
