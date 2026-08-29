const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');
const globalVars = require('../global-variables');

// const start = require('./ipc-save-manager');

let PROFILE_ROOT = null;
let ACTIVE_PROFILE = null;
let CONFIG_PATH = path.join(__dirname, 'config-save-manager.json');
let GAME_SAVE_FOLDER = null;
let BACKUP_PATH = null;
let currentProfile = null;

// const maxBackupsCount = 2;
const maxBackupsCount = 3;

let win;


//========
//init
//========
function checkForConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        return false;
    }

    let rawConfig;

    try {
        rawConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
    } catch (err) {
        return false
    }

    let config;

    try {
        config = JSON.parse(rawConfig);
    } catch (err) {
        return false;
    }

    const requiredLines = [
        'PROFILE_ROOT',
        'GAME_SAVE_FOLDER',
        'ACTIVE_PROFILE',
        'BACKUP_PATH'
    ];

    for(const line of requiredLines) {
        if(!config[line] || typeof config[line] !== 'string') {
            return false;
        }
    }

    PROFILE_ROOT = config.PROFILE_ROOT;
    GAME_SAVE_FOLDER = config.GAME_SAVE_FOLDER;
    ACTIVE_PROFILE = config.ACTIVE_PROFILE;
    BACKUP_PATH = config.BACKUP_PATH;

    if(
        !fs.existsSync(PROFILE_ROOT) ||
        !fs.existsSync(GAME_SAVE_FOLDER) ||
        !fs.existsSync(BACKUP_PATH)
    ) {
        return false;
    }
    return true;
}
function checkJson() {
    if (!fs.existsSync(CONFIG_PATH)) {
        return false;
    }
    return true;
}


async function firstTimeInit() {
    if(!globalVars.KFFolderPath || typeof globalVars.KFFolderPath !== 'string') {
        return false;
    }
    if(!fs.existsSync(globalVars.KFFolderPath)) {
        return false;
    }

    let chosenGamePath;

    while (true) {
        const result = dialog.showOpenDialogSync({
            title: 'Select valid game save folder (has at least one folder called slot(1-4))',
            properties: ['openDirectory']
        });

        if(!result || result.length === 0) {
            // app.relaunch();
            // app.exit(0);

            if(win) {
                win.close();
            }

            return false;
        }

        const candidatePath = result[0];

        const entries = fs.readdirSync(candidatePath, { withFileTypes: true });
        const directories = entries.filter(entry => entry.isDirectory());

        const hasValidSlot = directories.some(dir => {
            const name = dir.name.toLowerCase();
            return (
                name === 'slot1' ||
                name === 'slot2' ||
                name === 'slot3' ||
                name === 'slot4'
            );
        });

        if(hasValidSlot) {
            chosenGamePath = candidatePath;
            break;
        }
        dialog.showMessageBoxSync({
            type: 'error',
            message: 'This map does not include a valid save file(slot1-slot4). Try again.'
        });
    }

    GAME_SAVE_FOLDER = chosenGamePath;
    PROFILE_ROOT = path.join(globalVars.KFFolderPath, 'save_manager_profiles');
    BACKUP_PATH = path.join(globalVars.KFFolderPath, 'save_manager_backups');
    ACTIVE_PROFILE = 'default';

    
    if(!fs.existsSync(PROFILE_ROOT)) fs.mkdirSync(PROFILE_ROOT, { recursive: true });
    if(!fs.existsSync(BACKUP_PATH)) fs.mkdirSync(BACKUP_PATH, { recursive: true });

    // const temporaryProfilePath = path.join(__dirname, 'profiles');

    // if(!fs.existsSync(temporaryProfilePath)) {
    //     return false;
    // }
    // if(!copyHelper(temporaryProfilePath, PROFILE_ROOT)) {
    //     return false;
    // }
    // fs.rmSync(temporaryProfilePath, { recursive: true, force: true });

    const defaultPath = path.join(PROFILE_ROOT, 'default');
    if(!fs.existsSync(defaultPath)) fs.mkdirSync(defaultPath, { recursive: true });

    if(!copyHelper(GAME_SAVE_FOLDER, defaultPath)) {
        return false;
    }

    const config = {
        PROFILE_ROOT,
        GAME_SAVE_FOLDER,
        ACTIVE_PROFILE,
        BACKUP_PATH
    };

    try {
        fs.writeFileSync(
            CONFIG_PATH,
            JSON.stringify(config, null, 4),
            'utf-8'
        );
    } catch {
        return false;
    }

    return true;
}

