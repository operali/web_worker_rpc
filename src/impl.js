const CONFIG = {
  TIMEOUT: 42000,     // how long is a remote call timeout
  QPS: 1000,          // requested limit per second, when reach, the worker restart
  HEARTBEAT: 4200,    // heartbeat to detect if worker is still alive
  SUBSCRIBE_SIZE: 64, // subscribtion counter limit to prevent subscribtion leak by user
  ONERROR_LIMIT: 64   // when errors counter reached, the worker restart
}

const inspect = self.inspect

let reqId = 0;
let IDSeed = Math.floor(Math.random() * 65536);
const genID = () => {
  return '' + IDSeed++;
}

const __regCb = (subMap, subId, cb) => {
  let cbMap = subMap[subId];
  if (!cbMap) {
    cbMap = {}
    subMap[subId] = cbMap;
    if (subMap.SUBSCRIBE_SIZE === undefined) {
      subMap.SUBSCRIBE_SIZE = 0;
    }
    let sz = subMap.SUBSCRIBE_SIZE + 1;
    if (sz >= CONFIG.SUBSCRIBE_SIZE) {
      return null;
    }
    subMap.SUBSCRIBE_SIZE = sz;
    //debug console.log(`client + 1 = ${subMap.SUBSCRIBE_SIZE}`);
  }
  let cbId = genID();
  cbMap[cbId] = cb;
  return { subId, cbId };
}

const __onMessage = (str, reqMap, subMap, canMap, env, sender) => {
  let data = JSON.parse(str);
  let type = data.type;
  let reqId = data.reqId;
  if (type === 'req' || type === 'send') {
    let fname = data.fname;
    let args = data.args;
    let paths = fname.split('.');
    let func = null;
    let self = null;
    for (let pathItem of paths) {
      func = env[pathItem];
      if (!func) {
        if (inspect) {
          console.error(`cannot find ${fname} in ${inspect(env)}`);
        } else {
          console.error(`cannot find ${fname} env`);
        }
        return true;
      }
      self = env
      env = func
    }
    try {
      if (self) {
        func = func.bind(self);
      }
      let args1 = [];
      for (let i = 0; i < args.length; ++i) {
        let arg = args[i];
        if (arg != null && arg.hasOwnProperty('subId') && arg.hasOwnProperty('cbId')) {
          let subId = arg.subId;
          let cbId = arg.cbId;
          args1.push((...args) => {
            sender({
              type: 'cb', subId, cbId, args
            })
          })
        } else {
          args1.push(arg);
        }
      }
      let r = func(...args1);
      if (type !== 'send') {
        if (r && r.then) { // promise
          r.then((res) => {
            sender({ type: 'resp', reqId, res });
          }, (ex) => {
            sender({ type: 'resp', reqId, err: '' + ex });
          })
        } else {
          sender({ type: 'resp', reqId, res: r });
        }
      } else { // r === canceller
        if (r) {
          //debug console.log(`server subscribe add`);
          canMap[reqId] = r;
        }
      }
    }
    catch (ex) {
      if (type !== 'send') {
        sender({
          type: 'resp',
          reqId,
          err: '' + ex
        });
      }
    }
  } else if (type === 'resp') {
    let task = reqMap[reqId];
    if (!task) {
      console.warn('resp timeout!');
      return true;
    } else {
      delete reqMap[reqId];
      let err = data.err;
      if (err) {
        task.rej(err);
      } else {
        task.res(data.res);
      }
    }
  } else if (type === 'cb') {
    let subId = data.subId;
    let cbId = data.cbId;
    let args = data.args;
    let cbMap = subMap[subId];
    if (!cbMap) {
      // has been cancelled
      return true;
    }
    let cb = cbMap[cbId];
    if (!cb) {
      console.error(`no found callback for cbId:${cbId}`);
      return true;
    }
    try {
      cb(...args)
    } catch (ex) {
      console.error(`__rspCB fail, ${ex} `);
      return true;
    }
  } else if (type === 'can') {
    let can = canMap[data.subId];
    if (can) {
      delete canMap[data.subId];
      //debug console.log(`server subscribe remove`);
      try {
        can();
      } catch (ex) {
        console.error('subscribe cancellor fail:' + ex);
      }
    }
  } else if (type === 'fatal') {
    return false;
  }
  return true;
};

const __proxy = (reqMap, subMap, sender, ticker) => {
  const makeProxy = (obj, path) => {
    return new Proxy(obj, {
      get(target, key) {
        let path1;
        if (key == 'apply' || key == 'call') {
          path1 = path; // then key is useless
        } else {
          path1 = path === '' ? key : `${path}.${key}`;
        }
        let funcObj = (...args) => {
          reqId++;
          if (key == 'apply') { // func.apply(func, args) translate to func(...args);
            args = args.slice(1);
            args = args[0];
          } else if (key == 'call') { // func.call(func, ...args) translate to func(...args);
            args = args.slice(1);
          }
          let validargs = []
          let subscribeFunc = false;
          for (let i = 0; i < args.length; ++i) {
            let arg = args[i];
            if (typeof (arg) == 'function') {
              let callbackArg = __regCb(subMap, reqId, arg);
              if (!callbackArg) {
                sender({
                  type: 'fatal'
                });
                return;
              }
              validargs.push(callbackArg);
              subscribeFunc = true;
            } else {
              validargs.push(arg);
            }
          }
          if (subscribeFunc) {
            sender({
              type: 'send',
              reqId,
              fname: path1,
              args: validargs
            });
            let subId = reqId;
            return () => { //canceller
              delete subMap[subId];
              subMap.SUBSCRIBE_SIZE = subMap.SUBSCRIBE_SIZE - 1;
              //debug console.log(`client - 1 = ${subMap.SUBSCRIBE_SIZE}`);
              sender({
                type: 'can',
                subId
              });
            };
          } else {
            return new Promise((res, rej) => {
              reqMap[reqId] = {
                res,
                rej,
                tick: ticker.tick
              };
              sender({
                type: 'req',
                reqId,
                fname: path1,
                args: validargs
              });
            });
          }
        };
        return makeProxy(funcObj, path1);
      }
    });
  };
  let pObj = makeProxy({}, '');
  return pObj;
};

