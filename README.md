# IrisWebOS - 纯静态Web桌面体验站

## 项目简介

IrisWebOS是一个基于Vue 3构建的纯静态Web桌面操作系统体验站，提供完整的浏览器内桌面环境，包含窗口管理、任务栏、终端、AI助手、文件下载器、内置浏览器等核心功能。

## 核心特性

- **纯静态部署**：无需后端服务，可直接部署到任何静态托管服务
- **窗口管理系统**：支持窗口拖拽、缩放、最大化、最小化、多窗口管理
- **内置终端**：集成xterm.js，支持基础命令行操作
- **AI助手**：支持配置OpenAI兼容接口，前端直连无中转
- **虚拟文件系统**：基于IndexedDB的浏览器内文件系统
- **主题切换**：支持深色/浅色主题切换

## 技术栈

- **前端框架**：Vue 3
- **构建工具**：Vite 5
- **终端组件**：xterm.js
- **事件总线**：mitt
- **WASM运行时**：@wasmer/wasi（可选）
- **GPU加速**：WebGPU（可选）

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000 查看效果

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录

### 预览生产版本

```bash
npm run preview
```

## 部署说明

### 部署要求

1. **静态文件托管**：仅需静态文件服务器，无需Node.js、数据库等运行环境
2. **HTTPS要求**：WebGPU和WASM高级功能要求HTTPS环境（localhost除外）
3. **MIME类型配置**：确保服务器正确配置以下MIME类型：
   - `.wasm` → `application/wasm`
   - `.json` → `application/json`

### 部署到Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /var/www/iris-webos/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.wasm$ {
        types { application/wasm wasm; }
        add_header Content-Encoding gzip;
    }
}
```

### 部署到Cloudflare Pages

1. 连接GitHub仓库到Cloudflare Pages
2. 构建命令：`npm run build`
3. 输出目录：`dist`
4. 自动启用HTTPS

### 部署到OSS/CDN

1. 将 `dist` 目录所有文件上传到OSS
2. 配置静态网站托管
3. 启用HTTPS证书
4. 配置正确的MIME类型

## 项目结构

```
/
├── index.html                 # 站点入口
├── vite.config.js             # Vite配置
├── package.json               # 依赖声明
├── /public                    # 静态资源
│   ├── /static                # 壁纸、图标
│   ├── /download              # 可下载文件
│   └── /wasm                  # WASM模块
├── /src                       # 源码
│   ├── /core                  # 核心模块
│   │   ├── system.js          # 系统管理器
│   │   ├── window-manager.js  # 窗口管理器
│   │   └── desktop.js         # 桌面管理器
│   ├── /components            # UI组件
│   ├── /apps                  # 应用组件
│   ├── /fs                    # 虚拟文件系统
│   └── /webgpu                # WebGPU封装
└── /dist                      # 构建产物
```

## 核心功能使用

### 终端应用

- 支持命令：`ls`, `cd`, `pwd`, `mkdir`, `echo`, `clear`, `help`
- 基于虚拟文件系统，数据本地持久化

### AI助手

1. 打开"系统设置"应用
2. 配置AI接口地址（如：https://api.openai.com/v1/chat/completions）
3. 输入API Key
4. 选择模型（如：gpt-3.5-turbo）
5. 开始对话

### 文件下载器

- 展示可下载的静态文件列表
- 点击下载按钮直接下载文件
- 文件列表配置：`public/download/files.json`

### 内置浏览器

- 基于iframe实现
- 支持前进、后退、刷新
- 默认访问GitHub

## 浏览器兼容性

推荐使用支持WebGPU的现代浏览器：

- Chrome 113+
- Edge 113+
- Arc

不支持WebGPU的浏览器会显示友好提示，但基础功能仍可使用。

## 数据安全

- **本地存储**：所有配置、对话记录存储在localStorage和IndexedDB
- **无数据上传**：不上传任何用户数据到云端
- **API直连**：AI对话请求直接发送到用户配置的接口，无中转
- **一键清空**：系统设置提供一键清空所有数据功能

## 开发指南

### 添加新应用

1. 在 `src/apps/` 下创建应用目录
2. 创建Vue组件（如：`MyApp.vue`）
3. 在 `src/components/Window.vue` 中注册组件
4. 在 `src/core/desktop.js` 中添加桌面图标
5. 在 `src/components/Taskbar.vue` 中添加应用信息

### 自定义主题

修改 `src/App.vue` 中的CSS变量：

```css
--bg-color: #1e1e1e;
--text-color: #ffffff;
--window-bg: #2d2d2d;
--border-color: #3d3d3d;
--taskbar-bg: #252525;
--active-color: #0078d4;
```

## 许可证

MIT License

## 更新日志

### v1.0.0 (2025-05-02)

- 初始版本发布
- 实现完整的桌面环境
- 集成终端、AI助手、下载器、浏览器、设置等核心应用
- 支持窗口管理和任务栏
- 实现虚拟文件系统
- 支持主题切换
