const fs = require('fs');
const {readFileSync} = fs;
const path = require('path');
const {join} = path;
const fsExtra = require('fs-extra');
const config = require('./config-manager');
const backupManager = require('./backup-manager');
const globalVars = require('./global-variables');
const child_process = require('child_process');

// const modsFolder = join(__dirname, '/mods');
const modsFolder = join(globalVars.KFFolderPath, '/mods');

if(!fs.existsSync(modsFolder)) fs.mkdirSync( modsFolder );

let modsLoaded = [];

exports.launcherVersion = "0.0.0"; // This value is edited by the main.js



const loadMod = function(modpath) {

    try {
        let modInfos = JSON.parse(
            readFileSync( join(modpath, 'mod.json'), 'utf8' )
        );

        modInfos.name = path.basename( modpath );
        if(!modInfos.addons) {
            modInfos.addons = {
                SF: fs.existsSync(join(modpath, '/SF')) || undefined,
                python: fs.existsSync(join(modpath, '/python')) || undefined,
                js: fs.existsSync(join(modpath, '/js')) || undefined,
                bat: fs.existsSync(join(modpath, '/bat')) || undefined,
                ressourcePack: fs.existsSync(join(modpath, '/install')) || undefined,
                text: fs.existsSync(join(modpath, '/text')) || undefined,
                chars: fs.existsSync(join(modpath, '/chars')) || undefined,
                collection: fs.existsSync(join(modpath, '/collection')) || undefined,
                audio: fs.existsSync(join(modpath, '/audio')) || undefined,
                map: fs.existsSync(join(modpath, '/map')) || undefined,
                editFiles: fs.existsSync(join(modpath, '/edit_files')) || undefined,
                items: fs.existsSync(join(modpath, '/items')) || undefined
            }

            if(!modInfos.devmode) {
                fs.writeFileSync( join(modpath, '/mod.json'), JSON.stringify(modInfos), {encoding:'utf8'} );
            }
        }

        modsLoaded.push( modInfos );

        if(globalVars.mainWindow != null) globalVars.mainWindow.webContents.send('addMod', modInfos, config['activated-mods'].includes(modInfos.name));

        return true;

    } catch (error) {
        console.error(error);

        // modsLoaded.push({
        //     name: path.dirname( modpath )
        // });

        return false;
    }

}



function loadAllMods() {


    const logModsLoadTime = false;
    
    let timeBeforeLoadingMods = 0;

    if(logModsLoadTime) {
        
        console.log('loading mods..');

        try {
            timeBeforeLoadingMods = config['not-use-date'] ? 0 : (new Date().getTime());
        } catch (error) {
            console.error(error);
            console.log('error while using new Date().getTime()');
        }
        
    }

    modsLoaded = [];

    let haveModNotLoaded = null;

    const banLetterMod = '.';
    fs.readdirSync(modsFolder).forEach(
        folder => {
            
            if(folder.includes(banLetterMod)) {return;}

            if(loadMod( join(modsFolder, folder) ) == false) {
                
                haveModNotLoaded = folder;
                
            }
        }
    );

    if(logModsLoadTime && !config['not-use-date']) {
        try {
            console.log('mods loadeds in ' + (new Date().getTime() - timeBeforeLoadingMods) + 'ms');
        } catch (error) {
            console.error(error);
            console.log('error while using new Date().getTime()');
            console.log('mods loadeds');
        }
    }

    return haveModNotLoaded;
}


const SUB_LEVELS_SCRIPTS_NUMBER_ID = 400;

const ANYLEVELS_SCRIPTS_LIST_ID = "\n; Mods Scripts: [ANY-LEVELS FEATURE]";


