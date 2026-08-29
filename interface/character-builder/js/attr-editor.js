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
    if(initvalue == null) {
        
        if(type == 'select') {

            // will be edited later

        } else {
            attrInput.value = '';
            onchange(attrInput);
        }
    } else {
        onchange(attrInput);
    }

    
    if(type == 'select') {
        attrInput = document.createElement('select');
        selectChilds.forEach(element => attrInput.appendChild(element));

        
        if(initvalue == null) {
            initvalue = selectChilds[0].value;
            attrInput.value = initvalue;
            onchange(attrInput);
        }
        
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

    if(type == "color") {
        attrInput.style.padding = "2px";
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

    const cancelMButton = document.createElement('button');

    cancelMButton.innerText = 'Cancel';
    cancelMButton.style = `
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

    cancelMButton.onclick = () => {
        isOkTo("Are you sure that you want to quit ?\nIf you have not compiled the mod your modifications won't be saved.", (wantoquit=>{
            if(!wantoquit) return;
            
            electronAPI.goHome();
        }));
    }

    attributEditor.appendChild(cancelMButton);
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
            el.value = el.value.replace(/ /g, '_').replace(/[^0-9a-zA-Z-_]+/g, '').toUpperCase().slice(0, 5); // The limit is 5 letters
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
        value: undefined,
        onchange: (el) => {
            
            if(charTypesList[el.value]) charDatas.class = charTypesList[el.value];
        },
        selectChilds: (()=>{

            let childsOfInput = [];

            for (const key in charTypesList) {
                
                let el = document.createElement('option');

                el.value = key;
                el.innerText = key;
                childsOfInput.push(el);
            }

            return childsOfInput;
        })()
    })

    addAttrInput({
        text: 'other category',
        type: 'select',
        // value: (()=>{
        //     for (const key in charTypesList) {
        //         return charTypesList[key].cat;
        //         break;
        //     }
        // })(),
        value: 'no-cat',
        onchange: (el) => {

            if(el.value == 'no-cat') {
                charDatas.otherClasses = [];
                return;
            }

            if(!charTypesList[el.value]) return;

            charDatas.otherClasses = [ charTypesList[el.value].cat ];
        },
        selectChilds: (()=>{

            let childsOfInput = [];
            
            let firstOption = document.createElement('option');

            firstOption.value = 'no-cat';
            firstOption.innerText = 'Nothing';
            childsOfInput.push( firstOption );

            for (const key in charTypesList) {
                
                let el = document.createElement('option');

                el.value = key;
                el.innerText = key;
                childsOfInput.push(el);
            }

            return childsOfInput;
        })()
    });

    addAttrInput({
        text: 'has chicken',
        type: 'select',
        value: 'no',
        onchange: (el) => {

            charDatas.hasChicken = el.value != 'no';
            
        },
        selectChilds: (()=>{

            let childsOfInput = [];

            for (const key of [
                "no",
                "yes"
            ]) {
                
                let el = document.createElement('option');

                el.value = key;
                el.innerText = key[0].toUpperCase() + key.slice(1);
                childsOfInput.push(el);
            };
            return childsOfInput;
        })()
    });
    

    addAttrInput({
        text: 'Face',
        type: 'select',
        value: 'no_face',
        onchange: (el) => {

            charDatas.face = (el.value == 'no_face') ? undefined : el.value;
            
        },
        selectChilds: (()=>{

            let childsOfInput = [];

            for (const key of [
                ["No face",     "no_face"],

                ["Men face 1",     "STORY_CHASEMCCAIN"],

                ["Men face 2",      "GEN_M_STUBBLE_BLACK"],
                
                ["Woman face 1",    "STORY_ELLIEPHILLIPS"],
                
                ["Woman face 2",    "NPC_CITIZENFEMALE01"]
            ]) {
                
                let el = document.createElement('option');

                el.value = key[1];
                el.innerText = key[0];
                childsOfInput.push(el);
            };

            return childsOfInput;
        })()
    });
    

    
    addAttrInput({
        text: 'Hair Id',
        type: 'text',
        // value: (charDatas.hatcolor || "#4876FE") + "",
        value: (charDatas.hairid || ""),
        onchange: (el) => {
            
            let newVal = el.value+'';
            
            if(newVal.length == 0) {
                charDatas.hairid = null;
                return;
            }

            charDatas.hairid = newVal;
        }
    });
    addAttrInput({
        text: 'Hat Id',
        type: 'text',
        // value: (charDatas.hatcolor || "#4876FE") + "",
        value: (charDatas.hatid || ""),
        onchange: (el) => {
            
            let newVal = el.value+'';
            
            if(newVal.length == 0) {
                charDatas.hatid = null;
                return;
            }

            charDatas.hatid = newVal;
        }
    });
    addAttrInput({
        text: 'Hat Color',
        type: 'color',
        // value: (charDatas.hatcolor || "#4876FE") + "",
        value: (charDatas.hatcolor || "#FFFFFF") + "",
        onchange: (el) => {
            
            let newVal = el.value+'';
            if(newVal.startsWith("#")) {
                charDatas.hatcolor = newVal;
            } else {
                charDatas.hatcolor = null;
            }
        }
    });


    addAttrInput({
        text: 'Animations',
        type: 'select',
        value: 'classic',
        onchange: (el) => {

            charDatas.face = (el.value == 'classic') ? undefined : el.value;
            
        },
        selectChilds: (()=>{

            let childsOfInput = [];

            for (const key of [
                ["Classic",     "classic"],

                ["Frank",     "_FrankHoney"],
                
                ["Chill",     "Collect_2_05_DiscoDude"],

                ["Keep hands behind himself",     "_ChanGoon_02"],
                
                ["Serious",     "_Cop"],
                
                ["Rex",     "_RexFury"],
                

            ]) {
                
                let el = document.createElement('option');

                el.value = key[1];
                el.innerText = key[0];
                childsOfInput.push(el);
            };

            return childsOfInput;
        })()
    });

    
    addAttrInput({
        text: 'Auto Unlocked',
        type: 'select',

        value: charDatas.notAutoUnlocked ? 'no' : 'yes',
        onchange: (el) => {

            charDatas.notAutoUnlocked = el.value != 'yes';
            
        },
        selectChilds: (()=>{

            let childsOfInput = [];

            let listOptionsStr = [
                "yes",
                "no"
            ];


            if(charDatas.notAutoUnlocked) {
                listOptionsStr = [
                    "no",
                    "yes"
                ]
            }

            for (const key of listOptionsStr) {
                
                let el = document.createElement('option');

                el.value = key;
                el.innerText = key[0].toUpperCase() + key.slice(1);
                childsOfInput.push(el);
            };
            return childsOfInput;
        })()

    });
    

    
    
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