class VirtualHttpServer {
  constructor() {
    this.servers = new Map()
    this.routes = new Map()
    this.middlewares = []
    this.requestId = 0
  }

  // 创建虚拟服务器
  createServer(port, options = {}) {
    if (this.servers.has(port)) {
      throw new Error(`端口 ${port} 已被占用`)
    }

    const server = {
      port,
      routes: new Map(),
      middlewares: [],
      listeners: {
        request: [],
        error: [],
        listening: []
      },
      status: 'closed',
      options
    }

    this.servers.set(port, server)
    
    return {
      listen: (callback) => this.listen(port, callback),
      on: (event, handler) => this.on(port, event, handler),
      use: (middleware) => this.use(port, middleware),
      get: (path, handler) => this.route(port, 'GET', path, handler),
      post: (path, handler) => this.route(port, 'POST', path, handler),
      close: () => this.close(port)
    }
  }

  // 监听端口
  listen(port, callback) {
    const server = this.servers.get(port)
    if (!server) {
      throw new Error(`服务器不存在`)
    }

    server.status = 'listening'
    console.log(`[虚拟HTTP] 服务器监听端口 ${port}`)
    
    if (callback) callback()
    
    // 触发listening事件
    server.listeners.listening.forEach(handler => handler())
  }

  // 事件监听
  on(port, event, handler) {
    const server = this.servers.get(port)
    if (!server) return

    if (server.listeners[event]) {
      server.listeners[event].push(handler)
    }
  }

  // 中间件
  use(port, middleware) {
    const server = this.servers.get(port)
    if (!server) return
    server.middlewares.push(middleware)
  }

  // 路由注册
  route(port, method, path, handler) {
    const server = this.servers.get(port)
    if (!server) return

    const key = `${method}:${path}`
    server.routes.set(key, handler)
  }

  // 处理请求
  async handleRequest(port, request) {
    const server = this.servers.get(port)
    if (!server || server.status !== 'listening') {
      return { status: 404, body: 'Server not found' }
    }

    const { method, path, headers, body } = request
    const key = `${method}:${path}`

    // 执行中间件
    for (const middleware of server.middlewares) {
      const result = await middleware(request)
      if (result) return result
    }

    // 查找路由
    const handler = server.routes.get(key) || server.routes.get(`${method}:*`)
    
    if (handler) {
      const response = await handler(request)
      return response
    }

    // 静态文件服务
    if (server.options.staticRoot) {
      return await this.serveStatic(server.options.staticRoot, path)
    }

    return { status: 404, body: 'Not Found' }
  }

  // 静态文件服务
  async serveStatic(root, path) {
    try {
      const filePath = root + path
      // 这里会集成虚拟文件系统
      return {
        status: 200,
        body: `模拟文件: ${filePath}`,
        headers: { 'Content-Type': 'text/html' }
      }
    } catch (error) {
      return { status: 404, body: 'File not found' }
    }
  }

  // 关闭服务器
  close(port) {
    const server = this.servers.get(port)
    if (server) {
      server.status = 'closed'
      console.log(`[虚拟HTTP] 服务器关闭端口 ${port}`)
    }
  }

  // 获取所有运行的服务器
  getActiveServers() {
    const active = []
    this.servers.forEach((server, port) => {
      if (server.status === 'listening') {
        active.push({ port, status: server.status })
      }
    })
    return active
  }
}

export const virtualHttp = new VirtualHttpServer()
