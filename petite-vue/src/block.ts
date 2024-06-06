/*
 * @Author: zc
 * @Date: 2022-01-27 18:28:30
 * @LastEditors: zc
 * @LastEditTime: 2024-06-05 16:43:54
 * @FilePath: /core-main/Users/limo/Downloads/petite-vue-main/src/block.ts
 */
import { Context, createContext } from './context'
import { walk } from './walk'
import { remove } from '@vue/shared'
import { stop } from './reactivity'

export class Block {
  template: Element | DocumentFragment
  ctx: Context
  key?: any
  parentCtx?: Context

  isFragment: boolean
  start?: Text
  end?: Text

  get el() {
    return this.start || (this.template as Element)
  }

  constructor(template: Element, parentCtx: Context, isRoot = false) {
    this.isFragment = template instanceof HTMLTemplateElement

    if (isRoot) {
        // 根节点
      this.template = template
    } else if (this.isFragment) {
      this.template = (template as HTMLTemplateElement).content.cloneNode(
        true
      ) as DocumentFragment
    } else {
      this.template = template.cloneNode(true) as Element
    }

    if (isRoot) {
        // 根节点的上下文
      this.ctx = parentCtx
    } else {
      // 子节点的上下文
      // create child context
      this.parentCtx = parentCtx
      parentCtx.blocks.push(this)
      this.ctx = createContext(parentCtx)
    }

    console.log('walk constructor this.template: ', this.template)
    walk(this.template, this.ctx)
  }

  insert(parent: Element, anchor: Node | null = null) {
    if (this.isFragment) {
      if (this.start) {
        // already inserted, moving
        let node: Node | null = this.start
        let next: Node | null
        while (node) {
          next = node.nextSibling
          parent.insertBefore(node, anchor)
          if (node === this.end) break
          node = next
        }
      } else {
        this.start = new Text('')
        this.end = new Text('')
        parent.insertBefore(this.end, anchor)
        parent.insertBefore(this.start, this.end)
        parent.insertBefore(this.template, this.end)
      }
    } else {
      parent.insertBefore(this.template, anchor)
    }
  }

  remove() {
    if (this.parentCtx) {
      remove(this.parentCtx.blocks, this)
    }
    if (this.start) {
      const parent = this.start.parentNode!
      let node: Node | null = this.start
      let next: Node | null
      while (node) {
        next = node.nextSibling
        parent.removeChild(node)
        if (node === this.end) break
        node = next
      }
    } else {
      this.template.parentNode!.removeChild(this.template)
    }
    this.teardown()
  }

  teardown() {
    this.ctx.blocks.forEach((child) => {
      child.teardown()
    })
    this.ctx.effects.forEach(stop)
    this.ctx.cleanups.forEach((fn) => fn())
  }
}
