const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const backupManager = require('./backup-manager');
const modManager = require('./mod-manager');
const memoryJS = require('memoryjs');

const config = require('./config-manager');

// If this module found error in configuration files it stop the app
require('./check-config')(app);


console.log('app launched');



let mainWindow;
let isGameLaunched;
let appLocationURL = __dirname;


// Interact with the window :
function unfreezePage() {
    mainWindow.webContents.executeJavaScript("setIsPageFrozen(false)", true);
}
function alertWindow(text, infotype) {
    
    mainWindow.webContents.send('alert', text, infotype);
}


// ** Create the menu : **
// (in the futur I will put it in another file)
const template = [
    {
        label: app.getName().replace(/-/g, ' '),
        submenu: [
            {
                label: 'reload',
                click: () => {
                    mainWindow.reload();
                }
            },
            {
                label: 'open devtool',
                click: () => {
                    mainWindow.webContents.openDevTools();
                }
            },
            {
                label: 'quit',
                click: () => {
                    app.quit();
                }
            }
        ]
    },

    {
        label: 'params',
        submenu: [
            {
                label: 'background',
                click: () => {
                    dialog.showOpenDialog({ properties: ['openFile'], title: 'choose background image' }).then(
                        dialogDatas => {
                
                            if(dialogDatas.filePaths.length == 0) {
                                config['user-preferences'].background = null;
                                config.save();
                                
                                mainWindow.reload();
                                return;
                            }
                
                            let backgroundData = fs.readFileSync( dialogDatas.filePaths[0] ).toString('base64');

                            config['user-preferences'].background = `url("data:image/png;base64,${backgroundData}")`;
                            config.save();

                            mainWindow.reload();
                        }
                    ).catch(
                        err => {
                            console.error(err);
                            config['user-preferences'].background = null;
                            config.save();

                            
                            mainWindow.reload();
                        }
                    );
                }
        },
        {
            label: 'open json settings',
            click: () => {
                childProcess.exec(JSON.stringify( path.join(__dirname, 'config.json') ));
            }
        }
        ]
    }
];

// Using camelcase with the menu buttons :
template.forEach(
    button => {
        let newButtLabel = '';

        button.label.split(' ').forEach(
            l => newButtLabel += ' ' + l.replace(l[0], l[0].toUpperCase())
        );

        button.label = newButtLabel.replace(' ', '');
    }
);

// Apply this menu to the app :
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);


const createWindow = (urlwindowfile) => {

    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 956,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true
        }
    });

    switch (urlwindowfile) {
        case 'main':
            urlwindowfile = `file://${appLocationURL}/interface/index.html`;
            break;
    }

    // et charger l'index.html de l'application.
    mainWindow.loadURL(urlwindowfile);

    return mainWindow;
}



// Open the window when the app is ready
app.whenReady().then(() => {

    // When the main window is open :
    function onWindowOpen() {
        if(config['open-dev-tool']) mainWindow.webContents.openDevTools();
        
        // Change the background
        if(config['user-preferences'].background) mainWindow.webContents.send('background', config['user-preferences'].background);

        // Load the mods
        console.log('loading mods..');
        let haveModNotLoaded = modManager.loadAllMods();
        console.log('mods loadeds');

        if(haveModNotLoaded) {
            console.log('1 or more mods cannot be loaded');
            alertWindow("Error : a mod can't be loaded\n(verify if there are a mod.json file or if he is badly imported)");
        }

        // Add the mods to the window
        modManager.getModsLoaded().forEach(
            modInfos => {
                mainWindow.webContents.send('addMod', modInfos, config['activated-mods'].includes(modInfos.name));
            }
        );

        // Send the version of the app :
        mainWindow.webContents.send('version', config.version);
    }

    // Next open the window
    createWindow('main').webContents.on('dom-ready', onWindowOpen);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow('main').webContents.once('dom-ready', onWindowOpen);
    });
});


// Stop the app when all windows is closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        console.log("STOP APP");
        app.quit();
    }
});



/*****************************************************
****** Events / Communication with the window : ******
******************************************************/



// When user click on the "Import Mod" button
ipcMain.on('addmod', (ev) => {

    modManager.mainWindow = mainWindow;

    
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
    
    mainWindow.webContents.send('setStartButt', 'Apply mods..');

    console.log('apply modifications..');

    let cmdToRunAfter = modManager.launchMods();

    console.log(cmdToRunAfter.length + ' scripts to launch after the game is launched');

    console.log('launching..');
    
    mainWindow.webContents.send('setStartButt', 'LAUNCHING..');

    // Launch the game :
    setTimeout(() => {
        
        const cmdToLaunchGame = JSON.stringify( path.join(config['game-location'], config.exename) );

        console.log( cmdToLaunchGame );
        childProcess.exec( cmdToLaunchGame );

        let checkGameLaunchedInt = setInterval(() => {
            if(!isGameLaunched) return;

            clearInterval( checkGameLaunchedInt );

            // Wait before launch scripts because the game is loading
            setTimeout(() => {
                console.log('launching ' + cmdToRunAfter.length + ' scripts');
                cmdToRunAfter.forEach(
                    cmd => childProcess.exec( cmd )
                );

                cmdToRunAfter = [];

                
                setTimeout(() => {
                    mainWindow.webContents.send('setStartButt', 'LAUNCH GAME');
                    unfreezePage();
                }, 1000);

            }, 5700);
            
        }, 80);

    }, 250);

});



// Activate / Desactivate mod :
ipcMain.on('setModIsActivated', (ev, modname, isactivated) => {
    
    if(modname == false) return;

    modManager.setModIsActivated(modname, isactivated);

    unfreezePage();

});


// Check if the game is launched every seconds
setInterval(() => {
    
    memoryJS.getProcesses((error, processes) => {
        if(error) {
            console.error(error);
            console.log('error while checking if the game is launched');
            return;
        }

        isGameLaunched = processes.find( p => p.szExeFile == config.exename ) != null;
    });

}, 1000);