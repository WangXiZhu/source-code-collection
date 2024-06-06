import { Directive } from '.'
import {
  normalizeClass,
  normalizeStyle,
  isString,
  isArray,
  hyphenate,
  camelize
} from '@vue/shared'

const forceAttrRE = /^(spellcheck|draggable|form|list|type)$/

export const bind: Directive<Element & { _class?: string }> = ({
  el,
  get,
  effect,
  arg,
  modifiers
}) => {
  let prevValue: any

  // 当前模版中的className临时赋值为 _class
  // record static class
  if (arg === 'class') {
    el._class = el.className
  }

  effect(() => {
    let value = get()
    if (arg) {
      if (modifiers?.camel) {
        arg = camelize(arg)
      }
      setProp(el, arg, value, prevValue)
    } else {
      for (const key in value) {
        setProp(el, key, value[key], prevValue && prevValue[key])
      }
      for (const key in prevValue) {
        if (!value || !(key in value)) {
          setProp(el, key, null)
        }
      }
    }
    prevValue = value
  })
}


/**
 * 不同的属性值赋值
 * 1、class
 * 2、style
 * @param el 
 * @param key 
 * @param value 
 * @param prevValue 
 */
const setProp = (
  el: Element & { _class?: string },
  key: string,
  value: any,
  prevValue?: any
) => {
    // 设置class属性
    console.log('set-Prop-class key: ', key, el._class, value)

  if (key === 'class') {
    el.setAttribute(
      'class',
      normalizeClass(el._class ? [el._class, value] : value) || ''
    )
  } else if (key === 'style') {
    value = normalizeStyle(value)
    const { style } = el as HTMLElement
    if (!value) {
      el.removeAttribute('style')
    } else if (isString(value)) {
      if (value !== prevValue) style.cssText = value
    } else {
      for (const key in value) {
        setStyle(style, key, value[key])
      }
      if (prevValue && !isString(prevValue)) {
        for (const key in prevValue) {
          if (value[key] == null) {
            setStyle(style, key, '')
          }
        }
      }
    }
  } else if (
    !(el instanceof SVGElement) &&
    key in el &&
    !forceAttrRE.test(key)
  ) {
    console.log('set-Prop3: ', key, value)
    // @ts-ignore
    el[key] = value
    if (key === 'value') {
      // @ts-ignore
      el._value = value
    }
  } else {
    console.log('set-Prop4: ', key, value)

    // special case for <input v-model type="checkbox"> with
    // :true-value & :false-value
    // store value as dom properties since non-string values will be
    // stringified.
    if (key === 'true-value') {
      ;(el as any)._trueValue = value
    } else if (key === 'false-value') {
      ;(el as any)._falseValue = value
    } else if (value != null) {
      el.setAttribute(key, value)
    } else {
      el.removeAttribute(key)
    }
  }
}

const importantRE = /\s*!important$/

const setStyle = (
  style: CSSStyleDeclaration,
  name: string,
  val: string | string[]
) => {
  if (isArray(val)) {
    val.forEach((v) => setStyle(style, name, v))
  } else {
    if (name.startsWith('--')) {
      // custom property definition
      style.setProperty(name, val)
    } else {
      if (importantRE.test(val)) {
        // !important
        style.setProperty(
          hyphenate(name),
          val.replace(importantRE, ''),
          'important'
        )
      } else {
        style[name as any] = val
      }
    }
  }
}
