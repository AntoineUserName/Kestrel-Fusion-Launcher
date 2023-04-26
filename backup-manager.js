const fs = require('fs');
const path = require('path');
const config = require('./config-manager');

const backupFilesLocation = path.join( __dirname + '/backup-files' );




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

function loadBackupFile(filegamepath, dataconstructor) {
    
    try {

        if(fs.existsSync( path.join( backupFilesLocation, filegamepath ) ) == false) return false;

        let backupToLoad = fs.readFileSync( path.join( backupFilesLocation, filegamepath ) );

        if(dataconstructor != null) {
            backupToLoad = dataconstructor(backupToLoad);
        }

        fs.mkdirSync( path.join( config['game-location'],
            path.dirname(filegamepath) // Get the dir path
        ) , { recursive: true }); // Write folder that not exist

        fs.writeFileSync(
            path.join( config['game-location'], filegamepath ),
            backupToLoad
        );

        backupToLoad = null;

        return true;

    } catch (error) {
        console.error(error);
        return false;
    }
}


function getBackupFile(filegamepath) {
    
    try {
        
        let dataToBackup = fs.readFileSync( path.join( config['game-location'], filegamepath ) );

        fs.writeFileSync(
            path.join( backupFilesLocation, filegamepath ),
            dataToBackup
        );

        dataToBackup = null;
        console.log('new file in backup');

        return true;

    } catch (error) {
        console.error(error);
        return false;
    }
}


// Default backups : (this is backup just when you open the app for the first time)
backupFile('/LEVELS/LEGO_CITY/LEGO_CITY/AI/SCRIPT.TXT');


exports.backupFile = backupFile;
exports.getBackupFile = getBackupFile;
exports.loadBackupFile = loadBackupFile;