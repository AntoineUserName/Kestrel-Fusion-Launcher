const { contextBridge, ipcRenderer } = require('electron');

let sendedRes = false;
contextBridge.exposeInMainWorld('electronAPI', {
    sendRes: () => {
        if(sendedRes) return;
        sendedRes = true;

        const resInput = document.querySelector('#response-input');

        resInput.disabled = true;

        ipcRenderer.send('textResponse', resInput.value);
    }
});

ipcRenderer.on('questiondatas', (ev, questiontxt, enterbuttontext) => {
    document.querySelector('#question-text').innerText = questiontxt;
    const acceptButton = document.querySelector('#accept-button');
    acceptButton.innerText = enterbuttontext;
});