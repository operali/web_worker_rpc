// fun(...args)
interface IRPCMethod {
    (...args: any): any;
}

/**
 *
 * export = {
 *  a:{
 *    b:{
 *      f(...args)
 * ...
 */
interface IRPCExporter {
    [method: string]: IRPCMethod | IRPCExporter;
}

// match 'x(...args)' or 'x.y.z(...args)'
interface IRPCField {
    (...args: any[]): any;
    [key: string]: IRPCField;
}

interface IRPC {
    CONFIG: {
        TIMEOUT: number; // how long is a remote call timeout
        HEARTBEAT: number; // heartbeat to detect if worker is still alive
        QPS: number; // requested limit per second, when reach, the worker restart
        SUBSCRIBE_SIZE: number; // subscribe counter limit to prevent subscribtion leak by user
        ONERROR_LIMIT: number; // when errors counter reached, the worker restart
    };
    remote: IRPCField;
}

/**
 * usag:
 *  in main_thread.js
 *  var worker = window.__web_worker_rpc.create('path_to_worker_thread.js', {
 *     api:{
 *       fun()
 *     }
 *  })
 *  ...
 *
 *  worker.remote.fun_in_worker(...)
 *
 *  in worker_thread
 *
 *  rpc.exports = {
 *     fun_in_worker(...)
 *  }
 *
 *  rpc.remote.api.fun_in_main(...)
 */
declare var main: { create: (url: string, exporter: IRPCExporter) => IRPC };
export default main;
