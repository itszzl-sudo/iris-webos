# 🚀 在WebOS中运行Vite完整指南

## 快速开始

### 步骤1：创建Vite项目

打开终端，执行：

```bash
# 创建项目
npm create vite@latest my-vite-app -- --template vue

# 进入项目目录
cd my-vite-app

# 安装依赖
npm install
```

### 步骤2：启动虚拟开发服务器

```bash
# 启动Vite开发服务器
dev-server vite 5173
```

输出：
```
创建Vite开发服务器在端口 5173...
✓ Vite服务器已启动
访问地址: http://localhost:5173
或在内置浏览器输入: :5173
```

### 步骤3：在浏览器中查看

打开桌面上的"浏览器"应用，输入：
```
:5173
```

或
```
http://localhost:5173
```

### 步骤4：编辑代码并实时预览

1. 打开桌面上的"代码编辑器"
2. 打开文件 `my-vite-app/src/App.vue`
3. 编辑代码
4. 保存（Ctrl+S）
5. 浏览器自动刷新

## 完整示例项目

### 创建项目结构

```bash
# 创建目录
mkdir my-project
cd my-project

# 创建package.json
cat > package.json
```

输入：
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "vue": "^3.3.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

### 创建HTML文件

```bash
cat > index.html
```

输入：
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Vite App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### 创建Vue应用

```bash
mkdir src
cat > src/main.js
```

输入：
```javascript
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

```bash
cat > src/App.vue
```

输入：
```vue
<template>
  <div class="app">
    <h1>🚀 My Vite App in WebOS</h1>
    <p>计数器: {{ count }}</p>
    <button @click="count++">增加</button>
    <button @click="count--">减少</button>
    
    <div class="info">
      <p>运行环境: WebOS虚拟服务器</p>
      <p>端口: 5173</p>
      <p>热更新: 已启用</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<style scoped>
.app {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #42b883;
}

button {
  padding: 10px 20px;
  margin: 5px;
  font-size: 16px;
  cursor: pointer;
}

.info {
  margin-top: 20px;
  padding: 15px;
  background: #f0f0f0;
  border-radius: 8px;
}
</style>
```

### 安装并运行

```bash
npm install
dev-server vite 5173
```

## 命令参考

### dev-server命令

```bash
# 显示帮助
dev-server

# 列出所有运行的服务器
dev-server list

# 创建Vite服务器
dev-server vite 5173
dev-server vite 3000

# 停止服务器
dev-server stop 5173
```

### npm命令

```bash
npm init                    # 初始化项目
npm install                 # 安装依赖
npm install <package>       # 安装包
npm run <script>           # 运行脚本
npm list                   # 列出已安装包
```

### 文件系统命令

```bash
ls              # 列出文件
cd <dir>        # 切换目录
pwd             # 显示当前目录
cat <file>      # 查看文件
mkdir <dir>     # 创建目录
```

## 工作流程

```
创建项目 → 编辑代码 → 启动服务器 → 浏览器预览 → 热更新
    ↓           ↓           ↓            ↓          ↓
  npm create  Monaco     dev-server   :5173     自动刷新
```

## 提示

1. **端口冲突**: 使用 `dev-server list` 查看已使用的端口
2. **文件监听**: 编辑器保存后自动触发热更新
3. **浏览器刷新**: 虚拟服务器支持自动刷新
4. **多项目**: 可同时运行多个服务器在不同端口

## 故障排除

**服务器无法启动**
```bash
# 检查端口是否被占用
dev-server list

# 使用不同端口
dev-server vite 3000
```

**页面显示404**
```bash
# 确认项目结构
ls
cat index.html

# 确认在正确的目录
pwd
```

**依赖安装失败**
```bash
# 检查网络连接
# 查看npm日志
npm install --verbose
```
