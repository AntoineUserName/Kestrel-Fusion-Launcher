const { contextBridge, ipcRenderer } = require('electron');

let config;


const idCommunicationWindow = 'SETTINGS_EDITOR_W';


let editableSettings = [
    {
        name: 'closing the app after that the game is launched',
        id: 'close-after-game-launched',
        type: 'boolean',
        input: null
    },
    {
        name: 'launch the game with the console',
        id: 'open-in-cmd',
        type: 'boolean',
        input: null
    },
    {
        name: 'don\'t launch the game',
        id: 'not-launch-game',
        type: 'boolean',
        input: null
    },
    {
        name: 'close the app after launched the game',
        id: "close-after-game-launched",
        type: 'boolean',
        input: null
    }
]



ipcRenderer.on('configManager', (ev, newConfigM) => {
    console.log('received config manager');
    config = newConfigM;

    const parentForSettings = document.querySelector('#settings-container');

    parentForSettings.innerHTML = '';

    function addSetting(settingname, settingid, settingtype) {

        let el = document.createElement('div');

        el.className = 'setting-box';

        el.innerHTML = '<label></label>';
        el.querySelector('label').innerText = settingname;

        let input = document.createElement('input');

        switch (settingtype) {
            case 'boolean':
                input.type = 'checkbox';
                input.checked = config[settingid] == true;
                break;
                
            case 'string':
                input.type = 'text';
                input.value = config[settingid];
                break;
        
            default:
                input.type = 'text';
                input.value = config[settingid];
                break;
        }

        el.appendChild(input);

        parentForSettings.appendChild(el);

        return input;
    }

    editableSettings.forEach(
        setting => setting.input = addSetting(setting.name, setting.id, setting.type)
    );

});


contextBridge.exposeInMainWorld('electronAPI', {

    cancelChanges: () => {
        setTimeout(() => {
            ipcRenderer.send(idCommunicationWindow + 'cancel');
        }, 230);
    },
    save: () => {

        let editedConfigAttrs = {};

        editableSettings.forEach(
            setting => {
                editedConfigAttrs[setting.id] = setting.type == 'boolean' ? setting.input.checked : setting.input.value;
            }
        );

        ipcRenderer.send(idCommunicationWindow + 'save', editedConfigAttrs);
    }
});