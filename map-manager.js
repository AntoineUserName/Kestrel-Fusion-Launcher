const config = require('./config-manager');


const fs = require('fs');
const path = require('path');

function buffToLEInt(buffer) {
    return buffer.readUIntLE(0, 4);
}

function buffToLEFloat(buffer) {
    return buffer.readFloatLE(0);
}

const objectsList = {

    // The values needs to be in upper-case /!\

    'Coin_Gold_1':   '67000000',
    'Coin_Gold_2':   '67000002',
    'Coin_Silver_1': '73000000',
    'Coin_Silver_2': '73000002',
    'Coin_Blue_1':   '6a000000',
    'Coin_Blue_2':   '50000000',
    'Coin_Blue_3':   '62000000',
    'Coin_Purple':   '70000000',
    'Shield_TL':     '77850000',
    'Shield_TR':     '78850000',
    'Token_1':       '7A000000',
    'Token_2':       '7A000400',
    'Token_3':       '7A010000',
    'Brick_Red':     '72000000',

};


function getObjectNameWithId(hex) {

    hex = (hex+'').toUpperCase();

    for (const key in objectsList) {
        if(objectsList[key] == hex) {
            hex = key;
            break;
        }
    }

    return hex;
}

// Function: Parse and print entries from a file
function logEntries(filePath) {
    const buffer = fs.readFileSync(filePath);
    
    const index = buffer.indexOf(
        Buffer.from("47697a6d6f5069636b7570", "hex")
    );
    if (index === -1) {
        console.log("cannot log entries header not found");
        return;
    }

    const numEntries = buffToLEInt(buffer.subarray(index + 19, index + 23));
    let curPos = index + 51;

    for (let i = 0; i < numEntries; i++) {
        

        const typeHex = buffer.subarray(curPos, curPos + 4).toString("hex");
        const type = getObjectNameWithId(typeHex);
        curPos += 10;

        const strLen = buffer[curPos];
        const name = buffer.subarray(curPos + 1, curPos + strLen).toString();
        curPos += strLen + 1;

        const x = buffToLEFloat(buffer.subarray(curPos, curPos + 4));
        curPos += 4;
        const y = buffToLEFloat(buffer.subarray(curPos, curPos + 4));
        curPos += 4;
        const z = buffToLEFloat(buffer.subarray(curPos, curPos + 4));
        curPos += 14;

        console.log(`Entry ${i + 1}: TYPE(${type}) NAME(${name}) X(${x}) Y(${y}) Z(${z})`);
    }
}

/**
 * 
 * @param {String} filePath 
 * @param {Array} newCoins 
 * @param {Array} coinsToRemove 
 * @param {Array} newObjects 
 * @param {Array} objectsToRemove doesn't affect the added objects, can remove initial objects with their name 
 * @param {[String]} objectsNames doesn't affect the added objects, can remove initial objects with their name 
 */
