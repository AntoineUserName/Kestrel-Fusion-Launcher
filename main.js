const { app, BrowserWindow } = require('electron');
const path = require('path');
const {join} = path;
const fs = require('fs');

const config = require('./config-manager');

let addonsFolder = join(__dirname, 'addons');

const globalVars = require('./global-variables');
globalVars.app = app;
globalVars.appLocationURL = __dirname;
globalVars.KFFolderPath = join( config['game-location'], '/KF-Files' );

let isAfterUpdate = fs.existsSync(globalVars.KFFolderPath);
if(!isAfterUpdate) fs.mkdirSync( globalVars.KFFolderPath );


require('./backup-manager');
const modManager = require('./mod-manager');
const windowTypes = require('./window-types.json');
require('./menu-builder'); // Create the menu
require('./ipc-main-manager'); // Interactions main process <=> window process


if(config.firstTime) {
    globalVars.isAfterUpdate = isAfterUpdate;
    config.version = app.getVersion();
    require("./first-time");
}


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



// Executed when the main window is loaded :
function onWindowReloaded() {

    if(currentWindowType != windowTypes.MAIN) return;

    const homeWin = globalVars.mainWindow;

    // function applyThemeOnWindow(themeid) {
    //     try {
    //         homeWin.webContents.executeJavaScript(`
    //         (()=>{
    //             let el = document.createElement("link");
    //             el.rel = "stylesheet";
    //             el.href = ${
    //                 JSON.stringify( join(globalVars.appLocationURL, '/themes', themeid) )
    //             };

    //             document.head.appendChild(el);
    //         })()`, false);
    //     } catch (error) {
    //         console.error(error);
    //     }
    // }
    
    // if(config['open-dev-tool']) homeWin.webContents.openDevTools();

    // // Apply themes :
    // config['user-preferences'].themes.forEach( applyThemeOnWindow );

    // const themes = config['user-preferences'].themes;

    // let index = themes.length;
    // while (index > 0) {
    //     index--;

    //     homeWin.webContents.insertCSS(
    //         fs.readFileSync(
    //             join(globalVars.appLocationURL, '/themes', themes[index]), 'utf8'
    //         )
    //     );
    // }


    
    // send to the ui, the app location and some config infos
    // homeWin.webContents.send('appLocation', globalVars.appLocationURL, join(path.dirname(globalVars.app.getPath('exe')), '../'), config['not-use-date']);
    homeWin.webContents.send('appLocation', globalVars.appLocationURL, path.dirname(globalVars.app.getPath('exe')), config['not-use-date'], config['not-update'] || config.indev, config.hideModsBG, modManager.modsFolder);

    
    const userPrefs = config['user-preferences'];

    // send background, themes..
    homeWin.webContents.send('u-prefs', userPrefs.background, userPrefs.themes);

    // Load the mods
    let haveModNotLoaded = modManager.loadAllMods();

    if(haveModNotLoaded) {
        console.log('1 or more mods cannot be loaded:', haveModNotLoaded);
        alertWindow("Error : the mod " + JSON.stringify(haveModNotLoaded) + " can't be loaded\nVerify if there is a mod.json file or if the json wrote in has a syntaxe error or if the mod is badly imported");
    }


    // Send the version of the app :
    homeWin.webContents.send('version', config.version);
    
};



const createWindow = (windowtypetoopen, cusompreload, isfullscreen, customOptions) => {

    let removeOldWindow = () => null;

    // if there are already a window openned remove it
    if(typeof windowtypetoopen != "string" && globalVars.mainWindow != null) {

        const windowToR = globalVars.mainWindow;

        removeOldWindow = () => {
            windowToR.close();
        }
    }

    let windowWidth = 956, windowHeight = 600;

    if(customOptions) {
        if(customOptions.width) windowWidth = customOptions.width;
        if(customOptions.height) windowHeight = customOptions.height;
    }

    if(isfullscreen) {
        let {screen} = require('electron');

        screen = screen.getPrimaryDisplay().workAreaSize;

        windowWidth = screen.width;
        windowHeight = screen.height;
    }

    if(cusompreload !== false) {

        if(!cusompreload) {
            cusompreload = join(globalVars.appLocationURL, '/interface/preload.js')
        } else {
            cusompreload = (cusompreload+'').startsWith('_') ? cusompreload.slice(1) : join(globalVars.appLocationURL, '/interface', cusompreload)
        }
    } else {
        cusompreload = undefined;
    }

    let newWindowToShow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        fullscreen: config.fullscreen,
        webPreferences: {
            preload: cusompreload,
            contextIsolation: true,
            nodeIntegration: true
        }
    });
    
    newWindowToShow.setIcon(join(__dirname, 'icon.ico'));

    if(typeof windowtypetoopen != 'string') {
        
        globalVars.mainWindow = newWindowToShow;
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
                
            case windowTypes.OTHERLICENSES:
                windowtypetoopen = `file://${globalVars.appLocationURL}/interface/license-and-copyrights/other-licenses-page.html`;
                break;
            
            case windowTypes.UPDATER:
                windowtypetoopen = `file://${globalVars.appLocationURL}/interface/updater/updater.html`;
                break;
            
            case windowTypes.SETTINGS_EDITOR:
                windowtypetoopen = `file://${globalVars.appLocationURL}/interface/settings-editor/settings-editor.html`;
                break;
                
            case windowTypes.SAVE_MANAGER:
                windowtypetoopen = `file://${globalVars.appLocationURL}/interface/save-manager/index.html`;
                break;
        }
    } else {
        if(windowtypetoopen.startsWith('_')) {
            windowtypetoopen = `file://${windowtypetoopen.slice(1)}`;
        } else {
            windowtypetoopen = `file://${globalVars.appLocationURL}/interface/${windowtypetoopen}`;
        }
    }

    // Load the .html page :
    newWindowToShow.loadURL(windowtypetoopen);
    newWindowToShow.webContents.once('dom-ready', removeOldWindow);

    return newWindowToShow;
}
globalVars.createWindow = createWindow;

function openHomeWindow() {
    createWindow(windowTypes.MAIN, null, null, {
        width: config.widthHomeWindow
    })
     .webContents.on('dom-ready', onWindowReloaded); // Every time that the window is loaded/reloaded the function "onWindowReloaded" is called

}
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openHomeWindow();
});
globalVars.openHomeWindow = openHomeWindow;

// Open the window when the app is ready
app.whenReady().then(() => {

    let cancelHomeWin = false;
    
    if(
        fs.existsSync(addonsFolder)
    ) {
        const addonsFiles = fs.readdirSync(addonsFolder);
        let index = addonsFiles.length;
        while (index > 0) {
            index--;
            
            let addonFileName = addonsFiles[index];
            
            if(addonFileName.indexOf('.', addonFileName.length - 5) == -1) {
                console.log('loading addon ' + addonFileName);
                
                let addon = require(join(addonsFolder, addonFileName, 'addon-main.js'));

                if( addon && addon.start ) {

                    let res = addon.start({globalVars: globalVars});

                    if(res && res.cancelHomeWindow) cancelHomeWin = true;
                }
            }
        }

    } else {
        
        fs.mkdirSync(addonsFolder);
    }

    addonsFolder = null;

    if(cancelHomeWin) return;

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

app.on('will-quit', () => {
    require('electron').globalShortcut.unregisterAll();
});



if(true) {

    const {getProcesses} = require('memoryjs');


    // Check if the game is launched every seconds
    setInterval(() => {
        
        try {
            
            getProcesses((error, processes) => {
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

}

