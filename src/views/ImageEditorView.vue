<script setup lang="ts">
/**
 * 图片编辑器视图组件
 * 支持图片编辑、滤镜、裁剪、绘制等功能
 */
import { ref, onMounted, watch } from 'vue'

/**
 * 当前加载的图片
 */
const currentImage = ref<string | null>(null)

/**
 * 原始图片数据（用于重置）
 */
const originalImage = ref<string | null>(null)

/**
 * Canvas 引用
 */
const canvasRef = ref<HTMLCanvasElement | null>(null)

/**
 * Canvas 上下文
 */
let ctx: CanvasRenderingContext2D | null = null

/**
 * Fabric.js canvas 实例
 */
let fabricCanvas: any = null

/**
 * 是否正在加载
 */
const isLoading = ref(false)

/**
 * 当前工具
 */
const currentTool = ref<'select' | 'brush' | 'eraser' | 'text' | 'rect' | 'circle'>('select')

/**
 * 画笔颜色
 */
const brushColor = ref('#ff4757')

/**
 * 画笔大小
 */
const brushSize = ref(5)

/**
 * 滤镜设置
 */
const filters = ref({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0
})

/**
 * 历史记录
 */
const history = ref<string[]>([])
const historyIndex = ref(-1)

/**
 * 工具列表
 */
const tools = [
  { id: 'select', name: '选择', icon: '👆' },
  { id: 'brush', name: '画笔', icon: '🖌️' },
  { id: 'eraser', name: '橡皮擦', icon: '🧹' },
  { id: 'text', name: '文字', icon: '📝' },
  { id: 'rect', name: '矩形', icon: '⬜' },
  { id: 'circle', name: '圆形', icon: '⭕' },
]

/**
 * 预设颜色
 */
const presetColors = [
  '#ff4757', '#ff6b81', '#ffa502', '#ffdd59',
  '#2ed573', '#1abc9c', '#1e90ff', '#3742fa',
  '#8854d0', '#a55eea', '#ffffff', '#000000'
]

/**
 * 组件挂载时初始化
 */
onMounted(async () => {
  await initCanvas()
})

/**
 * 初始化 Canvas
 */
const initCanvas = async () => {
  if (!canvasRef.value) return
  
  ctx = canvasRef.value.getContext('2d')
  
  // 设置默认画布
  canvasRef.value.width = 800
  canvasRef.value.height = 600
  
  // 填充白色背景
  if (ctx) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 800, 600)
  }
  
  saveToHistory()
}

/**
 * 选择文件
 */
const selectFile = async (): Promise<void> => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      currentImage.value = event.target?.result as string
      originalImage.value = event.target?.result as string
      loadImage(currentImage.value)
    }
    reader.readAsDataURL(file)
  }
  
  input.click()
}

/**
 * 加载图片到 Canvas
 */
const loadImage = (src: string): void => {
  if (!ctx || !canvasRef.value) return
  
  const img = new Image()
  img.onload = () => {
    // 调整 canvas 大小
    const maxWidth = 800
    const maxHeight = 600
    let width = img.width
    let height = img.height
    
    if (width > maxWidth) {
      height = (maxWidth / width) * height
      width = maxWidth
    }
    if (height > maxHeight) {
      width = (maxHeight / height) * width
      height = maxHeight
    }
    
    canvasRef.value!.width = width
    canvasRef.value!.height = height
    ctx!.drawImage(img, 0, 0, width, height)
    
    saveToHistory()
  }
  img.src = src
}

/**
 * 应用滤镜
 */
const applyFilters = (): void => {
  if (!ctx || !canvasRef.value || !originalImage.value) return
  
  const img = new Image()
  img.onload = () => {
    ctx!.filter = `
      brightness(${filters.value.brightness}%)
      contrast(${filters.value.contrast}%)
      saturate(${filters.value.saturation}%)
      blur(${filters.value.blur}px)
      grayscale(${filters.value.grayscale}%)
      sepia(${filters.value.sepia}%)
      invert(${filters.value.invert}%)
    `
    ctx!.drawImage(img, 0, 0, canvasRef.value!.width, canvasRef.value!.height)
    ctx!.filter = 'none'
  }
  img.src = originalImage.value
}

/**
 * 监听滤镜变化
 */
watch(filters, () => {
  applyFilters()
}, { deep: true })

/**
 * 重置滤镜
 */
const resetFilters = (): void => {
  filters.value = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    grayscale: 0,
    sepia: 0,
    invert: 0
  }
}

/**
 * 保存到历史记录
 */
const saveToHistory = (): void => {
  if (!canvasRef.value) return
  
  const dataUrl = canvasRef.value.toDataURL()
  
  // 删除当前位置之后的历史
  history.value = history.value.slice(0, historyIndex.value + 1)
  history.value.push(dataUrl)
  historyIndex.value = history.value.length - 1
  
  // 限制历史记录数量
  if (history.value.length > 20) {
    history.value.shift()
    historyIndex.value--
  }
}

