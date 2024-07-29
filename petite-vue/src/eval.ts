/*
 * @Author: zc
 * @Date: 2022-01-27 18:28:30
 * @LastEditors: zc
 * @LastEditTime: 2024-06-11 14:54:29
 * @FilePath: /core-main/Users/limo/github/source-code-collection/petite-vue/src/eval.ts
 */
const evalCache: Record<string, Function> = Object.create(null)

/**
 * 将表达式转为函数
 * 
 * 后续所有获取数据的方式都是通过 with函数包裹的方式，将scope提前绑定作为作用域链
 * @param scope 
 * @param exp 
 * @param el 
 * @returns 
 */
export const evaluate = (scope: any, exp: string, el?: Node) =>
  execute(scope, `return(${exp})`, el)


// 缓存表达式的函数
export const execute = (scope: any, exp: string, el?: Node) => {
  const fn = evalCache[exp] || (evalCache[exp] = toFunction(exp))
//   console.log('execute: ', fn, fn(scope, el))
  try {
    return fn(scope, el);   // 生成函数中注入scope和el。这里的fn是一个函数，直接执行了并返回结果。这里直接内存中执行了。常见的 debugger:///VM***的形式。 https://si.geilicdn.com/img-5bf30000018fe71a7c640a21146b-unadjust_818_196.png
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn(`Error when evaluating expression "${exp}":`)
    }
    console.error(e)
  }
}
/**
 * 
 * @param exp 创建函数，并将数据$data注入进去
 * $data：则代表 ctx.scope.$refs 。不过设置了多层代理（MutableReactiveHandler extends BaseReactiveHandler）;.
 * 
 * https://si.geilicdn.com/img-2d880000018fe77e40240a23057e-unadjust_1281_1147.png
 * 证明方式可以通过断点click的内存函数，能够打印出挂载在 ctx.scope 下的所有属性，包括但不限于 $nextTick / $s / $refs 等等
 * 
 * 
 * 
 * 关于with的相关解释
 * 
 * with 语句扩展一个语句的作用域链
 * 
 * with (expression)
    statement

    expression： 将给定的表达式添加到在评估语句时使用的作用域链上。
 * @returns 
 */
const toFunction = (exp: string): Function => {
  try {
    return new Function(`$data`, `$el`, `with($data){console.log('$data: ', $data); ${exp}}`)
  } catch (e) {
    console.error(`${(e as Error).message} in expression: ${exp}`)
    return () => {}
  }
}
