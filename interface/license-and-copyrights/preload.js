const { contextBridge } = require('electron');
const { readFileSync } = require('fs');
const path = require('path');


contextBridge.exposeInMainWorld('electronAPI', {
    getLicense: () => readFileSync(path.join(__dirname, '../../LICENSE.md'), {encoding: 'utf8'}),
    getCopyrights: () => readFileSync(path.join(__dirname, '../../COPYRIGHTS.md'), {encoding: 'utf8'}),
    getOtherLicenses: () => readFileSync(path.join(__dirname, '../../OTHER-LICENSES.txt'), {encoding: 'utf8'}),
});