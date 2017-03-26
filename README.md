# web-pwa


> 该库是应对当前 Google 提出的 PWA 概念而写的。以链式 API 来完成 PWA 相关的操作。

 [![npm][1]][2]  [![git][3]][4]

## 安装

```
npm install web-pwa
// 或者使用 yarn
yarn add web-pwa
```


## DEMO

首先说明一下，我们要完成的目标：

 - 注册 sw
 - 添加 app.js 的缓存
 - 实现推送，并在用户点击后关闭，然后聚焦当前页面

整个代码如下：

```
import SW,{Notify,WebCaches} from 'web-pwa';

window.onload = function(){
    SW.register('sw.js');
    var tableName = 'prefetch-cache-v1';
    WebCaches.table(tableName).addRow('/app.js')
    .then(res=>{
        // res: 成功
    })
    Notify.request() // 请求推送权限
    .then(permission=>{
        // 用户同意
        Notify.show('villianhr','Hello Pwa')
        .onclick(event=>{
            event.close(); // 关闭当前 Notification
            Notify.focus(); // 聚焦窗口
        })
    })
}
```
 
## 使用

基本使用可以分为三块：

 - SW: 主要处理主线程 JS Service Worker 的相关行为。例如：注册，发送消息等
 - WebCaches: 用来处理 `CacheStorage` 缓存的相关操作。
 - Notify: 根据 `new Notification()` 来完成主线程 JS 的消息推送


```
import SW,{WebCaches,Notify} from 'web-pwa';
```

（重点推荐使用 WebCaches）
在内部细节中，处理了兼容性和权限请求的问题，这里我们具体落实到场景当中。

### SW

SW 原意是 `Service Worker`。如果大家还不熟悉，推荐可以参考：[Service Worker 全面进阶][5]。

#### 权限申请

```
SW.register('sw.js')
.then(reg=>{

})
```
它返回的是 Promise 对象。

#### 销毁 Service Worker

```
SW.unregister().then(res=>{
    if(res)console.log('unregisteration, done!');
})
```
它返回的是 Promise 对象。
#### Service Worker 更新

```
SW.update();
```

#### 消息通信

我们了解 Service Worker 是继承 `Web Worker`。在 `Web Worker` 中，我们可以使用 `postMessage` 进行通信，那么在 SW（Service Worker）中同样是可以的。

```
SW.postMessage('a new message send to Service Worker');
```

如果你想接受此次 SW 回复的信息，可以直接加上 `Promise` 的写法。

```
// 接收 SW 回复的信息
SW.postMessage('a new message send to Service Worker')
.then(reply=>{
    // doSth
})

// SW 回复信息

self.addEventListener('message', function(event){
    console.log("SW Received Message: " + event.data);
    event.ports[0].postMessage("SW Says 'Hello back!'");
});
```

另外，SW 还可以通过 `clients` 挂载的 [postMessage][6] 向 client 发送信息。如果有这种需求，可以直接监听 `message` 事件。

```
SW.onmessage(event=>{
    // 接收 SW 发送的消息
    // event.data
})
```

#### 推送订阅

当你想要使用 `Push` 相关的内容时，可以调用 `Notify.subscribe(route,key)` 方法。如果，你不是很理解 `Web Push` 的概念，可以参考: [Web Push 讲解][7]

```
// 下面的 key 根据自己生成进行替换
SW.subscribe('/subscription','BPLISiRYgXzzLY_-mKahMBdYPeRZU-8bFVzgJMcDuthMxD08v0cEfc9krx6pG5VGOC31oX_QEuOSgU5CYJqpzf0');
```



### WebCaches

首先这里有两个概念，一个是 table(表)，一个是 row(行)。每一个网站缓存可以有多个表，这完全取决于你自己的结构。该库是 `one-off` 形式，即，不能使用变量名来缓存表。例如：

```
var table = WebCaches.table('v1');
table.open(); // 正常执行没问题

table.open(); // 第二次使用无效
```
后面会介绍一种简便的方法进行简写。

缓存处理主要分为两块：

 - table
    - addRow: 添加行记录
    - delete: 删除表
    - copy: 复制整个表
    - rename: 重命名整个表
    - open: 打开表
 - row
    - get: 查询行
    - delete: 删除行
    - update: 更新行

#### table

table 本身就是一个函数，构造格式为：

 - table(cachesName): 打开某个具体的表
    - @param cachesName[String]: 具体打开的表名

##### 打开表

构造函数为：

 - open(): 执行打开操作
    - @return: promise

```
WebCaches.table('demo-v1').open()
.then(cache=>{})
```

##### 添加行

向表中添加具体的缓存行，添加方式有三种：

 - addRow(request)
    - @param request: 可以为 url 或者通过 `new Request(url)` 实例化得来的。
 - addRow([request1,request2,...])
    - @param Array: 里面就是 url/request 的数组。 
 - addRow(request,response)
    - @param request: 和上面一样，没啥区别
    - @param response: 需要存储的结构。一般是通过 `new Response(res)` 生成，或者直接通过 `fetch().then(response=>{})` 获得的。


