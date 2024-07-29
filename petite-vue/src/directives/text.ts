/*
 * @Author: zc
 * @Date: 2022-01-27 18:28:30
 * @LastEditors: zc
 * @LastEditTime: 2024-06-11 10:34:18
 * @FilePath: /core-main/Users/limo/github/source-code-collection/petite-vue/src/directives/text.ts
 */
import { isObject } from '@vue/shared'
import { Directive } from '.'

export const text: Directive<Text | Element> = ({ el, get, effect }) => {
  effect(() => {
    el.textContent = toDisplayString(get())
  })
}

// 处理展示到文档流中的文案。如果是对象，则进行序列化
export const toDisplayString = (value: any) =>
  value == null
    ? ''
    : isObject(value)
    ? JSON.stringify(value, null, 2)
    : String(value)
