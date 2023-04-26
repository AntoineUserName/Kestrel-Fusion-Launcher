const configFileLocation = './config.json';
const gameLocationFile = './game-location.txt';
const gameVersionFile = './version.txt';

const fs = require('fs');

let configDatas = {};



try {

    configDatas = JSON.parse(
        fs.readFileSync( configFileLocation, {encoding: 'utf8'} )
    );
    
} catch (error) {
    console.error(error);
    configDatas.notLoaded = 0;
}


// Load the game path :
if(configDatas.notLoaded == null) {
    
    try {
        // Load game location file :
        configDatas['game-location'] = fs.readFileSync( gameLocationFile, {encoding: 'utf8'} );

    } catch (error) {
        console.error(error);
        
        configDatas.notLoaded = 1;
    }
}


// Before there are version.txt file but now its unsed, the version variable is added in the check-config.js
// // Load the app version :
// if(configDatas.notLoaded == null) {
    
//     try {
//         // Load app version file :
//         configDatas['version'] = fs.readFileSync( gameVersionFile, {encoding: 'utf8'} );

//     } catch (error) {
//         console.error(error);
//         console.log("error while loading app version");
//         console.log("this isn't problematic but weird");

//         configDatas['version'] = 'unknown version';
//     }
// }


// Load the game .exe name :
if(configDatas.exename == null && configDatas.notLoaded == null) {
    
    try {
        
        let exeFile = fs.readdirSync(configDatas['game-location']).find( f => f.toLowerCase().endsWith('.exe') );

        if(exeFile) {
            configDatas['exename'] = exeFile;
        } else {
            throw 'no file with .exe extension in the game folder';
        }

    } catch (error) {
        console.error(error);
        console.log("error while searching the .exe game file");
        
        configDatas.notLoaded = 2;
    }
}


configDatas.save = () => {
    try {
        
        fs.writeFileSync( configFileLocation, JSON.stringify( configDatas ) );
        return true;

    } catch (error) {
        console.error(error);
        return false;
    }
}

module.exports = configDatas;