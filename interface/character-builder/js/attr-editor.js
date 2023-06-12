const attributEditor = document.querySelector('#attributes-editor');

let resetValueIcon = `
<svg style="
width: 15px;
height: 15px;
transform: scale(1.5);
" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
</svg>
`;


function addAttrInput(inputdatas) {

    let {text, type, value: initvalue, onchange, selectChilds} = inputdatas;

    let attrInput = document.createElement('input');
    let label = document.createElement('label');
    label.innerText = text;

    let reloadButton = document.createElement('button');
    reloadButton.className = 'reset-v-button';
    reloadButton.innerHTML = resetValueIcon;
    reloadButton.onclick = () => {
        attrInput.value = initvalue;
        if(attrInput.value == null) attrInput.value = '';
        onchange(attrInput);
    }

    attrInput.innerText = text;
    attrInput.type = type;

    attrInput.value = initvalue;
    if(attrInput.value == null) attrInput.value = '';
    onchange(attrInput);

    
    if(type == 'select') {
        attrInput = document.createElement('select');
        selectChilds.forEach(element => attrInput.appendChild(element));
        
    } else {
        attrInput.onkeydown = (ev) => {
            if(attrInput.value == null) attrInput.value = '';
            onchange(attrInput, ev);
        };
        attrInput.onkeyup = (ev) => {
            if(attrInput.value == null) attrInput.value = '';
            onchange(attrInput, ev);
        };
    }
    
    attrInput.onchange = (ev) => {
        if(attrInput.value == null) attrInput.value = '';
        onchange(attrInput, ev);
    };

    attributEditor.appendChild(label);
    attributEditor.appendChild(attrInput);
    attributEditor.appendChild(reloadButton);
    attributEditor.appendChild(document.createElement('p'));

}



// ** Adding the save button **
(()=>{
    const saveButton = document.createElement('button');

    saveButton.innerText = 'Compile Mod';
    saveButton.style = `
    font-size: 18px;
    padding: 2px 25px;
    cursor: pointer;
    border: 1px solid black;
    border-radius: 5px;
    box-shadow: 0 0 4px #00000038;
    background: white;
    margin-right: 35px;
    margin-top: 6px;
    
    width: 95%;
    margin-left: 2.5%;
    margin-right: 2.5%;
    `;

    saveButton.onclick = () => {
        saveCharacter();
    }

    attributEditor.appendChild(saveButton);
    attributEditor.appendChild(document.createElement('p'));

})();


// ** Adding the cancel button **
(()=>{

    const saveButton = document.createElement('button');

    saveButton.innerText = 'Cancel';
    saveButton.style = `
    font-size: 18px;
    padding: 2px 25px;
    cursor: pointer;
    border: 1px solid black;
    border-radius: 5px;
    box-shadow: 0 0 4px #00000038;
    background: white;
    margin-right: 35px;
    margin-top: 3px;
    
    width: 95%;
    margin-left: 2.5%;
    margin-right: 2.5%;
    `;

    saveButton.onclick = () => {
        isOkTo('Are you sure that you want to quit ?\nIf you have not compiled the mod your modifications are not saved.', (wantoquit=>{
            if(!wantoquit) return;
            
            electronAPI.goHome();
        }));
    }

    attributEditor.appendChild(saveButton);
    attributEditor.appendChild(document.createElement('p'));

})();



// Adding inputs to the attributes bar
electronAPI.onInit((charobj, charTypesList) => {
    
    // Adding manually special inputs :

    addAttrInput({
        text: 'mod name',
        type: 'text',
        value: 'My mod',
        onchange: (el) => {
            el.value = el.value.replace(/[^0-9a-zA-Z-\ ]+/g, '').slice(0, 15); // The limit is 15 letters
            charDatas.modname = el.value;
        }
    });
    
    addAttrInput({
        text: 'mod author',
        type: 'text',
        value: '',
        onchange: (el) => {
            el.value = el.value.slice(0, 22); // The limit is 22 letters
            charDatas.modauthor = el.value;
        }
    });

    addAttrInput({
        text: 'char id',
        type: 'text',
        value: charDatas.id,
        onchange: (el) => {
            el.value = el.value.replace(/ /g, '_').replace(/[^0-9a-zA-Z]+/g, '').toUpperCase().slice(0, 5); // The limit is 5 letters
            charDatas.id = el.value;
        }
    });
    addAttrInput({
        text: 'char name',
        type: 'text',
        value: charDatas.name,
        onchange: (el) => {
            el.value = el.value.replace(/"|\\/g, '');
            charDatas.name = el.value;
        }
    });
    addAttrInput({
        text: 'cheat code',
        type: 'text',
        value: '',
        onchange: (el) => {
            el.value = el.value.replace(/ /g, '').replace(/[^0-9a-zA-Z]+/g, '').toLowerCase();
            if((!el.value) || el.value.length < 6) {
                charDatas.cheatcode = null;
                return;
            }
            el.value = el.value.slice(0, 7); // The limit is 7 letters
            charDatas.cheatcode = el.value;
        }
    });

    addAttrInput({
        text: 'char type',
        type: 'select',
        value: charDatas.class,
        onchange: (el) => {
            if(charTypesList[el.value]) charDatas.class = charTypesList[el.value];
        },
        selectChilds: (()=>{

            let childsOfInput = [];

            for (const key in charTypesList) {
                charTypesList[key];
                let el = document.createElement('option');

                el.value = key;
                el.innerText = key;
                childsOfInput.push(el);
            }

            return childsOfInput;
        })()
    })

    addAttrInput({
        text: 'price',
        type: 'number',
        value: charDatas.price,
        onchange: (el) => {
            let newVal = parseInt(el.value);
            if(Number.isNaN(newVal) || newVal < 0) return;
            charDatas.price = newVal;
        }
    });
    
    // Adding other char attributes input
    for (const key in charDatas.props) {
        
        addAttrInput({
            text: key.replace(/_/g, ' '),
            type: 'number',
            value: charDatas.props[key],
            onchange: (el) => {
                let newVal = parseFloat(el.value);
                if(Number.isNaN(newVal)) return;
                charDatas.props[key] = newVal;
            }
        });
    }
});