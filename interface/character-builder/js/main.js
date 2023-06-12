const renderer = document.querySelector('#character-renderer');
const popupParent = document.querySelector('#center-popup');

let graphicInputs = []; // Go to textures-editor.js to view the graphicInputs
let isPageFrozen = false;

function setIsPageFrozen(isfrozen) {
    isPageFrozen = isfrozen;

    document.querySelector('#page-locker').style.display = isfrozen ? '' : 'none';
}


function alertInfo(infotext) {

    let popupElement = document.createElement('div');

    popupElement.style = `
    background: white;
    border-radius: 16px;
    border: solid 1px black;
    text-align: center;
    width: 80%;
    height: 65%;
    font-size: 20px;
    `;

    popupElement.innerHTML = `
    <p></p>
    <button>OK</button>
    `;
    popupElement.querySelector('p').innerText = infotext;
    popupElement.querySelector('button').onclick = () => {
        popupElement.remove();
        popupParent.style.display = 'none';
    }

    popupParent.appendChild(popupElement);
    popupParent.style.display = '';

}

electronAPI.setAlertFunc(alertInfo);

function setScrollLock(islock) {
    document.body.style.overflow = islock ? 'hidden' : '';
}

/**
 * Request to the user to response yes or no from a text gived
 * @param {String} text 
 * @param {Function} after 
 */
function isOkTo(text, after) {

    let el = document.createElement('div');

    el.style = `
    width: 85%;
    height: 85%;

    min-width: 100px;
    min-height: 100px;
    
    max-width: 800px;
    max-height: 650px;
    
    padding: 10px;
    background: white;
    pointer-events: all;
    user-select: text;
    border-radius: 15px;
    text-align: center;
    border: 1px solid black;
    box-shadow: 0 0 5px #00000059;
    animation: anim-scale-poping 0.2s ease;
    `;

    el.innerHTML = `
    <p></p>
    <button class="classic-button" style="margin: 5px;
    font-size: 18px;
    padding: 4px 15px;
    ">No</button>
    <button class="classic-button" style="margin: 5px;
    font-size: 18px;
    padding: 4px 15px;
    ">Yes</button>
    `;

    el.querySelector('p').innerText = text;
    el.querySelector('button').onclick = () => {
        el.remove();
        popupParent.style.display = 'none';
        after( false );
        setScrollLock(false);
    }
    el.querySelectorAll('button')[1].onclick = () => {
        el.remove();
        popupParent.style.display = 'none';
        after( true );
        setScrollLock(false);
    }

    popupParent.appendChild( el );

    setScrollLock(true);
    scrollTo(0, 0);

    popupParent.style.display = '';

}


// let rendererInputElements = [
//     {
//         id: 'FRONT_FACE',
//         elementid: 'front-face',
//         element: document.createElement('div')
//     },
//     {
//         id: 'BACK_FACE',
//         elementid: 'back-face',
//         element: document.createElement('div')
//     },
//     {
//         id: 'ARM_LEFT',
//         elementid: 'arm-left',
//         element: document.createElement('div')
//     },
//     {
//         id: 'ARM_RIGHT',
//         elementid: 'arm-right',
//         element: document.createElement('div')
//     },
//     {
//         id: 'HAT_GSC',
//         elementid: 'hat',
//         element: document.createElement('div')
//     },
//     {
//         id: 'HANDS',
//         elementid: 'hands',
//         element: document.createElement('div')
//     },
    
// ];

// rendererInputElements.forEach(rel => {

//     let el = rel.element;
//     el.id = rel.elementid;
//     el.className = 'render-input';

//     renderer.appendChild(el);
// });



// Auto-edited by the preload.js :
let charDatas = {};

electronAPI.onInit((objchar) => {

    electronAPI.resetAssets();

    charDatas = objchar;
});

electronAPI.onNewAsset((newassetid, newassetfile, err) => {
    graphicInputs.find(g => g.id == newassetid).onNewAsset(newassetfile, err);
});


electronAPI.onUnfreeze(() => {
    window.setIsPageFrozen(false);
});

function openNavURL(newurl) {
    electronAPI.openNavURL(newurl);
}



// *************************************************************
// **********************  Saving the mod  *********************
// *************************************************************

function saveCharacter(suretosavemod) {

    if(isPageFrozen) return;

    if(charDatas.modname.includes('\n') || (!charDatas.modname.replace(/ /g , '')) || charDatas.modname.replace(/ /g , '').length < 3 || charDatas.modname.length > 15) {
        alertInfo('Modify your mod name.\nCheck if the mod name have more than 3 letters.');
        return;
    }

    if(graphicInputs.find(g => g.added == false && g.isImportant)) return alertInfo('You forgot to add some assets');

    setIsPageFrozen(true);

    electronAPI.saveChar( charDatas, suretosavemod );
}

electronAPI.onSavedMod((cansave) => {
    if(cansave) {
        alertInfo('Mod saved !');
        return;
    }

    isOkTo(
        `\nWARN : A mod already have this name !\nDid you want to add your character in this mod ?\n(If there are a character that have the same id in the other mod this character will be replaced by the character that you want to save.)`,
        (wantoreplace) => {
            if(wantoreplace) saveCharacter(true);
        }
    );
});