function updateAnyScripts() {
    


    // let indexSFFileNumber = 32;
    let indexSFFileNumber = SUB_LEVELS_SCRIPTS_NUMBER_ID;


    let gamePath = join( config['game-location'] );


    let levelsScriptsReseted = [];

    
    modsLoaded.forEach(modInfos => {

        let modname = modInfos.name;

        let isModEnabled = config['activated-mods'].includes(modname);
        
        

        if(!modInfos.addons.SF) return;

        const dirModOtherScripts = join( modsFolder, '/' + modname, '/SF/OTHER_LEVELS' );

        if(!fs.existsSync(dirModOtherScripts)) return;

        fs.readdirSync( dirModOtherScripts ).forEach(
            folderName => {

                if(folderName.includes('.')) return;

                const dirModScripts = join( dirModOtherScripts, folderName );

                let fileLevelFocused = join(dirModScripts, 'LEVEL_FOCUSED.txt');

                if(!fs.existsSync(fileLevelFocused)) fileLevelFocused = join(dirModScripts, 'LEVEL_FOCUSED.TXT');

                if(!fs.existsSync(fileLevelFocused)) {
                    console.log("FILE MISSING HERE: " + fileLevelFocused);
                    return;
                }

                let folderFocusedPathInit = readFileSync(fileLevelFocused, 'utf8');
                let folderFocusedPath = join(gamePath, folderFocusedPathInit);


                let scriptListFilePathInit = join(folderFocusedPathInit, 'SCRIPT.TXT');
                let scriptListFilePath = join(gamePath, scriptListFilePathInit);
                

                if(!folderFocusedPath.startsWith(path.normalize(gamePath))) {
                    console.log("Bad path wrote in the file at: " + fileLevelFocused);
                    return;
                }

                if(!fs.existsSync(folderFocusedPath)) {
                    console.log("Folder not found with the path given, path wrote at: " + fileLevelFocused);
                    return;
                }


                if(!fs.existsSync(scriptListFilePath)) {
                    console.log("File not found at: " + scriptListFilePathInit +"\npath wrote at: " + fileLevelFocused);
                    return;
                }

                // backupManager.backupFile(folderFocusedPathInit);
                
                if(!backupManager.backupFile(scriptListFilePathInit)) {
                    console.log("Error cannot backup: " + scriptListFilePathInit);
                    return;
                }

                if(!levelsScriptsReseted.includes(scriptListFilePathInit)) {
                    levelsScriptsReseted.push(scriptListFilePathInit);
                    backupManager.loadBackupFile( scriptListFilePathInit );
                }

                let textToAddInScriptList = "\n\n; Mods Scripts : \n\n";

                fs.readdirSync( dirModScripts ).forEach(
                    filename => {

                        if(isModEnabled) return;

                        if(path.extname(filename).toLowerCase() != ".sf") return;
                        
                        const SFFileIndex = indexSFFileNumber;
                        indexSFFileNumber++;

                        // let SFFileName = 'MOD_' + filename.toUpperCase().replace(/-/g, '_');
                        let SFFileName = 'LEVEL' + SFFileIndex + '.SF';

                        if(filename[0] == '_') SFFileName = 'MOD' + filename.toUpperCase().replace(/-/g, '_').replace(/ /g, '_');

                        let scriptData = readFileSync( join( dirModScripts, filename ), 'utf8' );

                        scriptData = require('./compiler-game-script').compileScriptCode( scriptData );


                        fs.writeFileSync(
                            join(folderFocusedPath, SFFileName),
                            scriptData
                        );

                        textToAddInScriptList += '\n' + SFFileName.toLowerCase().split('.', 1)[0] + '	;	' + ( modname.replace(/\n/g, '').replace(/;/g, '') );
                    }
                );

                fs.appendFileSync(scriptListFilePath, textToAddInScriptList, 'utf8');

            }

        );

    
    });


    if(!config.scriptsEverywhere) return;

    // if(1 == 1) return console.log("cancelled anylevels"); // CANCELLEDD

    // Put scripts everywhere:
    
    // indexSFFileNumber += 160;

    let linesAny = "";

    let allScriptsToCopy = []; // [  ["script_datas();\nfunc();", "script_name.sf"]  ]

    
    console.log('copying all mod scripts..');
    
    
    modsLoaded.forEach(modInfos => {

        let modname = modInfos.name;

        let isModEnabled = config['activated-mods'].includes(modname);
        
        if(!isModEnabled) return;

        if(!modInfos.addons.SF) return;

        const dirModScripts = join( modsFolder, '/' + modname, '/SF' );

        if(!fs.existsSync(dirModScripts)) return;

        if(modInfos.noAnyLevelScripts) return;
        
        fs.readdirSync( dirModScripts ).forEach(
            filename => {


                if(path.extname(filename).toLowerCase() != ".sf") return;
                
                const SFFileIndex = indexSFFileNumber;
                indexSFFileNumber++;

                // let SFFileName = 'MOD_' + filename.toUpperCase().replace(/-/g, '_');
                let SFFileName = 'LEVEL' + SFFileIndex + '.SF';

                if(filename[0] == '_') SFFileName = 'MOD' + filename.toUpperCase().replace(/-/g, '_').replace(/ /g, '_');

                let scriptData = readFileSync( join( dirModScripts, filename ), 'utf8' );

                scriptData = require('./compiler-game-script').compileScriptCode( scriptData, {
                    replaceAlls: [
                        // [".IsLoaded()", " || true"]
                        [ /\w+.IsLoaded\(\)/g, "true" ]
                    ]
                });

                allScriptsToCopy.push( [scriptData, SFFileName] );

                linesAny += '\n' + SFFileName.toLowerCase().split('.', 1)[0] + '	;	' + ( modname.replace(/\n/g, '').replace(/;/g, '') );
            }
        );


    
    });
    
    if(linesAny.length != 0) {

        let apiIndexFileName = indexSFFileNumber;
        indexSFFileNumber++;
        

        let apiFileName = 'LEVEL' + apiIndexFileName + '.SF';

        allScriptsToCopy.push( [readFileSync( join( __dirname, 'js-to-sf-api-in-sublevel.sf' ), 'utf8' ), apiFileName] );
        
        linesAny += '\n' + apiFileName.split('.', 1)[0].toLowerCase() + '	;	Communication api code';
        // linesAny = '\n' + linesAny;

        linesAny = "\n" + ANYLEVELS_SCRIPTS_LIST_ID + "\n\n" + linesAny;
    }

    let scriptsListEditedCount = 0;

    function addScriptsInFolder(realDirPath, dirInitPath, mydirname) {

        // console.log("dirInitPath:", dirInitPath);
        
        if(path.basename(path.dirname(dirInitPath)).slice(3) == 'O_CITY') return;
        
        if(mydirname == 'AI') {

            let scriptListFilePathInit = join(dirInitPath, 'SCRIPT.TXT');
            let scriptListFileRealPath = join(realDirPath, 'SCRIPT.TXT');

            // if(!fs.existsSync(scriptListFilePathInit)) return;
            if(!fs.existsSync(scriptListFileRealPath)) return;
            
            
            if(!backupManager.backupFile(scriptListFilePathInit)) {
                console.log("Error cannot backup: " + scriptListFilePathInit);
                return;
            }
            
            if(!levelsScriptsReseted.includes(scriptListFilePathInit)) {
                // levelsScriptsReseted.push(scriptListFilePathInit);
                backupManager.loadBackupFile( scriptListFilePathInit );
            }


            
            fs.appendFileSync(scriptListFileRealPath, linesAny, 'utf8');

            scriptsListEditedCount++;

            let scriptToCopyIndex = allScriptsToCopy.length;
            while (scriptToCopyIndex > 0) {
                scriptToCopyIndex--;

                let scriptInfos = allScriptsToCopy[scriptToCopyIndex];

                fs.writeFileSync(join(realDirPath, scriptInfos[1]), scriptInfos[0], 'utf8');
            }

            return;
        }

        let realDirFiles = fs.readdirSync(realDirPath);

        let dirFilesI = realDirFiles.length;

        while (dirFilesI > 0) {
            dirFilesI--;

            let rfileName = realDirFiles[dirFilesI];

            if(!rfileName.includes('.')) {
                
                addScriptsInFolder(join(realDirPath, rfileName), join(dirInitPath, rfileName), rfileName);

            }
        }

    }

    console.log('adding scripts..');
    

    addScriptsInFolder(join(gamePath, 'LEVELS'), 'LEVELS', 'LEVELS');


    console.log(allScriptsToCopy.length + ' scripts added to ' + scriptsListEditedCount + ' folders');
    

    // Now go on every AI folder with SCRIPT.TXT
    // just check that its not the city one

    // if(!levelsScriptsReseted.includes(scriptListFilePathInit)) {
    //     //levelsScriptsReseted.push(scriptListFilePathInit);
    //     backupManager.loadBackupFile( scriptListFilePathInit );
    // }

    
}

