

# web_worker_rpc

一个安全，易用的web worker rpc脚本

## description
```text
web_worker_rpc，提供宿主与worker通信的RPC能力，并保证了以下情况时宿主的安全性
1. worker死循环或者任何超出了worker负荷能力 # CONFIG.HEARTBEAT
2. worker讳规过于频繁地向宿主发生请求 # CONFIG.QPS
3. worker内部错误达到限制数量 # CONFIG.ONERROR_LIMIT
4. 单次完成任务时间过长 # CONFIG.TIMEOUT
```

## example
[demo](https://operali.github.io/web_worker_rpc/dist/index.html)


## install
```bash
npm install web_worker_rpc
```
or
```bash
yarn add web_worker_rpc
```


## usage
1.  import it in script tag.

```html
<script src="web_worker_rpc.js"></script>
```

2. RPC in your host.js
```js
// host.js
const rpc = window['__web_worker_rpc']
// 创建一个新的worker
// 第一参数传入 url
// 第二参数转入需要暴露给worker的方法
let worker = rpc.create('worker.js', {
    hostFun() {
        console.log('log from host but call in worker');
    },
    others_api: {
        add(a, b) {
            return a+b;
        },
        // you can even RPC with callback function!
        addTickListener(tickTime, handle) {
            let tid = setInterval(handle, tickTime);
            // removeTickListener
            return ()=>{
                clearInterval(tid);
            }
        }
    }
})
```
```js
// host.js
// 调用worker的方法
worker.remote.workerFun().then(r=>console.log(r))
```

```js
// host.js
// 销毁
worker.dispose();
```

3. RPC in worker.js, you can call host api remotely.
```js
// 远程提供给host方法
rpc.exports = {
    workerFun(){
        return 'from worker';
    }
}
```
```js
// 远程调用host方法
rpc.remote.hostFun(__distance, id);
// 所有远端方法都是 promise
let r = await rpc.remote.others_api.add(1, 2);
```

```js
// you can even RPC with callback function!
let canceller = rpc.remote.addTickListener(3000, ()=>{
    console.log('tick from worker');
})
// removeListener
canceller()
```

## configuration
> <b>谨慎修改配置</b>
  
```js
{
    // how long is a remote call timeout, 
    // default 42000, 42 sec
    TIMEOUT: number; 

    // heartbeat to detect if worker is still alive, 
    // default 4200, 4.2 sec
    HEARTBEAT: number; 

    // requested limit per second, when reach, the worker restart, 
    // default 1000, worker can request at most 1000 times in a second
    QPS: number; 

    // when errors counter reached, the worker restart, 
    // default 64
    ONERROR_LIMIT: number; 
};
```

```js
// in <host.js>
const rpc = window['__web_worker_rpc']
rpc.CONFIG.TIMEOUT = 22;// 设置调用 host API超时为22ms, 抛出超时异常

// in <worker.js>
// no need to declare rpc, internal
rpc.TIMEOUT = 22;// 设置调用超时22ms, 抛出超时异常
```

## FAQ

> 当worker发生异常时，如何处理

worker将自动关闭，你可以获得异常和关闭的事件，
```js
worker.onFail = ()=>{
    console.log('something bad happen in worker, id of', worker.id);
}
```
你也可以将它重启，简单地，重新create一个
```js
worker.onFail = ()=>{
    console.log('something bad happen in worker, id of', worker.id);
    rpc.create(workerUrl, worker.exports).then(
        newWorker=> worker = newWorker
    )
}
```



