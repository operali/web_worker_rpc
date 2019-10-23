
let __distance = 0;
let __bStart = false;
let __id;
let __speed;
let __updateID;

rpc.exports = {
  toggle(id) {
    __id = id;
    __bStart = !__bStart;
    __speed = __bStart ? 1 : 0;
    rpc.remote.log(`${__bStart ? 'start' : 'stop'}: worker of ${id}`);
    if (!__updateID) {
      __updateID = setInterval(() => {
        __distance += __speed;
        if (__distance > 100) __distance = 0;
        rpc.remote.setDistance(__distance, id);
      }, 300);
    }
    return __bStart;
  },

  speedup() {
    rpc.remote.log(`speedup: worker of ${__id}`);
    __speed *= 3;
    setTimeout(function () {
      __speed /= 3;
    }, 2000);
    return __speed;
  }
}
