// *****************************************************************************************************
// This module is called when you open the app for the first time or when you launch it after updated it
// *****************************************************************************************************



const backupManager = require('./backup-manager');
const config = require('./config-manager');
const path = require('path');
const fs = require('fs');



backupManager.backupFile('/LEVELS/LEG' + 'O_CITY/L' + 'EG' + 'O_CITY/AI/SCRIPT.TXT');
backupManager.backupFile('/LEVELS/STANDALONES/GAMEMECHANICSTESTAREA/AI/SCRIPT.TXT');


const modManager = require('./mod-manager');

modManager.addInitMods();

modManager.loadAllMods();

// Disable all mods
modManager.getModsLoaded().forEach(
    mod => modManager.setModIsActivated( mod.name, false )
);

// Add initial modded text
modManager.updateCSVTexts(false);


fs.writeFileSync(path.join(config['game-location'], 'CHARS/MINIFIGS/SUPER_CHARACTERS/HATS/KFEMPTYMODEL.GSC'), '');


// For the audio :
if(!fs.existsSync(path.join(config['game-location'], 'AUDIO/SAMPLES/MODS'))) fs.mkdirSync(path.join(config['game-location'], 'AUDIO/SAMPLES/MODS'));
backupManager.backupFile('AUDIO/SAMPLES_DEFAULT.CFG');
backupManager.backupFile('AUDIO/SAMPLES_JAPAN.CFG');

if(!config.widthHomeWindow) config.widthHomeWindow = 1109;

if(config.unlockVehiclesIfAddChar == null) config.unlockVehiclesIfAddChar = true; // (should not update the chars list bc its at the start of the app)

if(config.isLightCommunication == null) config.isLightCommunication = true;

// if(config['user-preferences'] == null || config['user-preferences'].triedT !== true) {
if(config['user-preferences'].triedT !== true) {
    
    if(config['user-preferences'] == null) config['user-preferences'] = {themes: []};
    config['user-preferences'].triedT = true;

    if(config['user-preferences'].themes.length == 0) config['user-preferences'].themes.push('blue-theme.css');

}

config.firstTime = undefined;
config.save();


const globalVars = require('./global-variables');
if(globalVars.isAfterUpdate) {
    require('electron').app.exit();
    // require('electron').app.quit();
    // process.exit();
}
