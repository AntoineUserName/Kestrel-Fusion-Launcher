const {dialog, ipcMain} = require('electron');
const config = require('../../config-manager');
const globalVars = require('../../global-variables');


const idCommunicationWindow = 'SETTINGS_EDITOR_W';


/*****************************************************
****** Events / Communication with the window : ******
******************************************************/

let canDoOtherActions = true;

// ipcMain.on(idCommunicationWindow + 'editAttr', (ev, attrkey, attrvalue) => {
//     config[attrkey] = attrvalue;
// });


// When user click on the "save" button
ipcMain.on(idCommunicationWindow + 'save', (ev, editedConfigAttrs) => {

    if(!canDoOtherActions) return;

    canDoOtherActions = false;

    let oldIsScriptsEverywhere = config.scriptsEverywhere;

    let old_unlockVehiclesIfAddChar = config.unlockVehiclesIfAddChar;
    let old_unlockAllVehicles = config.unlockAllVehicles;
    

    let reloadAfterShortcuts = editedConfigAttrs['baseShortcut'] != null && editedConfigAttrs['baseShortcut'] != config['baseShortcut'];

    for (const key in editedConfigAttrs) {
        config[key] = editedConfigAttrs[key];
    }

    if(reloadAfterShortcuts) {
        console.log('Reloading shortcuts..');
        require('../../js-to-game-scripts').shortcuts.reloadShortcutsUsingBaseShortcut();
    }

    config.save();

    if((!editedConfigAttrs.scriptsEverywhere) != (!oldIsScriptsEverywhere)) {
        require('../../mod-manager').onFeatureAnyScriptGotEdited(editedConfigAttrs.scriptsEverywhere);
    }

    if( ((!editedConfigAttrs.unlockAllVehicles) != (!old_unlockAllVehicles)) || (!editedConfigAttrs.unlockVehiclesIfAddChar) != (!old_unlockVehiclesIfAddChar) ) {
        
        let characterManager = require('../../character-manager/character-manager'); // (don't load this module at the start of the app)
        let charFileManager = require('../../character-manager/char-file-manager');

        characterManager.updateCharsListFile(false);

    }

    setTimeout(() => {
        globalVars.openHomeWindow();
        canDoOtherActions = true;
    }, 230);
});

ipcMain.on(idCommunicationWindow + 'printmsg', (ev, msgToPrint) => {

    require('electron').dialog.showMessageBox({
        message: msgToPrint,
        buttons: [],
        type: 'info'
    });
});


// When user click on the "cancel" button
ipcMain.on(idCommunicationWindow + 'cancel', () => {
    
    if(!canDoOtherActions) return;

    canDoOtherActions = false;

    globalVars.openHomeWindow();

    canDoOtherActions = true;
});