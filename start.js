/**************************************************************************************************
*
*    This file is executed at the start of the application,
*    it check the configuration and if everything is fine, this file will call the main.js file
*
***************************************************************************************************/

const {app} = require('electron');

const config = require('./config-manager');

if(!config.version) config.version = app.getVersion();

if(config.notLoaded === 1 || config.notLoaded === 2) {
    
    const {dialog} = require('electron');
    const path = require('path');

    app.whenReady().then(() => {
        
        // let windowWidth = 956, windowHeight = 600;

        // let newWindow = new BrowserWindow({
        //     width: windowWidth,
        //     height: windowHeight,
        //     webPreferences: {
        //         //preload: path.join(globalVars.appLocationURL, '/interface/', (cusompreload ?? 'preload.js')),
        //         contextIsolation: true,
        //         nodeIntegration: true
        //     }
        // });

        function openChooseExeDialog() {
            
            dialog.showOpenDialog({ properties: ['openFile'], title: 'Select your exe file game' }).then(
                dialogDatas => {

                    if(dialogDatas.filePaths.length == 0) {
                        
                        // dialog.showErrorBox("Error :", "You have not choosed a file, choose the exe game file.");
                        // openChooseExeDialog();
                        app.quit();
                        return;
                    }
                    
                    let fileResult = dialogDatas.filePaths[0];

                    if(path.extname(fileResult).toLowerCase() != '.exe') {

                        dialog.showErrorBox("Error :", "The file that you choosed is not an .exe file, choose the exe game file.");
                        openChooseExeDialog();
                        return;
                    }

                    config['game-location'] = path.dirname(fileResult);
                    config.exename = path.basename(fileResult);
                    
                    if( require('fs').existsSync( path.join(config['game-location'], '/CHARS') ) == false ) {
                        dialog.showErrorBox("Error :", "The game files aren't extracted, be sure that you choosed the real exe game file.");
                        openChooseExeDialog();
                        return;
                    }

                    config.save();

                    // restart the app
                    app.relaunch();
                    app.quit();
                }
            );
        }

        openChooseExeDialog();

    }).catch(
        () => {
            app.quit();
        }
    );
    
} else if(config.notLoaded == 0) {

    if(!require('fs').existsSync('./config.json')) {

        // If there are no config.json files write a new config.json
        require('fs').writeFileSync('./config.json', JSON.stringify({
            "activated-mods": [],
            "user-preferences": {
                "background":null,
                "themes":[]
            },
            "fullscreen": false,
            "firstTime": true
        }), 'utf8');

        app.relaunch();
        app.quit();
    } else {
    
        app.whenReady().then(() => {

            const {dialog} = require('electron');

            dialog.showErrorBox('Error :',
`The config.json file has a problem.
It's probably due to a syntax error.

To fix the problem go to the folder of this launcher and enter into config.json file and verify that the json file syntaxe is good, if you don't know the json syntaxe try to get help of other people or by tutorials`
            );
        
            setTimeout(() => {
                app.quit();
            }, 500);
        });

    }
    
} else {

    // After checked everything execute the main file
    require('./main');
}