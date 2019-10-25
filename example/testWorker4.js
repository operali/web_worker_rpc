rpc.exports = {
    async heavyRequireHostHalf() {
        for (let i = 0; i < 501; ++i) {
            await rpc.remote.simple();
        }
        return
    }
}
