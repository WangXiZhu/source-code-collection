import { builtInDirectives, Directive } from './directives'
import { _if } from './directives/if'
import { _for } from './directives/for'
import { bind } from './directives/bind'
import { on } from './directives/on'
import { text } from './directives/text'
import { evaluate } from './eval'
import { checkAttr } from './utils'
import { ref } from './directives/ref'
import { Context, createScopedContext } from './context'

const dirRE = /^(?:v-|:|@)/
const modifierRE = /\.([\w-]+)/g

export let inOnce = false

export const walk = (node: Node, ctx: Context): ChildNode | null | void => {
  const type = node.nodeType

  console.log('walk node type: ', type)
  
  if (type === 1) { // ELEMENT_NODE。An Element node like <p> or <div>.
    // Element
    const el = node as Element
    if (el.hasAttribute('v-pre')) {
      return
    }

    checkAttr(el, 'v-cloak')

    let exp: string | null

    // 将 v-if的表达式整体传入到 _if函数中
    // v-if
    if ((exp = checkAttr(el, 'v-if'))) {
      return _if(el, exp, ctx)
    }

    // v-for
    if ((exp = checkAttr(el, 'v-for'))) {
      return _for(el, exp, ctx)
    }

    // v-scope
    if ((exp = checkAttr(el, 'v-scope')) || exp === '') {
      const scope = exp ? evaluate(ctx.scope, exp) : {}
      console.log('v-scope', scope)
      ctx = createScopedContext(ctx, scope)    // 创建「响应式」上下文！！！ 重要
      if (scope.$template) {
        resolveTemplate(el, scope.$template)
      }
    }

    // v-once
    const hasVOnce = checkAttr(el, 'v-once') != null
    if (hasVOnce) {
      inOnce = true
    }

    // ref
    if ((exp = checkAttr(el, 'ref'))) {
      applyDirective(el, ref, `"${exp}"`, ctx)
    }

    // 先处理子节点
    // process children first before self attrs
    walkChildren(el, ctx)

    // other directives
    const deferred: [string, string][] = []
    for (const { name, value } of [...el.attributes]) {
      if (dirRE.test(name) && name !== 'v-cloak') {
        if (name === 'v-model') {
          // defer v-model since it relies on :value bindings to be processed
          // first, but also before v-on listeners (#73)
          deferred.unshift([name, value])
        } else if (name[0] === '@' || /^v-on\b/.test(name)) {
          deferred.push([name, value])
        } else {
          processDirective(el, name, value, ctx)
        }
      }
    }
    for (const [name, value] of deferred) {
      processDirective(el, name, value, ctx)
    }

    if (hasVOnce) {
      inOnce = false
    }
  } else if (type === 3) {  // TEXT_NODE。The actual Text inside an Element or Attr.
    // Text
    const data = (node as Text).data
    if (data.includes(ctx.delimiters[0])) {
      let segments: string[] = []
      let lastIndex = 0
      let match
      while ((match = ctx.delimitersRE.exec(data))) {
        const leading = data.slice(lastIndex, match.index)
        if (leading) segments.push(JSON.stringify(leading))
        segments.push(`$s(${match[1]})`)    // 展示的数据
        lastIndex = match.index + match[0].length
      }
      if (lastIndex < data.length) {
        segments.push(JSON.stringify(data.slice(lastIndex)))
      }

      console.log('segments: ', segments)
      applyDirective(node, text, segments.join('+'), ctx)
    }
  } else if (type === 11) {     // A DocumentFragment node
    walkChildren(node as DocumentFragment, ctx)
  }
}

const walkChildren = (node: Element | DocumentFragment, ctx: Context) => {
  let child = node.firstChild
  while (child) {
    child = walk(child, ctx) || child.nextSibling
  }
}
/**
 * 处理vue语法
 * :class / @click / @vue:mounted
 * @param el 
 * @param raw 
 * @param exp 
 * @param ctx 
 */
const processDirective = (
  el: Element,
  raw: string,
  exp: string,
  ctx: Context
) => {
  let dir: Directive
  let arg: string | undefined
  let modifiers: Record<string, true> | undefined

  console.log('processDirective: ', raw, exp)
  // modifiers
  raw = raw.replace(modifierRE, (_, m) => {
    ;(modifiers || (modifiers = {}))[m] = true
    return ''
  })

  if (raw[0] === ':') {
    dir = bind
    arg = raw.slice(1)
  } else if (raw[0] === '@') {
    dir = on
    arg = raw.slice(1)
  } else {
    const argIndex = raw.indexOf(':')
    const dirName = argIndex > 0 ? raw.slice(2, argIndex) : raw.slice(2)
    dir = builtInDirectives[dirName] || ctx.dirs[dirName]
    arg = argIndex > 0 ? raw.slice(argIndex + 1) : undefined
  }
  if (dir) {
    if (dir === bind && arg === 'ref') dir = ref
    applyDirective(el, dir, exp, ctx, arg, modifiers)

    el.removeAttribute(raw) // 移除vue相关语法
  } else if (import.meta.env.DEV) {
    console.error(`unknown custom directive ${raw}.`)
  }
}

const applyDirective = (
  el: Node,
  dir: Directive<any>,
  exp: string,
  ctx: Context,
  arg?: string,
  modifiers?: Record<string, true>
) => {
    // exp作为「默认数据」赋值给形参 e，并作为参数传给后续使用。 如果直接执行 get(), 则返回实际数据为scope[exp]
    // 调用evaluate函数，返回 对应表达式的封装的with 匿名函数
  const get = (e = exp) => evaluate(ctx.scope, e, el)   
  const cleanup = dir({
    el,
    get,
    effect: ctx.effect,
    ctx,
    exp,
    arg,
    modifiers
  })
  // 如果返回了函数，则存储下来。如unmounted事件，待需要清理再执行
  if (cleanup) {
    ctx.cleanups.push(cleanup)
  }
}

/**
 * el中插入模版字符串
 * @param el 
 * @param template 
 * @returns 
 */
const resolveTemplate = (el: Element, template: string) => {
  if (template[0] === '#') {
    const templateEl = document.querySelector(template)
    if (import.meta.env.DEV && !templateEl) {
      console.error(
        `template selector ${template} has no matching <template> element.`
      )
    }
    el.appendChild((templateEl as HTMLTemplateElement).content.cloneNode(true))
    return
  }
  console.log('resolveTemplate: ', template)
  el.innerHTML = template
}
