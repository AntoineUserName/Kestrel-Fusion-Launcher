const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

let canUseDate;
let appLocG;
let updateOptions;
const updaterConfig = require('../updater/config-updater.json');

let cannotUpdateApp = 3;

let showModsBG = true;
let modsSlashPathDir;

// For the updater and getting config infos for showing or not the mods background images:
ipcRenderer.on('appLocation', (ev, appLoc, appExeP, notUseDate, notUpdate, newhideModsBG, modsDirPath) => {

    showModsBG = !newhideModsBG;

    cannotUpdateApp = notUpdate;

    modsSlashPathDir = modsDirPath.replace(/\\/g, '/');
    if(!modsSlashPathDir.endsWith('/')) modsSlashPathDir += '/';

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




// let addModB = () => {};
let setVersionDisplay = () => {};

let eShowPopup;

ipcRenderer.on('alert', (ev, text, infotype) => {
    eShowPopup(text, infotype);
});

// ipcRenderer.on('addMod', (ev, modinfo, isused) => {
//     addModB(modinfo, isused, hideModsBG);
// });

ipcRenderer.on('u-prefs', (ev, background, themes) => {
    
    if(themes) {

        // let themesDir = appLocG.replace(/\\/g, '/');
        let themesDir = appLocG;

        if(themesDir[themesDir.length-1] != '/') themesDir += '/';
        
        themesDir += 'themes/';
        
        let index = themes.length;
        while (index > 0) {
            index--;

            let el = document.createElement("link");
            el.rel = "stylesheet";
            el.href = themesDir + themes[index];

            document.head.appendChild(el);
        }
    }

    if(background) document.body.style.backgroundImage = background;

});

ipcRenderer.on('version', (ev, version) => {
    setVersionDisplay(version);
})

ipcRenderer.on('setStartButt', (ev, text, islowopacity) => {
    const elButton = document.querySelector('#launch-game button');
    elButton.innerHTML = text;
    elButton.style.opacity = islowopacity ? 0.9 : 1.0;
});


contextBridge.exposeInMainWorld('electronAPI', {

    // To set new callback that are called by the main.js
    // setAddMod: realAddMod => addModB = realAddMod,

    setChangeVersion: realSetVersion => setVersionDisplay = realSetVersion,

    setAddMod: (realAddMod) => {

        const addModB = realAddMod;

        ipcRenderer.on('addMod', (ev, modinfo, isused) => {
            addModB(modinfo, isused, showModsBG, modsSlashPathDir);
        });

    },

    // Function for send instructions to the main.js
    launchGame: () => ipcRenderer.send('launch'),
    addMod: () => ipcRenderer.send('homemenu-otherfeatures', 'addmod'),
    clickedCreateMod: () => ipcRenderer.send('homemenu-otherfeatures', 'clickedCreateMod'),
    setModIsActivated: (modname, isactivated) => { ipcRenderer.send('setModIsActivated', modname, isactivated) },
    removeMod: (modname) => { ipcRenderer.send('removeMod', modname) },
    viewMod: (modname) => ipcRenderer.send('viewMod', modname),

    setShowPopup: spopfunc => eShowPopup = spopfunc,

    canUpdate: () => {
        
        return new Promise((resolve, reject) => {

            //return resolve(true);

            while(cannotUpdateApp === 3) {
                await (new Promise((resolve) => {
                    setTimeout(resolve, 500);
                }));
            }

            if(cannotUpdateApp || (window.navigator && navigator.onLine == false)) {
                resolve(false);
                return;
            }

            // Put a couldown to not check if the app can update everytime that you open the app
            if(canUseDate) {
                if(fs.existsSync(path.join(appLocG, 'updater', "/checked.txt"))) {
                
                    let oldTimeUpdate = parseFloat(
                        fs.readFileSync(path.join(appLocG, 'updater', "/checked.txt"), {encoding:'utf8'})
                    );
            
                    if(Number.isNaN(oldTimeUpdate) == false && (oldTimeUpdate + (updaterConfig.secondsToWaitBeforeCheckUpdate * 1000)) > new Date().getTime()) {
                        console.log("haven't time to update");

                        resolve(updaterConfig.hasFoundUpdate === true);
                        return;
                    }
                    
                }

            }

            if(
                !require('../updater/config-updater.json').gitRepo
            ) {
                console.log('No update checks possible: no repo in config-updater.json');
                resolve(false);
                return;
            }


            function checkUpdates() {
                
                try {

                    const uaup = require('uaup-js');

                    uaup.CheckForUpdates(updateOptions)
                    .then( canfupdate => {

                        updaterConfig.hasFoundUpdate = canfupdate;

                        fs.writeFileSync(path.join(appLocG, 'updater', "/config-updater.json"), JSON.stringify(updaterConfig), {encoding:'utf8'} );

                        if(canUseDate) {
                            fs.writeFileSync(path.join(appLocG, 'updater', "/checked.txt"), '' + (new Date().getTime()), {encoding:'utf8'});
                        }

                        resolve(canfupdate);
                    })
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

    setModParam: (modId, paramName, val) => {
        ipcRenderer.send('setModParam', modId, paramName, val);
    },

    updateTheApp: () => {
        ipcRenderer.send('updatingapp');
    }
});