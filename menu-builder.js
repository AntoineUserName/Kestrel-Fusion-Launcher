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
                    globalVars.mainWindow.reload();
                }
            },
            {
                label: 'open devtool',
                click: () => {
                    globalVars.mainWindow.webContents.openDevTools();
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
        {
            label: 'open json settings',
            click: () => {
                require('child_process').exec(JSON.stringify( path.join(__dirname, 'config.json') ));
            }
        }
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
                label: 'import theme',
                click: () => {
                    dialog.showOpenDialog({ properties: ['openFile'], title: 'choose your theme' }).then(
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