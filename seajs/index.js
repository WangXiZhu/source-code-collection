/**
 * Sea.js 2.2.1 | seajs.org/LICENSE.md
 */

/**
 * seajs属性值概览
 {
    "Module": func,
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

模块请求前执行堆栈
Module.fetch
Module.load
Module.use
(anonymous)
Module.preload
seajs.use


模块函数发送请求后执行堆栈

Module
Module.get
Module.load
onRequest
onload
load(async)
addOnload
request
sendRequest
Module.load
Module.use
(anonymous)
Module.preload
seajs.use




 */
;(function (global, undefined) {
    // Avoid conflicting when `sea.js` is loaded multiple times
    // 避免执行加载多次脚本
    if (global.seajs) {
        return
    }

    var seajs = (global.seajs = {
        // The current version of Sea.js being used
        version: "2.2.1"
    })

    var data = (seajs.data = {})

    /**
     * 工具函数。用于判断类型
     * util-lang.js - The minimal language enhancement
     */

    function isType(type) {
        return function (obj) {
            return {}.toString.call(obj) == "[object " + type + "]"
        }
    }

    var isObject = isType("Object")
    var isString = isType("String")
    var isArray = Array.isArray || isType("Array")
    var isFunction = isType("Function")

    var _cid = 0
    function cid() {
        return _cid++
    }

    /**
     * 事件通信管理
     * util-events.js - The minimal events support
     */

    var events = (data.events = {})

    // Bind event
    seajs.on = function (name, callback) {
        var list = events[name] || (events[name] = [])
        list.push(callback)
        return seajs // 返回seajs本身，可进行链式调用
    }

    // Remove event. If `callback` is undefined, remove all callbacks for the
    // event. If `event` and `callback` are both undefined, remove all callbacks
    // for all events
    seajs.off = function (name, callback) {
        // Remove *all* events
        if (!(name || callback)) {
            events = data.events = {}
            return seajs
        }

        var list = events[name]
        if (list) {
            if (callback) {
                for (var i = list.length - 1; i >= 0; i--) {
                    if (list[i] === callback) {
                        list.splice(i, 1)
                    }
                }
            } else {
                delete events[name]
            }
        }

        return seajs
    }

    // 触发事件。对外暴露该函数，同时声明变量，函数内部可用
    // Emit event, firing all bound callbacks. Callbacks receive the same
    // arguments as `emit` does, apart from the event name
    var emit = (seajs.emit = function (name) {
        var list = events[name],
            fn

        if (list) {
            // Copy callback lists to prevent modification
            list = list.slice() // 拷贝一份数据
            var args = Array.prototype.slice.call(arguments, 1) // 获取emit除事件名称外所有的参数
            // Execute event callbacks
            while ((fn = list.shift())) {
                fn.apply(null, args)
            }
        }

        return seajs
    })

    /**
     * util-path.js - The utilities for operating path such as id, uri
     */

    var DIRNAME_RE = /[^?#]*\//

    var DOT_RE = /\/\.\//g
    var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//
    var DOUBLE_SLASH_RE = /([^:/])\/\//g

    // 获取资源的上级资源名称
    // Extract the directory portion of a path
    // dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
    // ref: http://jsperf.com/regex-vs-split/2
    function dirname(path) {
        return path.match(DIRNAME_RE)[0]
    }

    // Canonicalize a path
    // realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c"
    function realpath(path) {
        // /a/b/./c/./d ==> /a/b/c/d
        path = path.replace(DOT_RE, "/")

        // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
        while (path.match(DOUBLE_DOT_RE)) {
            path = path.replace(DOUBLE_DOT_RE, "/")
        }

        // a//b/c  ==>  a/b/c
        path = path.replace(DOUBLE_SLASH_RE, "$1/")

        return path
    }

    // Normalize an id
    // normalize("path/to/a") ==> "path/to/a.js"
    // NOTICE: substring is faster than negative slice and RegExp
    function normalize(path) {
        var last = path.length - 1
        var lastC = path.charAt(last)

        // If the uri ends with `#`, just return it without '#'
        if (lastC === "#") {
            return path.substring(0, last)
        }

        return path.substring(last - 2) === ".js" || path.indexOf("?") > 0 || path.substring(last - 3) === ".css" || lastC === "/"
            ? path
            : path + ".js"
    }

    var PATHS_RE = /^([^/:]+)(\/.+)$/
    var VARS_RE = /{([^{]+)}/g

    function parseAlias(id) {
        var alias = data.alias
        return alias && isString(alias[id]) ? alias[id] : id
    }

    function parsePaths(id) {
        var paths = data.paths
        var m

        if (paths && (m = id.match(PATHS_RE)) && isString(paths[m[1]])) {
            id = paths[m[1]] + m[2]
        }

        return id
    }

    function parseVars(id) {
        var vars = data.vars

        if (vars && id.indexOf("{") > -1) {
            id = id.replace(VARS_RE, function (m, key) {
                return isString(vars[key]) ? vars[key] : m
            })
        }

        return id
    }

    function parseMap(uri) {
        var map = data.map
        var ret = uri

        if (map) {
            for (var i = 0, len = map.length; i < len; i++) {
                var rule = map[i]

                ret = isFunction(rule) ? rule(uri) || uri : uri.replace(rule[0], rule[1])

                // Only apply the first matched rule
                if (ret !== uri) break
            }
        }

        return ret
    }

    var ABSOLUTE_RE = /^\/\/.|:\// //  =>  //.|:/
    var ROOT_DIR_RE = /^.*?\/\/.*?\// //  => ^.*?//.*?/

    function addBase(id, refUri) {
        var ret
        var first = id.charAt(0)

        // Absolute
        if (ABSOLUTE_RE.test(id)) {
            ret = id
        }
        // Relative
        else if (first === ".") {
            ret = realpath((refUri ? dirname(refUri) : data.cwd) + id)
        }
        // Root
        else if (first === "/") {
            var m = data.cwd.match(ROOT_DIR_RE)
            ret = m ? m[0] + id.substring(1) : id
        }
        // Top-level
        else {
            ret = data.base + id
        }

        // Add default protocol when uri begins with "//"
        if (ret.indexOf("//") === 0) {
            ret = location.protocol + ret
        }

        return ret
    }

    // seajs.config接受不同的参数，该方法接收这些参数并处理出真正需要加载的资源链接
    // https://github.com/seajs/seajs/issues/262
    function id2Uri(id, refUri) {
        if (!id) return ""

        id = parseAlias(id)
        id = parsePaths(id)
        id = parseVars(id)
        id = normalize(id)

        var uri = addBase(id, refUri)
        uri = parseMap(uri)

        return uri
    }

    var doc = document
    var cwd = dirname(doc.URL) // 当前文档对象的资源链接。与document.location.href 属性的值是相等的
    var scripts = doc.scripts // 当前文档对象中所有脚本对象

    // Recommend to add `seajsnode` id for the `sea.js` script element
    var loaderScript = doc.getElementById("seajsnode") || scripts[scripts.length - 1]

    // When `sea.js` is inline, set loaderDir to current working directory
    var loaderDir = dirname(getScriptAbsoluteSrc(loaderScript) || cwd) // 记载资源的基础路径

    // 获取脚本的src地址
    function getScriptAbsoluteSrc(node) {
        return node.hasAttribute // non-IE6/7
            ? node.src
            : // see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
              node.getAttribute("src", 4)
    }

    // For Developers
    seajs.resolve = id2Uri

    /**
     * 加载脚本和样式文件
     * util-request.js - The utilities for requesting script and style files
     * ref: tests/research/load-js-css/test.html
     */

    var head = doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement
    var baseElement = head.getElementsByTagName("base")[0] // <base> 标签为页面上的所有链接规定默认地址或默认目标

    var IS_CSS_RE = /\.css(?:\?|$)/i
    var currentlyAddingScript
    var interactiveScript

    // `onload` event is not supported in WebKit < 535.23 and Firefox < 9.0
    // ref:
    //  - https://bugs.webkit.org/show_activity.cgi?id=38995
    //  - https://bugzilla.mozilla.org/show_bug.cgi?id=185236
    //  - https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events
    var isOldWebKit = +navigator.userAgent.replace(/.*(?:AppleWebKit|AndroidWebKit)\/(\d+).*/, "$1") < 536

    function request(url, callback, charset) {
        var isCSS = IS_CSS_RE.test(url)
        var node = doc.createElement(isCSS ? "link" : "script") // 创建结点

        // 支持 charset为函数或者普通字符串
        if (charset) {
            var cs = isFunction(charset) ? charset(url) : charset
            if (cs) {
                node.charset = cs
            }
        }

        addOnload(node, callback, isCSS, url)

        if (isCSS) {
            node.rel = "stylesheet"
            node.href = url
        } else {
            node.async = true // 设置异步属性
            node.src = url
        }

        // For some cache cases in IE 6-8, the script executes IMMEDIATELY after
        // the end of the insert execution, so use `currentlyAddingScript` to
        // hold current node, for deriving url in `define` call
        currentlyAddingScript = node

        // ref: #185 & http://dev.jquery.com/ticket/2709
        // 如果当前页面中有base标签，则资源前置到base标签前，否则直接在head中添加
        baseElement ? head.insertBefore(node, baseElement) : head.appendChild(node)

        currentlyAddingScript = null
    }

    /**
     * @description: 脚本添加onload监听器
     * @param {*} node 当前结点
     * @param {*} callback 回调函数
     * @param {*} isCSS 判断是否是css样式表
     * @param {*} url 当前结点的url
     * @return {*}
     */
    function addOnload(node, callback, isCSS, url) {
        var supportOnload = "onload" in node

        // for Old WebKit and Old Firefox
        if (isCSS && (isOldWebKit || !supportOnload)) {
            setTimeout(function () {
                pollCss(node, callback)
            }, 1) // Begin after node insertion
            return
        }

        if (supportOnload) {
            // FireFox
            node.onload = onload
            node.onerror = function () {
                emit("error", { uri: url, node: node })
                onload()
            }
        } else {
            // IE
            // 监听“readystatechange”。 每当 readyState 的值变化都会执行该函数
            node.onreadystatechange = function () {
                if (/loaded|complete/.test(node.readyState)) {
                    onload()
                }
            }
        }

        function onload() {
            // 保证函数只执行一次，防止内存泄漏
            // Ensure only run once and handle memory leak in IE
            node.onload = node.onerror = node.onreadystatechange = null

            // 移除结点，防止内存泄漏？
            // Remove the script to reduce memory leak
            if (!isCSS && !data.debug) {
                head.removeChild(node)
            }

            // 结点释放
            // Dereference the node
            node = null

            callback()
        }
    }

    /**
     * @description: 轮询加载css文件
     * @param {*} node
     * @param {*} callback
     * @return {*}
     */
    function pollCss(node, callback) {
        var sheet = node.sheet
        var isLoaded

        // for WebKit < 536
        if (isOldWebKit) {
            if (sheet) {
                isLoaded = true
            }
        }
        // for Firefox < 9.0
        else if (sheet) {
            try {
                if (sheet.cssRules) {
                    isLoaded = true
                }
            } catch (ex) {
                // The value of `ex.name` is changed from "NS_ERROR_DOM_SECURITY_ERR"
                // to "SecurityError" since Firefox 13.0. But Firefox is less than 9.0
                // in here, So it is ok to just rely on "NS_ERROR_DOM_SECURITY_ERR"
                if (ex.name === "NS_ERROR_DOM_SECURITY_ERR") {
                    isLoaded = true
                }
            }
        }

        setTimeout(function () {
            if (isLoaded) {
                // Place callback here to give time for style rendering
                callback()
            } else {
                pollCss(node, callback)
            }
        }, 20)
    }

    /**
     * @description: 返回当前正在加载的脚本
     * @return {*}
     */
    function getCurrentScript() {
        if (currentlyAddingScript) {
            return currentlyAddingScript
        }

        // For IE6-9 browsers, the script onload event may not fire right
        // after the script is evaluated. Kris Zyp found that it
        // could query the script nodes and the one that is in "interactive"
        // mode indicates the current script
        // ref: http://goo.gl/JHfFW

        // document.readyState
        // loading（正在加载）；
        // interactive（可交互）；文档已被解析，"正在加载"状态结束，但是诸如图像，样式表和框架之类的子资源仍在加载
        // complete（完成）。文档和所有子资源已完成加载。表示 load 状态的事件即将被触发。
        if (interactiveScript && interactiveScript.readyState === "interactive") {
            return interactiveScript
        }

        var scripts = head.getElementsByTagName("script")

        // 返回head中可交互的脚本？ 只能同时存在一个可交互的脚本？
        for (var i = scripts.length - 1; i >= 0; i--) {
            var script = scripts[i]
            if (script.readyState === "interactive") {
                interactiveScript = script
                return interactiveScript
            }
        }
    }

    // For Developers
    seajs.request = request

    /**
     * util-deps.js - The parser for dependencies
     * ref: tests/research/parse-dependencies/test.html
     */
    // 收集依赖项 dependencies
    var REQUIRE_RE =
        /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g
    var SLASH_RE = /\\\\/g // 斜杠

    /**
     * 代码字符串中获取依赖
     * function(require) {
     *  var Spinning = require('./spinning');
     *  var s = new Spinning('#container');
     *  s.render();
     * }
     *
     * =>
     *
     * ['./spinning']
     * @param {*} code
     * @returns
     */
    function parseDependencies(code) {
        var ret = []

        code.replace(SLASH_RE, "").replace(REQUIRE_RE, function (m, m1, m2) {
            if (m2) {
                ret.push(m2)
            }
        })

        return ret
    }

    /**
     * module.js - The core of module loader
     */

    var cachedMods = (seajs.cache = {})
    var anonymousMeta

    // 标记正在请求的资源
    var fetchingList = {}
    // 已完成的资源
    var fetchedList = {}
    // TODO
    var callbackList = {}

    // 模块状态码
    var STATUS = (Module.STATUS = {
        // 1 - The `module.uri` is being fetched
        FETCHING: 1,
        // 2 - The meta data has been saved to cachedMods
        SAVED: 2,
        // 3 - The `module.dependencies` are being loaded
        LOADING: 3,
        // 4 - The module are ready to execute
        LOADED: 4,
        // 5 - The module is being executed
        EXECUTING: 5,
        // 6 - The `module.exports` is available
        EXECUTED: 6
    })

    // 初始化一个Module对象
    function Module(uri, deps) {
        this.uri = uri
        this.dependencies = deps || []
        this.exports = null
        this.status = 0

        // 收集等待当前模块的脚本
        // Who depends on me
        this._waitings = {}

        // The number of unloaded dependencies
        this._remain = 0
    }

    // 获得模块的依赖项
    // Resolve module.dependencies
    Module.prototype.resolve = function () {
        var mod = this
        var ids = mod.dependencies
        var uris = []

        for (var i = 0, len = ids.length; i < len; i++) {
            uris[i] = Module.resolve(ids[i], mod.uri)
        }
        return uris
    }

    // Load module.dependencies and fire onload when all done
    /**
     * 加载模块，
     * @returns
     */
    Module.prototype.load = function () {
        var mod = this

        // 模块正在加载中则等待
        // If the module is being loaded, just wait it onload call
        if (mod.status >= STATUS.LOADING) {
            return
        }

        mod.status = STATUS.LOADING

        // Emit `load` event for plugins such as combo plugin
        var uris = mod.resolve()
        emit("load", uris, mod)

        var len = (mod._remain = uris.length)
        var m

        // 初始化模块，并将该模块加入待等待的列表中
        // Initialize modules and register waitings
        for (var i = 0; i < len; i++) {
            m = Module.get(uris[i])

            if (m.status < STATUS.LOADED) {
                // Maybe duplicate: When module has dupliate dependency, it should be it's count, not 1
                m._waitings[mod.uri] = (m._waitings[mod.uri] || 0) + 1
            } else {
                mod._remain--
            }
        }

        if (mod._remain === 0) {
            mod.onload()
            return
        }

        // 将缓存模块里面所有需要加载的资源都存储在requestCache
        // Begin parallel loading
        var requestCache = {}

        for (i = 0; i < len; i++) {
            m = cachedMods[uris[i]]

            if (m.status < STATUS.FETCHING) {
                m.fetch(requestCache)
            } else if (m.status === STATUS.SAVED) {
                m.load()
            }
        }

        // 上面通过fetch加载requestCache中的请求，则一起发送
        // Send all requests at last to avoid cache bug in IE6-9. Issues#808
        for (var requestUri in requestCache) {
            if (requestCache.hasOwnProperty(requestUri)) {
                requestCache[requestUri]()
            }
        }
    }

    /**
     * 当外部依赖的文件加载完毕后，更新模块状态  STATUS.LOADED
     * 通过获得当前模块的 _waitings ，告知_waitings 该模块已经加载完毕，能够获取执行结果。
     * 通过自调用 onload函数，最终回到最外层函数
     */
    // Call this method when module is loaded
    Module.prototype.onload = function () {
        var mod = this
        mod.status = STATUS.LOADED

        if (mod.callback) {
            mod.callback()
        }

        // 获得依赖当前模块的文件，
        // Notify waiting modules to fire onload
        var waitings = mod._waitings
        var uri, m

        for (uri in waitings) {
            if (waitings.hasOwnProperty(uri)) {
                m = cachedMods[uri]
                m._remain -= waitings[uri]
                if (m._remain === 0) {
                    m.onload()
                }
            }
        }

        // Reduce memory taken
        delete mod._waitings
        delete mod._remain
    }

    /**
     * 添加模块script脚本到文档流中，获取一个模块，并执行对应回调
     * @param {*} requestCache
     * @returns
     */
    // Fetch a module
    Module.prototype.fetch = function (requestCache) {
        var mod = this
        var uri = mod.uri

        mod.status = STATUS.FETCHING

        // Emit `fetch` event for plugins such as combo plugin
        var emitData = { uri: uri }
        emit("fetch", emitData)
        var requestUri = emitData.requestUri || uri

        // 无url或者非cmd模块则直接加载
        // Empty uri or a non-CMD module
        if (!requestUri || fetchedList[requestUri]) {
            mod.load()
            return
        }

        // 资源如果已经正在请求，则在回调队列中也加入该函数
        if (fetchingList[requestUri]) {
            callbackList[requestUri].push(mod)
            return
        }

        fetchingList[requestUri] = true
        callbackList[requestUri] = [mod]

        // Emit `request` event for plugins such as text plugin
        emit(
            "request",
            (emitData = {
                uri: uri,
                requestUri: requestUri,
                onRequest: onRequest,
                charset: data.charset
            })
        )

        // 如果该模块没有请求过，则加入缓存中
        if (!emitData.requested) {
            requestCache ? (requestCache[emitData.requestUri] = sendRequest) : sendRequest()
        }

        function sendRequest() {
            seajs.request(emitData.requestUri, emitData.onRequest, emitData.charset)
        }

        // 每个模块资源请求完，直接执行该回调
        function onRequest() {
            delete fetchingList[requestUri] // 作用是什么？先delete后又重新赋值，是否多余
            fetchedList[requestUri] = true

            // Save meta data of anonymous module
            if (anonymousMeta) {
                Module.save(uri, anonymousMeta)
                anonymousMeta = null
            }

            // Call callbacks
            // 请求完毕，则直接加载该模块
            var m,
                mods = callbackList[requestUri]
            delete callbackList[requestUri]
            while ((m = mods.shift())) m.load()
        }
    }

    /**
     * @description: 执行该模块代码，通过define获取到对应的工厂函数，然后执行
     * @return {*}
     */
    // Execute a module
    Module.prototype.exec = function () {
        var mod = this

        // When module is executed, DO NOT execute it again. When module
        // is being executed, just return `module.exports` too, for avoiding
        // circularly calling
        // 如果模块已经执行则，则直接返回
        if (mod.status >= STATUS.EXECUTING) {
            return mod.exports
        }

        mod.status = STATUS.EXECUTING

        // Create require
        var uri = mod.uri

        // #region
        // 为每个模块中提供require方法
        function require(id) {
            // 每次require则会首次执行或者从缓存中获取
            return Module.get(require.resolve(id)).exec()
        }

        require.resolve = function (id) {
            return Module.resolve(id, uri)
        }

        // 异步加载模块列表
        // eg: require.async(["./spinning", "./test"], (Spinning, Test) => {})
        require.async = function (ids, callback) {
            Module.use(ids, callback, uri + "_async_" + cid())
            return require
        }

        // #endregion

        // 执行工厂函数
        var factory = mod.factory

        /**
         * 向模块工厂函数中注入 require, export, module等三个变量
         * 实际模块例子: define(function(require, exports, module) {}
         */
        var exports = isFunction(factory) ? factory(require, (mod.exports = {}), mod) : factory

        if (exports === undefined) {
            exports = mod.exports
        }

        // Reduce memory leak
        delete mod.factory

        mod.exports = exports
        mod.status = STATUS.EXECUTED

        // Emit `exec` event
        emit("exec", mod)

        // 返回函数执行结果
        return exports
    }

    // Resolve id to uri
    /**
     *
     * @param {*} id ../static/hello/src/main
     * @param {*} refUri file:///Users/limo/Downloads/examples-master/app/_use_0
     * @returns
     */
    Module.resolve = function (id, refUri) {
        // Emit `resolve` event for plugins such as text plugin
        var emitData = { id: id, refUri: refUri }
        emit("resolve", emitData)

        return emitData.uri || seajs.resolve(emitData.id, refUri)
    }

    /**
     * 提供模块的define方法，当脚本加载完毕。则会直接执行该脚本
     *
     * @param {*} id
     * @param {*} deps
     * @param {*} factory
     */
    // Define a module
    Module.define = function (id, deps, factory) {
        var argsLen = arguments.length

        // define(factory)
        if (argsLen === 1) {
            factory = id
            id = undefined
        } else if (argsLen === 2) {
            factory = deps

            // define(deps, factory)
            if (isArray(id)) {
                deps = id
                id = undefined
            }
            // define(id, factory)
            else {
                deps = undefined
            }
        }

        // 将工厂函数转化为字符串。 并通过正则匹配require相关字符串收集对应的模块依赖
        // Parse dependencies according to the module factory code
        if (!isArray(deps) && isFunction(factory)) {
            deps = parseDependencies(factory.toString())
        }

        var meta = {
            id: id,
            uri: Module.resolve(id),
            deps: deps,
            factory: factory
        }

        // Try to derive uri in IE6-9 for anonymous modules
        if (!meta.uri && doc.attachEvent) {
            var script = getCurrentScript()

            if (script) {
                meta.uri = script.src
            }

            // NOTE: If the id-deriving methods above is failed, then falls back
            // to use onload event to get the uri
        }

        // Emit `define` event, used in nocache plugin, seajs node version etc
        emit("define", meta)

        meta.uri
            ? Module.save(meta.uri, meta)
            : // Save information for "saving" work in the script onload event
              (anonymousMeta = meta)
    }

    /**
     * 将模块信息存储在缓存中
     * 工厂函数存储在cachedMods中
     */
    // Save meta data to cachedMods
    Module.save = function (uri, meta) {
        var mod = Module.get(uri)

        // Do NOT override already saved modules
        if (mod.status < STATUS.SAVED) {
            mod.id = meta.id || uri
            mod.dependencies = meta.deps || []
            mod.factory = meta.factory
            mod.status = STATUS.SAVED
        }
    }

    // 根据uri获取模块。
    // Get an existed module or create a new one
    Module.get = function (uri, deps) {
        return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps))
    }

    /**
     * 加载异步模块
     * @param {*} ids
     * @param {*} callback
     * @param {*} uri
     */
    // Use function is equal to load a anonymous module
    Module.use = function (ids, callback, uri) {
        var mod = Module.get(uri, isArray(ids) ? ids : [ids])

        // 模块加载完毕的回调函数
        mod.callback = function () {
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

            delete mod.callback
        }

        mod.load()
    }

    /**
     * 在所有模块之前预加载模块
     * @param {*} callback
     */
    // Load preload modules before all other modules
    Module.preload = function (callback) {
        var preloadMods = data.preload
        var len = preloadMods.length

        if (len) {
            Module.use(
                preloadMods,
                function () {
                    // Remove the loaded preload modules
                    preloadMods.splice(0, len)

                    // Allow preload modules to add new preload modules
                    Module.preload(callback)
                },
                data.cwd + "_preload_" + cid()
            )
        } else {
            callback()
        }
    }

    // Public API

    seajs.use = function (ids, callback) {
        Module.preload(function () {
            Module.use(ids, callback, data.cwd + "_use_" + cid())
        })
        return seajs
    }

    Module.define.cmd = {}
    global.define = Module.define // 函数挂载在全局

    // For Developers

    seajs.Module = Module
    data.fetchedList = fetchedList
    data.cid = cid

    // 获取对应的模块，直接返回module.export的执行结果
    seajs.require = function (id) {
        var mod = Module.get(Module.resolve(id))
        if (mod.status < STATUS.EXECUTING) {
            mod.onload()
            mod.exec()
        }
        return mod.exports
    }

    /**
     * config.js - The configuration for the loader
     */

    var BASE_RE = /^(.+?\/)(\?\?)?(seajs\/)+/

    // 默认seajs的资源和其他模块放在同一个服务器下。可以通过config方法，预设base的值
    // The root path to use for id2uri parsing
    // If loaderUri is `http://test.com/libs/seajs/[??][seajs/1.2.3/]sea.js`, the
    // baseUri should be `http://test.com/libs/`
    data.base = (loaderDir.match(BASE_RE) || ["", loaderDir])[1]

    // The loader directory
    data.dir = loaderDir

    // The current working directory
    data.cwd = cwd

    // The charset for requesting files
    data.charset = "utf-8"

    // Modules that are needed to load before all other modules
    data.preload = (function () {
        var plugins = []

        // Convert `seajs-xxx` to `seajs-xxx=1`
        // NOTE: use `seajs-xxx=1` flag in uri or cookie to preload `seajs-xxx`
        var str = location.search.replace(/(seajs-\w+)(&|$)/g, "$1=1$2")

        // Add cookie string
        str += " " + doc.cookie

        // Exclude seajs-xxx=0
        str.replace(/(seajs-\w+)=1/g, function (m, name) {
            plugins.push(name)
        })

        return plugins
    })()

    // 别名配置
    // data.alias - An object containing shorthands of module id
    // alias: {
    //     'es5-safe': 'gallery/es5-safe/0.9.3/es5-safe',
    //     'json': 'gallery/json/1.0.2/json',
    //     'jquery': 'jquery/jquery/1.10.1/jquery'
    //   },

    // 路径配置
    // data.paths - An object containing path shorthands in module id
    // paths: {
    //     'gallery': 'https://a.alipayobjects.com/gallery'
    //   },

    // 变量配置
    // vars 配置的是模块标识中的变量值, 有些场景下，模块路径在运行时才能确定，这时可以使用 vars 变量来配置
    // data.vars - The {xxx} variables in module id
    // vars: {
    //     'locale': 'zh-cn'
    // },

    // 映射配置
    // data.map - An array containing rules to map module uri
    // map: [
    //     ['http://example.com/js/app/', 'http://localhost/js/app/']
    //   ],

    //  调试模式
    // data.debug - Debug mode. The default value is false

    // 预加载项
    //   preload: [
    //     Function.prototype.bind ? '' : 'es5-safe',
    //     this.JSON ? '' : 'json'
    //   ],

    // Sea.js 的基础路径
    //   base: 'http://example.com/path/to/base/',

    seajs.config = function (configData) {
        for (var key in configData) {
            var curr = configData[key]
            var prev = data[key]

            // Merge object config such as alias, vars
            if (prev && isObject(prev)) {
                for (var k in curr) {
                    prev[k] = curr[k]
                }
            } else {
                // Concat array config such as map, preload
                if (isArray(prev)) {
                    curr = prev.concat(curr)
                }
                // Make sure that `data.base` is an absolute path
                else if (key === "base") {
                    // Make sure end with "/"
                    if (curr.slice(-1) !== "/") {
                        curr += "/"
                    }
                    curr = addBase(curr)
                }

                // Set config
                data[key] = curr
            }
        }

        emit("config", configData)
        return seajs
    }
})(this)
