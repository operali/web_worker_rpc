

# web_worker_rpc

一个安全，易用的web worker rpc脚本

## feature
- [x] 心跳机制检查worker是否正常
- [x] 限制worker错误数量
- [x] 限制worker过于频繁的请求
- [x] 以上异常发生可配置将worker重启


## install
```bash
yarn add web_worker_rpc
```

# example
[demo](./dist/index.html)


## usage
in <index.html>
```html
<script src="web_worker_rpc.js"></script>
```
or
```js
// host.js
import rpc from 'web_worker_rpc'
```

in <host.js>
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
        } 
    }
})

// 调用worker的方法
worker.remote.workerFun().then(r=>console.log(r))

// 销毁
worker.dispose();
```

in <worker.js>
```js
// 暴露给host方法
rpc.exports = {
    workerFun(){
        return 'from worker';
    }
}

// 调用host方法
rpc.remote.hostFun(__distance, id);
// 所有远端方法都是 promise
let r = await rpc.remote.others_api.add(1, 2);

```

## configuration
> 谨慎修改以下配置
  
```js
{
        TIMEOUT: number; // how long is a remote call timeout, default 42000, 42 sec
        HEARTBEAT: number; // heartbeat to detect if worker is still alive, default 4200, 4.2 sec
        QPS: number; // requested limit per second, when reach, the worker restart, default 1000, when worker can request 1000 times in a second
        ONERROR_LIMIT: number; // when errors counter reached, the worker restart, default 64
};


// usage
// in <host.js>
const rpc = window['__web_worker_rpc']
rpc.CONFIG.TIMEOUT = 22;// 设置调用 host API超时为22ms, 抛出超时异常

// in <worker.js>
// no need to declare rpc, internal
rpc.TIMEOUT = 22;// 设置调用超时22ms, 抛出超时异常
```
