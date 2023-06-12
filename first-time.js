// **************************************************************
// This module is called when you open the app for the first time
// **************************************************************



const backupManager = require('./backup-manager');
const config = require('./config-manager');
const path = require('path');
const fs = require('fs');


config.firstTime = undefined;
config.save();

backupManager.backupFile('/LEVELS/LEG' + 'O_CITY/L' + 'EG' + 'O_CITY/AI/SCRIPT.TXT');



const modManager = require('./mod-manager');

modManager.addInitMods();

modManager.loadAllMods();

// Disable all mods
modManager.getModsLoaded().forEach(
    mod => modManager.setModIsActivated( mod.name, false )
);


fs.writeFileSync(path.join(config['game-location'], 'CHARS/MINIFIGS/HATS/SUPER_CHARACTERS/KFEMPTYMODEL.GSC'), '');


// For the audio :
if(!fs.existsSync(path.join(config['game-location'], 'AUDIO/SAMPLES/MODS'))) fs.mkdirSync(path.join(config['game-location'], 'AUDIO/SAMPLES/MODS'));
backupManager.backupFile('AUDIO/SAMPLES_DEFAULT.CFG');
backupManager.backupFile('AUDIO/SAMPLES_JAPAN.CFG');