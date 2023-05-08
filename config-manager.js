const configFileLocation = './config.json';
const gameLocationFile = './game-location.txt';
//const gameVersionFile = './version.txt';

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
        configDatas['game-location'] = fs.readFileSync( gameLocationFile, {encoding: 'utf8'} ).replace(/\n/gs, '');

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


// Load the game .exe name if he was not already found :
if(configDatas.exename == null && configDatas.notLoaded == null) {
    
    try {
        
        let exeFiles = fs.readdirSync(configDatas['game-location']).filter( f => f.toLowerCase().endsWith('.exe') );

        if(exeFiles.length > 0) {

            if(exeFiles.length > 1) {
                exeFiles[0] = exeFiles.find(f =>f.slice(0,2).toUpperCase() == f.slice(0,2)) || exeFiles[0];
            }
            
            configDatas['exename'] = exeFiles[0];

        } else {
            throw 'no file with .exe extension in the game folder';
        }

    } catch (error) {
        console.error(error);
        console.log("error while searching the .exe game file");
        
        configDatas.notLoaded = 2;
    }
}

if(configDatas.notLoaded == null) {

    if(typeof(configDatas["user-preferences"]) != 'object') {
        configDatas["user-preferences"] = {
            background: null,
            themes: []
        };
    }


    let themes = configDatas['user-preferences'].themes;

    // Check if themes are an array :
    if(themes == null || typeof(themes) != 'object' || typeof(themes.forEach) != 'function') {

        // If not, set "themes" to an empty array
        themes = [];

        configDatas['user-preferences'].themes = [];
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