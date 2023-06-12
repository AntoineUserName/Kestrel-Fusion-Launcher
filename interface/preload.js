const { contextBridge, ipcRenderer } = require('electron');

let addModB = () => {};
let setVersionDisplay = () => {};

let eShowPopup;

ipcRenderer.on('alert', (ev, text, infotype) => {
    eShowPopup(text, infotype);
});

ipcRenderer.on('addMod', (ev, modinfo, isused) => {
    addModB(modinfo, isused);
});

ipcRenderer.on('background', (ev, background) => {
    document.body.style.backgroundImage = background;
});

ipcRenderer.on('version', (ev, version) => {
    setVersionDisplay(version);
})

ipcRenderer.on('setStartButt', (ev, text) => {
    document.querySelector('#launch-game button').innerHTML = text;
});


contextBridge.exposeInMainWorld('electronAPI', {

    // To set new callback that are called by the main.js
    setAddMod: realAddMod => addModB = realAddMod,
    setChangeVersion: realSetVersion => setVersionDisplay = realSetVersion,

    // Function for send instructions to the main.js
    launchGame: () => ipcRenderer.send('launch'),
    addMod: () => ipcRenderer.send('addmod'),
    setModIsActivated: (modname, isactivated) => { ipcRenderer.send('setModIsActivated', modname, isactivated) },
    removeMod: (modname) => { ipcRenderer.send('removeMod', modname) },
    viewMod: (modname) => ipcRenderer.send('viewMod', modname),

    setShowPopup: spopfunc => eShowPopup = spopfunc

});