##### 重命名/复制表

重命名的格式为：

 - rename(newName)
    - @param newName[String]: 表的新名字
    - @return Promise
            
```
WebCaches.table('old-v1').rename('new-v2')
.then(res=>{
    // success
})
.catch(err=>{
    // fail
})
```

复制表的格式为：

 - copyTo(targetTable)
    - @param targetTable[String]: 指定的表名
    - @return Promise
 
```
// 将 A 表复制给 B
WebCaches.table('A').copyTo('B')
.then(res=>{
    // success
})
.catch(err=>{
    // fail
})
```

##### 删除表

格式为：

 - delete()
 - @return: Promise


```
WebCaches.table('A').delete()
.then(res=>{
    // success
})
.catch(err=>{
    // fail
})
```

#### row

row 本身也是一个函数:

 - row(request)
    - @param request[Request||String]: 该参数可以为 request，或者 pathname（注意不能带上 `origin`）。当为 request 时，是直接匹配对应的行记录，而为 `pathname` 时，则是使用 [path-to-regexp][8] 的格式，可以匹配多个或者模糊匹配。


```
// 只匹配 js 文件

WebCaches.table(tableName).row('/*.js')
.get().then(res=>{
  console.log(res);
  })
```

通过 request 匹配：

```
var js = new Request('/app.js');

Caches.table(tableName).row(js)
    .get().then(res=>{
      console.log(res);
    })
```

##### 简写
如果每次都 `WebCaches.table.row` 这样调用，会让人觉得比较冗长，那么有没有什么好的办法解决呢？这里提供了一个工具函数 `clone` 用来生成可重复使用的对象。

```
// 提取 table
var table_v1 = WebCaches.clone('v1');
table_v1().open(); // first,OK

table_v1().open(); // second,OK
```

然后，可以提取 row

```
var table_row = WebCaches.clone('v1','/*.js');

table_row().get(); // first, OK

table_row().get(); // second, OK
```


##### 删除行

```
// 删除所有 js 文件
WebCaches.table(tableName).row('/*.js')
.delete()
.then(()=>{
    // success
})
.catch(err=>{
    // fail
})
```

##### 更新行

```
fetch('/')
.then(res=>{
// 更新根目录文件
  WebCaches.table(tableName).row('/')
  .update(res)
  .then(()=>{
    WebCaches.table(tableName).row('/').get()
    .then(console.log.bind(console))
  })
})
```



### Notify

`Notify` 提供了 `Notification` 相关的 API。其主打的是链式调用，不需要过多的关注 `Notification` 内部细节。


#### 权限申请

```
notify.request()
.then(permission=>{
    // permission === "granted"
    // permission === "denied"
    // permission === "default"
})
``` 

#### 消息推送

使用消息推送的时候，可以不用嵌套在 `request()` 里面，它内部已经做了权限的处理。

```
// 纯文字版
Notify.show('demo','this is a demo')

// 带 Icon
Notify.show('demo','this is a demo','demo.png')
```

#### 推送后自动关闭

```
Notify.show('demo','this is a demo')
.hide(3000); // 3s 后自动关闭
```

#### 推送点击

```
Notify.show('demo','this is a demo')
.onclick(e=>{
    e.target.close();
});
```

Notify 还提供了其它的事件监听

 - onclick
 - onclose
 - onshow
 - onerror

上面这些方法都可以进行链式调用。

```
Notify.show('demo','this is a demo')
.onclick(event=>{})
.onclose(event=>{})
.onshow(event=>{})
```

用户点击推送这一行为，我们可以加上额外的处理，例如，打开页面，聚焦页面等。

```
Notify.show('demo','this is a demo')
.onclick(event=>{
    event.target.close();
    // 聚焦页面
    Notify.focus();
    // 打开新的页面
    Notify.open('https://www.villainhr.com');
})
```

## License

MIT

## Author

 - author: [villainhr][9]
 - email: villainthr@gmail.com
    


  [1]: https://img.shields.io/badge/npm-web--pwa-blue.svg
  [2]: https://www.npmjs.com/package/web-pwa
  [3]: https://img.shields.io/badge/git-web--pwa-blue.svg
  [4]: https://github.com/JimmyVV/web-pwa
  [5]: https://www.villainhr.com/page/2017/01/08/Service%20Worker%20%E5%85%A8%E9%9D%A2%E8%BF%9B%E9%98%B6
  [6]: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
  [7]: https://www.villainhr.com/page/2017/01/08/Web%20%E6%8E%A8%E9%80%81%E6%8A%80%E6%9C%AF#Push
  [8]: https://github.com/pillarjs/path-to-regexp
  [9]: https://www.villainhr.com/