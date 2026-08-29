

exports.openWindow = () => {

    const {join} = require('path');
    
    const config = require('../../config-manager');

    /**
     * @type {Electron.BrowserWindow}
     */
    let win = new (require('electron').BrowserWindow)({
        
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true
        }
    });

    win.loadFile(join(__dirname, 'optimiser.html'));
    
    
    win.webContents.on('ipc-message', (ev, channel, ...args) => {

        if(channel == 'optimiser-init-start') {
            
            win.webContents.send('optimiser-init', config['game-location']);
        }

        if(channel == 'optimiser-opendir') {
            require('child_process').exec('explorer ' + JSON.stringify(args[0]).replace(/\\\\/g, '\\'));
        }

    });


};
