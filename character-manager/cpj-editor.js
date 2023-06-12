const fs = require('fs');
const path = require('path');
const backupManager = require('../backup-manager');
const config = require('../config-manager');


exports.customCharacterCategorieId = "";

const fileConfig = {
    encoding: 'hex'
};
const whereToAddThisLine = 81145 * 2 - 2;


const cpjFileGamePath = 'CHARS/LEG' + 'OCITY_GENERIC.CPJ';



function toHexStr(initstr) {
    return Buffer.from(initstr, 'utf-8').toString('hex');
}
function toUTFStr(initstr) {
    return Buffer.from(initstr, 'hex').toString('utf8');
}


function toCamecaseString(initstring, separator) {
    initstring = initstring.toLowerCase();

    if(!separator) return initstring.replace(initstring[0], initstring[0].toUpperCase());

    let strArr = initstring.split(separator);

    initstring = '';

    strArr.forEach(
        word => initstring += separator + word[0].toUpperCase() + word.slice(1)
    );
    
    if(initstring[0] == separator) initstring = initstring.replace(separator, '');

    return initstring;
}


/**
 * Generate new cpj character list
 * @example
 * generateNewFile('/folder/file.cpj', [{charPathId: 'Char_Name', charId: 'Name'}])
 * @param {Array} newcharacters 
 */
function generateNewFile(newcharacters) {

    let finallyAddedChars = [];

    let newFileDatas = backupManager.getBackupFile(cpjFileGamePath, fileConfig).toString('utf8');

    let lineToAdd = '';
    
    let unusedCharLines = getCharUnusedSlots(newFileDatas);

    console.log('----- Unused slots : -----');
    console.log(
        unusedCharLines
    );
    
    let totalCharactersSlotUnused = 0;
    unusedCharLines.forEach( l => {
        totalCharactersSlotUnused += l.count - 1;
    })
    console.log( totalCharactersSlotUnused + ' character slots unused' );

    newcharacters.forEach(char => {
        
        // 2 methods to add a character :
        
        const method1 = ()=>{ // 1 : replace another existing unused line :

            let charPathId = toCamecaseString(char.id);
            let charId = toCamecaseString(char.id);

            // charPathId = charPathId.toUpperCase();
            // charId = charId.toUpperCase();
            
            //let pathChar = Buffer.from(`Minifigs\\${exports.customCharacterCategorieId}\\${charPathId}\\`, 'utf-8').toString('hex') + '0000000000'; // 5 '00'
            
            // The custom char path :
            // let pathChar = `Minifigs\\${exports.customCharacterCategorieId}\\${charPathId}\\`;
            let pathChar = `Minifigs\\${exports.customCharacterCategorieId}\\`;


            // This line search an unused char line that is more longer than the custom path
            const charLineToChange = unusedCharLines.find(l => l.count > 1 && (
                (
                    'Minifigs'
                    + (l.value
                    .split('Minifigs', 2)[1].split(l.id, 1)[0].slice(0, -5))
                ).length >= pathChar.length && l.id.length >= charId.length
            ));
            if(charLineToChange == null) return false;

            charLineToChange.count--;

            let pathToEditIndex = newFileDatas.indexOf(toHexStr(charLineToChange.value));

            let pathToEdit = (
                'Minifigs'
                + charLineToChange.value
                .split('Minifigs', 2)[1].split(charLineToChange.id, 1)[0].slice(0, -5)
            );
            
            pathToEditIndex += charLineToChange.value.indexOf(pathToEdit) * 2; // to convert the txt length you just need to multiple the length by 2

            console.log(pathToEdit);

            pathChar = toHexStr(pathChar);
            pathToEdit = toHexStr(pathToEdit);

            while(pathChar.length < pathToEdit.length) {
                pathChar += '00';
            }

            charId = toHexStr(charId);
            charLineToChange.id = toHexStr(charLineToChange.id);
            while(charId.length < charLineToChange.id.length) {
                charId += '00';
            }

            // exports.customCharacterCategorieId = toCamecaseString(exports.customCharacterCategorieId, '_');

            //charId = toHexStr(charId) + '00' + '00' + '00' + '00' + '00' + '00' + '00' + '00' + '00'; // 9 '00'

            // newFileDatas = newFileDatas.slice(0, whereToAddThisLine) + lineToAdd + newFileDatas.slice(whereToAddThisLine + (82 * 2));
            
            // newFileDatas = newFileDatas.replace(
            //     Buffer.from('Minifigs\\SmokeyEscobar\\', 'utf8').toString('hex'),
            //     toHexStr(pathChar)
            // );
            
            // newFileDatas = newFileDatas.replace(
            //     Buffer.from('SmokeyEscobar', 'utf8').toString('hex'),
            //     charId
            // );
            // newFileDatas = newFileDatas.replace(
            //     pathToEdit,
            //     pathChar
            // );
            newFileDatas = newFileDatas.slice(0, pathToEditIndex) + pathChar + newFileDatas.slice(pathToEditIndex + pathChar.length);

            newFileDatas = newFileDatas.replace(
                charLineToChange.id,
                charId
            );

            return true;
        };
        
        if(true) {
            
            if(
                method1()
            ) {
                finallyAddedChars.push(char);

                console.log(`"${char.id}" added in the cpj file`);
            } else {
                console.log(`cannot add "${char.id}" in the cpj file`);
            }

            return;
        }
        
        const method2 = () => { // This method don't work BUT this is important to keep it

            // *********************************************************************************************
            // *                                  DONT REMOVE THIS METHOD                                  *
            // *********************************************************************************************
            
            // 2 : try to adding a new char line

            // const charId = '3dsCOP2';
            // const miniCharId = '3dspolicemale02';
            let charPathId = toCamecaseString(char.id);
            let charId = toCamecaseString(char.name);

            charPathId = charPathId.toUpperCase();
            charId = charId.toUpperCase();

            // exports.customCharacterCategorieId = toCamecaseString(exports.customCharacterCategorieId, '_');

            let pathChar = Buffer.from(`Minifigs\\${exports.customCharacterCategorieId}\\${charPathId}\\`, 'utf-8').toString('hex');
            charPathId = Buffer.from(charPathId, 'utf-8').toString('hex');
            charId = Buffer.from(charId, 'utf-8').toString('hex');


            const specialId = '49'; // Normal Id
            // const specialId = '82'; // Id for test

            lineToAdd += `4D 4F 42 4A 00 00 00 00 16 00 00 00 PATHID 00 10 00 00 00 MINIID 00 13 00 00 00 05 00 00 00 4F 4C 53 54 00 05 00 00 00 00 00 SPECIALID 00 00 00 05 00 00 00`
            .replace(/ /g, '')
            .replace('PATHID', pathChar)
            .replace('MINIID', charId)
            .replace('SPECIALID', specialId);

            newFileDatas += lineToAdd
        }

    });

    totalCharactersSlotUnused = 0;
    unusedCharLines.forEach( l => {
        totalCharactersSlotUnused += l.count - 1;
    });
    console.log(`now there are ${totalCharactersSlotUnused} character lines unused`);

    fs.writeFileSync(path.join(config['game-location'], cpjFileGamePath), newFileDatas, fileConfig);

    return {finallyAddedChars, totalCharactersSlotUnused};
}


