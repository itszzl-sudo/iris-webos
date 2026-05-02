<template>
  <div 
    v-if="visible"
    class="context-menu"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <div 
      v-for="(item, index) in items" 
      :key="index"
      class="menu-item"
      :class="{ separator: item.type === 'separator' }"
      @click="handleItemClick(item)"
    >
      <span v-if="item.type !== 'separator'">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  x: Number,
  y: Number,
  items: Array
})

const emit = defineEmits(['close'])

const handleItemClick = (item) => {
  if (item.action) {
    item.action()
  }
  emit('close')
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: var(--window-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 4px 0;
  min-width: 150px;
  z-index: 10000;
}

.menu-item {
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
}

.menu-item:hover:not(.separator) {
  background: var(--hover-color);
}

.menu-item.separator {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
  padding: 0;
  cursor: default;
}
</style>
