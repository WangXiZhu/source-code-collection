import { isArray, isObject } from '@vue/shared'
import { Block } from '../block'
import { evaluate } from '../eval'
import { Context, createScopedContext } from '../context'

const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
const stripParensRE = /^\(|\)$/g
const destructureRE = /^[{[]\s*((?:[\w_$]+\s*,?\s*)+)[\]}]$/

type KeyToIndexMap = Map<any, number>

export const _for = (el: Element, exp: string, ctx: Context) => {
  const inMatch = exp.match(forAliasRE)
  if (!inMatch) {
    import.meta.env.DEV && console.warn(`invalid v-for expression: ${exp}`)
    return
  }

  const nextNode = el.nextSibling

  const parent = el.parentElement!  // 非空断言。告诉编译器该节点不可能为空
  const anchor = new Text('')
  parent.insertBefore(anchor, el)   // 锚点占位，用于后续节点往文档流中插入  
  parent.removeChild(el)

  const sourceExp = inMatch[2].trim()
  let valueExp = inMatch[1].trim().replace(stripParensRE, '').trim()
  let destructureBindings: string[] | undefined
  let isArrayDestructure = false
  let indexExp: string | undefined
  let objIndexExp: string | undefined

  // 解析出 节点的标识
  let keyAttr = 'key'
  let keyExp =
    el.getAttribute(keyAttr) ||
    el.getAttribute((keyAttr = ':key')) ||
    el.getAttribute((keyAttr = 'v-bind:key'))
  if (keyExp) {
    el.removeAttribute(keyAttr)
    if (keyAttr === 'key') keyExp = JSON.stringify(keyExp)
  }

  let match
  if ((match = valueExp.match(forIteratorRE))) {
    valueExp = valueExp.replace(forIteratorRE, '').trim()
    indexExp = match[1].trim()
    if (match[2]) {
      objIndexExp = match[2].trim()
    }
  }

  if ((match = valueExp.match(destructureRE))) {
    destructureBindings = match[1].split(',').map((s) => s.trim())
    isArrayDestructure = valueExp[0] === '['
  }


  let mounted = false
  let blocks: Block[]
  let childCtxs: Context[]
  let keyToIndexMap: Map<any, number>

  // 通过判断source的数据类型，返回子数组
  const createChildContexts = (source: unknown): [Context[], KeyToIndexMap] => {
    const map: KeyToIndexMap = new Map()
    const ctxs: Context[] = []

    if (isArray(source)) {
      for (let i = 0; i < source.length; i++) {
        ctxs.push(createChildContext(map, source[i], i))
      }
    } else if (typeof source === 'number') {
      for (let i = 0; i < source; i++) {
        ctxs.push(createChildContext(map, i + 1, i))
      }
    } else if (isObject(source)) {
      let i = 0
      for (const key in source) {
        ctxs.push(createChildContext(map, source[key], i++, key))
      }
    }

    return [ctxs, map]
  }

  const createChildContext = (
    map: KeyToIndexMap,
    value: any,
    index: number,
    objKey?: string
  ): Context => {
    // #region 组装子项的数据。通过给子项目定义的 value名字(valueExp)和键名(indexExp) 组成一个新的数据
    const data: any = {}        // {item: Proxy, index: index}
    if (destructureBindings) {
      destructureBindings.forEach(
        (b, i) => (data[b] = value[isArrayDestructure ? i : b])
      )
    } else {
      data[valueExp] = value
    }
    if (objKey) {
      indexExp && (data[indexExp] = objKey)
      objIndexExp && (data[objIndexExp] = index)
    } else {
      indexExp && (data[indexExp] = index)
    }
    //#endregion

    const childCtx = createScopedContext(ctx, data)     // 包含了当前子项数据和ctx
    console.log('keyExp: ', keyExp)
    const key = keyExp ? evaluate(childCtx.scope, keyExp) : index
    map.set(key, index)

    console.log('map: ', map,  '\n key : ',key, '\n index: ', index)
    childCtx.key = key
    return childCtx
  }

  const mountBlock = (ctx: Context, ref: Node) => {
    console.log('=========mountBlock ==========')
    const block = new Block(el, ctx)
    block.key = ctx.key
    block.insert(parent, ref)   // parent.insertBefore(this.template, anchor)
    return block
  }

  ctx.effect(() => {
    const source = evaluate(ctx.scope, sourceExp)   // 返回 数组proxy对象
    const prevKeyToIndexMap = keyToIndexMap
    ;[childCtxs, keyToIndexMap] = createChildContexts(source)

    console.log('childCtxs: ', childCtxs, keyToIndexMap)
    if (!mounted) {
        // 初始化时候添加
      blocks = childCtxs.map((s) => mountBlock(s, anchor))  // 每次在锚点前添加
      mounted = true
    } else {
        // 数组改变
      for (let i = 0; i < blocks.length; i++) {
        if (!keyToIndexMap.has(blocks[i].key)) {
          blocks[i].remove()
        }
      }
      
      const nextBlocks: Block[] = []
      let i = childCtxs.length
      let nextBlock: Block | undefined
      let prevMovedBlock: Block | undefined
      while (i--) {
        const childCtx = childCtxs[i]
        const oldIndex = prevKeyToIndexMap.get(childCtx.key)
        let block
        if (oldIndex == null) {
          // new 新增节点
          block = mountBlock(
            childCtx,
            nextBlock ? nextBlock.el : anchor
          )
        } else {
          // update 更新节点
          block = blocks[oldIndex]
          Object.assign(block.ctx.scope, childCtx.scope)    // 合并数据
          if (oldIndex !== i) {
            // moved
            if (
              blocks[oldIndex + 1] !== nextBlock || 
              // If the next has moved, it must move too
              prevMovedBlock === nextBlock
            ) {
              prevMovedBlock = block
              block.insert(parent, nextBlock ? nextBlock.el : anchor)
            }
          }
        }
        nextBlocks.unshift(nextBlock = block)
      }
      blocks = nextBlocks
    }
  })

  return nextNode
}