let __checkTimeout = (reqMap, ticker) => {
  let timeID = setInterval(() => {
    let timeoutList = [];
    for (let reqId in reqMap) {
      let req = reqMap[reqId];
      let tick = req.tick;
      if (tick < ticker.tick) timeoutList.push([reqId, req]); //{0:reqId, 1:req}
    }
    for (let reqPair of timeoutList) {
      reqPair[1].rej('timeout exception');
      delete reqMap[reqPair[0]];
    }
    ticker.tick++;
  }, CONFIG.TIMEOUT);
  return timeID;
};

if (!self.window) {   // worker
  let reqMap = {};    // custom it
  let subMap = {};    // {subId: cbMap }
  let canMap = {};    // {subId: canceller}
  let sender = o => {
    let strMsg = JSON.stringify(o);
    self.postMessage(strMsg);
  }
  self.onmessage = msg => {
    __onMessage(msg.data, reqMap, subMap, canMap, Object.assign({
      __hb: () => {
        return 'r';
      }
    }, self.rpc.exports), sender);
  }
  let ticker = {
    tick: 0,
    get timeout() {
      return self.timeout;
    }
  };
  self.rpc = {
    CONFIG
  };
  self.rpc.remote = __proxy(reqMap, subMap, sender, ticker);
  setTimeout(function () {
    __checkTimeout(reqMap, ticker);
  }, 0);
} else { // window
  // get path of this script
  let workerHeader = `importScripts('${document.currentScript.src}');
`;

  console.log('llasdfasdf')
  class WorkerProxy {
    constructor(script, exports) {
      this.CONFIG = CONFIG;
      this.reqMap = {};
      this.subMap = {};
      this.canMap = {};
      this.requestCount = 0;
      this.onerrorCount = 0;
      this.finishHandler = fetch(script).then(workerTextLoader => {
        return workerTextLoader.text()
      }).then(workerText => {
        var blob;
        try {
          blob = new Blob([workerHeader, workerText], { type: 'application/javascript' });
        } catch (e) { // Backwards-compatibility
          console.log(e);
          window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
          blob = new BlobBuilder();
          blob.append(workerHeader);
          blob.append(workerText);
          blob = blob.getBlob();
        }
        this.worker = new Worker(URL.createObjectURL(blob));

        if (exports) {
          this.exports = exports;
        }

        this.ticker = {
          tick: 0
        };
        let sender = o => {
          let strMsg = JSON.stringify(o);
          this.worker.postMessage(strMsg);
        };
        this.worker.onmessage = msg => {
          this.requestCount++;
          if (this.requestCount > (CONFIG.HEARTBEAT / 1000) * CONFIG.QPS) {
            this.requestCount = 0;
            this.exitFail(`remote QPS > ${CONFIG.QPS}!`);
            return
          }
          if (!__onMessage(msg.data, this.reqMap, this.subMap, this.canMap, this.exports, sender)) {
            this.exitFail(`reach MAX subscribe limit > ${CONFIG.SUBSCRIBE_SIZE}!`);
            return
          }
        };
        this.worker.onerror = evt => {
          console.error(evt);
          if (++this.onerrorCount > CONFIG.onerrorCount) {
            this.requestCount = 0;
            this.onerrorCount = 0;
            this.exitFail(`worker onerror`);
          }
        };
        this.remote = __proxy(this.reqMap, this.subMap, sender, this.ticker);
        this.timeID = __checkTimeout(this.reqMap, this.ticker);
        this.__hbChecking = false;
        this.onFail = () => {
          console.error('remote fail to call, restart!');
        };
        this.__hb();
        return this;
      })
    }
    dispose() {
      this.worker.terminate();
      clearInterval(this.timeID);
      this.remote = new Proxy({}, {
        get(target, key) {
          throw new Error('remote is disposed!');
        }
      });
      this.isClosed = true;

      for (let canKey in this.canMap) {
        setTimeout(() => {
          let can = this.canMap[canKey];
          can()
        }, 0);
      }
    }
    exitFail(reason) {
      this.dispose();
      setTimeout(() => {
        if (reason) {
          console.error(reason);
        }
        this.onFail();
      }, 0);
    }
    __hb() {
      setTimeout(async () => {
        try {
          if (this.isClosed) {
            return;
          }
          if (this.__hbChecking) {
            this.exitFail(`remote fail to answer!`);
            return;
          }
          this.requestCount = 0;
          this.__hbChecking = true;
          this.__hb();
          let r = await this.remote.__hb()
          if (r !== 'r') {
            throw new Error('heartbeat fail to return!');
          }
          this.__hbChecking = false;
        } catch (ex) {
          return;
        }
      }, CONFIG.HEARTBEAT);
    }
  };

  self['__web_worker_rpc'] = {
    create: (url, exports) => {
      let proxy = new WorkerProxy(url, exports);
      return proxy.finishHandler;
    }
  }
}

export default {};
