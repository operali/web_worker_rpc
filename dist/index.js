
let rpc = window['__web_worker_rpc']


let actors = {};
let actorId = 0;
window.addWorker = () => {
  actorId++;
  let act = new Actor(actorId);
  actors[actorId] = act;
};

let logs = [];
class Actor {
  constructor(id) {
    this.id = id;
    let t = document.querySelector('#actor-template');
    let newNode = t.cloneNode(true);
    newNode.style.cssText = '';
    newNode.id = '';
    this.ui = newNode;
    let c = document.querySelector('#actor-container');
    c.appendChild(this.ui);

    let textName = this.ui.querySelector('.name');
    textName.textContent = `${this.id}`;

    let btToggle = this.ui.querySelector('.toggle');
    btToggle.onclick = async () => {
      let startOrNot = await this.worker.remote.toggle(this.id);
      if (startOrNot) {
        btToggle.textContent = 'stop';
      } else {
        btToggle.textContent = 'start';
      }
    };

    let btSpeedup = this.ui.querySelector('.speedup');
    btSpeedup.onclick = () => {
      this.worker.remote.speedup();
    };

    let btQuit = this.ui.querySelector('.quit');
    btQuit.onclick = () => {
      this.worker.dispose();
      c.removeChild(this.ui);
    };

    this.worker = rpc.create('worker.js', {
      log: (str) => {
        logs.push(str);
        if (logs.length > 10) logs = logs.splice(logs.length - 10);
        let logger = document.querySelector('#logger');
        logger.textContent = [...logs].reverse().join('\n');
      },
      setDistance: (distance) => {
        let uiDistance = this.ui.querySelector('.distance');
        uiDistance.textContent = '.'.repeat(distance);
      }
    }).then(worker => {
      this.worker = worker;
      btToggle.onclick()
    })



  }
}
