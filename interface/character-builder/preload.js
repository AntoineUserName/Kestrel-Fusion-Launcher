const { contextBridge, ipcRenderer } = require('electron');
const globalVars = require('../../global-variables');
const {exec} = require('child_process');

let eventsOnInitList = [];
let eventsOnAssetList = [];
let eventsOnSavedMod = [];


ipcRenderer.on('initCharClass', (ev, objchar, charTypesList) => {

    eventsOnInitList.forEach( ev => ev(objchar, charTypesList) );
});


ipcRenderer.on('onNewAsset', (ev, newassetid, newassetfile, err) => {
    eventsOnAssetList.forEach( ev => ev(newassetid, newassetfile, err) );
});

ipcRenderer.on('onSavedMod', (ev, issaved) => {
    eventsOnSavedMod.forEach( ev => ev(issaved) );
});


contextBridge.exposeInMainWorld('electronAPI', {

    saveChar: (cchardatas, sgraphicdatas, issuretoreplacemod) => {
        ipcRenderer.send('saveChar', cchardatas, sgraphicdatas, issuretoreplacemod);
    },

    addAsset: (assetid) => {
        ipcRenderer.send('addAsset', assetid)
    },
    resetAssets: () => {
        ipcRenderer.send('resetAssets');
    },

    onInitAttr: (ev) => {
        ipcRenderer.on('initAttr', ev);
    },

    onNewAsset: (ev) => {
        eventsOnAssetList.push(ev);
    },

    onInit: (ev) => {
        eventsOnInitList.push(ev)
    },

    onSavedMod: (ev) => {
        eventsOnSavedMod.push(ev);
    },

    goHome: () => {
        globalVars.openHomeWindow();
    },

    onUnfreeze: (ev) => {
        ipcRenderer.on('unfreeze', ev);
    },

    setAlertFunc: (newshowpop) => {
        
        ipcRenderer.on('alert', (ev, text, infotype) => {
            newshowpop(text, infotype);
        });
    },

    openNavURL: (newurl) => {
        exec(
            (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open') + ' ' + newurl
        );
    }

});