function editMapFile(filePath, newCoins, coinsToRemove = [], newObjects = [], objectsToRemove = [], objectsNames = [], objectImports = []) {

    // Actually the objectsToRemove does nothing
    

    if(objectsNames.length > 0) {

        

        let namesFilePath = path.join( path.dirname(filePath), "GIZMONAMES.TXT" );

        if(!fs.existsSync(namesFilePath)) {
            fs.writeFileSync(namesFilePath, '');
        }

        

        let namesFilePathSecond = path.normalize(namesFilePath).replace(path.normalize(config['game-location']), '');
        require('./backup-manager').backupFile(namesFilePathSecond);

        require('./backup-manager').loadBackupFile(namesFilePathSecond);

        let namesFileDatas = fs.readFileSync(namesFilePath, 'utf8');

        objectsNames.forEach(
            customNameObj => {

                if(customNameObj[0] == "/") {

                    if(customNameObj.startsWith('REPLACE:')) {
                        customNameObj = customNameObj.slice('REPLACE:'.length);
                        while (customNameObj[0] == ' ') {
                            customNameObj = customNameObj.slice(1);
                        }
                        let indexBY = customNameObj.indexOf('/BY:');

                        let replaceSTR = '';

                        if(indexBY != -1) {
                            replaceSTR = customNameObj.slice(indexBY + '/BY:'.length);


                            while (namesFileDatas[indexBY - 1] == ' ' && indexBY > 1) {
                                indexBY -= 1;
                            }
                        } else {
                            indexBY = undefined;
                        }

                        namesFileDatas = namesFileDatas.replace(customNameObj.slice(0, indexBY), replaceSTR);
                    }

                } else {
                    namesFileDatas += '\n' + customNameObj;
                }

            }
        );

        
        fs.writeFileSync(namesFilePath, namesFileDatas, 'utf8');
    }

    
    

    let namesFilePath = path.join( path.dirname(filePath), "LE" + "GO" + "SETS.TXT" );

    if(!fs.existsSync(namesFilePath)) {
        fs.writeFileSync(namesFilePath, '');
    }

    

    let namesFilePathSecond = path.normalize(namesFilePath).replace(path.normalize(config['game-location']), '');
    require('./backup-manager').backupFile(namesFilePathSecond);

    require('./backup-manager').loadBackupFile(namesFilePathSecond);

    if(objectImports.length > 0) {

        
        let namesFileDatas = '\n' + fs.readFileSync(namesFilePath, 'utf8') + '\n';

        objectImports.forEach(
            customNameObj => {

                if(customNameObj[0] == "/" && customNameObj[1] == "/") {
                    // its a comment
                }
                else if(customNameObj[0] == ">") {

                    if(customNameObj.startsWith('REPLACE:')) {
                        customNameObj = customNameObj.slice('REPLACE:'.length);
                        while (customNameObj[0] == ' ') {
                            customNameObj = customNameObj.slice(1);
                        }
                        let indexBY = customNameObj.indexOf('/BY:');

                        let replaceSTR = '';

                        if(indexBY != -1) {
                            replaceSTR = customNameObj.slice(indexBY + '/BY:'.length);


                            while (namesFileDatas[indexBY - 1] == ' ' && indexBY > 1) {
                                indexBY -= 1;
                            }
                        } else {
                            indexBY = undefined;
                        }

                        namesFileDatas = namesFileDatas.replace(customNameObj.slice(0, indexBY), replaceSTR);
                    }

                }
                else {
                    
                    let importLine;

                    if (customNameObj.startsWith('Builder_')) {
                        importLine = 'Level "' + customNameObj + '"';
                    } else {
                        importLine = customNameObj;
                    }

                    importLine = importLine + '\n';

                    if(!namesFileDatas.includes('\n' + importLine)) {
                        namesFileDatas += importLine;
                    }

                }

            }
        );

        namesFileDatas += '\n';
        
        fs.writeFileSync(namesFilePath, namesFileDatas, 'utf8');
    }

    // TODO CHECK IT DONT GIVE A BROKE BUFFER

    let buffer = fs.readFileSync(filePath);


    // Objects:

    let objectsStartIndex = -1;

    let tries = 3;

    while (tries > 0) {
        tries--;

        let betterObsIndex;

        betterObsIndex = buffer.indexOf(
            Buffer.from("0C47697A4F62737461636C65", "hex"), objectsStartIndex + 1
        );

        
        if(betterObsIndex == -1) {
            betterObsIndex = buffer.indexOf(
                Buffer.from("0D436F6D706C657847697A6D6F", "hex"), objectsStartIndex + 1
            );
        }

        // if(betterObsIndex == -1) {
        //     betterObsIndex = buffer.indexOf(
        //         Buffer.from("GIZSIMPLEPROPOBJECT", "utf8"), objectsStartIndex + 1
        //     );
        // }

        if(betterObsIndex != -1) objectsStartIndex = betterObsIndex;

    }


    if(objectsStartIndex != -1) {
        
        let offsetStr = Buffer.from("00", "hex")[0];
        while (buffer[objectsStartIndex - 1] != offsetStr || buffer[objectsStartIndex - 2] != offsetStr || buffer[objectsStartIndex - 3] != offsetStr) {
            
            objectsStartIndex--;

            // console.log(buffer[objectsStartIndex]);
            // console.log(
            //     buffer.subarray(objectsStartIndex, objectsStartIndex+1).toString('hex')
            // );
            
            

            if(objectsStartIndex < 5) {
                break;
            }

        }

        if(objectsStartIndex > 5) {

            let autoNameIndex = 1;

            while (newObjects.length > 0) {
                let obj = newObjects.pop();

                if(obj.hexLine) {

                    
                    buffer = Buffer.concat([
                        buffer.subarray(0, objectsStartIndex),
                        Buffer.from(obj.hexLine+'', 'hex'),
                        buffer.subarray(objectsStartIndex, buffer.length),
                    ]);

                } else {

                    let objName = obj.name;
                    if(objName) {
                        objName += '';
                    } else {
                        objName = 'AutoName' + autoNameIndex;
                        autoNameIndex++;
                    }

                    let objId = obj.type+'';

                    let objClass = obj.class;

                    if(obj.breakable || objClass == 'simple') objClass = 'GIZSIMPLEPROPOBJECT';
                    if(objClass == "complex") objClass = "ComplexGizmo";

                    if(objClass == "GIZSIMPLEPROPOBJECT" && obj.endLine == null) obj.endLine = '000000000000000000000B0000003200000000000000000000';
                    
                    let gtype;
                    if(objClass && objClass.charAt) {
                        if(objClass[0] == "#") {
                            gtype = objClass.slice(1);
                        } else {
                            let nameS = Buffer.alloc(1);
                            nameS.writeUInt8(objClass.length+1, 0);
                            gtype = '00' + nameS.toString('hex') + Buffer.from(objClass, 'utf8').toString('hex') + '00';
                        }
                    } else {
                        gtype = '000C' + '47697A4F62737461636C65' + '00';
                    }
    
                    let pos = obj.pos;
                    
                    let nameLengthBuff = Buffer.alloc(1);
                    // nameLengthBuff.writeUInt8(objName.length + 2, 0);
                    nameLengthBuff.writeUInt8(objName.length + 1, 0);
    
                    let idSizeBuff = Buffer.alloc(1);
                    idSizeBuff.writeUInt8(objId.length + 1, 0);
    
                    let posBuff = Buffer.alloc(12);
                    posBuff.writeFloatLE(pos[0],0);
                    posBuff.writeFloatLE(pos[1],4);
                    posBuff.writeFloatLE(pos[2],8);

                    let endBuff = Buffer.from(obj.endLine || "00200000000000000000160000002F00000005000000000000A041000000000000000000", "hex");

                    if(obj.rotY != null) {
                        // if(endBuff.length > 2) {
                        //     // endBuff.writeInt16LE((((parseInt(obj.rotY)||0) / 360) * 65535), 1);
                        //     endBuff.writeInt16LE((parseInt(obj.rotY)||0), 1);
                        // }
                        // console.log(endBuff.length);
                        
                        if(endBuff.length > 3) {
                            // endBuff.writeUInt16LE(parseInt(((parseInt(obj.rotY)||0) / 360) * 65535)||0, 1);
                            endBuff.writeInt16LE((parseInt(obj.rotY)||0), 1);
                            
                            // endBuff.writeInt16LE((parseInt(obj.rotY)||0), 0); nope
                        }
                    }
                    if(obj.rotX != null) {
                        if(endBuff.length > 4) {
                            // endBuff.writeInt16LE(parseInt(((obj.rotX||0) / 360) * 65535), 1);
                            endBuff.writeInt16LE(parseInt((obj.rotX||0)), 3);
                        }
                    }
    
                    let objEntry = Buffer.concat([
                        nameLengthBuff,
                        Buffer.from(objName, 'utf8'),
                        Buffer.from(gtype, "hex"),
                        idSizeBuff,
                        Buffer.from(objId, 'utf8'),
                        Buffer.from("00", "hex"),
    
                        posBuff,
                        
                        // there is yaw and pitch in that:
                        endBuff
                    ]);
                    
                    buffer = Buffer.concat([
                        buffer.subarray(0, objectsStartIndex),
                        objEntry,
                        buffer.subarray(objectsStartIndex, buffer.length),
                    ]);
                }



            }
        } else {
            console.log("error obj start header index: " + objectsStartIndex);
            
        }

    } else {

        if(newObjects.length > 0) {
            
            require('electron').dialog.showMessageBox({
                title: 'MapManager problem',
                message: 'Problem: cannot add objects in this file, cannot find objects header index\nFile: ' + filePath
            });

        }

    }


    // buffer = Buffer.concat();


    // Coins:
    
    const headerIndex = buffer.indexOf(
        Buffer.from("47697a6d6f5069636b7570", "hex")
    );
    if (headerIndex === -1) {


        if(coinsToRemove.length > 0 || newCoins.length > 0) {
            
            require('electron').dialog.showMessageBox({
                title: 'MapManager problem',
                message: 'Problem: cannot add coins in this file, cannot find coins header index\nFile: ' + filePath
            });
        }
        
        fs.writeFileSync(filePath, buffer);

        console.log("header not found for coins");
        return;
    }


    const numEntries = buffToLEInt(buffer.subarray(headerIndex + 19, headerIndex + 23));
    
    let finalNumberOfEntries = numEntries + newCoins.length;


    
    let initEntriesOffset = headerIndex + 51;


    // Remove some objects with their name
    
    if(coinsToRemove.length > 0) {
        let curPos = initEntriesOffset;
        for (let i = 0; i < numEntries; i++) {
            
            let objectFirstPos = curPos;

            // const typeHex = buffer.subarray(curPos, curPos + 4).toString("hex");
            // const type = getObjectNameWithId(typeHex);
            curPos += 10;

            const strLen = buffer[curPos];
            const name = buffer.subarray(curPos + 1, curPos + strLen).toString();
            curPos += strLen + 1;

            // const x = buffToLEFloat(buffer.subarray(curPos, curPos + 4));
            curPos += 4;
            // const y = buffToLEFloat(buffer.subarray(curPos, curPos + 4));
            curPos += 4;
            // const z = buffToLEFloat(buffer.subarray(curPos, curPos + 4));
            curPos += 14;

            if(coinsToRemove.includes(name)) {
                // remove this part: (objectFirstPos, curPos - 1);
                buffer = Buffer.concat([buffer.subarray(0, objectFirstPos), buffer.subarray(curPos)]);
                curPos = objectFirstPos; // for not miss other objects because the buffer changed

                coinsToRemove = coinsToRemove.filter(nametoremove => nametoremove != name);

                finalNumberOfEntries -= 1;
            }
            
        }
        
        if(coinsToRemove.length > 0) {
            require('electron').dialog.showMessageBox(
                {
                    title: 'MapManager problem',
                    message: "Some objects wanted to be remove are not found: " + coinsToRemove.map(objName => JSON.stringify(objName+'')).join(", ")
                }
            );
        }
    }


    
    // Edit number of coins:
    buffer.writeUintLE(finalNumberOfEntries, headerIndex + 19, 4);


    let buffersToMix = [buffer.subarray(0, initEntriesOffset)];

    

    while(newCoins.length > 0) {

        let objectDatas = newCoins.pop();

        if(objectDatas.hexLine) { // syntaxe: "00 1A 2B 3C 4D 5E"

            
            // ''.split("").map()

            buffersToMix.push(
                Buffer.from(objectDatas.hexLine.split(" ").map(hexval => {
                    if(hexval) {
                        let newval = parseInt(hexval, 16);
                        if(Number.isNaN(newval)) {
                            throw "Wrong hex value for a object entry: " + JSON.stringify(hexval);
                        }
                        return newval || 0;
                    }
                }))
            );

        } else {

            let {type, name, pos} = objectDatas;

            type = objectsList[type] || type;

            let x = pos[0];
            let y = pos[1];
            let z = pos[2];
            
            // Creating a new entry that contain datas of the new object

            const nameBuffer = Buffer.from(name, 'utf8');
            const nameLength = nameBuffer.length + 1;

            // without the +3:
            // Collect (normal)
            // lect (after)

            // PEU ETRE QUE CA MARCHE : A TESTER LES 2
            // const entry = Buffer.alloc(32 + nameLength);
            const entry = Buffer.alloc(30 + 3 + nameLength);
            // const entry = Buffer.alloc(34 + nameLength);
            let offset = 0;

            // BAD, SKIPPED BYTES
            // // Type (4 bytes)
            // entry.write(typeHex, offset, 4, 'hex'); offset += 10;

            entry.write(type, offset, 4, 'hex');
            offset += 4;

            // Write 6 zero bytes as padding (mimicking unknown data)
            entry.fill(0, offset, offset + 6);
            offset += 6;


            // Name string length and name (1 byte length + string)
            entry.writeUInt8(nameLength, offset); offset += 1;
            nameBuffer.copy(entry, offset); offset += nameBuffer.length;
            entry.writeUInt8(0, offset); offset += 1; // Null terminator

            // X, Y, Z positions
            entry.writeFloatLE(x, offset); offset += 4;
            entry.writeFloatLE(y, offset); offset += 4;
            // entry.writeFloatLE(z, offset); offset += 4;
            entry.writeFloatLE(z, offset);
            

            // normally its already fill of 0
            // entry.fill(0, offset, offset + 10); offset += 10;

            // crash
            // when use 32 at the start:  error: It must be >= 0 && <= 43. Received 44
            // finally its not usefull i think
            // entry.fill(0, offset, offset + 10); offset += 10;

            // need to put 10 bytes at the end

            // useless
            // // Padding / entry footer
            // offset += 10;

            // // Append the new entry
            
            // fs.appendFileSync(filePath, entry);


            // push all the new entries here
            buffersToMix.push( entry );

        }

    }
    
    

    buffersToMix.push(
        buffer.subarray(initEntriesOffset, buffer.length)
    );

    let finalBuffer = Buffer.concat( buffersToMix );
    

    fs.writeFileSync(filePath, finalBuffer);
}

