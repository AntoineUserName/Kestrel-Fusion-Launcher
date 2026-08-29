const path = require('path');
const config = require('./config-manager');
const globalVars = require('./global-variables');
const {dialog, ipcMain} = require('electron');
const modManager = require('./mod-manager');
const childProcess = require('child_process');


/*****************************************************
****** Events / Communication with the window : ******
******************************************************/

let canDoOtherActions = true;

// Interact with the window :
function unfreezePage() {
    canDoOtherActions = true;
    globalVars.mainWindow.webContents.executeJavaScript("setIsPageFrozen(false)", true);
}
function alertWindow(text, infotype) {
    globalVars.mainWindow.webContents.send('alert', text, infotype);
}

// When user click on the "Import Mod" button
ipcMain.on('homemenu-otherfeatures', (ev, channelName, ...args) => {

    if(channelName == 'clickedCreateMod') {

        require('child_process').exec('explorer ' + JSON.stringify(path.join(__dirname, 'documentation')).replace(/\\\\/g, '\\'));

    }
    else if(channelName == 'addmod') {

        if(!canDoOtherActions) return;
        canDoOtherActions = false;
        
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
    }
    
});


// Delete a mod
ipcMain.on('removeMod', (ev, modname) => {
    
    if(!canDoOtherActions) return;
    canDoOtherActions = false;
    
    if(modManager.removeMod( modname ) == false) {
        console.log('Error : cannot delete the mod');
        alertWindow('Error : cannot delete the mod');
    } else {
        console.log('Mod deleted');
        alertWindow('Mod deleted');
    }

    unfreezePage();
});

ipcMain.on('setModParam', (ev, modId, paramName, val) => {

    modManager.setModParam(modId, paramName, val);
});

// Open mod files
ipcMain.on('viewMod', (ev, modname) => {
    console.log('open ' + JSON.stringify( path.join(modManager.modsFolder, modname) ));
    childProcess.exec( 'start "" ' + JSON.stringify( path.join(modManager.modsFolder, modname) ) );
});


// *********************************************
// ************* Launch the game : *************
// *********************************************

let cmdToRunOnClosed = [];

