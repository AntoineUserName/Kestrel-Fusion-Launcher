


const projListPath = 'STUFF/BOLTTYPES.TXT';
const itemsListPath = 'LEVELS/BUILDER/BUILDERWEAPON/PLAYERITEMTYPES.TXT';


exports.updateItems = () => {
    
    const modManager = require('./mod-manager');
    const path = require('path');
    const config = require('./config-manager');
    const backupManager = require('./backup-manager');
    const fs = require('fs');

    backupManager.backupFile(projListPath);
    backupManager.backupFile(itemsListPath);


    let itemsEdits = [];
    let projEdits = [];
    
    modManager.getModsLoaded().forEach(
        mod => {
            if(!mod.addons.items) return;

            if(!config['activated-mods'].includes(mod.name)) return;

            const itemsFolder = path.join(modManager.modsFolder, mod.name, 'items');

            fs.readdirSync(itemsFolder).forEach(
                itemsFileName => {

                    if(path.extname(itemsFileName).toLowerCase() != '.txt') return;


                    // fs.readFileSync(path.join(itemsFolder, itemsFileName), {encoding: 'utf8'}).split('\n').forEach(
                    //     line => {

                    //         if(!line) return;
                    //         if(line.replace(/[^a-zA-Z0-9/]/g, '').startsWith('//')) return;

                    //         edits.
                    //     }
                    // );

                    let editsDatasStr = fs.readFileSync(path.join(itemsFolder, itemsFileName), {encoding: 'utf8'});

                    let iLetter = 0;

                    while (iLetter != -1) {

                        while(editsDatasStr[iLetter] == '\n' || editsDatasStr[iLetter] == '\r') {
                            iLetter++;
                        }
                        
                        let startStr = editsDatasStr.slice(iLetter, iLetter + 30);
                        
                        // console.log(iLetter, JSON.stringify(startStr));
                        

                        if(startStr.startsWith("add_item")) {

                            let endI = editsDatasStr.indexOf("\n}", iLetter);

                            if(endI != -1) {
                                itemsEdits.push(editsDatasStr.slice(iLetter, endI));
                                iLetter = endI;
                            } else {
                                itemsEdits.push(editsDatasStr.slice(iLetter));
                            }

                        } else if(startStr.startsWith("replace_item")) {

                            let endI = editsDatasStr.indexOf("\n}", iLetter);

                            if(endI != -1) {
                                itemsEdits.push(editsDatasStr.slice(iLetter, endI));
                                iLetter = endI;
                            } else {
                                itemsEdits.push(editsDatasStr.slice(iLetter));
                            }

                        } else if(startStr.startsWith("add_proj")) {
                            let endI = editsDatasStr.indexOf("\n}", iLetter);

                            if(endI != -1) {
                                projEdits.push(editsDatasStr.slice(iLetter, endI));
                                iLetter = endI;
                            } else {
                                projEdits.push(editsDatasStr.slice(iLetter));
                            }
                        } else if(startStr.startsWith("replace_proj")) {

                            // NEVER TAKE THE "\n   }" ONLY "\n}"
                            let endI = editsDatasStr.indexOf("\n}", iLetter);

                            if(endI != -1) {
                                projEdits.push(editsDatasStr.slice(iLetter, endI));
                                iLetter = endI;
                            } else {
                                projEdits.push(editsDatasStr.slice(iLetter));
                            }
                        }

                        // replace_proj with `name "paintball_gren"`:
                        
                        iLetter = editsDatasStr.indexOf("\n", iLetter+1);

                    }

                }
            );

        }
    );

    

    backupManager.loadBackupFile(itemsListPath, (fileDatas) => {
        
        fileDatas = fileDatas.toString('utf8');

        let index = itemsEdits.length;
        while (index > 0) {
            index--;
            let itemEdit = itemsEdits[index];

            let firstLineEndI = itemEdit.indexOf('\n');

            if(firstLineEndI != -1) {

                let contentLine = itemEdit.slice(firstLineEndI);

                if(contentLine.slice(-2) == '\n}') contentLine = contentLine.slice(0, -2);

                // console.log(JSON.stringify(itemEdit));
                

                if(itemEdit.startsWith('add_')) {

                    let itemName = itemEdit.slice(0, firstLineEndI);
                    let itemI = itemName.indexOf('"');
                    if(itemI == -1) itemI = itemName.indexOf(' ');

                    if(itemI == -1) {
                        itemName = 'error_item_id_badly_wrote';
                    } else {
                        itemName = itemName.slice(itemI+1);
                        itemI = itemName.indexOf('"');
                        if(itemI != -1) itemName = itemName.slice(0, itemI);
                    }

                    fileDatas += '\n\nitem_type "' + itemName + '"\n{';
                    fileDatas += contentLine;
                    fileDatas += '\n}\n\n';
                }
                else if(itemEdit.startsWith('replace_')) {

                    let replaceIStart = itemEdit.indexOf('`');

                    if(replaceIStart != -1) {
                        let replaceIEnd = itemEdit.indexOf('`', replaceIStart+1);

                        if(replaceIEnd != -1) {
                            
                            let strToReplace = itemEdit.slice(replaceIStart, replaceIEnd);

                            let strToReplaceI = fileDatas.indexOf(strToReplace);
                            
                            if(strToReplaceI != -1) {

                                strToReplaceI += strToReplace.length;

                                while (strToReplaceI > 0 && fileDatas[strToReplaceI] != ':') {
                                    strToReplaceI--;
                                }

                                strToReplaceI++;

                                let strToReplaceIEnd = fileDatas.indexOf('\n}', strToReplaceI);

                                if(strToReplaceIEnd != -1) {

                                    // if(itemEdit.slice(0, replaceIStart).includes('every')) {
                                    
                                    fileDatas = fileDatas.slice(0, strToReplaceI) + contentLine + fileDatas.slice(strToReplaceIEnd);
                                }

                            }

                        }

                    }

                }

            }

        }

        return fileDatas;
    }, {
        
        new: {encoding: 'utf8'},
        init: {encoding: 'utf8'}
    });
    
    backupManager.loadBackupFile(projListPath, (fileDatas) => {
        
        fileDatas = fileDatas.toString('utf8');

        let index = projEdits.length;
        while (index > 0) {
            index--;
            let itemEdit = projEdits[index];

            let firstLineEndI = itemEdit.indexOf('\n');

            if(firstLineEndI != -1) {

                let contentLine = itemEdit.slice(itemEdit.indexOf('\n'));

                if(contentLine.slice(-2) == '\n}') contentLine = contentLine.slice(0, -2);

                if(itemEdit.startsWith('add_')) {

                    fileDatas += '\n\n';
                    fileDatas += '\nbolttype_start';
                    fileDatas += contentLine;
                    fileDatas += '\nbolttype_end\n';

                }
                else if(itemEdit.startsWith('replace_')) {

                    let replaceIStart = itemEdit.indexOf('`');

                    if(replaceIStart != -1) {
                        let replaceIEnd = itemEdit.indexOf('`', replaceIStart+1);

                        if(replaceIEnd != -1) {
                            
                            let strToReplace = itemEdit.slice(replaceIStart, replaceIEnd);

                            let strToReplaceI = fileDatas.indexOf(strToReplace);
                            
                            if(strToReplaceI != -1) {

                                strToReplaceI += strToReplace.length;

                                while (strToReplaceI > 0 && fileDatas[strToReplaceI] != ':') {
                                    strToReplaceI--;
                                }

                                strToReplaceI++;

                                let strToReplaceIEnd = fileDatas.indexOf('\nbolttype_end', strToReplaceI);

                                if(strToReplaceIEnd != -1) {

                                    // if(itemEdit.slice(0, replaceIStart).includes('every')) {
                                    
                                    fileDatas = fileDatas.slice(0, strToReplaceI) + contentLine + fileDatas.slice(strToReplaceIEnd);
                                }

                            }

                        }

                    }

                }

            }

        }

        return fileDatas;
    }, {
        
        new: {encoding: 'utf8'},
        init: {encoding: 'utf8'}
    });
}

