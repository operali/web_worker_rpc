
//import main from '../src/index'

document.addEventListener('click', e => {
  let worker = window['__web_worker_rpc'].create('example/worker.js', {
    abc: () => console.log('abc')
  })
})

