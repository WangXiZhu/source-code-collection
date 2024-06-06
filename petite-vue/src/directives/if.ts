/*
 * @Author: zc
 * @Date: 2022-01-27 18:28:30
 * @LastEditors: zc
 * @LastEditTime: 2024-06-05 17:16:24
 * @FilePath: /core-main/Users/limo/Downloads/petite-vue-main/src/directives/if.ts
 */
import { Block } from '../block'
import { evaluate } from '../eval'
import { checkAttr } from '../utils'
import { Context } from '../context'

interface Branch {
  exp?: string | null
  el: Element
}

export const _if = (el: Element, exp: string, ctx: Context) => {
  if (import.meta.env.DEV && !exp.trim()) {
    console.warn(`v-if expression cannot be empty.`)
  }

  const parent = el.parentElement!
  const anchor = new Comment('v-if')
  parent.insertBefore(anchor, el)   // 插入 注释节点  <!--v-if-->
  
  const branches: Branch[] = [
    {
      exp,
      el
    }
  ]

  // if/else-if/else 将判断分支以数组的方式暂存
  // locate else branch
  let elseEl: Element | null
  let elseExp: string | null
  while ((elseEl = el.nextElementSibling)) {    // 只返回元素节点之后的兄弟元素节点（不包括文本节点、注释节点）
    elseExp = null
    if (
      checkAttr(elseEl, 'v-else') === '' ||
      (elseExp = checkAttr(elseEl, 'v-else-if'))
    ) {
      parent.removeChild(elseEl)
      branches.push({ exp: elseExp, el: elseEl })
    } else {
      break
    }
  }

  console.log('if - branches: ', branches)

  // 返回元素节点之后的兄弟节点（包括文本节点、注释节点即回车、换行、空格、文本等等）
  const nextNode = el.nextSibling   
  parent.removeChild(el)        // 移除当前v-if节点

  let block: Block | undefined
  let activeBranchIndex: number = -1

  const removeActiveBlock = () => {
    if (block) {
      parent.insertBefore(anchor, block.el)
      block.remove()
      block = undefined
    }
  }

  // 监听函数中的数据更新
  //  Registers the given function to track reactive updates.
  ctx.effect(() => {
    debugger
    for (let i = 0; i < branches.length; i++) {
      const { exp, el } = branches[i]


      // 通过 evaluate 计算结果
      console.log('if-evaluate(ctx.scope, exp): ', !exp || evaluate(ctx.scope, exp))
      if (!exp || evaluate(ctx.scope, exp)) {
        if (i !== activeBranchIndex) {
          removeActiveBlock()
          block = new Block(el, ctx)    // 创建一个新的block组件
          block.insert(parent, anchor)  // 之前占位的 注释节点  <!--v-if--> 节点 之前插入判断条件为true的节点
          parent.removeChild(anchor)    // 移除 <!--v-if-->
          activeBranchIndex = i
        }
        return
      }
    }
    // no matched branch.
    activeBranchIndex = -1
    removeActiveBlock()
  })

  return nextNode
}
