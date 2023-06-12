const fs = require('fs');
const path = require('path');
const config = require('./config-manager');
const { KFFolderPath } = require('./global-variables');


// const backupFilesLocation = path.join( __dirname, '/backup-files' );
const backupFilesLocation = path.join( KFFolderPath, '/backup-files' );

if( fs.existsSync(backupFilesLocation) == false ) fs.mkdirSync( backupFilesLocation );


function backupFile(filegamepath) {
    
    try {

        if(fs.existsSync(
            path.join( backupFilesLocation, filegamepath )
        )) return true;

        let dataToBackup = fs.readFileSync( path.join( config['game-location'], filegamepath ) );

        fs.mkdirSync( path.join( backupFilesLocation,
            path.dirname(filegamepath) // Get the dir path
        ) , { recursive: true }); // Write folder that not exist

        fs.writeFileSync(
            path.join( backupFilesLocation, filegamepath ),
            dataToBackup
        );

        dataToBackup = null;

        return true;

    } catch (error) {
        console.error(error);
        return false;
    }
}


function loadBackupFile(filegamepath, dataconstructor, fileoptions) {
    
    if(fileoptions == null) fileoptions = {
        init: null,
        new: null
    }

    try {

        if(fs.existsSync( path.join( backupFilesLocation, filegamepath ) ) == false) return false;

        let backupToLoad = fs.readFileSync( path.join( backupFilesLocation, filegamepath ), fileoptions.init );

        if(dataconstructor != null) {
            backupToLoad = dataconstructor(backupToLoad);
        }

        fs.mkdirSync( path.join( config['game-location'],
            path.dirname(filegamepath) // Get the dir path
        ) , { recursive: true }); // Write folder that not exist

        fs.writeFileSync(
            path.join( config['game-location'], filegamepath ),
            backupToLoad,
            fileoptions.new
        );

        backupToLoad = null;

        return true;

    } catch (error) {
        console.error(error);
        return false;
    }
}


function getBackupFile(filegamepath, fileoptions) {
    
    try {
        
        return fs.readFileSync( path.join( backupFilesLocation, filegamepath ), fileoptions );

    } catch (error) {
        console.error(error);
        
        return null;
    }
}





exports.backupFile = backupFile;
exports.getBackupFile = getBackupFile;
exports.loadBackupFile = loadBackupFile;