/**
 * 撤销
 */
const undo = (): void => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    loadFromHistory()
  }
}

/**
 * 重做
 */
const redo = (): void => {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    loadFromHistory()
  }
}

/**
 * 从历史记录加载
 */
const loadFromHistory = (): void => {
  if (!ctx || !canvasRef.value) return
  
  const img = new Image()
  img.onload = () => {
    ctx!.clearRect(0, 0, canvasRef.value!.width, canvasRef.value!.height)
    ctx!.drawImage(img, 0, 0)
  }
  img.src = history.value[historyIndex.value]
}

/**
 * 清空画布
 */
const clearCanvas = (): void => {
  if (!ctx || !canvasRef.value) return
  
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  saveToHistory()
}

/**
 * 下载图片
 */
const downloadImage = (): void => {
  if (!canvasRef.value) return
  
  const link = document.createElement('a')
  link.download = `edited-image-${Date.now()}.png`
  link.href = canvasRef.value.toDataURL('image/png')
  link.click()
}

/**
 * 旋转图片
 */
const rotateImage = (degrees: number): void => {
  if (!ctx || !canvasRef.value) return
  
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  
  tempCanvas.width = canvasRef.value.height
  tempCanvas.height = canvasRef.value.width
  
  tempCtx?.translate(tempCanvas.width / 2, tempCanvas.height / 2)
  tempCtx?.rotate((degrees * Math.PI) / 180)
  tempCtx?.drawImage(canvasRef.value, -canvasRef.value.width / 2, -canvasRef.value.height / 2)
  
  canvasRef.value.width = tempCanvas.width
  canvasRef.value.height = tempCanvas.height
  ctx.drawImage(tempCanvas, 0, 0)
  
  saveToHistory()
}

/**
 * 翻转图片
 */
const flipImage = (horizontal: boolean): void => {
  if (!ctx || !canvasRef.value) return
  
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  
  tempCanvas.width = canvasRef.value.width
  tempCanvas.height = canvasRef.value.height
  
  if (horizontal) {
    tempCtx?.translate(tempCanvas.width, 0)
    tempCtx?.scale(-1, 1)
  } else {
    tempCtx?.translate(0, tempCanvas.height)
    tempCtx?.scale(1, -1)
  }
  
  tempCtx?.drawImage(canvasRef.value, 0, 0)
  ctx.drawImage(tempCanvas, 0, 0)
  
  saveToHistory()
}

/**
 * Canvas 鼠标事件处理
 */
const handleMouseDown = (e: MouseEvent): void => {
  if (!ctx || !canvasRef.value) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  if (currentTool.value === 'brush') {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = brushColor.value
    ctx.lineWidth = brushSize.value
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }
}

const handleMouseMove = (e: MouseEvent): void => {
  if (!ctx || !canvasRef.value) return
  
  if (currentTool.value === 'brush' && e.buttons === 1) {
    const rect = canvasRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    ctx.lineTo(x, y)
    ctx.stroke()
  } else if (currentTool.value === 'eraser' && e.buttons === 1) {
    const rect = canvasRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, brushSize.value, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }
}

const handleMouseUp = (): void => {
  saveToHistory()
}
</script>

