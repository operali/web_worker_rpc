function delay(s) {
    return new Promise(res => {
        setTimeout(() => {
            res();
        }, s);
    });
}
rpc.exports = {
    getId() {
        return rpc.id;
    },
    unit() { },
    funNum() {
        return 1
    },
    funAdd(a, b) {
        return a + b;
    },
    funAddObj(obj) {
        return obj.a + obj.b
    },
    funFail() {
        throw "myException";
    },
    funAddObjs(obj1, obj2) {
        return {
            a: obj1.a + obj2.a,
            b: obj1.b + obj2.b
        }
    },
    funcAddArray(arr) {
        return arr.reduce((p, c) => p + c);
    },
    async funAddObjsDelay(obj1, obj2) {
        await delay(2);
        return {
            a: obj1.a + obj2.a,
            b: obj1.b + obj2.b
        }
    }
}
