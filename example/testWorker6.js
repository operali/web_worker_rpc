function delay(s) {
    return new Promise(res => {
        setTimeout(() => {
            res();
        }, s);
    });
}
rpc.exports = {
    async longTime() {
        await delay(45000);
    }
}