function getCharUnusedSlots(newFileDatas) {
    
    let listCharLines = [];

    // Listing unused lines in the .cpj file
    toUTFStr(newFileDatas).split( toUTFStr(`4D 4F 42 4A 00 00 00 00`.replace(/ /g, '')) ).forEach(
        str => {
            if(str.includes('SUPER_Ch')) return;
            const splittedLine = str.split('Minifigs', 2);
            if(splittedLine.length <= 1) return; // If its not a char line

            // const charid = splittedLine[1].split(toUTFStr('000000'), 2)[1].slice(0, -2);
            const charid = splittedLine[1].split(toUTFStr('000000'), 2)[1].slice(0, -2).split(toUTFStr('00'), 1)[0];

            // console.log({ // <- to debug
            //     line: str,
            //     charid: charid
            // });

            let charLine = listCharLines.find(cline => cline.id == charid);

            if(charLine == null) {
                listCharLines.push({
                    value: str,
                    id: charid,
                    count: 1
                });
                return;
            }

            charLine.count++;
        }
    );

    listCharLines = listCharLines.filter(l => l.count > 1);

    return listCharLines;
}

function getCharIds() {
    
    let listCharIds = [];

    // Listing all character ids in the .cpj file
    toUTFStr(
        backupManager.getBackupFile(cpjFileGamePath, fileConfig).toString('utf8')
    ).split( toUTFStr(`4D 4F 42 4A 00 00 00 00`.replace(/ /g, '')) ).forEach(
        str => {
            if(str.includes('SUPER_Ch')) return;
            const splittedLine = str.split('Minifigs', 2);
            if(splittedLine.length <= 1) return; // If its not a char line

            // const charid = splittedLine[1].split(toUTFStr('000000'), 2)[1].slice(0, -2);
            const charid = splittedLine[1].split(toUTFStr('000000'), 2)[1].slice(0, -2).split(toUTFStr('00'), 1)[0];

            if(!charid) return;

            if(!listCharIds.includes(charid)) listCharIds.push(charid);
            
        }
    );

    return listCharIds;
}



exports.generateNewFile = generateNewFile;
exports.getCharIds = getCharIds;