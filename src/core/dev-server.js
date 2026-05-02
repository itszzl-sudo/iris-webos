import { virtualHttp } from './http-server.js'
import { enhancedFS } from './enhanced-fs.js'

class DevServerManager {
  constructor() {
    this.servers = new Map()
    this.activePorts = new Set()
  }

  // 创建Vite开发服务器
  async createViteServer(projectPath, port = 5173) {
    if (this.activePorts.has(port)) {
      throw new Error(`端口 ${port} 已被占用`)
    }

    const server = virtualHttp.createServer(port, {
      staticRoot: projectPath,
      type: 'vite'
    })

    // 模拟Vite的热更新
    const hmrClients = new Set()
    
    // HMR端点
    server.get('/__vite_hmr', (req) => {
      return {
        status: 200,
        body: this.createHMRScript(),
        headers: { 'Content-Type': 'application/javascript' }
      }
    })

    // 主要路由
    server.get('/', async (req) => {
      const indexPath = projectPath + '/index.html'
      try {
        const content = await enhancedFS.readFile(indexPath)
        return {
          status: 200,
          body: this.injectHMR(content),
          headers: { 'Content-Type': 'text/html' }
        }
      } catch {
        return {
          status: 404,
          body: 'index.html not found'
        }
      }
    })

    // 静态资源路由
    server.get('*', async (req) => {
      const filePath = projectPath + req.path
      try {
        const content = await enhancedFS.readFile(filePath)
        const ext = filePath.split('.').pop()
        const mimeTypes = {
          'js': 'application/javascript',
          'css': 'text/css',
          'html': 'text/html',
          'json': 'application/json',
          'vue': 'text/plain'
        }
        
        return {
          status: 200,
          body: content,
          headers: { 'Content-Type': mimeTypes[ext] || 'text/plain' }
        }
      } catch {
        return { status: 404, body: 'Not Found' }
      }
    })

    // 文件监听（热更新）
    const watcher = enhancedFS.watch(projectPath, async (event) => {
      console.log(`[Vite HMR] 文件变更: ${event.path}`)
      
      // 通知所有HMR客户端
      hmrClients.forEach(client => {
        client({
          type: 'update',
          path: event.path,
          timestamp: event.timestamp
        })
      })
    })

    this.servers.set(port, {
      server,
      watcher,
      hmrClients,
      projectPath,
      type: 'vite'
    })
    this.activePorts.add(port)

    server.listen(() => {
      console.log(`[Vite] 开发服务器运行在虚拟端口 ${port}`)
      console.log(`[Vite] 项目路径: ${projectPath}`)
    })

    return {
      port,
      url: `http://localhost:${port}`,
      hmr: {
        connect: (callback) => hmrClients.add(callback),
        disconnect: (callback) => hmrClients.delete(callback)
      },
      close: () => this.closeServer(port)
    }
  }

  // 创建Express风格的服务器
  async createExpressServer(port = 3000) {
    const server = virtualHttp.createServer(port, {
      type: 'express'
    })

    this.servers.set(port, { server, type: 'express' })
    this.activePorts.add(port)

    const app = {
      get: (path, handler) => server.get(path, handler),
      post: (path, handler) => server.post(path, handler),
      use: (middleware) => server.use(middleware),
      listen: (callback) => server.listen(callback),
      close: () => this.closeServer(port)
    }

    return app
  }

  // 注入HMR脚本
  injectHMR(html) {
    const hmrScript = `
<script>
  const ws = new WebSocket('ws://localhost:__PORT__/__vite_hmr');
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.type === 'update') {
      console.log('[HMR] 更新:', data.path);
      location.reload();
    }
  };
</script>`
    return html.replace('</head>', hmrScript + '</head>')
  }

  // HMR客户端脚本
  createHMRScript() {
    return `
const ws = new WebSocket('ws://localhost:__PORT__/__vite_hmr');
ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  console.log('[HMR]', data);
};
`
  }

  // 关闭服务器
  closeServer(port) {
    const serverInfo = this.servers.get(port)
    if (serverInfo) {
      if (serverInfo.watcher) {
        serverInfo.watcher.close()
      }
      serverInfo.server.close()
      this.servers.delete(port)
      this.activePorts.delete(port)
      console.log(`[开发服务器] 关闭端口 ${port}`)
    }
  }

  // 获取所有运行的服务器
  getServers() {
    return Array.from(this.servers.entries()).map(([port, info]) => ({
      port,
      type: info.type,
      projectPath: info.projectPath,
      status: 'running'
    }))
  }

  // 请求路由（内部通信）
  async routeRequest(port, request) {
    return await virtualHttp.handleRequest(port, request)
  }
}

export const devServerManager = new DevServerManager()