//==============
// Get UI state
//==============

function getUIstate() {
    return {
        ok: true,
        profiles: getProfiles(),
        currentProfile: getCurrentProfile(),
        activeProfile: getActiveProfile(),
        savesInGame: getSavesAmount(false),
        savesInProfile: getSavesAmount(true)
    };
}



//===================
// Profile functions
//===================
function getProfiles() {
    if(!PROFILE_ROOT) {
        return[];
    }
    if(!fs.existsSync(PROFILE_ROOT)) {
        return[];
    }

    const entries = fs.readdirSync(PROFILE_ROOT, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());
    const names = directories.map(entry => entry.name);

    return names;
}

function createProfile (profileName) {
    if(!PROFILE_ROOT) {
        return false;
    }
    if(!fs.existsSync(PROFILE_ROOT)) {
        return false;
    }
    if (!profileName || typeof profileName !== 'string') {
        return false;
    }
    if(profileName.length == 0) {
        return false;
    }
    const newPROFILE_ROOT = path.join(PROFILE_ROOT, profileName);
    if (fs.existsSync(newPROFILE_ROOT)) {
        return false;
    }
    fs.mkdirSync(newPROFILE_ROOT);
    return true;
}



function renameProfile (profileNewName) {
    if(!PROFILE_ROOT) {
        return false;
    }
    if(!fs.existsSync(PROFILE_ROOT)) {
        return false;
    }
    if(!currentProfile) {
        return false;
    }
    if(profileNewName.length == 0) {
        return false;
    }

    const currentPROFILE_ROOT = path.join(PROFILE_ROOT, currentProfile);
    
    const newPROFILE_ROOT = path.join(PROFILE_ROOT, profileNewName);

    if(fs.existsSync(newPROFILE_ROOT)) {
        return false;
    }

    if(!copyHelper(currentPROFILE_ROOT, newPROFILE_ROOT)) {
        return false;
    }

    // fs.rmdirSync(currentPROFILE_ROOT);
    fs.rmSync(currentPROFILE_ROOT, { recursive: true, force: true});

    
    if(ACTIVE_PROFILE === currentProfile) {
        ACTIVE_PROFILE = profileNewName;
        writeActiveProfile();
    }
    currentProfile = profileNewName;

    // fs.renameSync(currentPROFILE_ROOT, newPROFILE_ROOT);

    // writeActiveProfile();

    return true;

}


function deleteProfile () {
    if(!PROFILE_ROOT) {
        return false;
    }
    if(!fs.existsSync(PROFILE_ROOT)) {
        return false;
    }
    if(!currentProfile) {
        return false;
    }
    
    const targetPROFILE_ROOT = path.join(PROFILE_ROOT, currentProfile);

    if(!fs.existsSync(targetPROFILE_ROOT)) {
        return false;
    }

    fs.rmSync(targetPROFILE_ROOT, { recursive: true, force: true});

    if(ACTIVE_PROFILE === currentProfile) {
        ACTIVE_PROFILE = null;
        writeActiveProfile();
    }
    currentProfile = null;
    return true;
}

function setCurrentProfile(profileName) {
    currentProfile = profileName;
}

function getCurrentProfile() {
    return currentProfile;
}


function getActiveProfile() {
    if(ACTIVE_PROFILE === null) {
        return "The active profile doesn't exist anymore.";
    }
    return ACTIVE_PROFILE;
}


function writeActiveProfile() {
    if(!fs.existsSync(CONFIG_PATH)) {
        return;
    }
    const config = JSON.parse (
        fs.readFileSync(CONFIG_PATH, 'utf8')
    );
    config.ACTIVE_PROFILE = ACTIVE_PROFILE;
    
    fs.writeFileSync(
        CONFIG_PATH,
        JSON.stringify(config, null, 2)
    );
}

