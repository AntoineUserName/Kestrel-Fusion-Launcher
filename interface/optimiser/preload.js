const {ipcRenderer} = require('electron');

const path = require('path');
const {join, normalize} = path;
const fs = require('fs');

let gameFolder, voicesFolder;

let cutsFolder;
const germanCutsPaths = [];
const allCutscenesPath = [];

ipcRenderer.on('optimiser-init', (ev, currGameFolder) => {
    gameFolder = normalize(currGameFolder);

    voicesFolder = join(gameFolder, 'AUDIO/SAMPLES/VO');
    
    document.querySelectorAll("button").forEach(
        b => {

            let dataFolderId = b.getAttribute('data-folderid');

            if(!dataFolderId) return;
            

            let langFolderFullPath = join(voicesFolder, dataFolderId);

            if(
                fs.existsSync(langFolderFullPath)
            ) {

                b.innerText = 'Delete ' + b.innerText + ' voices';

                b.onclick = onClickDeleteVoice;

            } else {

                b.innerText = '(deleted) ' + b.innerText + ' voices';
            }

        }
    );

    cutsFolder = join(gameFolder, 'MOVIES/NXG/30FPS');

    let allCutsSize = 0;

    let allGerCutsSize = 0;

    const toGigaB = (1000 * 1000 * 1000);

    fs.readdirSync(cutsFolder).forEach(
        cutsceneName => {
            
            if(!cutsceneName.endsWith('.FMV')) return;

            let cutscenePath = join(cutsFolder, cutsceneName);

            let cutSize = fs.statSync(cutscenePath).size / toGigaB;
            
            allCutsSize += cutSize;

            if(cutsceneName.endsWith('_GERMAN.FMV')) {

                allGerCutsSize += cutSize;

                germanCutsPaths.push(cutscenePath);
            }


            allCutscenesPath.push(cutscenePath);

        }
    );

    fs.readdirSync(join(gameFolder, 'CUT')).forEach(

        folderName => {

            if(folderName[0] != '0' || folderName.includes('.')) return;

            function findF(cutsCurrDirPath) {

                let filesDirNames = fs.readdirSync(cutsCurrDirPath);
                
                
                let index = 0;
                while (index < filesDirNames.length) {
                    let o = filesDirNames[index];

                    
                    
                    let iEnd = o.lastIndexOf('.');

                    if(iEnd == -1) {
                        
                        findF(join(cutsCurrDirPath, o));
                        
                    } else {
                        
                        if(o.slice(iEnd+1) == 'FMV') {

                            let pathF = join(cutsCurrDirPath, o);

                            console.log('found at: ', pathF);
                            
                            let cutSize = fs.statSync(pathF).size / toGigaB;

                            allCutsSize += cutSize;

                            allCutscenesPath.push(
                                pathF
                            );
                        }

                    }

                    index++;
                }
            }

            

            findF(join(gameFolder, 'CUT', folderName));

        }
    );


    const delCutsGerButton = document.querySelector("#del-ger-cuts");
    const delAllCutsButton = document.querySelector("#del-all-cuts");

    delCutsGerButton.innerText += ' (' + ( allGerCutsSize < 0.1 ? 'deleted)' : ' ' + (allGerCutsSize.toFixed(2) + 'Giga-bytes )'));
    delAllCutsButton.innerText += ' (' + ( allCutsSize < 0.1 ? 'deleted)' : ' ' + (allCutsSize.toFixed(2) + 'Giga-bytes )'));



    delCutsGerButton.onclick = () => {

        emptifyGameFiles(germanCutsPaths, 'german cutscenes');
    }

    delAllCutsButton.onclick = () => {
        emptifyGameFiles(allCutscenesPath, 'all cutscenes');
    };


    document.querySelector("#open-sublvl-dir").onclick = () => {
        ipcRenderer.send('optimiser-opendir', join(gameFolder, 'LEVELS/STANDALONES'));
    };
    document.querySelector("#open-testlvl-dir").onclick = () => {
        ipcRenderer.send('optimiser-opendir', join(gameFolder, 'LEVELS/TESTAREA'));
    };


    // document.querySelector("#test").onclick = () => {
    //     activeDeleteAction(() => {alert('test!')}, 'Printing test');
    // }


});

function getFilesIn(folder, extname = "") {
    
    extname = extname.toUpperCase();

    let results = [];

    let l = fs.readdirSync(folder);
    let index = l.length;
    while (index > 0) {
        index--;
        
        let fname = l[index];
        let i = fname.lastIndexOf('.');
        if(i != -1 && fname.slice(i+1).toUpperCase() == extname) {
            results.push([fname.slice(0, i), fname]);
        }
    }


    return results;
}

function removeDir(folder) {
    if(!folder.startsWith(gameFolder)) throw 'not game file';
    fs.rmSync(folder, { recursive: true });
}

function deleteLang(langFolderName) {

    let langFolderFullPath = join(voicesFolder, langFolderName);

    if(fs.existsSync(langFolderFullPath)) {

        removeDir(langFolderFullPath);

    }

    
    const DX_folder = join(gameFolder, 'AUDIO/TRACKS/CUTSCENES/SURROUND/DX');

    // Folder of 500Mo:
    const allDXFiles = getFilesIn(DX_folder, 'OGG');

    const langEndFile = '_' + langFolderName;

    // Delete all files ending with '_LANGID.OGG'

    let index = allDXFiles.length;
    while (index > 0) {
        index--;
        
        let fname = allDXFiles[index];

        if(fname[0].endsWith(langEndFile)) fs.unlinkSync(join(DX_folder, fname[1]));
        
    }

    


}


function onClickDeleteVoice(ev) {
    
    let b = ev.target;

    let dataFolderId = b.getAttribute('data-folderid');

    if(!dataFolderId) return;

    activeDeleteAction( () => {
        
        deleteLang(dataFolderId);

    }, 'Deleting ' + b.innerText);

}

function emptifyGameFiles(filesPathsList, descr) {
    
    activeDeleteAction(() => {

        let emptyBuff = Buffer.from([]);

        let index = 0;
        while (index < filesPathsList.length) {
            let filePathToDel = filesPathsList[index];
            
            // fs.unlinkSync(filePathToDel);

            fs.writeFileSync(filePathToDel, emptyBuff);

            index++;
        }

    }, 'Deleting ' + descr);
}


function activeDeleteAction(deleteFunction, descr) {
    
    let isCanceled = false;

    let cancelDiv = document.createElement("div");

    let n = document.createElement("span");
    n.innerText = descr + '..';

    cancelDiv.appendChild(n);

    let b = document.createElement("button");
    b.innerText = 'Cancel';
    b.onclick = () => {
        isCanceled = true;
        cancelDiv.remove();
        b.onclick = null;
    };

    cancelDiv.appendChild(b);
    
    document.querySelector("#cancellers-container").appendChild(cancelDiv);
    

    // TODO ADD ELEMENT FOR CANCELLING!!

    setTimeout(() => {
        
        if(isCanceled) return;

        cancelDiv.remove();

        deleteFunction();

    }, 8000);
}


window.onload = () => {


    ipcRenderer.send('optimiser-init-start');

};
