<script setup lang="ts">
/**
 * 3D 建模展示视图组件
 * 使用 Three.js 实现 3D 模型展示和基础建模功能
 */
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Three.js 场景
 */
let scene: THREE.Scene | null = null

/**
 * 相机
 */
let camera: THREE.PerspectiveCamera | null = null

/**
 * 渲染器
 */
let renderer: THREE.WebGLRenderer | null = null

/**
 * 轨道控制器
 */
let controls: OrbitControls | null = null

/**
 * 动画帧 ID
 */
let animationId: number | null = null

/**
 * Canvas 容器引用
 */
const containerRef = ref<HTMLDivElement | null>(null)

/**
 * 当前选中的形状
 */
const currentShape = ref<string>('cube')

/**
 * 模型颜色
 */
const modelColor = ref('#667eea')

/**
 * 是否显示网格
 */
const showGrid = ref(true)

/**
 * 是否显示坐标轴
 */
const showAxes = ref(true)

/**
 * 当前模型列表
 */
const models = ref<Array<{ id: string; name: string; mesh: THREE.Mesh }>>([])

/**
 * 当前选中的模型 ID
 */
const selectedModelId = ref<string | null>(null)

/**
 * 可选形状列表
 */
const shapes = [
  { id: 'cube', name: '立方体', icon: '📦' },
  { id: 'sphere', name: '球体', icon: '🔮' },
  { id: 'cylinder', name: '圆柱体', icon: '🥫' },
  { id: 'cone', name: '圆锥体', icon: '📐' },
  { id: 'torus', name: '圆环', icon: '🍩' },
  { id: 'dodecahedron', name: '十二面体', icon: '💎' },
  { id: 'octahedron', name: '八面体', icon: '🔷' },
  { id: 'tetrahedron', name: '四面体', icon: '🔺' },
  { id: 'torusKnot', name: '环面纽结', icon: '🪢' },
  { id: 'icosahedron', name: '二十面体', icon: '⬡' },
]

/**
 * 预设颜色
 */
const presetColors = [
  '#ff4757', '#ff6b81', '#ffa502', '#ffdd59',
  '#2ed573', '#1abc9c', '#1e90ff', '#667eea',
  '#8854d0', '#a55eea', '#ffffff', '#2d3436'
]

/**
 * 组件挂载时初始化
 */
onMounted(() => {
  initScene()
})

/**
 * 组件卸载时清理
 */
onUnmounted(() => {
  cleanup()
})

/**
 * 初始化 3D 场景
 */
const initScene = () => {
  if (!containerRef.value) return

  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  // 创建相机
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.position.set(5, 5, 5)
  camera.lookAt(0, 0, 0)

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  containerRef.value.appendChild(renderer.domElement)

  // 创建轨道控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // 添加环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  // 添加平行光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(5, 10, 5)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  // 添加点光源
  const pointLight = new THREE.PointLight(0x667eea, 1, 100)
  pointLight.position.set(-5, 5, -5)
  scene.add(pointLight)

  // 添加网格
  addGrid()

  // 添加坐标轴
  addAxes()

  // 添加默认立方体
  addShape('cube')

  // 开始动画循环
  animate()

  // 监听窗口大小变化
  window.addEventListener('resize', onWindowResize)
}

/**
 * 添加网格
 */
const addGrid = () => {
  if (!scene) return

  const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333)
  gridHelper.name = 'grid'
  scene.add(gridHelper)
}

/**
 * 添加坐标轴
 */
const addAxes = () => {
  if (!scene) return

  const axesHelper = new THREE.AxesHelper(5)
  axesHelper.name = 'axes'
  scene.add(axesHelper)
}

/**
 * 添加形状
 */
