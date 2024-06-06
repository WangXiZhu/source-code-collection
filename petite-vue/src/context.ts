/*
 * @Author: zc
 * @Date: 2022-01-27 18:28:30
 * @LastEditors: zc
 * @LastEditTime: 2024-06-05 16:44:05
 * @FilePath: /core-main/Users/limo/Downloads/petite-vue-main/src/context.ts
 */
import {
  effect as rawEffect,
  reactive,
  ReactiveEffectRunner
} from './reactivity'
import { Block } from './block'
import { Directive } from './directives'
import { queueJob } from './scheduler'
import { inOnce } from './walk'
export interface Context {
  key?: any
  scope: Record<string, any>
  dirs: Record<string, Directive>
  blocks: Block[]
  effect: typeof rawEffect
  effects: ReactiveEffectRunner[]
  cleanups: (() => void)[]
  delimiters: [string, string]
  delimitersRE: RegExp
}

export const createContext = (parent?: Context): Context => {
  const ctx: Context = {
    delimiters: ['{{', '}}'],
    delimitersRE: /\{\{([^]+?)\}\}/g,
    ...parent,
    scope: parent ? parent.scope : reactive({}),
    dirs: parent ? parent.dirs : {},
    effects: [],
    blocks: [],
    cleanups: [],
    effect: (fn) => {
      if (inOnce) {
        queueJob(fn)
        return fn as any
      }
      const e: ReactiveEffectRunner = rawEffect(fn, {
        scheduler: () => queueJob(e)
      })
      ctx.effects.push(e)
      return e
    }
  }
  return ctx
}

export const createScopedContext = (ctx: Context, data = {}): Context => {
  const parentScope = ctx.scope
  const mergedScope = Object.create(parentScope)
  Object.defineProperties(mergedScope, Object.getOwnPropertyDescriptors(data))
  mergedScope.$refs = Object.create(parentScope.$refs)
  const reactiveProxy = reactive(
    new Proxy(mergedScope, {
      set(target, key, val, receiver) {
        // 当前scope上如果不存在属性值，则创建在父scope上？
        // when setting a property that doesn't exist on current scope,
        // do not create it on the current scope and fallback to parent scope.


        // fix : 使用target.hasOwnProperty会调用 @vue/reactivity/dist/reactivity.esm-bundler.js 中 内部函数hasOwnProperty，
        // 而该方法内又直接调用了 obj.hasOwnProperty函数，这时候会进入get函数。get函数中如果判断key是“hasOwnProperty”则又返回函数 hasOwnProperty,导致死循环。 https://si.geilicdn.com/img-220b0000018fe7498ca70a239846-unadjust_632_641.png

        /**
         * 
         修改内部方法 hasOwnProperty
         function hasOwnProperty(key) {
            const obj = toRaw(this);
            track(obj, "has", key);
            //   return obj.hasOwnProperty(key);
            return Object.prototype.hasOwnProperty.call(obj, key)
            }
         * 
         */
        if (receiver === reactiveProxy && !target.hasOwnProperty(key)) { // 修复前： 
        // if (receiver === reactiveProxy && !Object.prototype.hasOwnProperty.call(target, key)) {
          return Reflect.set(parentScope, key, val)
        }
        return Reflect.set(target, key, val, receiver)
      }
    })
  )

  bindContextMethods(reactiveProxy)
  return {
    ...ctx,
    scope: reactiveProxy
  }
}

// 将scope注入到声明的函数中，这样函数通过this.xxx 就可以访问或者修改scope下的数据
export const bindContextMethods = (scope: Record<string, any>) => {
  for (const key of Object.keys(scope)) {
    if (typeof scope[key] === 'function') {
      scope[key] = scope[key].bind(scope)
    }
  }
}
