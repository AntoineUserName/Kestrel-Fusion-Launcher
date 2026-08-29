const texturesEditor = document.querySelector('#graphic-attributes-editor');


function updateRender() {
    //rendererInputElements.forEach()
}


function addGraphicInput(inputdatas) {

    let {id, name, isImportant} = inputdatas;

    if(isImportant !== false) isImportant = true;

    let baseGInputElement = document.createElement('div');

    let el = document.createElement('button');
    let checkboxHasFile = document.createElement('input');
    let label = document.createElement('label');
    
    checkboxHasFile.type = 'checkbox';
    checkboxHasFile.checked = isImportant == false;

    label.innerText = name + ' ';

    el.innerText = 'Add file';
    el.onclick = () => {
        electronAPI.addAsset(id);
    }

    baseGInputElement.className = 'ginput-element';

    baseGInputElement.appendChild(checkboxHasFile);
    baseGInputElement.appendChild(label);
    baseGInputElement.appendChild(el);
    
    texturesEditor.appendChild(baseGInputElement);
    texturesEditor.appendChild(document.createElement('p'));

    const graphicInputD = {
        id,
        name,
        el,
        label,
        isImportant,
        added: false,
        onNewAsset: (assetfilename, err) => {

            if(err) {
                console.error(err);
                alert(err);
            }
            if(assetfilename == null) {
                assetfilename = '';
                checkboxHasFile.checked = isImportant === false;
                graphicInputD.added = isImportant === false;
                el.innerText = 'Add file';
            } else {
                checkboxHasFile.checked = true;
                graphicInputD.added = true;
                el.innerText = 'Change file';
            }

            label.innerText = name + ' ' + assetfilename;
        }
    };

    graphicInputs.push(graphicInputD);
}





// Adding inputs to the attributes bar
electronAPI.onInit(() => {
    
    // Adding manually special inputs :
    addGraphicInput({
        id: 'FRONT_FACE',
        name: 'Front face',
    });
    addGraphicInput({
        id: 'BACK_FACE',
        name: 'Back face',
    });
    
    addGraphicInput({
        id: 'BODY',
        name: 'Body front',
    });
    
    addGraphicInput({
        id: 'BACK',
        name: 'Body back',
    });
    
    addGraphicInput({
        id: 'ARM_RIGHT',
        name: 'Arm right',
    });
    addGraphicInput({
        id: 'ARM_LEFT',
        name: 'Arm left',
    });
    
    addGraphicInput({
        id: 'BELT',
        name: 'Belt',
    });

    addGraphicInput({
        id: 'LEGS',
        name: 'Legs',
    });
    
    addGraphicInput({
        id: 'HAT.GSC',
        name: 'Hat',
        isImportant: false
    });

    addGraphicInput({
        id: 'HANDS',
        name: 'Hands',
    });
    
    addGraphicInput({
        id: 'ICON',
        name: 'Icon',
    });
    
});