<template>
  <div class="image-editor-view">
    <!-- 标题栏 -->
    <div class="editor-header">
      <h2>🖼️ 图片编辑器</h2>
      <div class="header-actions">
        <button @click="selectFile" class="upload-btn">📤 选择图片</button>
        <button @click="downloadImage" class="download-btn" :disabled="!currentImage">📥 下载</button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <!-- 工具选择 -->
      <div class="tool-group">
        <button 
          v-for="tool in tools" 
          :key="tool.id"
          :class="['tool-btn', { active: currentTool === tool.id }]"
          @click="currentTool = tool.id as any"
          :title="tool.name"
        >
          {{ tool.icon }}
        </button>
      </div>
      
      <!-- 颜色选择 -->
      <div class="tool-group">
        <span class="label">颜色:</span>
        <div class="color-palette">
          <button 
            v-for="color in presetColors" 
            :key="color"
            :class="['color-btn', { active: brushColor === color }]"
            :style="{ background: color }"
            @click="brushColor = color"
          ></button>
        </div>
        <input type="color" v-model="brushColor" class="color-picker" />
      </div>
      
      <!-- 画笔大小 -->
      <div class="tool-group">
        <span class="label">大小:</span>
        <input type="range" v-model="brushSize" min="1" max="50" class="size-slider" />
        <span class="size-value">{{ brushSize }}</span>
      </div>
      
      <!-- 操作按钮 -->
      <div class="tool-group">
        <button @click="undo" :disabled="historyIndex <= 0" class="action-btn">↩️ 撤销</button>
        <button @click="redo" :disabled="historyIndex >= history.length - 1" class="action-btn">↪️ 重做</button>
        <button @click="clearCanvas" class="action-btn danger">🗑️ 清空</button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 画布区域 -->
      <div class="canvas-area">
        <canvas 
          ref="canvasRef"
          class="editor-canvas"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
        ></canvas>
        <div v-if="!currentImage" class="placeholder">
          <p>👆 点击"选择图片"上传图片</p>
          <p class="tip">支持 JPG, PNG, GIF 等格式</p>
        </div>
      </div>

      <!-- 滤镜面板 -->
      <div class="filters-panel">
        <h3>🎨 滤镜调整</h3>
        
        <div class="filter-item">
          <label>亮度</label>
          <input type="range" v-model="filters.brightness" min="0" max="200" />
          <span>{{ filters.brightness }}%</span>
        </div>
        
        <div class="filter-item">
          <label>对比度</label>
          <input type="range" v-model="filters.contrast" min="0" max="200" />
          <span>{{ filters.contrast }}%</span>
        </div>
        
        <div class="filter-item">
          <label>饱和度</label>
          <input type="range" v-model="filters.saturation" min="0" max="200" />
          <span>{{ filters.saturation }}%</span>
        </div>
        
        <div class="filter-item">
          <label>模糊</label>
          <input type="range" v-model="filters.blur" min="0" max="10" step="0.5" />
          <span>{{ filters.blur }}px</span>
        </div>
        
        <div class="filter-item">
          <label>灰度</label>
          <input type="range" v-model="filters.grayscale" min="0" max="100" />
          <span>{{ filters.grayscale }}%</span>
        </div>
        
        <div class="filter-item">
          <label>复古</label>
          <input type="range" v-model="filters.sepia" min="0" max="100" />
          <span>{{ filters.sepia }}%</span>
        </div>
        
        <div class="filter-item">
          <label>反色</label>
          <input type="range" v-model="filters.invert" min="0" max="100" />
          <span>{{ filters.invert }}%</span>
        </div>
        
        <button @click="resetFilters" class="reset-btn">🔄 重置滤镜</button>
        
        <hr />
        
        <h4>🔄 变换</h4>
        <div class="transform-buttons">
          <button @click="rotateImage(90)" class="transform-btn">↻ 顺时针</button>
          <button @click="rotateImage(-90)" class="transform-btn">↺ 逆时针</button>
          <button @click="flipImage(true)" class="transform-btn">↔️ 水平翻转</button>
          <button @click="flipImage(false)" class="transform-btn">↕️ 垂直翻转</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-editor-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.editor-header h2 {
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.upload-btn, .download-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.upload-btn {
  background: #667eea;
  color: white;
}

.download-btn {
  background: #4ade80;
  color: #000;
}

.download-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar {
  display: flex;
  gap: 20px;
  padding: 15px;
  background: #1e1e2e;
  border-radius: 12px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  align-items: center;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 12px;
  color: #888;
}

.tool-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #16213e;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: #2d2d44;
}

.tool-btn.active {
  background: #667eea;
}

.color-palette {
  display: flex;
  gap: 4px;
}

.color-btn {
  width: 24px;
  height: 24px;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
}

.color-btn.active {
  border-color: white;
}

.color-picker {
  width: 30px;
  height: 30px;
  border: none;
  cursor: pointer;
}

.size-slider {
  width: 80px;
}

.size-value {
  font-size: 12px;
  color: #888;
  min-width: 30px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  background: #333;
  color: #aaa;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.danger {
  background: #ff4757;
  color: white;
}

.main-content {
  display: flex;
  gap: 15px;
  flex: 1;
  min-height: 0;
}

.canvas-area {
  flex: 1;
  background: #1e1e2e;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.editor-canvas {
  max-width: 100%;
  max-height: 100%;
  cursor: crosshair;
}

.placeholder {
  position: absolute;
  text-align: center;
  color: #666;
}

.placeholder .tip {
  font-size: 12px;
  margin-top: 10px;
}

.filters-panel {
  width: 250px;
  background: #1e1e2e;
  border-radius: 12px;
  padding: 15px;
  overflow-y: auto;
}

.filters-panel h3 {
  font-size: 14px;
  margin-bottom: 15px;
}

.filters-panel h4 {
  font-size: 13px;
  margin: 15px 0 10px;
}

.filter-item {
  margin-bottom: 12px;
}

.filter-item label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 5px;
}

.filter-item input[type="range"] {
  width: calc(100% - 50px);
  vertical-align: middle;
}

.filter-item span {
  display: inline-block;
  width: 45px;
  text-align: right;
  font-size: 12px;
  color: #666;
}

.reset-btn {
  width: 100%;
  padding: 8px;
  border: none;
  background: #667eea;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
}

hr {
  border: none;
  border-top: 1px solid #333;
  margin: 15px 0;
}

.transform-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.transform-btn {
  padding: 8px;
  border: none;
  background: #333;
  color: #aaa;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.transform-btn:hover {
  background: #444;
  color: white;
}
</style>
