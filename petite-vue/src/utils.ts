/*
 * @Author: zc
 * @Date: 2022-01-27 18:28:30
 * @LastEditors: zc
 * @LastEditTime: 2024-06-05 10:53:52
 * @FilePath: /core-main/Users/limo/Downloads/petite-vue-main/src/utils.ts
 */

/**
 * 返回vue特殊属性的值
 * 如 v-if/v-for的值。同时如果当前有值还需要「删除」该属性，如 v-clock, 删除该属性则重新渲染
 * @param el 
 * @param name 
 * @returns 
 */
export const checkAttr = (el: Element, name: string): string | null => {
  const val = el.getAttribute(name)
  // 有值的情况下，则删除属性值
  
//   console.log('checkAttr: rm ', name, '=', val)

  if (val != null) {
    el.removeAttribute(name)
}
  return val
}

export const listen = (
  el: Element,
  event: string,
  handler: any,
  options?: any
) => {
    console.log('addEventListener: ',event, handler, options)
  el.addEventListener(event, handler, options)
}
