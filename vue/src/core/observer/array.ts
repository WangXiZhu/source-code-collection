/*
 * @Author: zc
 * @Date: 2023-07-24 15:45:36
 * @LastEditors: zc
 * @LastEditTime: 2023-07-31 17:13:05
 * @FilePath: /vue/src/core/observer/array.ts
 */
/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { TriggerOpTypes } from '../../v3'
import { def } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 *
 * 处理数组中新增元素的情况。
 * 目前的方式都是通过拦截数组的API实现的，如果直接通过数组下标修改数据则数据监听不生效
 * arr[0] = 1 则这种场景下，需要调用 $set来更新数据。 created周期中通过数组设置数据是生效的，mounted周期中则不生效
 * delete arr[0] 通过 $delete,   Vue.$delete(arr, 0);   Vue.delete( target, propertyName/index )
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator(...args) {
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)  // 入参的第三项及以后都是插入的元素  [1,2,3].splice(0,1, 3,4)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    if (__DEV__) {
      ob.dep.notify({
        type: TriggerOpTypes.ARRAY_MUTATION,
        target: this,
        key: method
      })
    } else {
      ob.dep.notify() // 触发监听
    }
    return result
  })
})
