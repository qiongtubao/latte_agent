<template>
  <div id="app">
    <h1>Latte Agent</h1>
    <p>Electron + Vue3 应用已成功启动</p>
  </div>
</template>

<script setup lang="ts">
/**
 * App 根组件
 * 应用入口视图
 */
</script>

<style>
/* 全局基础样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #1a1a2e;
  color: #e0e0e0;
}

#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #e94560;
}

p {
  font-size: 1.1rem;
  color: #a0a0b0;
}
</style>
