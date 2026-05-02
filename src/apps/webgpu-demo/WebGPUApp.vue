<template>
  <div class="webgpu-app">
    <div class="webgpu-toolbar">
      <button @click="startRender" class="toolbar-btn" :disabled="rendering">
        {{ rendering ? '渲染中...' : '开始渲染' }}
      </button>
      <button @click="stopRender" class="toolbar-btn" :disabled="!rendering">
        停止渲染
      </button>
      <select v-model="demoType" @change="changeDemo" class="demo-select">
        <option value="triangle">三角形</option>
        <option value="rotating">旋转三角形</option>
        <option value="particles">粒子系统</option>
      </select>
    </div>
    
    <div class="webgpu-canvas-container" ref="canvasContainer">
      <canvas ref="canvas" class="webgpu-canvas"></canvas>
      <div v-if="!webgpuSupported" class="webgpu-unsupported">
        <div class="unsupported-content">
          <h2>⚠️ WebGPU 不支持</h2>
          <p>您的浏览器不支持 WebGPU</p>
          <p>请使用支持 WebGPU 的浏览器：</p>
          <ul>
            <li>Chrome 113+</li>
            <li>Edge 113+</li>
            <li>Firefox Nightly (需启用)</li>
          </ul>
        </div>
      </div>
    </div>
    
    <div class="webgpu-info">
      <span>FPS: {{ fps }}</span>
      <span>尺寸: {{ canvasWidth }} x {{ canvasHeight }}</span>
      <span>格式: {{ format }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { webgpuManager } from '../../webgpu/index.js'

const props = defineProps({
  windowId: String
})

const canvasContainer = ref(null)
const canvas = ref(null)
const rendering = ref(false)
const webgpuSupported = ref(false)
const demoType = ref('triangle')
const fps = ref(0)
const format = ref('bgra8unorm')

let contextId = null
let animationId = null
let lastTime = 0
let frameCount = 0
let pipeline = null
let bindGroup = null
let uniformBuffer = null

const canvasWidth = computed(() => canvas.value?.clientWidth || 800)
const canvasHeight = computed(() => canvas.value?.clientHeight || 600)

const initWebGPU = async () => {
  const supported = await webgpuManager.init()
  webgpuSupported.value = supported
  
  if (!supported) {
    console.warn('WebGPU not supported')
    return false
  }
  
  if (canvas.value) {
    const ctx = webgpuManager.createContext(canvas.value, {
      width: canvas.value.clientWidth,
      height: canvas.value.clientHeight
    })
    
    if (ctx) {
      contextId = ctx.id
      format.value = ctx.format
      return true
    }
  }
  
  return false
}

const createTrianglePipeline = async () => {
  const device = webgpuManager.getDevice()
  if (!device) return
  
  const shaderCode = `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec3<f32>,
}

@vertex
fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(0.0, 0.5),
    vec2<f32>(-0.5, -0.5),
    vec2<f32>(0.5, -0.5)
  );
  
  var color = array<vec3<f32>, 3>(
    vec3<f32>(1.0, 0.0, 0.0),
    vec3<f32>(0.0, 1.0, 0.0),
    vec3<f32>(0.0, 0.0, 1.0)
  );
  
  var output: VertexOutput;
  output.position = vec4<f32>(pos[vertex_index], 0.0, 1.0);
  output.color = color[vertex_index];
  return output;
}

@fragment
fn fragment_main(@location(0) color: vec3<f32>) -> @location(0) vec4<f32> {
  return vec4<f32>(color, 1.0);
}
`
  
  const shaderModule = webgpuManager.createShaderModule(shaderCode)
  
  pipeline = webgpuManager.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vertex_main'
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fragment_main',
      targets: [{
        format: format.value
      }]
    },
    primitive: {
      topology: 'triangle-list'
    }
  })
}

const render = (timestamp) => {
  if (!rendering.value || !contextId) return
  
  const texture = webgpuManager.getCurrentTexture(contextId)
  if (!texture) return
  
  const commandEncoder = webgpuManager.getDevice().createCommandEncoder()
  
  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: texture.createView(),
      clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
      loadOp: 'clear',
      storeOp: 'store'
    }]
  })
  
  if (pipeline) {
    renderPass.setPipeline(pipeline)
    renderPass.draw(3, 1, 0, 0)
  }
  
  renderPass.end()
  
  webgpuManager.getDevice().queue.submit([commandEncoder.finish()])
  
  frameCount++
  if (timestamp - lastTime >= 1000) {
    fps.value = Math.round(frameCount * 1000 / (timestamp - lastTime))
    frameCount = 0
    lastTime = timestamp
  }
  
  animationId = requestAnimationFrame(render)
}

const startRender = async () => {
  if (rendering.value) return
  
  const initialized = await initWebGPU()
  if (!initialized) return
  
  await createTrianglePipeline()
  
  rendering.value = true
  lastTime = performance.now()
  frameCount = 0
  animationId = requestAnimationFrame(render)
}

const stopRender = () => {
  rendering.value = false
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

const changeDemo = async () => {
  if (rendering.value) {
    stopRender()
    await startRender()
  }
}

const handleResize = () => {
  if (contextId && canvas.value) {
    webgpuManager.resizeContext(
      contextId,
      canvas.value.clientWidth,
      canvas.value.clientHeight
    )
  }
}

onMounted(() => {
  if (canvasContainer.value && canvas.value) {
    canvas.value.width = canvasContainer.value.clientWidth
    canvas.value.height = canvasContainer.value.clientHeight
    
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(canvasContainer.value)
  }
})

onUnmounted(() => {
  stopRender()
  if (contextId) {
    webgpuManager.destroyContext(contextId)
  }
})
</script>

<style scoped>
.webgpu-app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.webgpu-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  height: 40px;
}

.toolbar-btn {
  padding: 4px 12px;
  background: #0e639c;
  color: white;
  border-radius: 3px;
  font-size: 13px;
  cursor: pointer;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn:not(:disabled):hover {
  background: #1177bb;
}

.demo-select {
  padding: 4px 8px;
  background: #3c3c3c;
  color: #cccccc;
  border: 1px solid #3c3c3c;
  border-radius: 3px;
  font-size: 13px;
}

.webgpu-canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.webgpu-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.webgpu-unsupported {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
}

.unsupported-content {
  text-align: center;
  color: white;
  padding: 40px;
}

.unsupported-content h2 {
  color: #f59e0b;
  margin-bottom: 20px;
}

.unsupported-content ul {
  list-style: none;
  padding: 0;
  margin-top: 10px;
}

.unsupported-content li {
  margin: 5px 0;
  color: #10b981;
}

.webgpu-info {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 4px 12px;
  background: #007acc;
  color: white;
  font-size: 12px;
  height: 24px;
}
</style>