exports.onFeatureAnyScriptGotEdited = (newIsScriptsEverywhere) => {

    let gamePath = join( config['game-location'] );


    if(!newIsScriptsEverywhere) { // When has disabled the feature


        let scriptsListEditedCount = 0;

        const skipLetters =    ['\t', '\r', '\n', ' '];
        const notNameLetters = ['\t', '\r', '\n', ' ', ';'];
        
        function disableCustomScriptsInFolder(realDirPath, dirInitPath, mydirname) {
            
            if(path.basename(path.dirname(dirInitPath)).slice(3) == 'O_CITY') return;
            
            if(mydirname == 'AI') {

                let scriptListFilePathInit = join(dirInitPath, 'SCRIPT.TXT');
                let scriptListFileRealPath = join(realDirPath, 'SCRIPT.TXT');

                // if(!fs.existsSync(scriptListFilePathInit)) return;
                if(!fs.existsSync(scriptListFileRealPath)) return;
                
                

                let allScriptsToRemove = [ ];

                let scriptDatasTxt = readFileSync(scriptListFileRealPath, 'utf8');

                let i = scriptDatasTxt.indexOf(ANYLEVELS_SCRIPTS_LIST_ID);

                if(i == -1) return;

                i += ANYLEVELS_SCRIPTS_LIST_ID.length;
                
                let maxI = scriptDatasTxt.length;

                while (i < maxI && scriptDatasTxt[i] != '\n') {
                    i++;
                }


                while (i < maxI) {
                    
                    while (i < maxI && skipLetters.includes(scriptDatasTxt[i])) {
                        i++;
                    }

                    if(i < maxI && scriptDatasTxt[i] != ';') {

                        let iLevelStart = i;
                        while (i < maxI && notNameLetters.includes(scriptDatasTxt[i]) == false) {
                            i++;
                        }

                        let lvlName = scriptDatasTxt.slice(iLevelStart, i).toUpperCase();

                        if(lvlName) allScriptsToRemove.push(lvlName + '.SF');

                    }

                    i++;
                }

                // console.log('allScriptsToRemove:', allScriptsToRemove);


                if(!backupManager.loadBackupFile(scriptListFilePathInit)) return;
                
                
                // fs.appendFileSync(scriptListFileRealPath, linesAny, 'utf8');

                scriptsListEditedCount++;

                let scriptToDisableIndex = allScriptsToRemove.length;
                while (scriptToDisableIndex > 0) {
                    scriptToDisableIndex--;

                    let scriptToDisablePath = join(realDirPath, allScriptsToRemove[scriptToDisableIndex]);

                    if(fs.existsSync(scriptToDisablePath)) fs.unlinkSync(scriptToDisablePath);
                }

                return;
            }

            let realDirFiles = fs.readdirSync(realDirPath);

            let dirFilesI = realDirFiles.length;

            while (dirFilesI > 0) {
                dirFilesI--;

                let rfileName = realDirFiles[dirFilesI];

                if(!rfileName.includes('.')) {
                    
                    disableCustomScriptsInFolder(join(realDirPath, rfileName), join(dirInitPath, rfileName), rfileName);

                }
            }

        }

        console.log('removing scripts..');
        

        disableCustomScriptsInFolder(join(gamePath, 'LEVELS'), 'LEVELS', 'LEVELS');


        console.log('edited ' + scriptsListEditedCount + ' txt files');

        return;
    }



    updateAnyScripts();

};



/**
 * This function is executed when a mod is selected / unselected
 * NOTE: It's possible that a mod are disabled not by the user but by a code like when you updated the app for example.
 * But everytime a mod is enabled it's because the user manually enabled it so it's why there is popups messages when a mod is enabled and never when a mod is disabled.
 * 
 * @param {String} modname 
 * @param {Boolean} isactivated 
 */
