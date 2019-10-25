



document.body.onload = () => {
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
        item.style = 'color:black';
        logger.appendChild(item);
    };

    window.error = (...args) => {
        let item = document.createElement('pre');
        item.innerText = args.map(arg => '' + arg).join(' ');
        item.style = 'color:red';
        logger.appendChild(item);
    }

    window.expect = (testName, '')

    window.clear = () => {

    }


}
