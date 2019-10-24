

# web_worker_rpc

一个安全，易用的web worker rpc脚本

## feature
- [x] 心跳机制检查worker是否正常
- [x] 限制worker错误数量
- [x] 限制worker过于频繁的请求
- [x] 以上异常发生可配置将worker重启

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
            ()=>{
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
