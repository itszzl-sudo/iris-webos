<template>
  <div class="window-manager">
    <Window
      v-for="window in windows"
      :key="window.id"
      :window="window"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { windowManager } from '../core/window-manager.js'
import Window from './Window.vue'

const windows = computed(() => windowManager.getAllWindows())
</script>

<style scoped>
.window-manager {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 48px;
  pointer-events: none;
}
</style>