// everytime a mod with object adding feature is toogled
function updateMods() {

    let l = ('l' + String.fromCharCode(101)).toUpperCase() + "G" + String.fromCharCode(79) + "_CI" + ("TY");
    let mainWorldFilePath = "LEVELS/" + l + '/' + l + '/' + l + '.G' + 'IZ';

    // MAYBE SHOULD EDIT A FILE IN LEVELS/BUILDERS
    
    if(require("./backup-manager").backupFile(mainWorldFilePath) == false) {
        throw "CANNOT BACKUP FILE AT " + JSON.stringify(mainWorldFilePath);
        return;
    }

    require('./backup-manager').loadBackupFile(mainWorldFilePath);

    let cityNewObjects = [];
    let cityObjectsToRemove = [];
    let cityObjectsNames = [];

    let cityNewCoins = [];
    let cityCoinsToRemove = [];

    let cityImports = [];

    let otherGroups = [];

    const folderPath = require("./mod-manager").modsFolder;

    require("./mod-manager").getModsLoaded().forEach(
        modDatas => {
            if(!modDatas.addons.map) return;
            

            let folderOfModMap = path.join(folderPath, modDatas.name, 'map');
            fs.readdirSync(folderOfModMap).forEach(
                fileNameMap => {
                    if(!fileNameMap.toLowerCase().endsWith(".json")) return;

                    let mapDatas;

                    try {
                        
                        mapDatas = JSON.parse(
                            fs.readFileSync(path.join(folderOfModMap, fileNameMap), 'utf8')
                        );
                    } catch (error) {
                        console.error(error);
                        require('electron').dialog.showErrorBox("Error MapManager", "JSON badly wrote at " + JSON.stringify(path.join(folderOfModMap, fileNameMap)));
                        return;
                    }

                    if(config['activated-mods'].includes(modDatas.name)) {
                        
                        
                        if(mapDatas.cityCoins) {
                            mapDatas.cityCoins.forEach(el => cityNewCoins.push(el));
                        }
                        
                        if(mapDatas.cityCoinsToRemove) {
                            mapDatas.cityCoinsToRemove.forEach(el => cityCoinsToRemove.push(el));
                        }


                        if(mapDatas.cityObjects) {
                            mapDatas.cityObjects.forEach(el => cityNewObjects.push(el));
                        }
                        if(mapDatas.removeCityObjects) {
                            mapDatas.removeCityObjects.forEach(el => cityObjectsToRemove.push(el));
                        }

                        if(mapDatas.cityObjectsNames) {
                            mapDatas.cityObjectsNames.forEach(el => cityObjectsNames.push(el));
                        }
                        
                        if(mapDatas.cityImports) {
                            mapDatas.cityImports.forEach(el => cityImports.push(el));
                        }
                        
                    }


                    if(mapDatas.otherObjects) {
                        mapDatas.otherObjects.forEach(
                            groupMap => {

                                if(!groupMap) return;

                                if(groupMap.cancelled) return;
                                
                                let group = otherGroups.find(group => group.path == groupMap.path);

                                if(!group) {
                                    group = {
                                        path: groupMap.path,
                                        newCoins: [],
                                        removeCoins: [],
                                        newObjects: [],
                                        removeObjects: [],
                                        objectsNames: [],
                                        imports: []
                                    };
                                    otherGroups.push(group);
                                }

                                if(config['activated-mods'].includes(modDatas.name)) {
                                    

                                    if(groupMap.newCoins) {
                                        groupMap.newCoins.forEach(el => group.newCoins.push(el));
                                    }
                                    if(groupMap.removeCoins) {
                                        groupMap.removeCoins.forEach(el => group.removeCoins.push(el));
                                    }

                                    if(groupMap.newObjects) {
                                        groupMap.newObjects.forEach(el => group.newObjects.push(el));
                                    }
                                    
                                    if(groupMap.removeObjects) {
                                        groupMap.removeObjects.forEach(el => group.removeObjects.push(el));
                                    }
                                    
                                    if(groupMap.objectsNames) {
                                        groupMap.objectsNames.forEach(el => group.objectsNames.push(el));
                                    }
                                    
                                    if(groupMap.imports) {
                                        groupMap.imports.forEach(el => group.imports.push(el));
                                    }
                                }


                            }
                        );
                    }

                }
            );

        }
    );

    let gamePath = config["game-location"];

    let mainFileFinalPath = path.join(path.join(gamePath, mainWorldFilePath));

    console.log("editing: " + mainFileFinalPath);
    editMapFile(mainFileFinalPath, cityNewCoins, cityCoinsToRemove, cityNewObjects, cityObjectsToRemove, cityObjectsNames, cityImports);

    if(config.mapManager_log_entries) {
        logEntries(mainFileFinalPath);
    }


    otherGroups.forEach(
        group => {

            let levelPath = group.path+'';

            if(levelPath.startsWith("_city")) levelPath = levelPath.replace('_city', mainWorldFilePath);

            if(path.extname(levelPath).toLowerCase() == ".exe" || (path.join(gamePath, levelPath).normalize()).startsWith(path.normalize(gamePath)) == false) {
                require('electron').dialog.showErrorBox("Error MapManager", "File path not looking in a right file");
                return;
            }

            if(require("./backup-manager").backupFile(levelPath) == false) {
                require('electron').dialog.showErrorBox("Error MapManager", "Cannot add object: File not found at " + JSON.stringify(levelPath));
                console.log(JSON.stringify(levelPath));
                return;
            }

            require('./backup-manager').loadBackupFile(levelPath);

            levelPath = path.join(gamePath, levelPath);

            if(config.mapManager_log_entries) {
                console.log("before:");
                logEntries(levelPath);
            }
            console.log('editing ' + levelPath + " adding " + group.newObjects.length + " entries");
            editMapFile(levelPath, group.newCoins, group.removeCoins, group.newObjects, group.removeObjects, group.objectsNames, group.imports);
            if(config.mapManager_log_entries) {
                console.log("after:");
                logEntries(levelPath);
            }

        }
    );

}





// Export functions if used in other modules
module.exports = {
    logEntries,
    editMapFile,
    updateMods
};




// ("modfolder/MAP");

// ({
//     cityObjects: [

//         {
//             type: '',
//             name: '',
//             pos: []
//         }
//     ],

//     removeCityObjects: [
//         "name"
//     ],

//     otherObjects: [
//         {
//             path: "/blabla/blabla/blabla.giz",
//             newObjects: [
//                 {
//                     type: '',
//                     class: '',
//                     pos: [2, 5.5, 3],
//                     rotY: 0,
//                     rotX: 0
//                     // if no name a random unique name is generated automaticly
//                     // name: 'object1'
//                 }
//             ],
//             // removeObjects: [
//             //     'name'
//             // ]
//             // new other features..
//         }
//     ]
// });


