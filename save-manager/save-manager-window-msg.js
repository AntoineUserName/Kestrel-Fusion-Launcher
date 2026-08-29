// const { ipcMain } = require('electron');
const saveManager = require('./save-manager');
const globalVars = require('../global-variables');

let events = {};

function handleMsg(channelId, event) {
    events[channelId] = event;
}


//===========
// Init
//===========

handleMsg('init', () => {
    const hasConfig = saveManager.checkForConfig();
    if(!hasConfig) {
        if(!saveManager.firstTimeInit()) {
            return {
                ok: false,
                error: 'Initialisation failed.'
            };
        }
    }
    return {
        ok: true,
        ...saveManager.getUIstate()
    };
});

handleMsg('checkJson', () => {
    const hasJson = saveManager.checkJson();
    if (!hasJson) {
        return false
    };
    return true;
});

//==================
// Profile features
//==================

handleMsg('setCurrentProfile', (_, profileName) => {
    saveManager.setCurrentProfile(profileName);
    return {
        ok: true,
        ...saveManager.getUIstate()
    };
});

handleMsg('createProfile', (_, profileName) => {
    if(saveManager.createProfile(profileName) === false) {
        return {
            ok: false,
            error: 'Profile not created'
        };
    }
    return {
        ok: true,
        ...saveManager.getUIstate()
    };
});

handleMsg('renameProfile', (_, profileNewName) => {
    if(saveManager.renameProfile(profileNewName) === false) {
        return {
            ok: false,
            error: 'Profile not renamed'
        };
    }
    return {
        ok: true,
        ...saveManager.getUIstate()
    };
});

handleMsg('deleteProfile', () => {
    if(!saveManager.deleteProfile()) {
        return {
            ok: false,
            error: 'Profile could not be deleted'
        };
    }
    return {
        ok: true,
        ...saveManager.getUIstate()
    };
});

//==============
// Save to game
//==============

handleMsg('loadProfileToGame', () => {

    if(globalVars.isGameLaunched) {
        return {
            ok: false,
            error: 'Please close the game before changing save files'
        };
    }

    if(!saveManager.loadProfileToGame()) {
        return {
            ok: false,
            error: 'Profile could not be loaded to game.\nMake sure you have a profile selected.'
        };
    }
    return {
        ok: true,
        ...saveManager.getUIstate()
    };
});

//==================
// Import functions
//==================

handleMsg('importSaveProfile', async () => {
    if(!await saveManager.importSaveProfile()) {
        return {
            ok: false,
            error: 'profile import failed.'
        };
    }
    return {
        ok: true,
        ...saveManager.getUIstate()
    };
});

handleMsg('importSaveToCurrentProfile', async () => {
    if(!await saveManager.importSaveToCurrentProfile()) {
        return {
            ok: false,
            error: 'Importing save to profile failed.\nMake sure you have a profile selected.'
        };
    }
    return {
        ok: true,
        ...saveManager.getUIstate()
    };
});

handleMsg('importBackup', (_, backupChosen) => {
    if(!saveManager.importBackup(backupChosen)) {
        return {
            ok: false,
            error: 'Backup could not be imported.'
        };
    }
    return {
        ok: true,
        ...saveManager.getUIstate()
    };
});

//==================
// Export functions
//==================

handleMsg('exportProfile', async () =>{
    if(!await saveManager.exportProfile()) {
        return {
            ok: false,
            error: 'Profile could not be exported.\nMake sure you have a profile selected.'
        };
    }
    return {
        ok: true
    };
});

handleMsg('exportSaveToProfile', (_, chosenSlot) => {
    if(!saveManager.exportSaveToProfile(chosenSlot)) {
        return {
            ok: false,
            error: 'Save could not exported to current profile.'
        };
    }
    return {
        ok: true,
        ...saveManager.getUIstate()
    };
});

handleMsg('dumpAllSaves', (_, profileName) => {
    if(!saveManager.dumpAllSaves(profileName)) {
        return {
            ok: false,
            error: 'Game saves could not be dumped to profile.'
        };
    }
    return {
        ok: true,
        ...saveManager.getUIstate()
    };
});

//============
// UI helpers
//============

handleMsg('getGameSaves', () =>{
    try{
        const entries = saveManager.getGameSaves();
        return {
            ok: true,
            entries
        };
    } catch {
        return {
            ok: false,
            error: 'Grabbing game saves failed.'
        };
    }
});



handleMsg('seeProfilesBackups', () => {

    try {
        saveManager.seeProfilesBackups();
    } catch (error) {
        
    }

    return {
        ok: true
    }
});


handleMsg('getBackups', () =>{
    try{
        const entries = saveManager.getBackups();
        return {
            ok: true,
            entries
        };
    } catch {
        return {
            ok: false,
            error: 'Grabbing backups failed.'
        };
    }
});


/**
 * 
 * @param {Electron.IpcMainEvent} ev
 */
exports.onWindowMessage = async (ev, channelId, reqId, ...args) => {

    if(!channelId.startsWith('save_manager_')) return;

    channelId = channelId.slice('save_manager_'.length);

    let e = events[channelId];

    if(e) {

        let v = e(ev, ...args);

        if(v && v.then) v = await v;

        // ev.returnValue = v;

        ev.reply('save_manager_reply', reqId, v == null ? null : v);

    } else {

        console.log('event not declared:', channelId);
        console.log(__filename);
    }

};