/**
 * looseEqual： 判断数据是否相等
 * looseIndexOf： 查找对应的坐标
 */
import { isArray, looseEqual, looseIndexOf, toNumber } from '@vue/shared'
import { Directive } from '.'
import { listen } from '../utils'

export const model: Directive<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
> = ({ el, exp, get, effect, modifiers }) => {
  const type = el.type
  const assign = get(`(val) => { debugger; ${exp} = val }`) // 赋值函数
  const { trim, number = type === 'number' } = modifiers || {}

  if (el.tagName === 'SELECT') {
    // 处理 <select> 标签
    const sel = el as HTMLSelectElement

    // 监听dom操作
    listen(el, 'change', () => {
      const selectedVal = Array.prototype.filter
        .call(sel.options, (o: HTMLOptionElement) => o.selected)
        .map((o: HTMLOptionElement) =>
          number ? toNumber(getValue(o)) : getValue(o)
        )
      assign(sel.multiple ? selectedVal : selectedVal[0])   // 给对应的v-model赋值。直接更新scope上「exp」属性的值
    })

    // 上面通过assign给model更新数据后，reactivity会更新该effect的回调。 数据一旦修改完毕，则会 trigger  set事件。如果有其他地方引用，则更新数据
    effect(() => {
        //#region 更新dom中的数据。在v-model初始化的时候，需要通过该方法渲染出正确的结点。一旦执行，即使去掉后续功能也是正常的
      const value = get()   // 更新后的数据
      const isMultiple = sel.multiple
      for (let i = 0, l = sel.options.length; i < l; i++) {
        const option = sel.options[i]
        const optionValue = getValue(option)
        if (isMultiple) {
          if (isArray(value)) {
            option.selected = looseIndexOf(value, optionValue) > -1
          } else {
            option.selected = value.has(optionValue)
          }
        } else {
          if (looseEqual(getValue(option), value)) {
            if (sel.selectedIndex !== i) sel.selectedIndex = i      // 通过dom操作<select></select>更新下标
            return
          }
        }
      }
      if (!isMultiple && sel.selectedIndex !== -1) {
        sel.selectedIndex = -1
      }
      //#endregion
    })
  } else if (type === 'checkbox') {
    listen(el, 'change', () => {
      const modelValue = get()
      const checked = (el as HTMLInputElement).checked
      if (isArray(modelValue)) {
        const elementValue = getValue(el)
        const index = looseIndexOf(modelValue, elementValue)
        const found = index !== -1
        if (checked && !found) {
          assign(modelValue.concat(elementValue))
        } else if (!checked && found) {
          const filtered = [...modelValue]
          filtered.splice(index, 1)
          assign(filtered)
        }
      } else {
        assign(getCheckboxValue(el as HTMLInputElement, checked))
      }
    })

    let oldValue: any
    effect(() => {
      const value = get()
      if (isArray(value)) {
        ;(el as HTMLInputElement).checked =
          looseIndexOf(value, getValue(el)) > -1
      } else if (value !== oldValue) {
        ;(el as HTMLInputElement).checked = looseEqual(
          value,
          getCheckboxValue(el as HTMLInputElement, true)
        )
      }
      oldValue = value
    })
  } else if (type === 'radio') {
    listen(el, 'change', () => {
      assign(getValue(el))
    })
    let oldValue: any
    effect(() => {
      const value = get()
      if (value !== oldValue) {
        ;(el as HTMLInputElement).checked = looseEqual(value, getValue(el))
      }
    })
  } else {
    // text-like  类文本的输入框。如 type为 text/textarea/passport等等
    const resolveValue = (val: string) => {
      if (trim) return val.trim()
      if (number) return toNumber(val)
      return val
    }

    // 优化非直接输入的情况下，input事件多次调用。eg: 中文输入会触发该事件！
    listen(el, 'compositionstart', onCompositionStart)
    listen(el, 'compositionend', onCompositionEnd)

    // 通过lazy修饰符监听change或者input事件
    listen(el, modifiers?.lazy ? 'change' : 'input', () => {
      if ((el as any).composing) return // compositionstart事件触发中
      assign(resolveValue(el.value))
    })
    if (trim) {
      listen(el, 'change', () => {
        el.value = el.value.trim()
      })
    }

    effect(() => {
      if ((el as any).composing) {
        return
      }
      const curVal = el.value
      const newVal = get()
      // document.activeElement当前激活的节点
      if (document.activeElement === el && resolveValue(curVal) === newVal) {
        return
      }
      if (curVal !== newVal) {
        el.value = newVal
      }
    })
  }
}

const getValue = (el: any) => ('_value' in el ? el._value : el.value)

// retrieve raw value for true-value and false-value set via :true-value or :false-value bindings
const getCheckboxValue = (
  el: HTMLInputElement & { _trueValue?: any; _falseValue?: any },
  checked: boolean
) => {
  const key = checked ? '_trueValue' : '_falseValue'
  return key in el ? el[key] : checked
}

const onCompositionStart = (e: Event) => {
  ;(e.target as any).composing = true
}

const onCompositionEnd = (e: Event) => {
  const target = e.target as any
  if (target.composing) {
    target.composing = false
    trigger(target, 'input')
  }
}

const trigger = (el: HTMLElement, type: string) => {
  const e = document.createEvent('HTMLEvents')
  e.initEvent(type, true, true)
  el.dispatchEvent(e)
}