const addShape = (shapeType: string) => {
  if (!scene) return

  let geometry: THREE.BufferGeometry

  switch (shapeType) {
    case 'cube':
      geometry = new THREE.BoxGeometry(2, 2, 2)
      break
    case 'sphere':
      geometry = new THREE.SphereGeometry(1, 32, 32)
      break
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(1, 1, 2, 32)
      break
    case 'cone':
      geometry = new THREE.ConeGeometry(1, 2, 32)
      break
    case 'torus':
      geometry = new THREE.TorusGeometry(1, 0.4, 16, 100)
      break
    case 'dodecahedron':
      geometry = new THREE.DodecahedronGeometry(1)
      break
    case 'octahedron':
      geometry = new THREE.OctahedronGeometry(1.5)
      break
    case 'tetrahedron':
      geometry = new THREE.TetrahedronGeometry(1.5)
      break
    case 'torusKnot':
      geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16)
      break
    case 'icosahedron':
      geometry = new THREE.IcosahedronGeometry(1.5)
      break
    default:
      geometry = new THREE.BoxGeometry(2, 2, 2)
  }

  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(modelColor.value),
    flatShading: false,
    shininess: 100,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  // 随机位置偏移
  mesh.position.x = (Math.random() - 0.5) * 4
  mesh.position.y = 1 + Math.random() * 2
  mesh.position.z = (Math.random() - 0.5) * 4

  const id = `model-${Date.now()}`
  mesh.userData.id = id
  mesh.userData.name = shapes.find(s => s.id === shapeType)?.name || shapeType

  scene.add(mesh)

  models.value.push({
    id,
    name: mesh.userData.name,
    mesh
  })

  selectedModelId.value = id
}

/**
 * 删除选中的模型
 */
const deleteSelectedModel = () => {
  if (!scene || !selectedModelId.value) return

  const modelIndex = models.value.findIndex(m => m.id === selectedModelId.value)
  if (modelIndex === -1) return

  const model = models.value[modelIndex]
  scene.remove(model.mesh)
  model.mesh.geometry.dispose()
  ;(model.mesh.material as THREE.Material).dispose()

  models.value.splice(modelIndex, 1)
  selectedModelId.value = null
}

/**
 * 清空所有模型
 */
const clearAllModels = () => {
  if (!scene) return

  models.value.forEach(model => {
    scene!.remove(model.mesh)
    model.mesh.geometry.dispose()
    ;(model.mesh.material as THREE.Material).dispose()
  })

  models.value = []
  selectedModelId.value = null
}

/**
 * 更新选中模型颜色
 */
const updateModelColor = () => {
  if (!selectedModelId.value) return

  const model = models.value.find(m => m.id === selectedModelId.value)
  if (model) {
    ;(model.mesh.material as THREE.MeshPhongMaterial).color.set(modelColor.value)
  }
}

/**
 * 切换网格显示
 */
const toggleGrid = () => {
  if (!scene) return

  const grid = scene.getObjectByName('grid') as THREE.GridHelper
  if (grid) {
    grid.visible = showGrid.value
  }
}

/**
 * 切换坐标轴显示
 */
const toggleAxes = () => {
  if (!scene) return

  const axes = scene.getObjectByName('axes') as THREE.AxesHelper
  if (axes) {
    axes.visible = showAxes.value
  }
}

/**
 * 重置相机位置
 */
const resetCamera = () => {
  if (!camera || !controls) return

  camera.position.set(5, 5, 5)
  camera.lookAt(0, 0, 0)
  controls.reset()
}

/**
 * 导出场景截图
 */
const exportScreenshot = () => {
  if (!renderer) return

  renderer.render(scene!, camera!)
  const dataUrl = renderer.domElement.toDataURL('image/png')

  const link = document.createElement('a')
  link.download = `3d-scene-${Date.now()}.png`
  link.href = dataUrl
  link.click()
}

/**
 * 动画循环
 */
const animate = () => {
  animationId = requestAnimationFrame(animate)

  if (controls) {
    controls.update()
  }

  // 旋转模型
  models.value.forEach(model => {
    model.mesh.rotation.x += 0.005
    model.mesh.rotation.y += 0.01
  })

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

/**
 * 窗口大小变化处理
 */
const onWindowResize = () => {
  if (!camera || !renderer || !containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

/**
 * 清理资源
 */
const cleanup = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  window.removeEventListener('resize', onWindowResize)

  if (renderer) {
    renderer.dispose()
  }

  if (scene) {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        if (object.material instanceof THREE.Material) {
          object.material.dispose()
        }
      }
    })
  }
}
</script>

