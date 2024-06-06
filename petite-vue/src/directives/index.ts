/*
 * @Author: zc
 * @Date: 2022-01-27 18:28:30
 * @LastEditors: zc
 * @LastEditTime: 2024-06-05 16:44:36
 * @FilePath: /core-main/Users/limo/Downloads/petite-vue-main/src/directives/index.ts
 */
import { Context } from '../context'
import { effect as rawEffect } from '../reactivity'
import { bind } from './bind'
import { on } from './on'
import { show } from './show'
import { text } from './text'
import { html } from './html'
import { model } from './model'
import { effect } from './effect'

export interface Directive<T = Element> {
  (ctx: DirectiveContext<T>): (() => void) | void
}

export interface DirectiveContext<T = Element> {
  el: T
  get: (exp?: string) => any
  effect: typeof rawEffect
  exp: string
  arg?: string
  modifiers?: Record<string, true>
  ctx: Context
}

export const builtInDirectives: Record<string, Directive<any>> = {
  bind,
  on,
  show,
  text,
  html,
  model,
  effect
}
