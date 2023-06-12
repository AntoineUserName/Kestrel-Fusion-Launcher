const { CustomCharacter, addCharacter, charFolderId } = require("./character-manager");
const backupManager = require('../backup-manager');
const fs = require('fs');
const path = require("path");
const config = require('../config-manager');


/**
 * @example
 * compileCustomCharObjectToFiles( 'C:folder/folder', new CustomCharacter() );
 * @param {CustomCharacter} charobject 
 * @param {CustomCharacter} graphicDatas 
 * @param {String | null} resultfolder 
 */
function compileCustomCharObjectToModFiles(charobject, graphicDatas, resultfolder) {
    if(typeof(resultfolder) != 'string') throw 'resultfolder isn\'t a string';
    if(typeof(charobject) != 'object') throw 'charobject isn\'t an object';

    if(
        (!charobject.id)
        || typeof(charobject.id) != 'string'
        || charobject.id != charobject.id.toUpperCase()
        || charobject.id.length < 1
    ) {
        throw 'Cannot create new character : bad character id';
    }
    
    if(
        (!charobject.modname)
        || typeof(charobject.modname) != 'string'
        || charobject.modname.length < 3
    ) {
        throw 'Cannot create new character : bad mod name';
    }

    if(!resultfolder) resultfolder = require('../mod-manager').modsFolder;
    resultfolder = path.join(resultfolder, charobject.modname);

    if(!fs.existsSync(resultfolder)) fs.mkdirSync(resultfolder, {recursive: true});

    let modDatas = {
        id: charobject.id,
        name: charobject.name,

        price: charobject.price,
        cheatcode: charobject.cheatcode,
        class: charobject.class,
        addedToCustomer: charobject.addedToCustomer,

        attributes: []
    };

    // generate the mod file :
    
    for (const key in charobject.props) {
        if(typeof(charobject.props[key]) == 'number' && (charobject.props[key] + '').includes('.') == false) charobject.props[key] = charobject.props[key] + '.0';
        modDatas.attributes.push(key + '=' + charobject.props[key]);
    }

    const assetsFolderM = path.join(resultfolder, `/chars/${modDatas.id}/assets`);

    // Create mod folders
    fs.mkdirSync(assetsFolderM, {recursive: true});

    // If there are no mod.json create it
    if(!fs.existsSync(path.join(resultfolder, '/mod.json'))) {
        fs.writeFileSync(path.join(resultfolder, '/mod.json'),
`{
    "description": "A mod that add a new character in the game."
    ${charobject.modauthor ? ',"author": ' + JSON.stringify(charobject.modauthor) : '' }
}`, {encoding: 'utf8'});
    } else {

        // If there are already a mod.json be sure that if there are the object 'addons' there are 'chars' and 'text' to true
        try {
            
            let oldJSONDatas = JSON.parse(
                fs.readFileSync(path.join(resultfolder, '/mod.json'), {encoding:'utf8'})
            );

            if(oldJSONDatas.addons && ((!oldJSONDatas.addons.text) || (!oldJSONDatas.addons.chars))) {
                oldJSONDatas.addons.chars = true;
                oldJSONDatas.addons.text = true;
                fs.writeFileSync(path.join(resultfolder, '/mod.json'), JSON.stringify(oldJSONDatas), {encoding:'utf8'})
            }

        } catch (error) {
            console.error(error);
        }
    }

    // Create char.json
    fs.writeFileSync(path.join(resultfolder, `/chars/${modDatas.id}/char.json`), JSON.stringify(modDatas), {encoding: 'utf8'});


    // Add the assets (textures, models..) :

    for (const key in graphicDatas) {
        let fileName = key;

        console.log('adding ' + key);
        
        if(!fileName) return;
        if(!graphicDatas[key]) return;

        if(fileName.includes('.') == false || fileName.endsWith('.')) {
            fileName += '.DDS';
        }

        fs.writeFileSync(
            path.join(assetsFolderM, fileName),
            fs.readFileSync(graphicDatas[key])
        );

    }
    
    fs.mkdirSync(path.join(resultfolder, "/text"), {recursive: true});
    
    // Add character name in the text list :
    fs.writeFileSync(
        path.join(resultfolder, `/text/${modDatas.id}.txt`),
        `"${modDatas.id}","All","Char","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}","${modDatas.name}"`,
        {encoding: 'utf8'}
    );
}