<template>
  <div class="model-view">
    <!-- 标题栏 -->
    <div class="model-header">
      <h2>🎮 3D 建模展示</h2>
      <div class="header-actions">
        <button @click="exportScreenshot" class="export-btn">📸 导出截图</button>
        <button @click="resetCamera" class="reset-btn">🎯 重置视角</button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 3D 视图 -->
      <div class="canvas-container" ref="containerRef"></div>

      <!-- 控制面板 -->
      <div class="control-panel">
        <!-- 形状选择 -->
        <div class="panel-section">
          <h3>🔷 添加形状</h3>
          <div class="shape-grid">
            <button
              v-for="shape in shapes"
              :key="shape.id"
              :class="['shape-btn', { active: currentShape === shape.id }]"
              @click="addShape(shape.id)"
              :title="shape.name"
            >
              <span class="icon">{{ shape.icon }}</span>
              <span class="name">{{ shape.name }}</span>
            </button>
          </div>
        </div>

        <!-- 颜色选择 -->
        <div class="panel-section">
          <h3>🎨 颜色</h3>
          <div class="color-palette">
            <button
              v-for="color in presetColors"
              :key="color"
              :class="['color-btn', { active: modelColor === color }]"
              :style="{ background: color }"
              @click="modelColor = color; updateModelColor()"
            ></button>
          </div>
          <input
            type="color"
            v-model="modelColor"
            @change="updateModelColor"
            class="color-picker"
          />
        </div>

        <!-- 显示选项 -->
        <div class="panel-section">
          <h3>👁️ 显示选项</h3>
          <label class="checkbox-label">
            <input type="checkbox" v-model="showGrid" @change="toggleGrid" />
            <span>显示网格</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="showAxes" @change="toggleAxes" />
            <span>显示坐标轴</span>
          </label>
        </div>

        <!-- 模型列表 -->
        <div class="panel-section">
          <h3>📦 模型列表 ({{ models.length }})</h3>
          <div class="model-list">
            <div
              v-for="model in models"
              :key="model.id"
              :class="['model-item', { selected: selectedModelId === model.id }]"
              @click="selectedModelId = model.id"
            >
              <span>{{ model.name }}</span>
              <button
                @click.stop="deleteSelectedModel"
                class="delete-btn"
                v-if="selectedModelId === model.id"
              >
                ✕
              </button>
            </div>
            <div v-if="models.length === 0" class="empty-tip">
              点击上方按钮添加 3D 模型
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="panel-section">
          <button
            @click="deleteSelectedModel"
            :disabled="!selectedModelId"
            class="action-btn danger"
          >
            🗑️ 删除选中
          </button>
          <button
            @click="clearAllModels"
            :disabled="models.length === 0"
            class="action-btn"
          >
            🧹 清空全部
          </button>
        </div>

        <!-- 操作提示 -->
        <div class="panel-section tips">
          <h3>💡 操作提示</h3>
          <ul>
            <li>🖱️ 左键拖动：旋转视角</li>
            <li>🖱️ 右键拖动：平移视角</li>
            <li>🖱️ 滚轮：缩放</li>
            <li>点击模型列表选择模型</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.model-header h2 {
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.export-btn, .reset-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.export-btn {
  background: #4ade80;
  color: #000;
}

.reset-btn {
  background: #667eea;
  color: white;
}

.main-content {
  display: flex;
  gap: 15px;
  flex: 1;
  min-height: 0;
}

.canvas-container {
  flex: 1;
  background: #1a1a2e;
  border-radius: 12px;
  overflow: hidden;
}

.control-panel {
  width: 280px;
  background: #1e1e2e;
  border-radius: 12px;
  padding: 15px;
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 20px;
}

.panel-section h3 {
  font-size: 13px;
  margin-bottom: 10px;
  color: #aaa;
}

.shape-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.shape-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 5px;
  border: none;
  background: #16213e;
  color: #ccc;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.shape-btn:hover {
  background: #2d2d44;
  color: white;
}

.shape-btn .icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.shape-btn .name {
  font-size: 10px;
}

.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.color-btn {
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
}

.color-btn.active {
  border-color: white;
}

.color-picker {
  width: 100%;
  height: 36px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #aaa;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
}

.model-list {
  max-height: 150px;
  overflow-y: auto;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #16213e;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  font-size: 13px;
}

.model-item:hover {
  background: #2d2d44;
}

.model-item.selected {
  background: #667eea;
  color: white;
}

.delete-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
}

.empty-tip {
  text-align: center;
  color: #666;
  font-size: 12px;
  padding: 20px 0;
}

.action-btn {
  width: 100%;
  padding: 10px;
  border: none;
  background: #333;
  color: #aaa;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 8px;
  font-size: 13px;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.danger {
  background: #ff4757;
  color: white;
}

.tips ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips li {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}
</style>
