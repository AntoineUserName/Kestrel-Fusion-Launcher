const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// ****** Load and check the config : ******
console.log('loading config..');
const config = require('./config-manager');

// If this module found error in configuration files it stop the app
console.log('checking config..');
require('./check-config')(app);
// *****************************************


const globalVars = require('./global-variables');
globalVars.app = app;
globalVars.appLocationURL = __dirname;
globalVars.KFFolderPath = path.join( config['game-location'], '/KF-Files' );

if(!fs.existsSync(globalVars.KFFolderPath)) fs.mkdirSync( globalVars.KFFolderPath );


require('./backup-manager');
const modManager = require('./mod-manager');
const windowTypes = require('./window-types.json');
require('./menu-builder'); // Create the menu
require('./ipc-main-manager'); // Interactions main process <=> window process
const memoryJS = require('memoryjs');

console.log('modules loaded');



let currentWindowType = windowTypes.MAIN;



function alertWindow(text, infotype) {
    globalVars.mainWindow.webContents.send('alert', text, infotype);
}

modManager.launcherVersion = app.getVersion();



// Executed when the window is loaded :
function onWindowReloaded() {

    if(currentWindowType != windowTypes.MAIN) return;

    function applyThemeOnWindow(themeid) {
        try {
            globalVars.mainWindow.webContents.executeJavaScript(`
            (()=>{
                let el = document.createElement("link");
                el.rel = "stylesheet";
                el.href = ${
                    JSON.stringify( path.join(globalVars.appLocationURL, '/themes', themeid) )
                };

                document.head.appendChild(el);
            })()
            `, false);
        } catch (error) {
            console.error(error);
        }
    }
    
    if(config['open-dev-tool']) globalVars.mainWindow.webContents.openDevTools();

    // Apply themes :
    config['user-preferences'].themes.forEach( applyThemeOnWindow );
    
    // Change the background
    if(config['user-preferences'].background) globalVars.mainWindow.webContents.send('background', config['user-preferences'].background);

    // Load the mods
    console.log('loading mods..');
    let haveModNotLoaded = modManager.loadAllMods();
    console.log('mods loadeds');

    if(haveModNotLoaded) {
        console.log('1 or more mods cannot be loaded');
        alertWindow("Error : a mod can't be loaded\n(verify if there are a mod.json file or if he is badly imported)");
    }


    // Send the version of the app :
    globalVars.mainWindow.webContents.send('version', config.version);
    
}



const createWindow = (urlwindowfile) => {

    // Create the browser window
    globalVars.mainWindow = new BrowserWindow({
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
            urlwindowfile = `file://${globalVars.appLocationURL}/interface/index.html`;
            break;
    }

    // Load the .html page :
    globalVars.mainWindow.loadURL(urlwindowfile);

    return globalVars.mainWindow;
}



// Open the window when the app is ready
app.whenReady().then(() => {

    // Next open the window :
    createWindow('main')
     .webContents.on('dom-ready', onWindowReloaded); // Every time that the window is loaded/reloaded the function "onWindowReloaded" is called

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow('main').webContents.once('dom-ready', onWindowReloaded);
    });
});


// Stop the app when all windows is closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        console.log("STOP APP");
        app.quit();
    }
});





// Check if the game is launched every seconds
setInterval(() => {
    
    try {
        
        memoryJS.getProcesses((error, processes) => {
            if(error) {
                console.error(error);
                console.log('error while checking if the game is launched');
                return;
            }

            globalVars.isGameLaunched = processes.find( p => p.szExeFile == config.exename ) != null;
        });
    } catch (error) {
        console.error(error);
    }

}, 1000);