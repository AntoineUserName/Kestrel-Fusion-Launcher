const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const config = require('./config-manager');
const backupManager = require('./backup-manager');
const { exec } = require('child_process');

const modsFolder = path.join(__dirname, '/mods');
let modsLoaded = [];


exports.mainWindow = null; // This value is edited by the main.js

function loadMod(modpath) {

    try {
        let modInfos = JSON.parse(
            fs.readFileSync( path.join(modpath, '/mod.json') )
        );

        modInfos.name = path.basename( modpath );
        modInfos.addons = {
            SF: fs.existsSync(path.join(modpath, '/SF')),
            python: fs.existsSync(path.join(modpath, '/python')),
            js: fs.existsSync(path.join(modpath, '/js')),
            bat: fs.existsSync(path.join(modpath, '/bat')),
            ressourcePack: fs.existsSync(path.join(modpath, '/install'))
        }

        modsLoaded.push( modInfos );

        if(exports.mainWindow != null) exports.mainWindow.webContents.send('addMod', modInfos, config['activated-mods'].includes(modInfos.name));

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

    modsLoaded = [];

    let haveModNotLoaded = false;

    fs.readdirSync(modsFolder).forEach(
        folder => {
            if(loadMod( path.join(modsFolder, folder) ) == false) {
                haveModNotLoaded = true;
            }
        }
    )

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

    if(isactivated) {
        
        if(config['activated-mods'].includes( modname ) == false) {

            // Apply ressource pack mod files :
            if(modsLoaded[modToChange].addons.ressourcePack) {

                const dirModFiles = path.join( modsFolder, '/' + modname, '/install' );

                function rsrcPackFolderLoop(gamepath) {

                    // If the folder don't exist in the game create it
                    if(gamepath != '' && fs.existsSync( path.join(config['game-location'], gamepath) ) == false) {
                        fs.mkdirSync( path.join(config['game-location'], gamepath) );
                    }

                    const modFolderRealPath = path.join(dirModFiles, gamepath);

                    fs.readdirSync( modFolderRealPath ).forEach(
                        filename => {

                            // If its a folder
                            if(!filename.includes('.')) {

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
        config['activated-mods'] = config['activated-mods'].filter( m => m != modname );

        // Remove ressource pack mod files :
        if(modsLoaded[modToChange].addons.ressourcePack) {

            const dirModFiles = path.join( modsFolder, '/' + modname, '/install' );

            function rsrcPackFolderLoop(gamepath) {

                if(gamepath != '' && fs.existsSync( path.join(config['game-location'], gamepath) ) == false) return;

                const modFolderRealPath = path.join(dirModFiles, gamepath);

                fs.readdirSync( modFolderRealPath ).forEach(
                    filename => {

                        // If its a folder
                        if(!filename.includes('.')) {

                            rsrcPackFolderLoop( path.join(gamepath, '/' + filename) );

                            return;
                        }

                        const gamePathFile = path.join(gamepath, filename);

                        // Load the file
                        backupManager.loadBackupFile( gamePathFile );

                    }
                );
            }

            rsrcPackFolderLoop( '' );
        }
    }

    config.save();

}


function launchMods() {

    // ! warn : this method is activated when the game will be launched but for the files
    // into the "install" folder that are added to the game just go to this function : setModIsActivated


    // Be sure that every mods selecteds are loadeds
    config['activated-mods'] = config['activated-mods'].filter( modname => modsLoaded.find(m => m.name == modname) != null );


    let textToAdd = '\n; Modded scripts :';

    let codeToLaunchAfter = [];

    let indexSFFileNumber = 32;

    const levelsFocus = [
        '/LEVELS/LEGO_CITY/LEGO_CITY/AI/'
        // '/LEVELS/LEGO_CITY/LEGO_CITY/IS_SPACE_CENTRE/IS_SPACE_CENTRE_3322/AI/'
    ];


    // Apply changes by the mods (SF files, bat, js and python codes) :
    config['activated-mods'].forEach(modname => {
        
        let modInfos = modsLoaded.find(m => m.name == modname);

        // Apply .SF files
        if(modInfos.addons.SF) {
            const dirModP = path.join( modsFolder, '/' + modname + '/SF' );

            fs.readdirSync( dirModP ).forEach(
                filename => {
                    
                    const SFFileIndex = indexSFFileNumber;
                    indexSFFileNumber++;
    
                    // let SFFileName = 'MOD_' + filename.toUpperCase().replace(/-/g, '_');
                    let SFFileName = 'LEVEL' + SFFileIndex + '.SF';
    
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
    
    
                    textToAdd += '\n' + SFFileName.toLowerCase().split('.', 1)[0] + '	;	' + ( modInfos.name.replace(/\n/g, '').replace(/;/g, '') );
                }
            )
        }

        if(modInfos.addons.bat) {
            const dirModP = path.join( modsFolder, '/' + modname + '/bat' );

            fs.readdirSync( dirModP ).forEach(
                filename => {

                    if(path.extname(filename).toLowerCase() != "bat") return;

                    // If the script will be launched after
                    if(filename.startsWith('_')) {
                        codeToLaunchAfter.push(
                            JSON.stringify(path.join(dirModP, filename))
                        );
                        return;
                    }

                    exec(JSON.stringify(
                        path.join(dirModP, filename)
                    ));
                }
            )
        }
        

        if(modInfos.addons.js) {
            const dirModP = path.join( modsFolder, '/' + modname + '/js' );

            fs.readdirSync( dirModP ).forEach(
                filename => {

                    if(path.extname(filename).toLowerCase() != "js") return;

                    
                    // If the script will be launched after
                    if(filename.startsWith('_')) {
                        codeToLaunchAfter.push(
                            "node " + JSON.stringify(path.join(dirModP, filename))
                        );
                        return;
                    }

                    exec("node " + JSON.stringify(path.join(dirModP, filename)));

                }
            )
        }


        if(modInfos.addons.python) {
            const dirModP = path.join( modsFolder, '/' + modname + '/python' );

            fs.readdirSync( dirModP ).forEach(
                filename => {

                    if(path.extname(filename).toLowerCase() != "py") return;

                    // If the script will be launched after
                    if(filename.startsWith('_')) {
                        codeToLaunchAfter.push(
                            "python " + JSON.stringify(path.join(dirModP, filename))
                        );
                        return;
                    }

                    exec("python " + JSON.stringify(path.join(dirModP, filename)));
                }
            )
        }
    });

    levelsFocus.forEach(
        levelpath => {

            backupManager.loadBackupFile(
               path.join(levelpath, 'SCRIPT.TXT'),
               backupToLoad => backupToLoad + textToAdd
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
            fs.mkdirSync(destinationDir);
        }
        
        fsExtra.copy(sourceDir, destinationDir, function(error) {
            if (error) {
                console.error(error);
                reject()
            } else {
                resolve();
            }
        });

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

            return true;

        } catch (error) {
            console.error(error);
            
            return false;
        }
    }

    // If the mod add files, first try to load backup files and after remove the mod
    if(mod.addons.ressourcePack) {
        setModIsActivated(mod.name, false);

        setTimeout(() => { // Its not obligatory but its just to be sure that the mod are deleted after that here are disabled
            removeTheMod();
        }, 250);

        return;
    }
    
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

exports.addNewMod = addNewMod;
exports.loadAllMods = loadAllMods;
exports.loadMod = loadMod;
exports.removeMod = removeMod;
exports.setModIsActivated = setModIsActivated;
exports.launchMods = launchMods;
exports.getModsLoaded = () => modsLoaded;
exports.modsFolder = modsFolder;