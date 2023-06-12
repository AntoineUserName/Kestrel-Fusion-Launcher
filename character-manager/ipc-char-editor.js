const {ipcMain, dialog} = require('electron');
const { existsSync } = require('fs');
const path = require('path');
const globalVars = require('../global-variables');


let graphicDatas = {};

let existingCharIds = [];


function unfreezeWindow() {
    globalVars.mainWindow.webContents.send('unfreeze');
}

// Compile the mod :
ipcMain.on('saveChar', (ev, charDatas, issuretoreplacemod) => {
    console.log('saving character..');

    let resultfolder = require('../mod-manager').modsFolder;
    // let resultfolder = path.join(__dirname, '/charresult');

    let modPath = path.join(resultfolder, charDatas.modname);


    // Before compile the mod check that the character id haven't an id that the game already use
    if(existingCharIds.length == 0) existingCharIds = require('./cpj-editor').getCharIds().map(existingcharid => existingcharid.toUpperCase());
    console.log(existingCharIds);

    if(existingCharIds.includes(charDatas.id)) {
        globalVars.mainWindow.webContents.send(
            'alert',
            `The character ID already exist in the game, choose another ID for your character.`
        );
        unfreezeWindow();
        return;
    }


    // Before compile the mod alert the user if a mod have already this name
    if(!issuretoreplacemod) {
        
        if(existsSync(modPath)) {
            globalVars.mainWindow.webContents.send('onSavedMod', false);
            unfreezeWindow();
            return;
        }

    }

    require('./char-file-manager').compileChar(
        charDatas,
        graphicDatas,
        resultfolder
    );

    console.log('character saved');
    unfreezeWindow();

    globalVars.mainWindow.webContents.send('onSavedMod', true);

});


ipcMain.on('addAsset', (ev, assetid) => {

    function cancelAsset(err) {
        graphicDatas[assetid] = null;
        unfreezeWindow();
        globalVars.mainWindow.webContents.send('onNewAsset', assetid, null, err);
    }

    dialog.showOpenDialog({ properties: ['openFile'], title: 'choose the asset file', filters: ['dds', 'gsc'] }).then(
        filesChoosed => {

            if(filesChoosed.filePaths.length == 0 || (!filesChoosed.filePaths[0]) || existsSync(filesChoosed.filePaths[0]) == false) {
                cancelAsset();
                return;
            }

            graphicDatas[assetid] = filesChoosed.filePaths[0];

            globalVars.mainWindow.webContents.send('onNewAsset', assetid, path.basename(filesChoosed.filePaths[0]));
            unfreezeWindow();
        }
    ).catch(
        err => {
            console.error(err);
            cancelAsset(err);
        }
    );
});


ipcMain.on('resetAssets', () => {
    graphicDatas = {};
});