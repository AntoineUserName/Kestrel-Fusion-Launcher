const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const config = require('./config-manager');
const backupManager = require('./backup-manager');
const globalVars = require('./global-variables');
const child_process = require('child_process');

// const modsFolder = path.join(__dirname, '/mods');
const modsFolder = path.join(globalVars.KFFolderPath, '/mods');

if(!fs.existsSync(modsFolder)) fs.mkdirSync( modsFolder );

let modsLoaded = [];

exports.launcherVersion = "0.0.0"; // This value is edited by the main.js


function loadMod(modpath) {

    try {
        let modInfos = JSON.parse(
            fs.readFileSync( path.join(modpath, '/mod.json') )
        );

        modInfos.name = path.basename( modpath );
        if(!modInfos.addons) {
            modInfos.addons = {
                SF: fs.existsSync(path.join(modpath, '/SF')),
                python: fs.existsSync(path.join(modpath, '/python')),
                js: fs.existsSync(path.join(modpath, '/js')),
                bat: fs.existsSync(path.join(modpath, '/bat')),
                ressourcePack: fs.existsSync(path.join(modpath, '/install')),
                text: fs.existsSync(path.join(modpath, '/text')),
                chars: fs.existsSync(path.join(modpath, '/chars')),
                audio: fs.existsSync(path.join(modpath, '/audio'))
            }

            if(!modInfos.devmode) {
                fs.writeFileSync( path.join(modpath, '/mod.json'), JSON.stringify(modInfos), {encoding:'utf8'} );
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

    const timeBeforeLoadingMods = config['not-use-date'] ? 0 : (new Date().getTime());
    

    modsLoaded = [];

    let haveModNotLoaded = false;

    fs.readdirSync(modsFolder).forEach(
        folder => {
            if(loadMod( path.join(modsFolder, folder) ) == false) {
                haveModNotLoaded = true;
            }
        }
    );

    if(!config['not-use-date']) console.log('mods loaded in ' + (new Date().getTime() - timeBeforeLoadingMods) + 'ms');

    return haveModNotLoaded;
}

/**
 * This function is executed when a mod is selected / unselected
 * 
 * @param {String} modname 
 * @param {Boolean} isactivated 
 */
function setModIsActivated(modname, isactivated) {

    const modToChange = modsLoaded.findIndex(m => m.name == modname);

    if(modToChange == -1) return;


    // add / remove the new characters of the mod before change the activated mods
    if(modsLoaded[modToChange].addons.chars) {

        const characterManager = require('./character-manager/character-manager'); // (don't load this module at the start of the app)
        const charFileManager = require('./character-manager/char-file-manager');

        const charsFolderPath = path.join(modsFolder, modname, '/chars');

        if(isactivated) {
            fs.readdirSync(charsFolderPath).forEach(
                (charfoldername, charFolderIndex, charFolderArr) => {

                    console.log(`loading "${charfoldername}"..`);
                    charFileManager.loadCharMod( path.join(charsFolderPath, charfoldername), charFolderIndex == charFolderArr.length-1 );
                    console.log(`"${charfoldername}" loaded`);

                }
            );
        } else {
            fs.readdirSync(charsFolderPath).forEach(
                charfoldername => {

                    const charData = JSON.parse( fs.readFileSync(path.join(charsFolderPath, charfoldername, 'char.json'), {encoding: 'utf8'}) );

                    characterManager.removeCharacter(charData.id);
                }
            );
        }
        
    }


    if(isactivated) {
        
        // Enable a mod :
        if(config['activated-mods'].includes( modname ) == false) {

            if(modsLoaded[modToChange]['launcher-version'] != null) {

                const modV = parseInt(modsLoaded[modToChange]['launcher-version'].replace(/\./g, ''));

                if(parseInt(exports.launcherVersion.replace(/\./g, '')) < modV) {
                    globalVars.mainWindow.webContents.send('alert', `WARN :\nthe mod "${modname}" isn't build for this launcher version.\nYou can having bugs if you use it.\nIts recommanded to update your launcher at the last version.`, null);
                }
            }

            // *** Apply ressource pack mod files : ***
            if(modsLoaded[modToChange].addons.ressourcePack) {

                const dirModFiles = path.join( modsFolder, '/' + modname, '/install' );

                function rsrcPackFolderLoop(gamepath) {
                    
                    if(path.join(config['game-location'], gamepath).toLowerCase() == globalVars.KFFolderPath.toLowerCase()) return;

                    // If the folder don't exist in the game create it
                    if(gamepath != '' && fs.existsSync( path.join(config['game-location'], gamepath) ) == false) {
                        fs.mkdirSync( path.join(config['game-location'], gamepath) );
                    }

                    const modFolderRealPath = path.join(dirModFiles, gamepath);

                    fs.readdirSync( modFolderRealPath ).forEach(
                        filename => {

                            // If its a folder
                            if(fs.statSync(path.join(modFolderRealPath, filename)).isDirectory()) {

                                rsrcPackFolderLoop( path.join(gamepath, '/' + filename) );

                                return;
                            }
    
                            const gamePathFile = path.join(gamepath, filename);
    
                            if( fs.existsSync(path.join( config['game-location'], gamePathFile )) ) {
                                backupManager.backupFile( gamePathFile ); // If this file already exist backup it
                            }
                            
                            fs.writeFileSync(
                                path.join( config['game-location'], gamePathFile ),
                                fs.readFileSync( path.join( modFolderRealPath, filename ) )
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
        if(modsLoaded[modToChange].addons.ressourcePack) {

            const dirModFiles = path.join( modsFolder, '/' + modname, '/install' );

            function rsrcPackFolderLoop(gamepath) {

                if(gamepath != '' && fs.existsSync( path.join(config['game-location'], gamepath) ) == false) return;

                const modFolderRealPath = path.join(dirModFiles, gamepath);

                fs.readdirSync( modFolderRealPath ).forEach(
                    filename => {

                        // If its a folder
                        if(fs.statSync(path.join(modFolderRealPath, filename)).isDirectory()) {

                            rsrcPackFolderLoop( path.join(gamepath, '/' + filename) );
                            return;
                        }

                        const gamePathFile = path.join(gamepath, filename);

                        // Load the initial file and if there are no backup of this file, delete it
                        if(backupManager.loadBackupFile( gamePathFile ) == false) {
                            try {
                                if(fs.existsSync(path.join(config['game-location'], gamePathFile))) fs.unlinkSync(path.join(config['game-location'], gamePathFile));
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

    // Apply custom texts
    if(modsLoaded[modToChange].addons.text) updateCSVTexts(false);

    // Apply custom audio
    if(modsLoaded[modToChange].addons.audio) updateAudioList();

    config.save();

}


function launchMods() {

    // ! warn : this method is activated when the game will be launched but for the files
    // into the "install" folder that are added to the game just go to this function : setModIsActivated


    // Be sure that every mods selecteds are loadeds
    config['activated-mods'] = config['activated-mods'].filter( modname => modsLoaded.find(m => m.name == modname) != null );


    let textToAddInScriptList = '\n; Modded scripts :';

    let codeToLaunchAfter = [];

    let indexSFFileNumber = 32;

    const levelsFocus = [
        '/LEVELS/LEGO_CITY/LEGO_CITY/AI/'
        // '/LEVELS/LEGO_CITY/LEGO_CITY/IS_SPACE_CENTRE/IS_SPACE_CENTRE_3322/AI/'
    ];


    let customEnvForForkedJSModules = {...process.env};
    customEnvForForkedJSModules.MODINFOS = JSON.stringify({
        gamePath: config['game-location'],
        exeGameName: config.exename,
        modulesLocation: path.join(__dirname, 'node_modules')
    });

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
            const dirModP = path.join( modsFolder, '/' + modname, '/SF' );

            fs.readdirSync( dirModP ).forEach(
                filename => {
                    
                    const SFFileIndex = indexSFFileNumber;
                    indexSFFileNumber++;
    
                    // let SFFileName = 'MOD_' + filename.toUpperCase().replace(/-/g, '_');
                    let SFFileName = 'LEVEL' + SFFileIndex + '.SF';

                    if(filename.startsWith('_')) SFFileName = 'MOD' + filename.toUpperCase().replace(/-/g, '_').replace(/ /g, '_');
    
                    let scriptData = fs.readFileSync( path.join( dirModP, filename ) );
    
                    levelsFocus.forEach(
                        levelpath => {
                            
                            const pathFile = path.join(levelpath, SFFileName);

                            if( fs.existsSync(path.join( config['game-location'], pathFile )) ) backupManager.backupFile( pathFile );
                            
                            fs.writeFileSync(
                                path.join( config['game-location'], pathFile ),
                                scriptData
                            );
                        }
                    )
    
    
                    textToAddInScriptList += '\n' + SFFileName.toLowerCase().split('.', 1)[0] + '	;	' + ( modInfos.name.replace(/\n/g, '').replace(/;/g, '') );
                }
            )
        }

        if(modInfos.addons.bat) {
            const dirModP = path.join( modsFolder, '/' + modname, '/bat' );

            fs.readdirSync( dirModP ).forEach(
                filename => {

                    if(path.extname(filename).toLowerCase() != ".bat") return;

                    // If the script will be launched after
                    if(filename.startsWith('_')) {
                        codeToLaunchAfter.push(
                            JSON.stringify(path.join(dirModP, filename))
                        );
                        return;
                    }

                    // child_process.spawn(JSON.stringify(
                    //     path.join(dirModP, filename)
                    // ), {detached: true});
                    // execInNewBatProcess(JSON.stringify(path.join(dirModP, filename)));
                    execInNewBatProcess(path.join(dirModP, filename));
                }
            )
        }
        

        if(modInfos.addons.js) {
            const dirModP = path.join( modsFolder, '/' + modname, '/js' );

            fs.readdirSync( dirModP ).forEach(
                filename => {

                    if(path.extname(filename).toLowerCase() != ".js") return;

                    
                    if(filename.startsWith('_')) {

                        codeToLaunchAfter.push(
                            () => {
                                child_process.fork(path.join(dirModP, filename), {
                                    env: customEnvForForkedJSModules
                                });
                            }
                        );

                        return;
                    }

                    child_process.fork(path.join(dirModP, filename), {
                        env: customEnvForForkedJSModules
                    });
                    
                    // // If the script will be launched after
                    // if(filename.startsWith('_')) {
                    //     codeToLaunchAfter.push(
                    //         "node " + JSON.stringify(path.join(dirModP, filename))
                    //     );
                    //     return;
                    // }

                    // exec("node " + JSON.stringify(path.join(dirModP, filename)));

                }
            )
        }


        if(modInfos.addons.python) {
            const dirModP = path.join( modsFolder, '/' + modname, '/python' );

            fs.readdirSync( dirModP ).forEach(
                filename => {

                    if(path.extname(filename).toLowerCase() != ".py") return;

                    // If the script will be launched after
                    if(filename.startsWith('_')) {
                        codeToLaunchAfter.push(
                            "python " + JSON.stringify(path.join(dirModP, filename))
                        );
                        return;
                    }

                    // child_process.exec("python " + JSON.stringify(path.join(dirModP, filename)));
                    execInNewBatProcess("python " + JSON.stringify(path.join(dirModP, filename)));
                }
            )
        }
        
    });

    levelsFocus.forEach(
        levelpath => {

            backupManager.loadBackupFile(
                path.join(levelpath, 'SCRIPT.TXT'),
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

    // Return code to run when the game is launched
    return codeToLaunchAfter;

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

                const filePath = path.join( dirpath, "/" + filename );

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
            
            const pathToRemove = path.join( modsFolder, mod.name );

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
        
        const newModDir = path.join(modsFolder, '/' + path.basename(initModfolderpath));

        if(initModfolderpath == newModDir) {
            reject("cant import mod from the mods folder, relaunch the application to make this");
            return;
        }

        if(fs.existsSync( initModfolderpath ) == false) {
            reject("folder don't exist");
            return;
        }

        duplicateFolder(initModfolderpath, newModDir)
            .then(
                () => {

                    // loadMod(newModDir);

                    console.log('new mod directory created');
                    console.log('loading mod..');

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

    let textAddedToAList = '\n\n; ==== Modded sounds ====\n';
    
    config['activated-mods'].forEach(modname => {
            
        let modInfos = modsLoaded.find(m => m.name == modname);

        if(modInfos == null) return;

        if(modInfos.addons.audio) {
            const dirModP = path.join( modsFolder, '/' + modname, '/audio' );

            fs.readdirSync( dirModP ).forEach(
                filename => {
                    if(filename.includes('.') == false || path.extname(filename).toLowerCase() != '.wav') return;

                    let newFileName = filename.replace(/ /g, '_').toUpperCase();

                    let newFilePath = path.join(config['game-location'], 'AUDIO/SAMPLES/MODS', newFileName);

                    // Copy-paste the custom audio :
                    fs.writeFileSync(
                        newFilePath,
                        fs.readFileSync( path.join(dirModP, filename) )
                    );

                    textAddedToAList += `\nSample 	Name "${newFileName.replace('.WAV', '')}"   Filename "${path.join('MODS', newFileName).replace('.WAV', '').replace(/\//g, '\\')}"    Global  ForceNonPos		ForceNonPos `;
                }
            )
        }
    });

    
    backupManager.loadBackupFile('AUDIO/SAMPLES_DEFAULT.CFG', (initvaluefile) => {
        return initvaluefile.toString('utf8') + textAddedToAList;
    },
    {
        init: {encoding: 'utf8'},
        new: {encoding: 'utf8'},
    });
    
    backupManager.loadBackupFile('AUDIO/SAMPLES_JAPAN.CFG', (initvaluefile) => {
        return initvaluefile.toString('utf8') + textAddedToAList;
    },
    {
        init: {encoding: 'utf8'},
        new: {encoding: 'utf8'},
    });
}


function updateCSVTexts(cansaveconfig) {

    config['activated-mods'] = config['activated-mods'].filter( modname => modsLoaded.find(m => m.name == modname) != null );

    let textToAddInTextList = '';

    let textsReplacers = [];


    config['activated-mods'].forEach(modname => {
        
        let modInfos = modsLoaded.find(m => m.name == modname);
        
        
        if(modInfos.addons.text) {
            
            const dirModP = path.join( modsFolder, '/' + modname, '/text' );

            fs.readdirSync( dirModP ).forEach(
                filename => {

                    if(path.extname(filename).toLowerCase() != ".txt" && path.extname(filename).toLowerCase() != ".csv") return;
                    
                    if(filename.startsWith('_')) {

                        fs.readFileSync(path.join(dirModP, filename), {encoding: 'utf8'}).split('\n').forEach(
                            line => {

                                if(line && line.startsWith('//') == false) {

                                    textsReplacers.push({
                                        r: line.slice(0, line.indexOf('",')),
                                        v: line
                                    });
                                }
                        });
                    } else {
                        textToAddInTextList += '\n' + fs.readFileSync(path.join(dirModP, filename), {encoding: 'utf8'});
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

            return newTextList + textToAddInTextList;
        },
        {
            init: {encoding: 'utf8'},
            new: {encoding: 'utf8'},
        }
    );

    if(cansaveconfig) config.save();

}

function addInitMods() {
    // Add initial mods
    if(fs.existsSync( path.join(__dirname, 'init-mods') )) {
        const initModsPath = path.join(__dirname, 'init-mods');

        duplicateFolder(initModsPath, path.join(globalVars.KFFolderPath, 'mods') ).then(
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