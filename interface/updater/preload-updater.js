const uaup = require('uaup-js');
const path = require('path');
const {ipcRenderer} = require('electron');


ipcRenderer.on('appLocU', (ev, appLoc, appExePath) => {


    const updaterConfig = require('../../updater/config-updater.json');


    const defaultStages = {
        Checking: "Checking...",
        Found: "Update Found!",
        NotFound: "No Update Found.",
        Downloading: "Downloading...",
        Unzipping: "Installing...",
        Cleaning: "Finalizing...",
        Launch: "Launching..."
    };

    const updateOptions = {
        gitRepo: updaterConfig.gitRepo,
        gitUsername: updaterConfig.gitUsername,

        appName: updaterConfig.appName,
        appExecutableName: updaterConfig.appExecutableName,

        appDirectory: appExePath,
        versionFile: path.join(appLoc, 'updater', "/version.json"),
        tempDirectory: path.join(appLoc, 'updater', "/temp"),

        progressBar: document.getElementById("download"),
        label: document.getElementById("download-label"),
        stageTitles: defaultStages,
    };

    uaup.Update(updateOptions);
});