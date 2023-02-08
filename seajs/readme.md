访问https://github.com/seajs/examples/blob/master/app/hello.html 打印 seajs 对象

```js
{
"Module": function(){
    STATUS: {FETCHING: 1, SAVED: 2, LOADING: 3, LOADED: 4, EXECUTING: 5, …}
    define: ƒ (id, deps, factory)
    get: ƒ (uri, deps)
    preload: ƒ (callback)
    resolve: ƒ (id, refUri)
    save: ƒ (uri, meta)
    use : ƒ (ids, callback, uri)
    prototype: {
        exec: ƒ ()
        fetch: ƒ (requestCache)
        load: ƒ ()
        onload: ƒ ()
        resolve: ƒ ()
    }
},
"version":"2.2.1",
"data":{
"events":{

        },
        "fetchedList":{
            "file:///Users/limo/Downloads/examples-master/static/hello/src/main.js":true,
            "file:///Users/limo/Downloads/examples-master/static/hello/src/spinning.js":true,
            "file:///Users/limo/Downloads/examples-master/sea-modules/jquery/jquery/1.10.1/jquery.js":true
        },
        "base":"file:///Users/limo/Downloads/examples-master/sea-modules/",
        "dir":"file:///Users/limo/Downloads/examples-master/sea-modules/seajs/seajs/2.2.0/",
        "cwd":"file:///Users/limo/Downloads/examples-master/app/",
        "charset":"utf-8",
        "preload":[

        ],
        "alias":{
            "jquery":"jquery/jquery/1.10.1/jquery.js"
        }
    },
    "cache":{
        "file:///Users/limo/Downloads/examples-master/sea-modules/jquery/jquery/1.10.1/jquery.js":{
            "uri":"file:///Users/limo/Downloads/examples-master/sea-modules/jquery/jquery/1.10.1/jquery.js",
            "dependencies":[

            ],
            "status":6,
            "id":"jquery/jquery/1.10.1/jquery"
        }
    },
    "config": func,
    "emit": func,
    "on": func,
    "request": func,
    "require": func,
    "resolve": func,
    "use": func

}

```

-   require 方法

    require 是 seajs 提供用于加载其他模块的方法，而函数内部是将 define 提供的工厂函数字符串化，再正则匹配 `require()`相关代码，收集需要依赖的模块，所以该模块文件中所有用到 require()方法加载的模块资源都会加载。如果有异步逻辑延迟执行，则可以通过 require.async 来处理

## 拓展部分

-   apply 方法

    Module.use 中接受多个模块，通过收集模块的返回结果，通过 apply 将结果返回

```
var exports = []
var uris = mod.resolve()

// 执行模块列表函数，返回结果放置在exports
for (var i = 0, len = uris.length; i < len; i++) {
    exports[i] = cachedMods[uris[i]].exec()
}

// 执行回调函数。 apply将数组参数逐个传入
// apply(null, [param1, param2]) => 函数接收到的是  func(param1, param2)
if (callback) {
    callback.apply(global, exports)
}
```

-   apply 扩展使用

```
Math.max.apply(null, [1,2,3,...])
```

-   apply vs call

```
function aa(){
    // 接收两个参数
    console.log(arguments)  // Arguments(2) [1, 2, callee: ƒ, Symbol(Symbol.iterator): ƒ]
}

aa.call(null, 1,2)

aa.apply(null, [1,2])
```
