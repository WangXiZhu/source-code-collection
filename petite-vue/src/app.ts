/*
 * @Author: zc
 * @Date: 2022-01-27 18:28:30
 * @LastEditors: zc
 * @LastEditTime: 2024-06-05 16:43:34
 * @FilePath: /core-main/Users/limo/Downloads/petite-vue-main/src/app.ts
 */
import { reactive } from './reactivity'
import { Block } from './block'
import { Directive } from './directives'
import { bindContextMethods, createContext } from './context'
import { toDisplayString } from './directives/text'
import { nextTick } from './scheduler'

const escapeRegex = (str: string) =>
  str.replace(/[-.*+?^${}()|[\]\/\\]/g, '\\$&')

export const createApp = (initialData?: any) => {
    // 浏览器已经把html转为了dom节点

    // return;
  // root context
  
  const ctx = createContext()

  if (initialData) {
    // 初始化数据改为响应式
    ctx.scope = reactive(initialData)

  console.log('ctx: ', ctx)

    // 将声明的methods内部函数挂载在this变量上
    bindContextMethods(ctx.scope)

    // 自定义模版语言的数据开闭规则。比较适用在服务器单括号场景 $delimiters: ['${', '}']
    // handle custom delimiters
    if (initialData.$delimiters) {
      const [open, close] = (ctx.delimiters = initialData.$delimiters)
      ctx.delimitersRE = new RegExp(
        escapeRegex(open) + '([^]+?)' + escapeRegex(close),
        'g'
      )
    }
  }

  // 全局辅助函数
  // global internal helpers
  ctx.scope.$s = toDisplayString        // 视图层中展示数据。在解析node.type = Text的时候会用到
  ctx.scope.$nextTick = nextTick        // 下一个任务队列中执行
  ctx.scope.$refs = Object.create(null) // 空数据，dom通过响应式改变的时候。浏览器中闭包中的数据，则是该该对象， https://si.geilicdn.com/img-2d880000018fe77e40240a23057e-unadjust_1281_1147.png

  let rootBlocks: Block[]

//   return {mount: function(){}}
  return {
    // 自定义指令
    directive(name: string, def?: Directive) {
      if (def) {
        ctx.dirs[name] = def
        return this
      } else {
        return ctx.dirs[name]
      }
    },
    /**
     * 挂载数据
     * 接收el参数，通过document.querySelector查找元素，如果找不到就找带有 v-scope 属性值的元素
     * 
     * 然后通过Block函数将template添加到视窗上
     * @param el 
     * @returns 
     */
    mount(el?: string | Element | null) {
      if (typeof el === 'string') {
        el = document.querySelector(el)
        if (!el) {
          import.meta.env.DEV &&
            console.error(`selector ${el} has no matching element.`)
          return
        }
      }

      el = el || document.documentElement
      console.log('mount: ', el)
      let roots: Element[]
      if (el.hasAttribute('v-scope')) {
        roots = [el]
      } else {
        roots = [...el.querySelectorAll(`[v-scope]`)].filter(
          (root) => !root.matches(`[v-scope] [v-scope]`)
        )
      }
      if (!roots.length) {
        roots = [el]
      }

      if (
        import.meta.env.DEV &&
        roots.length === 1 &&
        roots[0] === document.documentElement
      ) {
        console.warn(
          `Mounting on documentElement - this is non-optimal as petite-vue ` +
            `will be forced to crawl the entire page's DOM. ` +
            `Consider explicitly marking elements controlled by petite-vue ` +
            `with \`v-scope\`.`
        )
      }

      rootBlocks = roots.map((el) => new Block(el, ctx, true))
      return this
    },

    unmount() {
      rootBlocks.forEach((block) => block.teardown())
    }
  }
}
