const path = require('path');
const config = require('./config-manager');
const globalVars = require('./global-variables');
const {dialog, ipcMain} = require('electron');
const modManager = require('./mod-manager');
const childProcess = require('child_process');


/*****************************************************
****** Events / Communication with the window : ******
******************************************************/


// Interact with the window :
function unfreezePage() {
    globalVars.mainWindow.webContents.executeJavaScript("setIsPageFrozen(false)", true);
}
function alertWindow(text, infotype) {
    globalVars.mainWindow.webContents.send('alert', text, infotype);
}

// When user click on the "Import Mod" button
ipcMain.on('addmod', (ev) => {

    
    dialog.showOpenDialog({ properties: ['openDirectory'], title: 'choose mod folder' }).then(
        folderDatas => {

            if(folderDatas.filePaths.length == 0) {
                unfreezePage();
                return;
            }

            const loadTheMod = folderpath => {

                // Add mod by the mod-manager
                modManager.addNewMod( folderpath )
                    .catch( () => {
                        console.log('mod cannot be loaded');
                        alertWindow("Error : the mod can't be loaded\n(verify if he have a mod.json file or if he is badly imported)");
                    } )
                    .finally(
                        () => {
                            unfreezePage();
                        }
                    );
            }

            // Load multiple mods :
            // folderDatas.filePaths.forEach(loadTheMod);

            loadTheMod( folderDatas.filePaths[0] );

        }
    ).catch(
        err => {
            console.error(err);
            alertWindow(err);

            unfreezePage();
        }
    )
});


// Delete a mod
ipcMain.on('removeMod', (ev, modname) => {
    
    if(modManager.removeMod( modname ) == false) {
        console.log('Error : cannot delete the mod');
        alertWindow('Error : cannot delete the mod');
    } else {
        console.log('Mod deleted');
        alertWindow('Mod deleted');
    }

    unfreezePage();
});

// Open mod files
ipcMain.on('viewMod', (ev, modname) => {
    console.log('open ' + JSON.stringify( path.join(modManager.modsFolder, modname) ));
    childProcess.exec( "explorer " + JSON.stringify( path.join(modManager.modsFolder, modname) ) );
});


// *********************************************
// ************* Launch the game : *************
// *********************************************

ipcMain.on('launch', (event) => {
    
    globalVars.mainWindow.webContents.send('setStartButt', 'Apply mods..');

    console.log('apply modifications..');

    let cmdToRunAfter = modManager.launchMods();

    console.log(cmdToRunAfter.length + ' scripts to launch after the game is launched');

    console.log('launching..');
    
    globalVars.mainWindow.webContents.send('setStartButt', 'LAUNCHING..');

    // Launch the game :
    setTimeout(() => {
        
        // const cmdToLaunchGame = JSON.stringify( path.join(config['game-location'], config.exename) );
        const cmdToLaunchGame = path.join(config['game-location'], config.exename);

        console.log( cmdToLaunchGame );
        // childProcess.exec( cmdToLaunchGame );
        childProcess.execFile( cmdToLaunchGame );

        let checkGameLaunchedInt = setInterval(() => {
            if(!globalVars.isGameLaunched) return;

            clearInterval( checkGameLaunchedInt );

            // Wait before launch scripts because the game is loading
            setTimeout(() => {
                console.log('launching ' + cmdToRunAfter.length + ' scripts');
                cmdToRunAfter.forEach(
                    cmd => childProcess.exec( cmd )
                );

                cmdToRunAfter = [];

                
                setTimeout(() => {
                    globalVars.mainWindow.webContents.send('setStartButt', 'LAUNCH GAME');
                    unfreezePage();
                }, 1000);

            }, 5700);
            
        }, 80);

    }, 250);

});



// Enable / Disable mod :
ipcMain.on('setModIsActivated', (ev, modname, isactivated) => {
    
    if(modname == false) return;

    modManager.setModIsActivated(modname, isactivated);

    unfreezePage();

});