class WebGPUManager {
  constructor() {
    this.device = null
    this.adapter = null
    this.supported = false
    this.contexts = new Map()
  }

  async init() {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported')
      this.supported = false
      return false
    }

    try {
      this.adapter = await navigator.gpu.requestAdapter()
      
      if (!this.adapter) {
        console.warn('WebGPU adapter not available')
        this.supported = false
        return false
      }

      this.device = await this.adapter.requestDevice()
      this.supported = true
      
      console.log('WebGPU initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize WebGPU:', error)
      this.supported = false
      return false
    }
  }

  isSupported() {
    return this.supported
  }

  getDevice() {
    return this.device
  }

  createContext(canvas, options = {}) {
    if (!this.device || !canvas) return null
    
    const context = canvas.getContext('webgpu')
    if (!context) {
      console.error('Failed to get WebGPU context')
      return null
    }
    
    const format = navigator.gpu.getPreferredCanvasFormat()
    const devicePixelRatio = window.devicePixelRatio || 1
    
    const width = options.width || canvas.clientWidth
    const height = options.height || canvas.clientHeight
    
    context.configure({
      device: this.device,
      format: format,
      alphaMode: 'premultiplied',
      width: Math.floor(width * devicePixelRatio),
      height: Math.floor(height * devicePixelRatio)
    })
    
    const contextId = `context-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.contexts.set(contextId, {
      context,
      canvas,
      format,
      width,
      height,
      devicePixelRatio
    })
    
    return {
      id: contextId,
      context,
      format,
      width,
      height
    }
  }

  resizeContext(contextId, width, height) {
    const ctx = this.contexts.get(contextId)
    if (!ctx) return
    
    const { context, canvas, devicePixelRatio } = ctx
    
    context.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied',
      width: Math.floor(width * devicePixelRatio),
      height: Math.floor(height * devicePixelRatio)
    })
    
    ctx.width = width
    ctx.height = height
    
    if (canvas) {
      canvas.width = Math.floor(width * devicePixelRatio)
      canvas.height = Math.floor(height * devicePixelRatio)
    }
  }

  getCurrentTexture(contextId) {
    const ctx = this.contexts.get(contextId)
    if (!ctx) return null
    
    return ctx.context.getCurrentTexture()
  }

  destroyContext(contextId) {
    this.contexts.delete(contextId)
  }

  createBuffer(descriptor) {
    if (!this.device) return null
    
    return this.device.createBuffer(descriptor)
  }

  createTexture(descriptor) {
    if (!this.device) return null
    
    return this.device.createTexture(descriptor)
  }

  createComputePipeline(descriptor) {
    if (!this.device) return null
    
    return this.device.createComputePipeline(descriptor)
  }

  createRenderPipeline(descriptor) {
    if (!this.device) return null
    
    return this.device.createRenderPipeline(descriptor)
  }

  createShaderModule(code) {
    if (!this.device) return null
    
    return this.device.createShaderModule({ code })
  }

  createBindGroup(descriptor) {
    if (!this.device) return null
    
    return this.device.createBindGroup(descriptor)
  }

  createBindGroupLayout(descriptor) {
    if (!this.device) return null
    
    return this.device.createBindGroupLayout(descriptor)
  }

  createSampler(descriptor) {
    if (!this.device) return null
    
    return this.device.createSampler(descriptor)
  }

  executeCompute(pipeline, commandCallback) {
    if (!this.device) return
    
    const commandEncoder = this.device.createCommandEncoder()
    const computePass = commandEncoder.beginComputePass()
    
    computePass.setPipeline(pipeline)
    commandCallback(computePass)
    computePass.end()
    
    this.device.queue.submit([commandEncoder.finish()])
  }

  executeRender(renderCallback) {
    if (!this.device) return
    
    const commandEncoder = this.device.createCommandEncoder()
    renderCallback(commandEncoder)
    this.device.queue.submit([commandEncoder.finish()])
  }

  writeBuffer(buffer, offset, data) {
    if (!this.device) return
    this.device.queue.writeBuffer(buffer, offset, data)
  }

  writeTexture(destination, data, dataLayout, size) {
    if (!this.device) return
    this.device.queue.writeTexture(destination, data, dataLayout, size)
  }
}

export const webgpuManager = new WebGPUManager()
