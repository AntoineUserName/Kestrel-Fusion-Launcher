const { contextBridge, ipcRenderer } = require('electron');


let lastReqId = 0;


let reqs = {};

function askNode(msgid, ...args) {
    
    return new Promise((resolve) => {
        
        lastReqId++;

        reqs[lastReqId] = resolve;

        ipcRenderer.send('save_manager_' + msgid, lastReqId, ...args);
        
    });

}

ipcRenderer.on('save_manager_reply', (ev, reqid, reqresult) => {

    let r = reqs[reqid];

    if(!r) {
        console.log('req not found');
        return;
    }

    r(reqresult);
    delete reqs[reqid];

});


contextBridge.exposeInMainWorld('saveAPI', {

    init: () => 
        askNode('init'),

    checkJson: () =>
        askNode('checkJson'),

    setCurrentProfile: (profileName) =>
        askNode('setCurrentProfile', profileName),

    createProfile: (profileName) =>
        askNode('createProfile', profileName),
    
    renameProfile: (profileNewName) =>
        askNode('renameProfile', profileNewName),

    deleteProfile: () =>
        askNode('deleteProfile'),

    loadProfileToGame: () =>
        askNode('loadProfileToGame'),

    importSaveProfile: () =>
        askNode('importSaveProfile'),

    importSaveToCurrentProfile: () =>
        askNode('importSaveToCurrentProfile'),

    importBackup: (backupChosen) =>
        askNode('importBackup', backupChosen),

    exportProfile: () =>
        askNode('exportProfile'),

    exportSaveToProfile: (chosenSlot) =>
        askNode('exportSaveToProfile', chosenSlot),

    dumpAllSaves: (profileName) =>
        askNode('dumpAllSaves', profileName),

    //UIhelpers

    getGameSaves: () =>
        askNode('getGameSaves'),

    getBackups: () =>
        askNode('getBackups'),
    
    seeProfilesBackups: () =>
        askNode('seeProfilesBackups')
});