// function getInitCharProps() {
//     const initCharDatas = backupManager.getBackupFile('CHARS/MINIFIGS/CIVILIAN/CIVILIAN_CHAS'+'EMC'+'CAIN/CIVILIAN_CHAS'+'EMC'+'CAIN.TXT').toString('utf8');
    
//     const initCharacterCompiledProps = {};

//     initCharDatas.split('\n').forEach(
//         line => {
//             line = line.replace(/^[ \t]+|[ \t]+$/g, '');
//             if((!line) || line.startsWith('//')) return;

//             let keyWords = line.split('=');
//             if(keyWords.length <= 1) keyWords = line.split(' ');

//             let variableKey = keyWords[0];
//             let variableValue = keyWords[1];

//             if(variableValue == '' || variableValue == null) {
                
//                 initCharacterCompiledProps[variableKey] = true;
//                 return;
//             }

//             variableValue.replace()
//         }
//     )


//     return initCharacterCompiledProps;

// }


let initCharTXTDatas;
let initCharCDDatas;

function compileModFilesToGameFiles(charfolder) {

    // put chars at CHARS/MINIFIGS/KF
    
    let charModInfo = JSON.parse(
        fs.readFileSync(
            path.join(charfolder, 'char.json'),
            {encoding: 'utf8'}
        ).toString('utf8')
    );

    if(!charModInfo.id) throw "error, no good ID in the char.json file";
    if(charModInfo.id.toUpperCase() != charModInfo.id) throw "error, no good ID in the char.json file";

    if(initCharTXTDatas == null) {
        initCharTXTDatas = backupManager.getBackupFile(
            `CHARS/MINIFIGS/COLLECT/COLLECT_1-06_SKATER/COLLECT_1-06_SKATER.TXT`
        ).toString('utf8');
    }
    
    let charTXTDatas = initCharTXTDatas;

    charModInfo.attributes.push(
        'name ' + charModInfo.id
    );
    
    charModInfo.attributes.forEach(
        attr => {
            if(attr.startsWith('//')) return;
            
            let valKey = attr.split(' ', 1)[0];
            
            if(attr.includes('=')) valKey = attr.split('=', 1)[0];

            // console.log(
            //     {
            //         line: attr,
            //         key: valKey
            //     }
            // );
            
            // Find the existing line and replace it

            let valToChange = charTXTDatas.indexOf('\n' + valKey);
            
            // If there are no line that already modify this value just add the attribut at the end of the file
            if(valToChange == -1) {
                charTXTDatas += '\n' + attr;
                return;
            }

            let endValToChange = charTXTDatas.slice(valToChange + 1).indexOf('\n') + 1;
            if(endValToChange == -1) endValToChange = charTXTDatas.length + 999;

            // Replace the existing line
            charTXTDatas = charTXTDatas.replace(
                charTXTDatas.slice(valToChange, valToChange + endValToChange),
                '\n' + attr
            );

        }
    );

    const compiledCharFolder = path.join(config["game-location"], 'CHARS/MINIFIGS', charFolderId.toUpperCase());

    fs.mkdirSync(compiledCharFolder, {recursive: true});

    fs.writeFileSync(
        path.join(compiledCharFolder, charModInfo.id + '.TXT'),
        charTXTDatas,
        {encoding: 'utf8'}
    );

    
    // ********* Generate the .CD file : *********
    
    if(initCharCDDatas == null) {
        initCharCDDatas = backupManager.getBackupFile(
            //`CHARS/MINIFIGS/COLLECT/COLLECT_1-06_SKATER/COLLECT_1-06_SKATER.CD`,
            `CHARS/MINIFIGS/COP/COP_DOORLOCKHOMES/COP_DOORLOCKHOMES.CD`,
            {encoding: 'hex'}
        ).toString('hex');
    }

    function replaceExistingValue(initv, newv) {

        initv = toHexStr(initv);
        newv = toHexStr(newv);

        // let indexInitVal = cdCharDatas.indexOf( initv );

        // if(indexInitVal == -1) return;

        while(newv.length < initv.length) {
            newv += '00';
        }

        cdCharDatas = cdCharDatas.replace(initv, newv);
    }

    /**
     * @type String
     */
    let cdCharDatas = initCharCDDatas;

    const charAssetsPath = path.join(charfolder, 'assets');
    const gameAssetsFolder = path.join(config["game-location"], 'CHARS/MINIFIGS/SUPER_CHARACTERS');
    // // Si ca marche pas, tester en prenant un dir déjà existant

    // fs.mkdirSync(gameAssetsFolder, {recursive: true});



    // ************ Adding textures ************
    if(fs.existsSync(charAssetsPath)) {

        // Adding icon :
        if(fs.existsSync(path.join(charAssetsPath, 'ICON.DDS'))) {

            fs.writeFileSync(
                path.join(config["game-location"], `STUFF/ICONS/${charModInfo.id}_DX11.TEX`),
                fs.readFileSync(path.join(charAssetsPath, 'ICON.DDS'))
            );
            
        }


        const coloursStartId = 'L' + '' + ('e'.toUpperCase()) + 'GO';
        // const camelCaseColoursStartId = coloursStartId[0].toUpperCase() + coloursStartId.slice(1).toLowerCase();

        function addTextureAndLine(fileid, newfileid, mgamepath, oldline, newline) {
            
            if(!fs.existsSync(path.join(charAssetsPath, fileid))) return;

            newfileid = newfileid.replace('$', charModInfo.id);
            
            // copy-paste the body file
            fs.writeFileSync(
                path.join(gameAssetsFolder, mgamepath + newfileid + '_DX11.TEX'),
                fs.readFileSync(path.join(charAssetsPath, fileid))
            );

            replaceExistingValue(oldline, newline + newfileid);
        }

        // Add the body texture :
        addTextureAndLine('BODY.DDS', 'MOD$', 'BODIES/', 'aracters\\Bodies\\BODY_HOMES', 'aracters\\Bodies\\');
        
        // if(fs.existsSync(path.join(charAssetsPath, 'BODY.DDS'))) {
            
        //     //let assetId = toMiniLine('BODY_HOMES', 'BODY_' + charModInfo.id);

        //     // copy-paste the body file
        //     fs.writeFileSync(
        //         // path.join(gameAssetsFolder, 'BODIES/BODY_' + charModInfo.id + '_DX11.TEX'),
        //         path.join(gameAssetsFolder, 'BODIES/MOD_' + charModInfo.id + '_DX11.TEX'),
        //         fs.readFileSync(path.join(charAssetsPath, 'BODY.DDS'))
        //     );

        //     // replaceExistingValue('aracters\\Bodies\\BODY_HOMES', 'aracters\\Bodies\\BODY_' + charModInfo.id);
        //     replaceExistingValue('aracters\\Bodies\\BODY_HOMES', 'aracters\\Bodies\\MOD_' + charModInfo.id);
        // }
        
        // // Add the legs texture :
        // addTextureAndLine('LEGS.DDS', 'LEG_BASE_$', 'LEGS/', 'Legs\\LEG_BASE_DARKGREY', 'Legs\\');
        addTextureAndLine('LEGS.DDS', 'MOD$', 'LEGS/', 'Legs\\LEG_BASE_DARKGREY', 'Legs\\');
        // if(fs.existsSync(path.join(charAssetsPath, 'LEGS.DDS'))) {
            
        //     // copy-paste the file
        //     fs.writeFileSync(
        //         path.join(gameAssetsFolder, 'LEGS/MOD_' + charModInfo.id + '_DX11.TEX'),
        //         fs.readFileSync(path.join(charAssetsPath, 'LEGS.DDS'))
        //     );

        //     replaceExistingValue('Legs\\LEG_BASE_DARKGREY', `Legs\\MOD_${charModInfo.id}`);
        // }
        
        // Add the back texture :
        //addTextureAndLine('BACK.DDS', 'BACK_$', 'BACKS/', coloursStartId+'_Colours\\'+coloursStartId+'_SM_EARTHYELLOW', 'Backs\\');
        addTextureAndLine('BACK.DDS', 'MOD$', 'BACKS/', coloursStartId+'_Colours\\'+coloursStartId+'_SM_EARTHYELLOW', 'Backs\\');
        // if(fs.existsSync(path.join(charAssetsPath, 'BACK.DDS'))) {
            
        //     // copy-paste the file
        //     fs.writeFileSync(
        //         path.join(gameAssetsFolder, 'BACKS/MOD_' + charModInfo.id + '_DX11.TEX'),
        //         fs.readFileSync(path.join(charAssetsPath, 'BACK.DDS'))
        //     );

        //     replaceExistingValue(coloursStartId+'_Colours\\'+coloursStartId+'_SM_EARTHYELLOW', 'Backs\\MOD_' + charModInfo.id);
        // }
        
        // Add the face texture
        //addTextureAndLine('FRONT_FACE.DDS', 'FACE_$FF', 'BACKS/', coloursStartId + '_CHAR_BRIGHTYELLOW', ``);
        if(fs.existsSync(path.join(charAssetsPath, 'FRONT_FACE.DDS'))) {
            
            // copy-paste the file
            fs.writeFileSync(
                path.join(gameAssetsFolder, coloursStartId + '_COLOURS/MOD_' + charModInfo.id + 'FF_DX11.TEX'),
                //path.join(gameAssetsFolder, 'L' + 'EGO_COLOURS/L' + 'EGO_CHAR_' + charModInfo.id + 'H_DX11.TEX'),
                fs.readFileSync(path.join(charAssetsPath, 'FRONT_FACE.DDS'))
            );
            // front face
            replaceExistingValue(coloursStartId + '_CHAR_BRIGHTYELLOW', `MOD_${charModInfo.id}FF`);
        }
        
        if(fs.existsSync(path.join(charAssetsPath, 'HANDS.DDS'))) {
            
            // copy-paste the file
            fs.writeFileSync(
                path.join(gameAssetsFolder, coloursStartId + '_COLOURS/MOD_' + charModInfo.id + 'H_DX11.TEX'),
                fs.readFileSync(path.join(charAssetsPath, 'HANDS.DDS'))
            );
            replaceExistingValue(coloursStartId + '_CHAR_BRIGHTYELLOW', `MOD_${charModInfo.id}H`);
        }
        
        if(fs.existsSync(path.join(charAssetsPath, 'BACK_FACE.DDS'))) {
            
            // copy-paste the file
            fs.writeFileSync(
                path.join(gameAssetsFolder, coloursStartId + '_COLOURS/MOD_' + charModInfo.id + 'BACKF_DX11.TEX'),
                fs.readFileSync(path.join(charAssetsPath, 'BACK_FACE.DDS'))
            );
            // back face
            replaceExistingValue(coloursStartId + '_CHAR_BRIGHTYELLOW', `MOD_${charModInfo.id}BACKF`);
        }
        
        if(fs.existsSync(path.join(charAssetsPath, 'ARM_LEFT.DDS'))) {
            
            // copy-paste the file
            fs.writeFileSync(
                path.join(gameAssetsFolder, coloursStartId + '_COLOURS/MOD_' + charModInfo.id + 'ARML_DX11.TEX'),
                // path.join(gameAssetsFolder, coloursStartId + '_COLOURS/L' + 'EGO_SM_' + charModInfo.id + 'B_DX11.TEX'),
                fs.readFileSync(path.join(charAssetsPath, 'ARM_LEFT.DDS'))
            );
            replaceExistingValue(coloursStartId + '_SM_EARTHYELLOW', `MOD_${charModInfo.id}ARML`);
            //replaceExistingValue('EGO_SM_EARTHYELLOW', `EGO_SM_${charModInfo.id}BLACK`);
            // replaceExistingValue('EGO_SM_EARTHYELLOW', `EGO_SM_${charModInfo.id}B`);
        }
        
        if(fs.existsSync(path.join(charAssetsPath, 'ARM_RIGHT.DDS'))) {
            
            // copy-paste the file
            fs.writeFileSync(
                path.join(gameAssetsFolder, coloursStartId + '_COLOURS/MOD_' + charModInfo.id + 'ARMR_DX11.TEX'),
                // path.join(gameAssetsFolder, coloursStartId + '_COLOURS/L' + 'EGO_SM_' + charModInfo.id + 'B_DX11.TEX'),
                fs.readFileSync(path.join(charAssetsPath, 'ARM_RIGHT.DDS'))
            );
            replaceExistingValue(coloursStartId + '_SM_EARTHYELLOW', `MOD_${charModInfo.id}ARMR`);
        }

        // Edit the belt
        if(charModInfo.beltcolor && typeof(charModInfo.beltcolor) == 'string') {

            replaceExistingValue('EGO_BASE_DARKGREY', `EGO_BASE_${charModInfo.beltcolor}`);
        }
        else if(fs.existsSync(path.join(charAssetsPath, 'BELT.DDS'))) {
            
            // copy-paste the file
            fs.writeFileSync(
                path.join(gameAssetsFolder, coloursStartId + '_COLOURS/MOD_BLT' + charModInfo.id + '_DX11.TEX'),
                fs.readFileSync(path.join(charAssetsPath, 'BELT.DDS'))
            );
            
            replaceExistingValue(coloursStartId + '_BASE_DARKGREY', `MOD_BLT${charModInfo.id}`);
        }

        // Add the face
        replaceExistingValue('FACE_STORY_DOORLOCKHOMES', `FACE_${charModInfo.id}_SKIMASK`);
        // replaceExistingValue('FACE_STORY_DOORLOCKHOMES', `FACE_${charModInfo.id}`);

        
        // Add the hat :
        if(charModInfo.hatid && typeof(charModInfo.hatid) == 'string') {
            // Set the hat 2 times :
            replaceExistingValue('Hats\\HAT_DEERSTALKER', 'Hats\\HAT_' + charModInfo.hatid);
            replaceExistingValue('HAT_DEERSTALKER', 'HAT_' + charModInfo.hatid);
            
            replaceExistingValue('Hats\\HAT_DEERSTALKER', 'Hats\\HAT_' + charModInfo.hatid);
            replaceExistingValue('HAT_DEERSTALKER', 'HAT_' + charModInfo.hatid);
        }
        else if(fs.existsSync(path.join(charAssetsPath, 'HAT.GSC'))) {
            
            // copy-paste the file
            fs.writeFileSync(
                path.join(gameAssetsFolder, 'HATS/HAT_' + charModInfo.id + '_DX11.GSC'),
                fs.readFileSync(path.join(charAssetsPath, 'HAT.GSC'))
            );
            
            // Set the hat 2 times :
            replaceExistingValue('Hats\\HAT_DEERSTALKER', 'Hats\\HAT_' + charModInfo.id);
            replaceExistingValue('HAT_DEERSTALKER', 'HAT_' + charModInfo.id);
            
            replaceExistingValue('Hats\\HAT_DEERSTALKER', 'Hats\\HAT_' + charModInfo.id);
            replaceExistingValue('HAT_DEERSTALKER', 'HAT_' + charModInfo.id);
        } else {
            // Set to an empty model
            replaceExistingValue('Hats\\HAT_DEERSTALKER', 'Hats\\KFEMPTYMODEL');
            replaceExistingValue('HAT_DEERSTALKER', 'KFEMPTYMODEL');
            
            replaceExistingValue('Hats\\HAT_DEERSTALKER', 'Hats\\KFEMPTYMODEL');
            replaceExistingValue('HAT_DEERSTALKER', 'KFEMPTYMODEL');
        }

    }

    // Write the cd file :
    
    fs.writeFileSync(
        path.join(compiledCharFolder, charModInfo.id + '.CD'),
        cdCharDatas,
        {encoding: 'hex'}
    );

    // const customCharObj = {
    //     id: charModInfo.id,
    //     name: charModInfo.name,
    //     class: charModInfo.class,

    //     price: charModInfo.price,
    //     cheatcode: charModInfo.cheatcode,
    //     addedToCustomer: charModInfo.addedToCustomer
    // }

    // Update the character list
    addCharacter( {...charModInfo} );
}



function toHexStr(initstr) {
    return Buffer.from(initstr, 'utf-8').toString('hex');
}
function toUTFStr(initstr) {
    return Buffer.from(initstr, 'hex').toString('utf8');
}



exports.compileChar = compileCustomCharObjectToModFiles;
exports.loadCharMod = compileModFilesToGameFiles