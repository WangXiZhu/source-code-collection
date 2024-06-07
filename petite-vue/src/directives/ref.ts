/*
 * @Author: zc
 * @Date: 2022-01-27 18:28:30
 * @LastEditors: zc
 * @LastEditTime: 2024-06-07 17:45:17
 * @FilePath: /core-main/Users/limo/github/source-code-collection/petite-vue/src/directives/ref.ts
 */
import { Directive } from '.'

export const ref: Directive = ({
  el,
  ctx: {
    scope: { $refs }
  },
  get,
  effect
}) => {
  let prevRef: any
  effect(() => {
    // 解析到 ref属性，则把对应的节点添加到scope.ctx中
    const ref = get()
    $refs[ref] = el
    if (prevRef && ref !== prevRef) {
      delete $refs[prevRef]
    }
    prevRef = ref
  })
  return () => {
    prevRef && delete $refs[prevRef]
  }
}
