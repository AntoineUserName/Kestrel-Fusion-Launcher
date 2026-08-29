const globalVars = require('./global-variables');
const { Menu, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const config = require('./config-manager');

// ** Create the menu : **
const template = [
    {
        label: globalVars.app.getName().replace(/-/g, ' '),
        submenu: [
            {
                label: 'reload',
                click: () => {
                    if(require('electron').BrowserWindow) require('electron').BrowserWindow.getFocusedWindow().reload();
                }
            },
            {
                label: 'home',
                click: () => {
                    globalVars.openHomeWindow();
                }
            },
            {
                label: 'open devtool',
                accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Control+Shift+I',
                click: () => {
                    if(require('electron').BrowserWindow) require('electron').BrowserWindow.getFocusedWindow().webContents.openDevTools();
                }
            },
            {
                label: 'quit',
                click: () => {
                    globalVars.app.quit();
                }
            }
        ]
    },

    {
        label: 'settings',
        submenu: [
            {
                label: 'edit settings',
                click: () => {
                    
                    globalVars.createWindow(
                        require('./window-types.json').SETTINGS_EDITOR,
                        'settings-editor/preload-settings-editor.js'
                    );

                    require('./interface/settings-editor/ipc-settings-editor');

                    let newConfigM = {};

                    for (const key in config) {
                        if(typeof(config[key]) != 'function') newConfigM[key] = config[key];
                    }
                    
                    globalVars.mainWindow
                    .webContents.on('dom-ready', () => {
                        globalVars.mainWindow.webContents.send('configManager', newConfigM);
                    });
                }
            },
            {
                label: 'optimise game',
                click: () => {
                    require('./interface/optimiser/optimiser-page').openWindow();
                }
            },
            {
                label: 'set background image',
                click: () => {
                    dialog.showOpenDialog({ properties: ['openFile'], title: 'choose background image' }).then(
                        dialogDatas => {
                
                            if(dialogDatas.filePaths.length == 0) {
                                config['user-preferences'].background = null;
                                config.save();
                                
                                globalVars.mainWindow.reload();
                                return;
                            }
                
                            let backgroundData = fs.readFileSync( dialogDatas.filePaths[0] ).toString('base64');

                            config['user-preferences'].background = `url("data:image/png;base64,${backgroundData}")`;
                            config.save();

                            globalVars.mainWindow.reload();
                        }
                    ).catch(
                        err => {
                            console.error(err);
                            config['user-preferences'].background = null;
                            config.save();

                            
                            globalVars.mainWindow.reload();
                        }
                    );
                }
        },
        {
            label: 'reset background',
            click: () => {
                config['user-preferences'].background = null;
                config.save();
                
                globalVars.mainWindow.reload();
            }
        },
        // {
        //     label: 'open json settings',
        //     click: () => {
        //         require('child_process').exec(JSON.stringify( path.join(__dirname, 'config.json') ));
        //     }
        // }
        ]
    },
    {
        label: 'themes',
        submenu: [
            // {
            //     label: 'select theme',
            //     click: () => {
            //         //
            //     }
            // },
            {
                label: 'reset theme',
                click: () => {
                    config['user-preferences'].themes = [];
                    config.save();
                    
                    globalVars.mainWindow.reload();
                }
            },
            {
                label: 'change theme',
                click: () => {
                    dialog.showOpenDialog({
                        properties: ['openFile'],
                        filters: [
                            { name: 'CSS', extensions: ['css'] }
                        ],
                        title: 'choose your theme',
                        defaultPath: fs.existsSync(path.join(__dirname, 'themes')) ? path.join(__dirname, 'themes') : undefined
                    }).then(
                        dialogDatas => {

                            function notTheme() {
                                config['user-preferences'].themes = [];
                                config.save();
                                
                                globalVars.mainWindow.reload();
                            }
                            
                            if(dialogDatas.filePaths.length == 0) return notTheme();


                            try {

                                let themeFileStats = fs.statSync(dialogDatas.filePaths[0]);

                                if(themeFileStats.isDirectory()) return notTheme();

                                if(path.extname( dialogDatas.filePaths[0] ).toLowerCase() != '.css') return notTheme();
                                

                                let themeData = fs.readFileSync( dialogDatas.filePaths[0] );
                                let themeFileName = path.basename(dialogDatas.filePaths[0]);

                                fs.writeFileSync(
                                    path.join(globalVars.appLocationURL, '/themes', themeFileName),
                                    themeData
                                );

                                config['user-preferences'].themes = [ themeFileName ];
                                config.save();
                                
                                globalVars.mainWindow.reload();

                            } catch (error) {
                                console.error(error);
                                return notTheme();
                            }

                        }
                    ).catch(
                        err => {
                            console.error(err);
                            config['user-preferences'].themes = [];
                            config.save();

                            
                            globalVars.mainWindow.reload();
                        }
                    );
                }
        }
        ]
    },

    {
        label: 'characters',
        submenu: [
            {
                label: 'new character',
                click: () => {
                    require('./character-manager/character-manager').openCharEditorWindow();
                }
            },
        ]
    },
    
    {
        label: 'save manager',
        submenu: [
            {
                label: 'manage saves',
                click: () => {
                    require('./save-manager/save-manager').openSaveManagerWindow();
                }
            },
        ]
    },

    {
        label: 'lisence and copyrights',
        submenu: [
            {
                label: 'view the licence',
                click: () => {
                    globalVars.createWindow(
                        require('./window-types.json').LICENSE,
                        'license-and-copyrights/preload.js',
                        true
                    );
                }
            },
            {
                label: 'view the other licences',
                click: () => {
                    globalVars.createWindow(
                        require('./window-types.json').OTHERLICENSES,
                        'license-and-copyrights/preload.js',
                        true
                    );
                }
            },
            {
                label: 'view the other copyrights',
                click: () => {
                    globalVars.createWindow(
                        require('./window-types.json').COPYRIGHTS,
                        'license-and-copyrights/preload.js',
                        true
                    );
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


/**
 * Edit the template array, its the first parametter of the callback function
 * @param {(template: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[]) => void} callback 
 */
exports.modifyMenu = (callback) => {
    
    callback(template);
}


exports.applyMenu = () => {
    
    // Apply this menu to the app :
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

exports.applyMenu();
