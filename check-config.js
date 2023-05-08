const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');

const config = require('./config-manager');

module.exports = (app) => {


    function showMDError(path) {
        
        childProcess.exec( JSON.stringify( path.join( __dirname, path + '.md' ) ) );
        console.log(config.notLoaded);
        let dateToStop = new Date().getTime() + 5000;
        while (new Date().getTime() < dateToStop) {}; // Wait 5 seconds and stop the app (i use a while because the next steps of the code will be executed)
        app.exit(0);
    }


    // If cant load config.json show error
    if(config.notLoaded != null) {
        
        let errorMsgFile = 'bad-game-location';

        switch (config.notLoaded) {
            case 0:
                errorMsgFile = 'bad-json';
                break;
                
            case 1:
                errorMsgFile = 'bad-game-location';
                break;
                
            case 2:
                errorMsgFile = 'exe-not-found';
                break;
        }

        showMDError('errors/' + errorMsgFile);
    }

    // Check if the game-location.txt return to the game files
    if( fs.existsSync(config['game-location']) == false ) {
        showMDError('errors/bad-game-location');
    }

    // Check if the user have extracted the game files by cheking if there are the "CHARS" folder
    if( fs.existsSync( path.join(config['game-location'], '/CHARS') ) == false ) {
        showMDError('README');
    }

    // Add the version of the app
    if(!config.version) config.version = app.getVersion();
}