function getSavesAmount(userProfile = false) {
    if(userProfile) {
        if(!currentProfile) {
            return 0;
        }
    } else {
        if(!GAME_SAVE_FOLDER) {
            return 0;
        }
    }

    let targetPath = null;
    if(userProfile){
        targetPath = path.join(PROFILE_ROOT, currentProfile)
    } else {
        targetPath = GAME_SAVE_FOLDER;
    }
    if(!fs.existsSync(targetPath)) {
        return 0;
    }
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());
    return directories.length;
}

//======================
// Game saves functions
//======================

function getGameSaves() {
    if(!GAME_SAVE_FOLDER) {
        return[];
    }
    if(!fs.existsSync(GAME_SAVE_FOLDER)) {
        return[];
    }

    const entries = fs.readdirSync(GAME_SAVE_FOLDER, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());
    const names = directories.map(entry => entry.name);

    return names;
}



function loadProfileToGame() {

    if(globalVars.isGameLaunched) return false;

    if(!currentProfile || typeof currentProfile !== 'string') {
        return false;
    }
    if(!PROFILE_ROOT || !fs.existsSync(PROFILE_ROOT)) {
        return false;
    }
    if(!GAME_SAVE_FOLDER || !fs.existsSync(GAME_SAVE_FOLDER)) {
        return false;
    }

    const selectedProfilePath = path.join(PROFILE_ROOT, currentProfile);
    if(!fs.existsSync(selectedProfilePath)) {
        return false;
    }

    const activeProfilePath = path.join(PROFILE_ROOT, ACTIVE_PROFILE);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${ACTIVE_PROFILE}_${timestamp}`;
    const backupPath = path.join(BACKUP_PATH, backupName);

    if(!fs.existsSync(backupPath)) fs.mkdirSync(backupPath, { recursive: true });

    if(!copyHelper(GAME_SAVE_FOLDER, backupPath)) {
        return false;
    }
    manageBackupAmount(ACTIVE_PROFILE);

    if (fs.existsSync(activeProfilePath)) {
        clearDirectory(activeProfilePath);
    } else {
        fs.mkdirSync(activeProfilePath);
    }
    if(!copyHelper(GAME_SAVE_FOLDER, activeProfilePath)) {
        return false;
    }

    clearDirectory(GAME_SAVE_FOLDER);

    if(!copyHelper(selectedProfilePath, GAME_SAVE_FOLDER)) {
        return false;
    }

    ACTIVE_PROFILE = currentProfile;
    writeActiveProfile();

    return true;
}

function manageBackupAmount(profileName) {

    const entries = fs.readdirSync(BACKUP_PATH, { withFileTypes: true });

    const profileBackups = entries.filter(entry => {
        return entry.isDirectory() &&
            entry.name.startsWith(profileName + '_');
    });

    const backupNames = profileBackups.map(entry => entry.name);
    backupNames.sort();

    if(backupNames.length <= maxBackupsCount) {
        return true;
    }

    const backupsToRemove = backupNames.length - maxBackupsCount;

    for(let i = 0; i < backupsToRemove; i++) {
        const backupPath = path.join(BACKUP_PATH, backupNames[i]);

        fs.rmSync(backupPath, {
            recursive: true,
            force: true
        });
    }

    return true;
}


//===================
// Import functions
//===================

async function importSaveProfile() {
    if(!PROFILE_ROOT) {
        return false;
    }
    if(!fs.existsSync(PROFILE_ROOT)) {
        return false;
    }

    const result = await dialog.showOpenDialog({
        title: 'Select a external profile folder to import',
        properties: ['openDirectory']
    });

    if(result.canceled || result.filePaths.length === 0) {
        return false;
    }

    const sourcePath = result.filePaths[0];

    if(!fs.existsSync(sourcePath)) {
        return false;
    }

    if(!fs.statSync(sourcePath).isDirectory()) {
        return false;
    }

    const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());

    const hasValidSlot = directories.some(dir => {
        const name = dir.name.toLowerCase();
        return (
            name === 'slot1' ||
            name === 'slot2' ||
            name === 'slot3' ||
            name === 'slot4'
        );
    });

    if(!hasValidSlot) {
        return false;
    }

    const profileName = path.basename(sourcePath);
    const targetPROFILE_ROOT = path.join(PROFILE_ROOT, profileName);

    if(fs.existsSync(targetPROFILE_ROOT)) {
        return false;
    }

    fs.mkdirSync(targetPROFILE_ROOT);
    copyHelper(sourcePath, targetPROFILE_ROOT);
    return true;
}


async function importSaveToCurrentProfile() {
    if(!PROFILE_ROOT) {
        return false;
    }
    if(!fs.existsSync(PROFILE_ROOT)) {
        return false;
    }
    if(!currentProfile) {
        return false;
    }

    const targetPROFILE_ROOT = path.join(PROFILE_ROOT, currentProfile);

    const result = await dialog.showOpenDialog({
        title: 'Select a external save file slot (slot1-slot4)',
        properties: ['openDirectory']
    });
    if(result.canceled || result.filePaths.length === 0) {
        return false;
    }

    const sourcePath = result.filePaths[0];

    if(!fs.statSync(sourcePath).isDirectory()) {
        return false; 
    }

    const slotName = path.basename(sourcePath).toLowerCase();

    const isValidSlot =
        slotName === 'slot1' ||
        slotName === 'slot2' ||
        slotName === 'slot3' ||
        slotName === 'slot4';

    if(!isValidSlot) {
        return false;
    }

    const targetSlotPath = path.join(targetPROFILE_ROOT, slotName);

    if(fs.existsSync(targetSlotPath)) {
        clearDirectory(targetSlotPath);
    } else {
        fs.mkdirSync(targetSlotPath);
    }

    copyHelper(sourcePath, targetSlotPath);
    return true;
}

function importBackup(backupChosen) {
    if(!backupChosen || typeof backupChosen !== 'string') {
        return false;
    }

    if(!BACKUP_PATH) {
        return false;
    }
    if(!fs.existsSync(BACKUP_PATH)) {
        return false;
    }

    const backupPROFILE_ROOT = path.join(BACKUP_PATH, backupChosen);

    if(!fs.existsSync(backupPROFILE_ROOT)) {
        return false;
    }
    
    const splitName = backupChosen.lastIndexOf('_');
    if(splitName === -1) {
        return false;
    }

    const profileName = backupChosen.slice(0, splitName);  

    if(!PROFILE_ROOT) {
        return false;
    }

    const targetPROFILE_ROOT = path.join(PROFILE_ROOT, profileName);

    if(!fs.existsSync(targetPROFILE_ROOT)) {
        fs.mkdirSync(targetPROFILE_ROOT);
    } else {
        clearDirectory(targetPROFILE_ROOT);
    }

    if(!copyHelper(backupPROFILE_ROOT, targetPROFILE_ROOT)) {
        return false;
    }
    return true;
}

//==================
// export functions
//==================

async function exportProfile() {
    if(!currentProfile || typeof currentProfile !== 'string') {
        return false;
    }

    if(!PROFILE_ROOT || !fs.existsSync(PROFILE_ROOT)) {
        return false;
    }

    const sourcePROFILE_ROOT = path.join(PROFILE_ROOT, currentProfile);

    if(!fs.existsSync(sourcePROFILE_ROOT)) {
        return false;
    }

    const result = await dialog.showOpenDialog({
        title: 'Select a destination folder for the profile export.',
        properties: ['openDirectory']
    });

    if(result.canceled || result.filePaths.length === 0){
        return false;
    }

    const destinationRoot = result.filePaths[0];

    const destinationPath = path.join(destinationRoot, currentProfile);

    if(fs.existsSync(destinationPath)) {
       clearDirectory(destinationPath);
    } else {
        fs.mkdirSync(destinationPath, { recursive: true });
    }

    if(!copyHelper(sourcePROFILE_ROOT, destinationPath)) {
        return false;
    }
    return true;
}

function exportSaveToProfile(chosenSlot) {
    if(!chosenSlot || typeof chosenSlot !== 'string') {
        return false;
    }
    if(!currentProfile) {
        return false;
    }
    if(!GAME_SAVE_FOLDER || !fs.existsSync(GAME_SAVE_FOLDER)) {
        return false;
    }
    if(!PROFILE_ROOT || !fs.existsSync(PROFILE_ROOT)) {
        return false;
    }

    const sourceSlotPath = path.join(GAME_SAVE_FOLDER, chosenSlot);
    const targetProfilePath = path.join(PROFILE_ROOT, currentProfile);
    const targetSlotPath = path.join(targetProfilePath, chosenSlot);

    if(!fs.existsSync(sourceSlotPath)) {
        return false;
    }

    if (fs.existsSync(targetSlotPath)) {
        clearDirectory(targetSlotPath);
    } else {
        fs.mkdirSync(targetSlotPath);
    }

    if(!copyHelper(sourceSlotPath, targetSlotPath)) {
        return false;
    }
    return true;
}
     
function dumpAllSaves(profileName) {
    if(!profileName || typeof profileName !== 'string') {
        return false;
    }
    if(!PROFILE_ROOT || !fs.existsSync(PROFILE_ROOT)) {
        return false;
    }
    if(!GAME_SAVE_FOLDER || !fs.existsSync(GAME_SAVE_FOLDER)) {
        return false;
    }

    const newProfilePath = path.join(PROFILE_ROOT, profileName);
    if(fs.existsSync(newProfilePath)) {
        return false;
    }
    
    fs.mkdirSync(newProfilePath);
    
    if(!copyHelper(GAME_SAVE_FOLDER, newProfilePath)) {
        return false;
    }
    return true;
}

//=============
// Helpers
//=============

function copyHelper (src, dest) {
    try {
        if(!fs.existsSync(src)) {
            return false;
        }
        if(!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if(entry.isDirectory()) {
                if(!copyHelper(srcPath, destPath)) {
                    return false;
                }
            } else if (entry.isFile()) {
                fs.copyFileSync(srcPath, destPath);
            }

        }

        return true;
        
    
    } catch(errOnCopy) {

        console.error(errOnCopy);

        dialog.showMessageBoxSync({
            type: 'error',
            message: 'Error was found when making copies:\n' + errOnCopy
        });
        return false;
    }
}

function clearDirectory (folder) {
    if(!fs.existsSync(folder)) {
        return;
    }

    const entries = fs.readdirSync(folder, { withFileTypes: true });

    for(const entry of entries) {
        const fullPath = path.join(folder, entry.name);
        fs.rmSync(fullPath, { recursive: true, force: true });
    }
}

function getBackups () {
    if(!BACKUP_PATH) {
        return[];
    }
    if(!fs.existsSync(BACKUP_PATH)) {
        return[];
    }

    const entries = fs.readdirSync(BACKUP_PATH, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());
    const names = directories.map(entry => entry.name);

    return names;
}


exports.seeProfilesBackups = () => {

    require('child_process').exec('explorer ' + JSON.stringify(BACKUP_PATH).replace(/\\\\/g, '\\')).on('error', (err) => {
        console.error(err);
    });
}

//=============
// Open window
//=============

function openSaveManagerWindow() {
    
    if(win) {
        
        win.restore();
        win.show();
        win.focus();
        return;
    }

    win = globalVars.createWindow(
        require('../window-types.json').SAVE_MANAGER,
        'save-manager/preload.js',
        false,
        { width: 1100, height: 650 }
    );

    // require('electron').BrowserWindow.prototype.webContents
    win.webContents.on('ipc-message', require('./save-manager-window-msg').onWindowMessage);

    win.once('close', () => {
        win = null;
    });
}

//==========
// Exports
//==========

exports.checkForConfig = checkForConfig;
exports.checkJson = checkJson;
exports.firstTimeInit = firstTimeInit;
exports.getProfiles = getProfiles;
exports.createProfile = createProfile;
exports.renameProfile = renameProfile;
exports.deleteProfile = deleteProfile;
exports.setCurrentProfile = setCurrentProfile;
exports.getCurrentProfile = getCurrentProfile;
exports.getActiveProfile = getActiveProfile;
exports.getSavesAmount = getSavesAmount;
exports.getGameSaves = getGameSaves;
exports.openSaveManagerWindow = openSaveManagerWindow;
exports.loadProfileToGame = loadProfileToGame;
exports.importSaveProfile = importSaveProfile;
exports.importSaveToCurrentProfile = importSaveToCurrentProfile;
exports.importBackup = importBackup;
exports.exportProfile = exportProfile;
exports.exportSaveToProfile = exportSaveToProfile;
exports.dumpAllSaves = dumpAllSaves;
exports.getUIstate = getUIstate;
exports.getBackups = getBackups;