function setModIsActivated(modname, isactivated) {

    const modToChange = modsLoaded.findIndex(m => m.name == modname);

    if(modToChange == -1) return;

    let modInfos = modsLoaded[modToChange];

    
    if(isactivated && modInfos.readme) {

        let modPathF = join(modsFolder, modname);

        let readmePath = join(modPathF, modInfos.readme+'');

        if(!readmePath.startsWith( path.normalize(modPathF) )) readmePath = '';

        let readmeText = '';

        if(readmePath != '' && fs.existsSync(readmePath)) {
            readmeText = `Message from the mod:\n${readFileSync(readmePath, {encoding:'utf8'})}`;
            readmeText = readmeText.replace(/{MODPATH}/g, modPathF);
        } else {
            readmeText = `Error: the mod try to show a text at this path:\n"${readmePath}"\nNo file found at this path.`;
        }

        globalVars.mainWindow.webContents.send('alert', readmeText, null);
    }


    // add / remove the new characters of the mod before change the activated mods
    if(modInfos.addons.chars) {

        let characterManager = require('./character-manager/character-manager'); // (don't load this module at the start of the app)
        let charFileManager = require('./character-manager/char-file-manager');

        const charsFolderPath = join(modsFolder, modname, '/chars');

        if(isactivated) {
            fs.readdirSync(charsFolderPath).forEach(
                (charfoldername, charFolderIndex, charFolderArr) => {

                    console.log(`loading "${charfoldername}"..`);
                    charFileManager.loadCharMod( join(charsFolderPath, charfoldername), charFolderIndex == charFolderArr.length-1 );
                    console.log(`"${charfoldername}" loaded`);

                }
            );
        } else {
            fs.readdirSync(charsFolderPath).forEach(
                charfoldername => {

                    const charData = JSON.parse( readFileSync(join(charsFolderPath, charfoldername, 'char.json'), {encoding: 'utf8'}) );

                    characterManager.removeCharacter(charData.id);
                }
            );
        }
        
    }


    if(isactivated) {
        
        // Enable a mod :
        if(config['activated-mods'].includes( modname ) == false) {

            if(modInfos['launcher-version'] != null) {

                const modV = parseInt(modInfos['launcher-version'].replace(/\./g, ''));

                if(parseInt(exports.launcherVersion.replace(/\./g, '')) < modV) {
                    globalVars.mainWindow.webContents.send('alert', `WARNING :\nthe mod "${modname}" isn't build for this launcher version.\nYou can have bugs if you use it.\nIts recommanded to update your launcher to the last version.`, null);
                }
            }

            // *** Apply ressource pack mod files : ***
            if(modInfos.addons.ressourcePack) {

                const dirModFiles = join( modsFolder, '/' + modname, '/install' );

                function rsrcPackFolderLoop(gamepath) {
                    
                    if(join(config['game-location'], gamepath).toLowerCase() == globalVars.KFFolderPath.toLowerCase()) return;

                    // If the folder don't exist in the game create it
                    if(gamepath != '' && fs.existsSync( join(config['game-location'], gamepath) ) == false) {
                        fs.mkdirSync( join(config['game-location'], gamepath) );
                    }

                    const modFolderRealPath = join(dirModFiles, gamepath);

                    fs.readdirSync( modFolderRealPath ).forEach(
                        filename => {

                            // If its a folder
                            if(fs.statSync(join(modFolderRealPath, filename)).isDirectory()) {

                                rsrcPackFolderLoop( join(gamepath, '/' + filename) );

                                return;
                            }

                            // Don't let the mod editing a .exe :
                            if(filename.toLowerCase().endsWith('.exe')) return;
    
                            const gamePathFile = join(gamepath, filename);
    
                            if( fs.existsSync(join( config['game-location'], gamePathFile )) ) {
                                backupManager.backupFile( gamePathFile ); // If this file already exist backup it
                            }
                            
                            fs.writeFileSync(
                                join( config['game-location'], gamePathFile ),
                                readFileSync( join( modFolderRealPath, filename ) )
                            );
    
                        }
                    );
                }

                rsrcPackFolderLoop( '' );
            }

            config['activated-mods'].push( modname );
        }

    } else {
        
        // Disable a mod :
        config['activated-mods'] = config['activated-mods'].filter( m => m != modname );

        // *** Remove ressource pack mod files : ***
        if(modInfos.addons.ressourcePack) {

            const dirModFiles = join( modsFolder, '/' + modname, '/install' );

            function rsrcPackFolderLoop(gamepath) {

                if(gamepath != '' && fs.existsSync( join(config['game-location'], gamepath) ) == false) return;

                const modFolderRealPath = join(dirModFiles, gamepath);

                fs.readdirSync( modFolderRealPath ).forEach(
                    filename => {

                        // If its a folder
                        if(fs.statSync(join(modFolderRealPath, filename)).isDirectory()) {

                            rsrcPackFolderLoop( join(gamepath, '/' + filename) );
                            return;
                        }

                        const gamePathFile = join(gamepath, filename);

                        // Load the initial file and if there are no backup of this file, delete it
                        if(backupManager.loadBackupFile( gamePathFile ) == false) {
                            try {
                                if(fs.existsSync(join(config['game-location'], gamePathFile))) fs.unlinkSync(join(config['game-location'], gamePathFile));
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    }
                );
            }

            rsrcPackFolderLoop( '' );
        }
    }

    let modChangedAddons = modInfos.addons;

    
    if(modChangedAddons.SF) {
        
        if(fs.existsSync( join( modsFolder, '/' + modname, '/SF/OTHER_LEVELS' ) ) || config.scriptsEverywhere) {
            updateAnyScripts();
        }
        
    }


    // Apply custom texts
    if(modChangedAddons.text) updateCSVTexts(false);

    // Apply custom audio
    if(modChangedAddons.audio) updateAudioList();

    
    // add custom lines to collection.txt
    if(modChangedAddons.collection) {

        let characterManager = require('./character-manager/character-manager'); // (don't load this module at the start of the app)
        let charFileManager = require('./character-manager/char-file-manager');

        characterManager.updateCharsListFile(false);
        
    }

    if(modChangedAddons.map) {
        require('./map-manager').updateMods();
    }
    
    
    if(modChangedAddons.items) require('./item-manager').updateItems();

    if(modChangedAddons.editFiles) require('./mod-file-edit-feature').updateFileEdits();

    // the warning :
    if(
        isactivated &&
        (modChangedAddons.js
        || modChangedAddons.python
        || modChangedAddons.bat)
    ) {
        globalVars.mainWindow.webContents.send('alert',
        "WARNING : this mod execute code when you use it.\n" +
        "*If you don't trust the author disable this mod.*"
        , true
        );
    }

    config.save();

}

// Object gived to js scripts
const moddingInfosKF = {
    gamePath: config['game-location'],
    exeGameName: config.exename,
    modulesLocation: join(__dirname, 'node_modules'),
    gameScriptToJSAPI: undefined // auto edited
};




function launchMods() {

    // ! warn : this method is activated when the game will be launched but for the files
    // into the "install" folder that are added to the game just go to this function : setModIsActivated


    // Be sure that every mods selecteds are loadeds
    config['activated-mods'] = config['activated-mods'].filter( modname => modsLoaded.find(m => m.name == modname) != null );


    let textToAddInScriptList = '\n; Modded scripts :';

    // Functions executed after that the game totally started :
    let codeToLaunchAfter = [];
    // Functions executed after that the game is closed :
    let codeToLaunchOnClosed = [];

    // The _.js mod files loaded
    let JSModModules = [];

    let indexSFFileNumber = 60;

    const levelsFocus = [
        '/LEVELS/LEG' + 'O_CITY/LE' + 'GO_CITY/AI/',
        // '/LEVELS/STANDALONES/GAMEMECHANICSTESTAREA/AI/'
        // '/LEVELS/L' + 'EG' + 'O_CITY/L' + 'EG' + 'O_CITY/IS_SPACE_CENTRE/IS_SPACE_CENTRE_3322/AI/'
    ];

    moddingInfosKF.gameScriptToJSAPI = undefined;

    let needJSCAPI = false;

    let customEnvForForkedJSModules = {...process.env};
    customEnvForForkedJSModules.MODINFOS = JSON.stringify(moddingInfosKF);

    function execInNewBatProcess(commandtoex) {
        child_process.spawn(commandtoex,
        {
            shell: true,
            detached: true
        });
    }


    // Apply changes by the mods (SF files, bat, js and python codes) :
    config['activated-mods'].forEach(modname => {
        
        let modInfos = modsLoaded.find(m => m.name == modname);

        // Apply .SF files
        if(modInfos.addons.SF) {
            const dirModP = join( modsFolder, '/' + modname, '/SF' );

            const disabledScriptsByParams = [];
            if(modInfos.params) {
                let i = 0;
                let size = modInfos.params.length || 0;
                while (i < size) {
                    let param = modInfos.params[i];
                    if(param && param.enableScript && !param.active) disabledScriptsByParams.push(param.enableScript);
                    i++;
                }
            }

            fs.readdirSync( dirModP ).forEach(
                filename => {

                    // if(path.extname(filename).toLowerCase() != ".sf") return;
                    if(filename.slice(-3).toLowerCase() != ".sf" || disabledScriptsByParams.includes(filename)) return;
                    
                    const SFFileIndex = indexSFFileNumber;
                    indexSFFileNumber++;
    
                    // let SFFileName = 'MOD_' + filename.toUpperCase().replace(/-/g, '_');
                    let SFFileName = 'LEVEL' + SFFileIndex + '.SF';

                    if(filename.startsWith('_')) SFFileName = 'MOD' + filename.toUpperCase().replace(/-/g, '_').replace(/ /g, '_');
    
                    let scriptData = readFileSync( join( dirModP, filename ), 'utf8' );

                    scriptData = require('./compiler-game-script').compileScriptCode( scriptData );
    
                    levelsFocus.forEach(
                        levelpath => {
                            
                            const pathFile = join(levelpath, SFFileName);

                            if( fs.existsSync(join( config['game-location'], pathFile )) ) backupManager.backupFile( pathFile );
                            
                            fs.writeFileSync(
                                join( config['game-location'], pathFile ),
                                scriptData
                            );
                        }
                    );
    
    
                    textToAddInScriptList += '\n' + SFFileName.toLowerCase().split('.', 1)[0] + '	;	' + ( modInfos.name.replace(/\n/g, '').replace(/;/g, '') );
                }
            )
        }

        if(modInfos.addons.bat) {
            const dirModP = join( modsFolder, '/' + modname, '/bat' );

            fs.readdirSync( dirModP ).forEach(
                filename => {

                    if(path.extname(filename).toLowerCase() != ".bat") return;

                    // If the script will be launched after
                    if(filename.startsWith('_')) {
                        codeToLaunchAfter.push(
                            JSON.stringify(join(dirModP, filename))
                        );
                        return;
                    }

                    // child_process.spawn(JSON.stringify(
                    //     join(dirModP, filename)
                    // ), {detached: true});
                    // execInNewBatProcess(JSON.stringify(join(dirModP, filename)));
                    execInNewBatProcess(join(dirModP, filename));
                }
            )
        }
        

        if(modInfos.addons.js) {
            const dirModP = join( modsFolder, '/' + modname, '/js' );

            fs.readdirSync( dirModP ).forEach(
                filename => {

                    if(path.extname(filename).toLowerCase() != ".js") return;


                    let execJSMod;

                    if(filename.toLowerCase().endsWith('_.js')) {
                        
                        if(!needJSCAPI) {
                            needJSCAPI = true;

                            // Add the JS-API :
                            moddingInfosKF.gameScriptToJSAPI = require('./js-to-game-scripts');
                            moddingInfosKF.gameScriptToJSAPI.modInfos = {...moddingInfosKF};
                            moddingInfosKF.gameScriptToJSAPI.JSModModules = JSModModules;
                            codeToLaunchAfter.push(
                                () => {
                                    require('./js-to-game-scripts').cModuleStart();
                                }
                            );
                            codeToLaunchOnClosed.push(
                                () => {
                                    require('./js-to-game-scripts').cModuleClose();
                                }
                            );
                            
                            // Add the .SF API :
                            const SFFileIndex = indexSFFileNumber;
                            indexSFFileNumber++;

                            let SFFileName = 'LEVEL' + SFFileIndex + '.SF';

                            
                            let scriptData = config.isLightCommunication ?  readFileSync( join( __dirname, 'js-to-sf-api-in-sublevel.sf' ) ) : readFileSync( join( __dirname, 'js-connection-main.sf' ) );
                            
                            levelsFocus.forEach(
                                levelpath => {
                                    
                                    const pathFile = join(levelpath, SFFileName);

                                    if( fs.existsSync(join( config['game-location'], pathFile )) ) backupManager.backupFile( pathFile );
                                    
                                    fs.writeFileSync(
                                        join( config['game-location'], pathFile ),
                                        scriptData
                                    );
                                }
                            );
            
            
                            textToAddInScriptList += '\n' + SFFileName.toLowerCase().split('.', 1)[0] + '	;	game script to JS communication API';
                        }
                        

                        // Execute the .js mod file

                        execJSMod = () => {

                            let modModule = require( join(dirModP, filename) );
                            
                            modModule.modInfos = {...moddingInfosKF};
                            modModule.modParams = modInfos.params || null;
                            modModule.modInfos.modName = modname;
                            modModule.modInfos.showMessage = (messagetxt, usespecialsyntaxe) => {
                                globalVars.mainWindow.webContents.send(
                                    'alert', '[' + modname + '] :\n' + (messagetxt || ''), usespecialsyntaxe
                                );
                            };

                            if(modModule.onStart) modModule.onStart();

                            JSModModules.push(modModule);
                        }
                        codeToLaunchOnClosed.push(() => {
                            let modModule = require( join(dirModP, filename) );
                            if(modModule.onClosed) modModule.onClosed();
                        });
                    } else if(filename.toLowerCase().endsWith('_fork.js')) {
                        execJSMod = () => {
                            child_process.fork(join(dirModP, filename), {
                                env: customEnvForForkedJSModules
                            });
                        }
                    } else {
                        return;
                    }
                    
                    
                    if(filename.startsWith('_')) {

                        codeToLaunchAfter.push( execJSMod );

                        return;
                    }

                    execJSMod();
                    
                    // // If the script will be launched after
                    // if(filename.startsWith('_')) {
                    //     codeToLaunchAfter.push(
                    //         "node " + JSON.stringify(join(dirModP, filename))
                    //     );
                    //     return;
                    // }

                    // exec("node " + JSON.stringify(join(dirModP, filename)));

                }
            )
        }


        if(modInfos.addons.python) {
            const dirModP = join( modsFolder, '/' + modname, '/python' );

            fs.readdirSync( dirModP ).forEach(
                filename => {

                    if(path.extname(filename).toLowerCase() != ".py") return;

                    // If the script will be launched after
                    if(filename.startsWith('_')) {
                        codeToLaunchAfter.push(
                            "py " + JSON.stringify(join(dirModP, filename))
                        );
                        return;
                    }

                    // child_process.exec("py " + JSON.stringify(join(dirModP, filename)));
                    execInNewBatProcess("py " + JSON.stringify(join(dirModP, filename)));
                }
            )
        }
        
    });

    levelsFocus.forEach(
        levelpath => {

            backupManager.loadBackupFile(
                join(levelpath, 'SCRIPT.TXT'),
                backupToLoad => {
                    backupToLoad = backupToLoad.toString('utf8');

                    // If this file is already modified (normally this situation isn't possible) remove the modded part
                    if(backupToLoad.includes('; Modded scripts :')) {
                        backupToLoad = backupToLoad.replace(/\; Modded.*/gs, '');
                    }

                    // Edit the game file :
                    return backupToLoad + textToAddInScriptList
                },
                {
                    init: {encoding: 'utf8'},
                    new: {encoding: 'utf8'},
                }
           );
        }
    );


    config.save();
    

    codeToLaunchOnClosed.push(()=>{
        // When game stopped remove all the js modules in the list
        while (JSModModules.length != 0) {
            JSModModules.pop();
        }
    });

    // Return code to run when the game is launched
    return {codeToLaunchAfter, codeToLaunchOnClosed};

}



function duplicateFolder(sourceDir, destinationDir) {

    return new Promise((resolve, reject) => {    

        if(sourceDir == destinationDir) return reject();

        if (!fs.existsSync(destinationDir)){
            fs.mkdirSync(destinationDir, {recursive: true});
        }
        
        // fsExtra.copy(sourceDir, destinationDir, function(error) {
        //     if (error) {
        //         console.error(error);
        //         reject()
        //     } else {
        //         resolve();
        //     }
        // });

        try {
            fsExtra.copySync(sourceDir, destinationDir);
            resolve();
        } catch (error) {
            console.error(error);
            reject(error);
        }

    });

}


function removeDir(dirpath, canlog) {

    try {
        
        if (!fs.existsSync(dirpath)) return false;

        fs.readdirSync( dirpath ).forEach(
            filename => {

                const filePath = join( dirpath, "/" + filename );

                if (fs.statSync( filePath ).isDirectory()) {
                    removeDir( filePath, canlog );
                } else {
                    fs.unlinkSync( filePath );
                    if(canlog) console.log('+1 file deleted');
                }
            }
        );

        fs.rmdirSync( dirpath );
        if(canlog) console.log('+1 folder deleted');

        return true;
    } catch (error) {
        console.error(error);

        return false;
    }

}


function removeMod(modname) {
    
    let mod = modsLoaded.find(m => m.name == modname);

    if( mod == null ) return false;

    function removeTheMod() {
        try {
            
            const pathToRemove = join( modsFolder, mod.name );

            console.log('removing "' + pathToRemove + '"');

            if( fs.existsSync(pathToRemove) == false ) {
                return false;
            }

            // Delete directory
            if( removeDir( pathToRemove, true ) == false ) return false

            modsLoaded = modsLoaded.filter(m => m.name != mod.name);

            config['activated-mods'] = config['activated-mods'].filter(m => m != mod.name);
            config.save();

            return true;

        } catch (error) {
            console.error(error);
            
            return false;
        }
    }

    
    setModIsActivated(mod.name, false);
    
    
    removeTheMod();

}


function addNewMod(initModfolderpath) {
    return new Promise((resolve, reject) => {

        console.log('loading new mod..');
        
        

        if(fs.existsSync( initModfolderpath ) == false) {
            reject("folder don't exist");
            return;
        }
        
        if(!fs.existsSync(join(initModfolderpath, "mod.json"))) {
            
            console.log('no mod.json in the folder, search inside the folder..');
            
            let allFilesInInitFolder = fs.readdirSync(initModfolderpath);
            
            let index = allFilesInInitFolder.length;
            let hasPatchedFolder = false;
            while (index > 0) {
                index--;
                let subFileName = allFilesInInitFolder[index];

                if(!subFileName.includes(".")) {
                    if(fs.existsSync(join(initModfolderpath, subFileName, 'mod.json'))) {
                        initModfolderpath = join(initModfolderpath, subFileName);
                        console.log('found the folder: ' + subFileName);
                        hasPatchedFolder = true;
                        break;
                    }
                }

            }

            if(!hasPatchedFolder) {

                if(fs.existsSync(join(initModfolderpath, "../", "mod.json"))) {

                    console.log('found the folder, it was upper');
                    initModfolderpath = join(initModfolderpath, "../");

                } else {
                    reject('You have not selected the right folder, no file "mod.json" found in the folder.');
                    return;
                }

            }

        }

        const newModDir = join(modsFolder, '/' + path.basename(initModfolderpath));

        if(initModfolderpath == newModDir) {
            reject("cant import mod from the mods folder, relaunch the application to make this");
            return;
        }

        duplicateFolder(initModfolderpath, newModDir)
            .then(
                () => {

                    // loadMod(newModDir);

                    console.log('new mod directory created');
                    console.log('loading mod..');

                    try {
                        
                        let modInfos = JSON.parse(
                            readFileSync( join(newModDir, '/mod.json') )
                        );

                        if(modInfos.devmode != null) {
                            modInfos.devmode = undefined;
                            fs.writeFileSync( join(newModDir, '/mod.json'), JSON.stringify(modInfos), 'utf8' );
                        }

                    } catch (error) {
                        
                    }

                    if(loadMod(newModDir)) {
                        console.log('mod loaded !');
                        resolve();
                    } else {
                        console.log('cannot load mod');
                        reject('mod structure error');
                    }

                }
            )
            .catch(reject);

    })
}


function updateAudioList() {

    // const dirAudioModsName = 'MODS';
    const dirAudioModsName = 'UI';

    const modsIdsPrefix = 'MOD_';

    const modsMusicsIdsPrefix = 'MOD_';


    // let textAddedToAList = '\n\n; ==== Modded sounds ====\n';
    let textAddedToAList = '';

    let addedTracksLines = '';
    let addedMusicBlockLines = '';


    let replacesForSfx = [];
    let replacesForMusics = [];

    let addsForSfx = [];
    let addsForMusics = [];

    
    config['activated-mods'].forEach(modname => {
        
        let modInfos = modsLoaded.find(m => m.name == modname);

        if(modInfos == null) return;

        if(modInfos.addons.audio) {
            const dirModP = join( modsFolder, '/' + modname, '/audio' );

            let configSoundsPath = join(dirModP, 'sounds.json');
            
            let configSounds = {};

            if(fs.existsSync(configSoundsPath)) configSounds = JSON.parse( readFileSync(configSoundsPath, 'utf8') );

            if(configSounds.addsForSfx) {
                addsForSfx.push(...configSounds.addsForSfx);
            }
            if(configSounds.addsForMusics) {
                addsForMusics.push(...configSounds.addsForMusics);
            }
            if(configSounds.replacesForMusics) {
                addsForSfx.push(...configSounds.replacesForMusics);
            }
            if(configSounds.replacesForSfx) {
                addsForMusics.push(...configSounds.replacesForSfx);
            }


            fs.readdirSync( dirModP ).forEach(
                filename => {
                    if(filename.includes('.') == false) return;

                    if(path.extname(filename).toLowerCase() != '.wav') {

                        if(path.extname(filename).toLowerCase() != '.ogg') return;

                        // if(filename.startsWith())
                        
                        let newFileName = modsMusicsIdsPrefix + filename.replace(/ /g, '_').toUpperCase();

                        let newFilePath = join(config['game-location'], 'AUDIO/TRACKS/MUSIC_FINAL', newFileName);

                        // Copy-paste the custom audio :
                        fs.writeFileSync(
                            newFilePath,
                            readFileSync( join(dirModP, filename) )
                        );

                        let musicName = newFileName.replace('.OGG', '');

                        addedMusicBlockLines += 
                        
                         '\n\nBank "' + musicName + '"'
                        +'\n'
                        +`        Track   Class "Quiet"   Filename "Music_Final\\${musicName}"                 Volume ${ configSounds.allMusicsVolume || (configSounds.musicsVolumes && configSounds.musicsVolumes[musicName]) || "0.2" }`
                        +'\n';

                        addedTracksLines +=
                        '\n'+
                        `	Track "${musicName}"                         Filename "${musicName}"                             Volume ${(configSounds.musicsVolumes2 && configSounds.musicsVolumes2[musicName]) || "0.6"} Duckscale 0.1 Duckattack 0.5 Duckrelease 2.0 DuckBus "Radio"`;

                        return;
                    }

                    let newFileName = modsIdsPrefix + filename.replace(/ /g, '_').toUpperCase();

                    let newFilePath = join(config['game-location'], 'AUDIO/SAMPLES', dirAudioModsName, newFileName);

                    // Copy-paste the custom audio :
                    fs.writeFileSync(
                        newFilePath,
                        readFileSync( join(dirModP, filename) )
                    );

                    let soundName = newFileName.replace('.WAV', '');

                    let volumeSFX = (configSounds.soundsVolumes && configSounds.soundsVolumes[soundName]) || "0.5";

                    // textAddedToAList += `\nSample 	Name "${newFileName.replace('.WAV', '')}"   Filename "${join(dirAudioModsName, newFileName).replace('.WAV', '').replace(/\//g, '\\')}"    Global  ForceNonPos		ForceNonPos `;
                    textAddedToAList += `\nSample 	Name "${soundName}"   Filename "${join(dirAudioModsName, newFileName).replace('.WAV', '').replace(/\//g, '\\')}"           	Volume ${volumeSFX}	Global`;

                }
            )
        }
    });


    backupManager.backupFile('AUDIO/TRACKS.CFG');
    backupManager.backupFile('AUDIO/SAMPLES_DEFAULT.CFG');
    backupManager.backupFile('AUDIO/SAMPLES_JAPAN.CFG');


    if(textAddedToAList.length != 0) textAddedToAList = "\n" + textAddedToAList;
    
    backupManager.loadBackupFile('AUDIO/SAMPLES_DEFAULT.CFG', (initvaluefile) => {
        
        initvaluefile = initvaluefile.toString('utf8');

        let i = 0x00000BFA;

        while (i > 0 && initvaluefile[i] != '\n') {
            i--;
        }

        initvaluefile = initvaluefile.slice(0, i) + textAddedToAList + initvaluefile.slice(i);

        replacesForSfx.forEach(
            replLine => {
                initvaluefile = initvaluefile.replace(replLine[0], replLine[1]);
            }
        );

        addsForSfx.forEach(
            replLine => {
                initvaluefile += '\n' + replLine;
            }
        );

        return initvaluefile;
        
        
        // return initvaluefile.toString('utf8') + textAddedToAList;
    },
    {
        init: {encoding: 'utf8'},
        new: {encoding: 'utf8'},
    });
    
    backupManager.loadBackupFile('AUDIO/SAMPLES_JAPAN.CFG', (initvaluefile) => {
        
        initvaluefile = initvaluefile.toString('utf8');

        let i = 0x00000A1E;

        while (i > 0 && initvaluefile[i] != '\n') {
            i--;
        }

        initvaluefile = initvaluefile.slice(0, i) + textAddedToAList + initvaluefile.slice(i);

        
        replacesForSfx.forEach(
            replLine => {
                initvaluefile = initvaluefile.replace(replLine[0], replLine[1]);
            }
        );

        addsForSfx.forEach(
            replLine => {
                initvaluefile += '\n' + replLine;
            }
        );

        return initvaluefile;
        
        
        // return initvaluefile.toString('utf8') + textAddedToAList;
    },
    {
        init: {encoding: 'utf8'},
        new: {encoding: 'utf8'},
    });


    
    
    backupManager.loadBackupFile('AUDIO/TRACKS.CFG', (initvaluefile) => {
        
        initvaluefile = initvaluefile.toString('utf8');



        let i = initvaluefile.indexOf('Path "Audio\\Tracks\\Music_Final"');
        

        if(i == -1) return initvaluefile;

        while (i < initvaluefile.length && (initvaluefile[i] != 'T' || initvaluefile.slice(i, i + 6) != 'Track ')) {
            i++;
        }
        while (i > 0 && initvaluefile[i] != '\n') {
            i--;
        }

        if(i <= 0) return initvaluefile;

        initvaluefile = initvaluefile.slice(0, i) + addedTracksLines + initvaluefile.slice(i) + addedMusicBlockLines;

        
        replacesForMusics.forEach(
            replLine => {
                initvaluefile = initvaluefile.replace(replLine[0], replLine[1]);
            }
        );

        addsForMusics.forEach(
            replLine => {
                initvaluefile += '\n' + replLine;
            }
        );

        return initvaluefile;
        
        
        // return initvaluefile.toString('utf8') + textAddedToAList;
    },
    {
        init: {encoding: 'utf8'},
        new: {encoding: 'utf8'},
    });

}


const initTextModDatas = '\n' + readFileSync(join(__dirname, 'text-added-to-game.txt'), {encoding:'utf8'});

function updateCSVTexts(cansaveconfig) {

    config['activated-mods'] = config['activated-mods'].filter( modname => modsLoaded.find(m => m.name == modname) != null );

    let textToAddInTextList = '';

    let textsReplacers = [];


    config['activated-mods'].forEach(modname => {
        
        let modInfos = modsLoaded.find(m => m.name == modname);
        
        
        if(modInfos.addons.text) {
            
            const dirModP = join( modsFolder, '/' + modname, '/text' );

            fs.readdirSync( dirModP ).forEach(
                filename => {

                    if(path.extname(filename).toLowerCase() != ".txt" && path.extname(filename).toLowerCase() != ".csv") return;
                    
                    if(filename.startsWith('_')) {

                        readFileSync(join(dirModP, filename), {encoding: 'utf8'}).split('\n').forEach(
                            line => {

                                if(line && line.startsWith('//') == false) {

                                    textsReplacers.push({
                                        r: line.slice(0, line.indexOf('",')),
                                        v: line
                                    });
                                }
                        });
                    } else {
                        textToAddInTextList += '\n' + readFileSync(join(dirModP, filename), {encoding: 'utf8'});
                    }
                }
            );
        }
    });


    
    backupManager.backupFile('/STUFF/TEXT/TEXT.CSV');
    
    // Edit the game file :
    backupManager.loadBackupFile(
        '/STUFF/TEXT/TEXT.CSV',
        backupToLoad => {
            let newTextList = backupToLoad.toString('utf8');

            if(textsReplacers.length != 0) {
                newTextList.split('\n').forEach(
                    line => {

                        let lineId = line.slice(0, line.indexOf('",'));

                        let lineReplacer = textsReplacers.find(t => t.r == lineId);

                        if(!lineReplacer) return;

                        newTextList = newTextList.replace(line, lineReplacer.v);
                    }
                );
            }

            return newTextList + textToAddInTextList + initTextModDatas;
        },
        {
            init: {encoding: 'utf8'},
            new: {encoding: 'utf8'},
        }
    );

    if(cansaveconfig) config.save();

}

function setModParam(modId, paramName, val) {
    let modInfos = modsLoaded.find(m => m.name == modId);

    if(!modInfos) return;
    

    modInfos.params.find(p => p.name == paramName).active = val;

    fs.writeFileSync(join(modsFolder, modId, 'mod.json'), JSON.stringify(modInfos), 'utf8');

}


function addInitMods() {
    // Add initial mods
    if(fs.existsSync( join(__dirname, 'init-mods') )) {
        const initModsPath = join(__dirname, 'init-mods');

        duplicateFolder(initModsPath, join(globalVars.KFFolderPath, 'mods') ).then(
            () => {
                console.log('initial mods duplicated');

                try {
                    removeDir(initModsPath);
                } catch (error) {
                    console.error(error);
                    console.log('error while removing the init mods folder');
                }
            }
        )
        .catch( console.error );

    }
}


exports.addNewMod = addNewMod;
exports.loadAllMods = loadAllMods;
exports.loadMod = loadMod;
exports.removeMod = removeMod;
exports.setModIsActivated = setModIsActivated;
exports.launchMods = launchMods;
exports.getModsLoaded = () => modsLoaded;
exports.modsFolder = modsFolder;
exports.addInitMods = addInitMods;
exports.updateCSVTexts = updateCSVTexts;
exports.setModParam = setModParam;