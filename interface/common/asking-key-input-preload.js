const { contextBridge, ipcRenderer } = require('electron');

ipcRenderer.on('customTxt', (ev, customTxt) => {
    document.querySelector('#txt').innerText = customTxt+'';
});

ipcRenderer.on('keySelected', (ev, keyTxt) => {
    document.querySelector('#accept-key').disabled = false;
    document.querySelector('#key-pressed').innerText = 'Key: ' + keyTxt;
});

let haveAcceptedKey = false;

contextBridge.exposeInMainWorld('electronAPI', {
    sendAcceptKey: () => {
        if(haveAcceptedKey) return;
        haveAcceptedKey = true;
        ipcRenderer.send('user-accepted-key-i');
    }
});