const path = require('path');
const fs = require('fs');


exports.updateFileEdits = () => {

    const config = require('./config-manager');

    let gameDir = config['game-location'];

    const folderPath = require("./mod-manager").modsFolder;

    let resetedFiles = [];

    require("./mod-manager").getModsLoaded().forEach(
        modDatas => {
            if(!modDatas.addons.editFiles) return;
            

            let isModEnabled = config['activated-mods'].includes(modDatas.name);

            let folderOfModEditFiles = path.join(folderPath, modDatas.name, 'edit_files');
            
            let allFileEdits = fs.readdirSync(folderOfModEditFiles);
            let index = allFileEdits.length;
            while (index > 0) {
                index--;
                let fileeditName = allFileEdits[index];


                if(fileeditName.toLowerCase().endsWith(".kfedit")) {

                    let fileEditPath = path.join(folderOfModEditFiles, fileeditName);

                    let fileDatas = fs.readFileSync(fileEditPath, 'utf8');

                    let filePathIndex = fileDatas.indexOf("file_path:");
                    if(filePathIndex == -1) {
                        console.log('Error: no "file_path" in ' + fileEditPath);
                    } else {

                        filePathIndex += 10; // "file_path:".length;
                        let foundIt = true;
                        while (fileDatas[filePathIndex] == ' ' || fileDatas[filePathIndex] == '\n' || fileDatas[filePathIndex] == '\t' || fileDatas[filePathIndex] == '\r') {
                            filePathIndex++;
                            if(filePathIndex >= fileDatas.length) {
                                foundIt = false;
                                break;
                            }
                        }

                        if(foundIt && filePathIndex < fileDatas.length) {


                            let filePathEndI = fileDatas.indexOf("\n", filePathIndex);

                            if(filePathEndI != -1) {

                                let fileToEditPathStart = fileDatas.slice(filePathIndex, filePathEndI - 1);

                                let fileToEditPath = path.join(gameDir, fileToEditPathStart);

                                if(fileToEditPath.startsWith(gameDir) && fileToEditPath.startsWith(require('./global-variables').KFFolderPath) == false) {
                                    
                                    let isFileNotExisiting = false;
                                    
                                    
                                    if(resetedFiles.includes(fileToEditPath) == false) {

                                        if(!fileToEditPath.includes('.')) {
                                            console.log('this is not a file at ' + JSON.stringify(fileToEditPath));
                                            console.log('no "." found in the name');
                                            isFileNotExisiting = true;
                                        }
                                        else if((!fs.existsSync(fileToEditPath)) || path.extname(fileToEditPath).toLowerCase() == ".exe" || path.extname(fileToEditPath).toLowerCase() == ".dll") {
                                            isFileNotExisiting = true;
                                            console.log('file not found at ' + JSON.stringify(fileToEditPath));
                                            console.log('or the file extension cannot be edited');
                                            
                                        } else {

                                            if( require('./backup-manager').backupFile(fileToEditPathStart) ) {
                                                
                                                require('./backup-manager').loadBackupFile(fileToEditPathStart);
                                                resetedFiles.push(fileToEditPath);
                                            } else {
                                                isFileNotExisiting = true;
                                            }
                                        }

                                    }

                                    if(!isFileNotExisiting) {

                                        let addContentIndex;

                                        if(isModEnabled) {

                                            
                                            
                                            addContentIndex = fileDatas.indexOf("ADD CONTENT:", filePathIndex);

                                            if(addContentIndex != -1) {
                                                addContentIndex += "ADD CONTENT:".length;

                                                let fileToEditDatas = fs.readFileSync(fileToEditPath, 'utf8');


                                                fs.writeFileSync(fileToEditPath, fileToEditDatas + fileDatas.slice(addContentIndex), 'utf8');

                                            }
                                            
                                            else {

                                                
                                                addContentIndex = fileDatas.indexOf("ADD HEX CONTENT:", filePathIndex);

                                                if(addContentIndex != -1) {
                                                    addContentIndex += "ADD HEX CONTENT:".length;

                                                    let fileToEditDatas = fs.readFileSync(fileToEditPath, 'hex');


                                                    fs.writeFileSync(fileToEditPath, fileToEditDatas + fileDatas.slice(addContentIndex).replace(/\n/g, '').replace(/ /g, ''), 'hex');

                                                }
                                                else {

                                                
                                                    addContentIndex = fileDatas.indexOf("REPLACE AT:", filePathIndex);
    
                                                    if(addContentIndex != -1) {
                                                        // addContentIndex++;
                                                        
                                                        addContentIndex += "REPLACE AT:".length;
    
                                                        let foundIt = true;
                                                        while (fileDatas[addContentIndex] == ' ' || fileDatas[addContentIndex] == '\n' || fileDatas[addContentIndex] == '\t' || fileDatas[addContentIndex] == '\r') {
                                                            addContentIndex++;
                                                            if(addContentIndex >= fileDatas.length) {
                                                                foundIt = false;
                                                                break;
                                                            }
                                                        }
                                                        
                                                        if(foundIt) {
                                                            
                                                            let offsEnd = fileDatas.indexOf("\n", addContentIndex);

                                                            if(offsEnd != -1) {
                                                                let offsetStr = fileDatas.slice(addContentIndex, offsEnd);
                                                                
                                                                let offsetNumber = -1;
                                                                if(offsetStr.startsWith("0x")) {
                                                                    offsetNumber = parseInt(offsetStr,16) * 2;
                                                                }
                                                                else if(offsetStr[0] == "#") {
                                                                    offsetStr = offsetStr.slice(1).replace(/ /g, '');
                                                                } else {
                                                                    offsetStr = Buffer.from(offsetStr, 'utf8').toString("hex");
                                                                }

                                                                
                                                                let replaceIndex = fileDatas.indexOf("REPLACE WITH:", offsEnd);

                                                                if(replaceIndex != 1) {

                                                                    replaceIndex += "REPLACE WITH:".length;

                                                                    foundIt = true;
                                                                    while (fileDatas[replaceIndex] == ' ' || fileDatas[replaceIndex] == '\n' || fileDatas[replaceIndex] == '\t' || fileDatas[replaceIndex] == '\r') {
                                                                        replaceIndex++;
                                                                        if(replaceIndex >= fileDatas.length) {
                                                                            foundIt = false;
                                                                            break;
                                                                        }
                                                                    }
                                                                    if(foundIt) {
                                                                        let replaceWithContent = fileDatas.slice(replaceIndex);

                                                                        if(replaceWithContent[0] == '#') {
                                                                            replaceWithContent = replaceWithContent.slice(1).replace(/\n/g, '').replace(/ /g, '');
                                                                        } else {
                                                                            // replaceWithContent = Buffer.from(replaceWithContent, 'hex').toString();
                                                                            replaceWithContent = Buffer.from(replaceWithContent, 'utf8').toString('hex');
                                                                        }
                                                                        
                                                                        let fileToEditDatas = fs.readFileSync(fileToEditPath, 'hex');

                                                                        if(offsetNumber != -1) {

                                                                            fileToEditDatas = fileToEditDatas.slice(0, offsetNumber) + replaceWithContent + fileToEditDatas.slice(offsetNumber + replaceWithContent.length);

                                                                        } else {

                                                                            // console.log(fileToEditDatas);
                                                                            
                                                                            // console.log(offsetStr.toLowerCase());

                                                                            // // console.log(offsetStr);
                                                                            // console.log(replaceWithContent.toLowerCase());

                                                                            

                                                                            // console.log(offsetStr);
                                                                            // console.log(JSON.stringify(offsetStr));
                                                                            // console.log(
                                                                            //     fileToEditDatas.indexOf(offsetStr)
                                                                            // );
                                                                            // console.log(
                                                                            //     fileToEditDatas.toLowerCase().indexOf(offsetStr.toLowerCase())
                                                                            // );

                                                                            offsetStr = offsetStr.replace(/[^a-zA-Z0-9]/g, '');
                                                                            replaceWithContent = replaceWithContent.replace(/[^a-zA-Z0-9]/g, '');
                                                                            
                                                                            fileToEditDatas = fileToEditDatas.toLowerCase();

                                                                            fileToEditDatas = fileToEditDatas.replace(offsetStr.toLowerCase(), replaceWithContent.toLowerCase());

                                                                        }
                                                                        
                                                                        fs.writeFileSync(fileToEditPath, fileToEditDatas, 'hex');
                                                                        
                                                                    }
                                                                }
                                                            }
                                                            
                                                        }

                                                    } else {

                                                        addContentIndex = fileDatas.indexOf("REMOVE AT:", filePathIndex);

                                                        if(addContentIndex != -1) {
                                                            
                                                            addContentIndex += "REMOVE AT:".length;

                                                            
                                                            let foundIt = true;
                                                            while (fileDatas[addContentIndex] == ' ' || fileDatas[addContentIndex] == '\n' || fileDatas[addContentIndex] == '\t' || fileDatas[addContentIndex] == '\r') {
                                                                addContentIndex++;
                                                                if(addContentIndex >= fileDatas.length) {
                                                                    foundIt = false;
                                                                    break;
                                                                }
                                                            }
                                                            

                                                            if(foundIt) {
                                                                let offsEnd = fileDatas.indexOf("\n", addContentIndex);
                                                                
                                                                if(offsEnd != -1) {
                                                                    let offsetStr = fileDatas.slice(addContentIndex, offsEnd);
                                                                    
                                                                    let offsetNumber = -1;
                                                                    if(offsetStr.startsWith("0x")) {
                                                                        offsetNumber = parseInt(offsetStr,16) * 2;
                                                                    }
                                                                    else if(offsetStr[0] == "#") {
                                                                        offsetStr = offsetStr.slice(1).replace(/ /g, '');
                                                                    } else {
                                                                        offsetStr = Buffer.from(offsetStr, 'utf8').toString("hex");
                                                                    }

                                                                    addContentIndex = offsEnd;

                                                                    addContentIndex = fileDatas.indexOf("SIZE TO REMOVE:", addContentIndex);

                                                                    if(addContentIndex != -1) {

                                                                        addContentIndex += "SIZE TO REMOVE:".length;

                                                                        foundIt = true;
                                                                        while (fileDatas[addContentIndex] == ' ' || fileDatas[addContentIndex] == '\n' || fileDatas[addContentIndex] == '\t' || fileDatas[addContentIndex] == '\r') {
                                                                            addContentIndex++;
                                                                            if(addContentIndex >= fileDatas.length) {
                                                                                foundIt = false;
                                                                                break;
                                                                            }
                                                                        }
    
                                                                        if(foundIt) {

                                                                            let lastISIZE = fileDatas.indexOf("\n", addContentIndex);

                                                                            let nbrToRemoveSIZE = parseInt(fileDatas.slice(addContentIndex, lastISIZE != -1 ? lastISIZE : undefined).replace(/ /g, '')) * 2;

                                                                            let fileToEditDatas = fs.readFileSync(fileToEditPath, 'hex');
    
                                                                            if(offsetNumber != -1) {
                                                                                offsetNumber = fileToEditDatas.indexOf(offsetStr);
                                                                            }
    
                                                                            fs.writeFileSync(fileToEditPath, fileToEditDatas.slice(0, offsetNumber) + fileToEditDatas.slice( offsetNumber + nbrToRemoveSIZE ), 'hex');
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }

                                                    }
    
                                                }

                                            }

                                        }

                                    }

                                }
                            }


                        } else {
                            console.log('Error: no "file_path" in ' + fileEditPath);
                        }

                    }


                }


            }

            
        }
    );

}



// file_path:
// 
// LEVELS/
// 
// ADD CONTENT:
// 
// 


// REPLACE AT:
// #00 11 22 33 44 55 66 FF

// REPLACE WITH:
// #00 11 22 33 44 55 66 FF


// REPLACE AT: 0x123456

// REPLACE WITH:
// MAMAAA



// REPLACE AT:
// MAMAAA

// REPLACE WITH:
// HMMMMM


// REMOVE AT:
// MAMAAA

// SIZE TO REMOVE:
// 6


// REMOVE AT:
// 0x456

// SIZE TO REMOVE:
// 1
