function delay(s) {
    return new Promise(res => {
        setTimeout(() => {
            res();
        }, s);
    });
};

window.onload = () => {
    let testBtn = document.querySelector('#test');
    let clearBtn = document.querySelector('#clear');
    let logger = document.querySelector('.logger');

    testBtn.onclick = () => {

    }

    clearBtn.onclick = () => {
        window.clear();
    }

    window.log = (...args) => {
        let item = document.createElement('pre');
        item.innerText = args.map(arg => '' + arg).join(' ');
        item.style = 'color:green';
        logger.appendChild(item);
    };

    window.error = (...args) => {
        let item = document.createElement('pre');
        item.innerText = args.map(arg => '' + arg).join(' ');
        item.style = 'color:red';
        logger.appendChild(item);
    }

    window.testBegin = (category) => {
        window.log(`${category}----------------------test begin`);
        window.testCounter = 0;
        window.testCategory = category;
    }

    window.testEnd = (counterExpected) => {
        if (counterExpected !== undefined) {
            if (window.testCounter !== counterExpected) {
                window.error(`FAIL, totally:${counterExpected - window.testCounter} ----------------------test end of: ${window.testCategory}\n\n`);
                return;
            }
        }
        window.log(`PASS----------------------test end of: ${window.testCategory}\n\n`);
    }

    window.expect = (testName, a, b) => {
        if (a || b) {
            if (JSON.stringify(a) == JSON.stringify(b)) {
                window.log(`PASS: ${testName}`);
                window.testCounter++;
            } else {
                window.error(`FAIL: ${testName}, left:${JSON.stringify(a)}, right:${JSON.stringify(b)}`);
            }
        } else {
            window.log(`PASS: ${testName}`);
            window.testCounter++;
        }
    }

    window.clear = () => {
        logger.innerHTML = "";
    }
    let rpcCreator = window['__web_worker_rpc'];
    async function test1() {
        // test of file
        window.testBegin('load/dispose');
        window.rpc = await rpcCreator.create('testWorker1.js', {
        })
        window.rpc.dispose();
        window.expect('isClose', window.rpc.isClosed, true);
        try {
            await window.rpc.remote.abc();
        } catch (ex) {
            ex + ''.includes('remote is disposed');
            window.expect('call after dispose', window.rpc.isClosed, true);
        }
        window.testEnd(2);
    }

    async function test2() {
        // test of file
        window.testBegin('host request worker');
        window.rpc = await rpcCreator.create('testWorker2.js')
        expect(`getId: ${rpc.id}`, rpc.id, await rpc.remote.getId());
        expect(`unit`, await rpc.remote.unit(), undefined);
        expect(`funNum`, await rpc.remote.funNum(), 1);
        expect(`funAdd 1`, await rpc.remote.funAdd(1, 1), 2);
        expect(`funAdd 2`, await rpc.remote.funAdd('1', 1), '11');
        expect(`funAddObj`, await rpc.remote.funAddObj({ a: 1, b: 1 }), 2);
        expect(`funAddObjs`, await rpc.remote.funAddObjs({ a: 1, b: 1 }, { a: 2, b: 3 }), { a: 3, b: 4 });
        expect(`funcAddArray`, await rpc.remote.funcAddArray([1, 2, 3, 4]), 10);
        try {
            let r = await rpc.remote.funFail({}, {});
        } catch (ex) {
            expect(`funFail`, ex, 'myException');
        }
        window.testEnd(9);
        window.rpc.dispose();
    }

    async function test3() {
        // test of file
        window.testBegin('worker request host');
        window.rpc = await rpcCreator.create('testWorker3.js', {
            getId() {
                return window.rpc.id;
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
        });
        expect(`getId: ${rpc.id}`, rpc.id, await rpc.remote.myEval(`rpc.remote.getId()`));
        expect(`unit`, await rpc.remote.myEval(`rpc.remote.unit()`), undefined);
        expect(`funNum`, await rpc.remote.myEval(`rpc.remote.funNum()`), 1);
        expect(`funAdd 1`, await rpc.remote.myEval(`rpc.remote.funAdd(1, 1)`), 2);
        expect(`funAdd 2`, await rpc.remote.myEval(`rpc.remote.funAdd('1', 1)`), '11');
        expect(`funAddObj`, await rpc.remote.myEval(`rpc.remote.funAddObj({ a: 1, b: 1 })`), 2);
        expect(`funAddObjs`, await rpc.remote.myEval(`rpc.remote.funAddObjs({ a: 1, b: 1 }, { a: 2, b: 3 })`), { a: 3, b: 4 });
        expect(`funcAddArray`, await rpc.remote.myEval(`rpc.remote.funcAddArray([1, 2, 3, 4])`), 10);
        try {
            let r = await rpc.remote.myEval(`rpc.remote.funFail({}, {})`);
        } catch (ex) {
            expect(`funFail`, ex, 'myException');
        }
        window.testEnd(9);
        window.rpc.dispose();
    }

    async function test4() {
        // test of file
        window.testBegin('too much requires');
        window.rpc = await rpcCreator.create('testWorker4.js', {
            simple() {

            }
        })
        expect('heavyRequireHostHalf', await rpc.remote.heavyRequireHostHalf(), undefined);
        await delay(1000);
        try {
            await rpc.remote.heavyRequireHostHalf();
            await rpc.remote.heavyRequireHostHalf();
            expect('heavyRequireHost', true, false);
        } catch (ex) {
            expect('heavyRequireHost', true, true);
        }
        window.testEnd(2);
        window.rpc.dispose();
    }

    async function test5() {
        // test of file
        window.testBegin('endless loop');
        window.rpc = await rpcCreator.create('testWorker5.js')
        try {
            await rpc.remote.endless();
            expect('endless', true, false);
        } catch (ex) {
            expect('endless', true, true);
        }
        window.testEnd(1);
        window.rpc.dispose();
    }

    async function test6() {
        // test of file
        window.testBegin('long time call');
        window.rpc = await rpcCreator.create('testWorker6.js')
        try {
            await rpc.remote.longTime();
            expect('longTime', true, false);
        } catch (ex) {
            expect('longTime', true, true);
        }
        window.testEnd(1);
        window.rpc.dispose();
    }
    async function test() {
        try {
            await test1();
            await test2();
            await test3();
            await test6();
            await test4();
            await test5();
        } catch (ex) {
            error('FAIL', ex);
        }

    }

    test();


};

