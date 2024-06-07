/*
 * @Author: zc
 * @Date: 2022-01-27 18:28:30
 * @LastEditors: zc
 * @LastEditTime: 2024-06-07 17:30:34
 * @FilePath: /core-main/Users/limo/github/source-code-collection/petite-vue/src/directives/show.ts
 */
import { Directive } from '.'

export const show: Directive<HTMLElement> = ({ el, get, effect }) => {
  const initialDisplay = el.style.display //当前条件下display属性
  effect(() => {
    el.style.display = get() ? initialDisplay : 'none'
  })
}
