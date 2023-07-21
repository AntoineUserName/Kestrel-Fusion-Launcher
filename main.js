const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const config = require('./config-manager');


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
let memoryJS;

if(config.firstTime) require("./first-time");


console.log('modules loaded');

// let oldErrrs = [];
// process.on('uncaughtException', err => {
//     console.error(err);
//     if(globalVars.mainWindow) {
//         globalVars.mainWindow.webContents.send('alert', err.stack + '');
//     } else {
//         oldErrrs.push(
//             err
//         )
//     }
// })
// setInterval(() => {
//     if(!globalVars.mainWindow) return;
//     setTimeout(() => {
//         oldErrrs.forEach(
//             err => globalVars.mainWindow.webContents.send('alert', err.stack + '')
//         )
//         oldErrrs = [];
//     }, 800);
// }, 2000);

let currentWindowType = windowTypes.MAIN;


// DONT ACTIVATE "customisable" FOR TEXT THAT ANYBODY CAN EDIT
function alertWindow(text, customisable) {
    globalVars.mainWindow.webContents.send('alert', text, customisable);
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
    
    // send the app location
    // globalVars.mainWindow.webContents.send('appLocation', globalVars.appLocationURL, path.join(path.dirname(globalVars.app.getPath('exe')), '../'), config['not-use-date']);
    globalVars.mainWindow.webContents.send('appLocation', globalVars.appLocationURL, path.dirname(globalVars.app.getPath('exe')), config['not-use-date']);
}



const createWindow = (windowtypetoopen, cusompreload, isfullscreen) => {

    let removeOldWindow = () => null;

    // if there are already a window openned remove it
    if(globalVars.mainWindow != null) {

        const windowToR = globalVars.mainWindow;

        removeOldWindow = () => {
            windowToR.close();
        }
    }

    let windowWidth = 956, windowHeight = 600;

    if(isfullscreen) {
        let {screen} = require('electron');

        screen = screen.getPrimaryDisplay().workAreaSize;

        windowWidth = screen.width;
        windowHeight = screen.height;
    }


    globalVars.mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        fullscreen: config.fullscreen,
        webPreferences: {
            preload: path.join(globalVars.appLocationURL, '/interface/', (cusompreload ?? 'preload.js')),
            contextIsolation: true,
            nodeIntegration: true
        }
    });
    
    globalVars.mainWindow.setIcon(path.join(__dirname, 'icon.ico'));

    currentWindowType = windowtypetoopen;

    switch (windowtypetoopen) {
        case windowTypes.MAIN:
            windowtypetoopen = `file://${globalVars.appLocationURL}/interface/index.html`;
            break;
        
        case windowTypes.CHAR_EDITOR:
            windowtypetoopen = `file://${globalVars.appLocationURL}/interface/character-builder/index.html`;
            break;
        
        case windowTypes.LICENSE:
            windowtypetoopen = `file://${globalVars.appLocationURL}/interface/license-and-copyrights/license-page.html`;
            break;
        
        case windowTypes.COPYRIGHTS:
            windowtypetoopen = `file://${globalVars.appLocationURL}/interface/license-and-copyrights/copyrights-page.html`;
            break;
        
        case windowTypes.UPDATER:
            windowtypetoopen = `file://${globalVars.appLocationURL}/interface/updater/updater.html`;
            break;
        
        case windowTypes.SETTINGS_EDITOR:
            windowtypetoopen = `file://${globalVars.appLocationURL}/interface/settings-editor/settings-editor.html`;
            break;
    }

    // Load the .html page :
    globalVars.mainWindow.loadURL(windowtypetoopen);
    globalVars.mainWindow.webContents.once('dom-ready', removeOldWindow);

    return globalVars.mainWindow;
}
globalVars.createWindow = createWindow;

function openHomeWindow() {
    createWindow(windowTypes.MAIN)
     .webContents.on('dom-ready', onWindowReloaded); // Every time that the window is loaded/reloaded the function "onWindowReloaded" is called

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow(windowTypes.MAIN).webContents.once('dom-ready', onWindowReloaded);
    });
}
globalVars.openHomeWindow = openHomeWindow;

// Open the window when the app is ready
app.whenReady().then(() => {

    // Next open the window :
    openHomeWindow();
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

        if(memoryJS == null) memoryJS = require('memoryjs');
        
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