ipcMain.on('launch', () => {
    
    if(!canDoOtherActions) return;
    canDoOtherActions = false;

    if(cmdToRunOnClosed.length != 0) {
        console.log('say that the process is stopped to mods for after say that the process is relaunched');
        cmdToRunOnClosed.forEach(
            cmd => {
                if(typeof(cmd) == 'string') {
                    childProcess.spawn(cmd,
                    {
                        shell: true,
                        detached: true
                    });
                    
                } else {
                    cmd();
                }
            }
        );
        cmdToRunOnClosed = [];
    }
    
    globalVars.mainWindow.webContents.send('setStartButt', 'Apply mods..', true);

    console.log('apply modifications..');

    let cmdToRunLater = modManager.launchMods();

    let cmdToRunAfter = cmdToRunLater.codeToLaunchAfter;
    cmdToRunOnClosed = cmdToRunLater.codeToLaunchOnClosed;

    console.log(cmdToRunAfter.length + ' scripts to launch after the game is launched');

    console.log('launching..');

    if(config['not-launch-game']) {
        if(config['close-after-game-launched']) {
            globalVars.app.quit();
        } else {
            globalVars.mainWindow.webContents.send('setStartButt', 'MODS APPLIED', true);
        }
        return;
    }
    
    globalVars.mainWindow.webContents.send('setStartButt', 'LAUNCHING..', true);

    // Launch the game :
    setTimeout(() => {
        
        const pathExeFile = path.join(config['game-location'], config.exename);

        console.log( pathExeFile );
        
        // childProcess.exec( JSON.stringify(pathExeFile) );
        
        // childProcess.execFile( cmdToLaunchGame );
        
        // const gameProcess = childProcess.spawn(pathExeFile);
        
        if(config['open-in-cmd']) {
            
            let terminal = require('child_process').spawn(process.platform == 'linux' ? '/bin/sh' : process.env.ComSpec, {
                shell: true,
                // detached: true
            });

            terminal.stderr.on('data', (errbuffer) => {

                if(typeof(errbuffer) != 'string') {
                    
                    if(errbuffer.toString) {
                        errbuffer = errbuffer.toString('utf8');
                    }
                }

                alertWindow('Error while launching the game :\n' + (typeof(errbuffer) == "string" ? errbuffer : 'Cannot translate error buffer'));
            });

            // terminal.stdin.write(JSON.stringify(pathExeFile) + '\n');
            
            // terminal.stdin.write('cd ' + JSON.stringify(config['game-location']) + '\n' + JSON.stringify(config.exename) + '\n');
            
            // terminal.stdin.write('cd ' + JSON.stringify(config['game-location']).replace(/\\/g, '\\') + '\n' + JSON.stringify(config.exename) + '\n');

            terminal.stdin.write('cd ' + JSON.stringify(config['game-location']).replace(/\\\\/g, '\\') + '\n' + JSON.stringify(config.exename).replace(/\\\\/g, '\\') + '\n');

            
            // terminal.stdout.on('data', datas => {
            //     console.log(datas.toString('utf8'))
            // });

            setTimeout(() => {
                console.log('removing terminal');
                terminal.kill('SIGINT');
            }, 5000);
        } else {
            childProcess.spawn(pathExeFile, {
                detached: true,
            });
        }

        // gameProcess.stdout.on('data', (data) => {
        //     console.log('Output:', data.toString());
        // });
        
        // gameProcess.stderr.on('data', (data) => {
        //     console.error('Error:', data.toString());
        // });
        
        // gameProcess.on('close', (code) => {
        //     console.log('Child process exited with code:', code);
        // });

        let launchedGameCount = 0;
        let gameAlreadyStarted = false;

        let checkGameLaunchedInt = setInterval(() => {
            if(gameAlreadyStarted) {
                if(globalVars.isGameLaunched) return;

                console.log('game closed');
                clearInterval( checkGameLaunchedInt );

                cmdToRunOnClosed.forEach(
                    cmd => {
                        if(typeof(cmd) == 'string') {
                            childProcess.spawn(cmd,
                            {
                                shell: true,
                                detached: true
                            });
                            
                        } else {
                            cmd();
                        }
                    }
                );
                cmdToRunOnClosed = [];
            } else {
                if(!globalVars.isGameLaunched) {
                    launchedGameCount = 0;
                    return;
                }

                if(launchedGameCount < 200) {
                    launchedGameCount++;
                    return;
                }

                gameAlreadyStarted = true;

                // Wait before launch scripts because the game is loading
                setTimeout(() => {
                    console.log('launching ' + cmdToRunAfter.length + ' scripts');
                    cmdToRunAfter.forEach(
                        cmd => {
                            if(typeof(cmd) == 'string') {
                                // childProcess.exec( cmd )

                                
                                childProcess.spawn(cmd,
                                {
                                    shell: true,
                                    detached: true
                                });
                                
                            } else {
                                cmd();
                            }
                        }
                    );

                    cmdToRunAfter = [];

                    
                    setTimeout(() => {

                        if(config['close-after-game-launched']) {
                            globalVars.app.quit();
                            return;
                        }

                        globalVars.mainWindow.webContents.send('setStartButt', 'LAUNCH GAME');
                        unfreezePage();
                    }, config['open-in-cmd'] ? 2000 : 1000);

                }, 5700);
            }
            
        }, 80);

    }, 250);

});



// Enable / Disable mod :
ipcMain.on('setModIsActivated', (ev, modname, isactivated) => {
    
    if(!canDoOtherActions) return;
    canDoOtherActions = false;
    
    if(modname == false) return;

    modManager.setModIsActivated(modname, isactivated);

    unfreezePage();

});


// open the updater
ipcMain.on('updatingapp', () => {

    if(config.indev || config['not-update']) return; // dont update if the app is in dev

    // when the app will be reloaded, the first-time.js will be called
    config.firstTime = true;
    config.save();

    globalVars.createWindow(
        require('./window-types.json').UPDATER,
        'updater/preload-updater.js'
    );

    const {Menu, MenuItem} = require('electron');
    
    const newMenu = new Menu();

    newMenu.append(
        new MenuItem({
            label: 'Updater',
            submenu: [{
            label: 'open devtool',
            role: 'open devtool',
            accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Control+Shift+I',
            click: () => { globalVars.mainWindow.webContents.openDevTools(); }
            }]
        })
    );

    Menu.setApplicationMenu( newMenu );

    globalVars.mainWindow
    .webContents.on('dom-ready', () => {
        // globalVars.mainWindow.webContents.send( 'appLocU', globalVars.appLocationURL, path.join(path.dirname(globalVars.app.getPath('exe')), '../') );
        globalVars.mainWindow.webContents.send( 'appLocU', globalVars.appLocationURL, path.dirname(globalVars.app.getPath('exe')) );
    });
});