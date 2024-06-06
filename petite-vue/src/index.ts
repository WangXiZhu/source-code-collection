/*
 * @Author: zc
 * @Date: 2022-01-27 18:28:30
 * @LastEditors: zc
 * @LastEditTime: 2024-06-05 16:44:20
 * @FilePath: /core-main/Users/limo/Downloads/petite-vue-main/src/index.ts
 */
export { createApp } from './app'
export { nextTick } from './scheduler'
export { reactive } from './reactivity'

import { createApp } from './app'

// 如果脚本有init属性值，则直接挂载
const s = document.currentScript
if (s && s.hasAttribute('init')) {
  createApp().mount()
}
