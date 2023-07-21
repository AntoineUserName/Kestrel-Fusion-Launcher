const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

let canUseDate;
let appLocG;
let updateOptions;
const updaterConfig = require('../updater/config-updater.json');

// Updater config :
ipcRenderer.on('appLocation', (ev, appLoc, appExeP, notUseDate) => {

    appLocG = appLoc;

    canUseDate = (!notUseDate);

    if(!fs.existsSync(path.join(appLoc, 'updater'))) fs.mkdirSync(path.join(appLoc, 'updater'));

    updateOptions = {
        gitRepo: updaterConfig.gitRepo,
        gitUsername: updaterConfig.gitUsername,
    
        appName: updaterConfig.appName,
        appExecutableName: updaterConfig.appExecutableName,

        appDirectory: appExeP,
        versionFile: path.join(appLoc, 'updater', "/version.json"),
        tempDirectory: path.join(appLoc, 'updater', "/temp"),
    
        // progressBar: document.getElementById("download"), // {Default is null} [Optional] If Using Electron with a HTML Progressbar, use that element here, otherwise ignore
        // label: document.getElementById("download-label"), // {Default is null} [Optional] If Using Electron, this will be the area where we put status updates using InnerHTML
    };
});




let addModB = () => {};
let setVersionDisplay = () => {};

let eShowPopup;

ipcRenderer.on('alert', (ev, text, infotype) => {
    eShowPopup(text, infotype);
});

ipcRenderer.on('addMod', (ev, modinfo, isused) => {
    addModB(modinfo, isused);
});

ipcRenderer.on('background', (ev, background) => {
    document.body.style.backgroundImage = background;
});

ipcRenderer.on('version', (ev, version) => {
    setVersionDisplay(version);
})

ipcRenderer.on('setStartButt', (ev, text) => {
    document.querySelector('#launch-game button').innerHTML = text;
});


contextBridge.exposeInMainWorld('electronAPI', {

    // To set new callback that are called by the main.js
    setAddMod: realAddMod => addModB = realAddMod,
    setChangeVersion: realSetVersion => setVersionDisplay = realSetVersion,

    // Function for send instructions to the main.js
    launchGame: () => ipcRenderer.send('launch'),
    addMod: () => ipcRenderer.send('addmod'),
    setModIsActivated: (modname, isactivated) => { ipcRenderer.send('setModIsActivated', modname, isactivated) },
    removeMod: (modname) => { ipcRenderer.send('removeMod', modname) },
    viewMod: (modname) => ipcRenderer.send('viewMod', modname),

    setShowPopup: spopfunc => eShowPopup = spopfunc,

    canUpdate: () => {
        
        return new Promise((resolve, reject) => {

            //return resolve(true);

            if((window.navigator && navigator.onLine == false) || require('../config-manager')['not-update'] || require('../config-manager').indev) {
                resolve(false);
                return;
            }

            // Put a couldown to not check if the app can update everytime that you open the app
            if(canUseDate) {
                if(fs.existsSync(path.join(appLocG, 'updater', "/checked.txt"))) {
                
                    let oldTimeUpdate = parseFloat(
                        fs.readFileSync(path.join(appLocG, 'updater', "/checked.txt"), {encoding:'utf8'})
                    );
            
                    if((oldTimeUpdate + (updaterConfig.secondsToWaitBeforeCheckUpdate * 1000)) > new Date().getTime()) {
                        console.log("haven't time to update");
                        return;
                    }
                    
                }

                fs.writeFileSync(path.join(appLocG, 'updater', "/checked.txt"), '' + (new Date().getTime()), {encoding:'utf8'});
            }

            function checkUpdates() {
                
                try {

                    const uaup = require('uaup-js');

                    uaup.CheckForUpdates(updateOptions)
                    .then(resolve)
                    .catch(err => reject(err));
                    
                    return;

                } catch (error) {
                    
                    reject(error);
                    return;
                }
            }

            if(updateOptions) {
                checkUpdates();
                return;
            }

            let intervUpdateOptions = setInterval(() => {

                if(updateOptions) {
                    clearInterval(intervUpdateOptions);
                    checkUpdates();
                    return;
                }

                console.log('waiting for updateOptions..');
            }, 500);
        })

    },

    updateTheApp: () => {
        ipcRenderer.send('updatingapp');
    }
});