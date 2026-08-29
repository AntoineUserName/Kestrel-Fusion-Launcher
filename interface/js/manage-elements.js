const modContainer = document.getElementById('mod-container');
const freezePageElement = document.getElementById('lock-page');
const modParam = document.getElementById('mod-param');

let totalEnabledMods = 0;
const enabledModsLabelElement = document.querySelector('#total-enabled-mods');

setTimeout(() => {
    enabledModsLabelElement.style.display = '';
}, 350);

let allMods = [];

const onButtonClicked = (ev) => {
    // if(!ev.target) return;
    // console.log(ev);
    
}

const onParamButtonClicked = function (ev) {
  
    let modId = ev.target.parentElement.getAttribute('data-mod-id');

    if(!modId) return;
    
    const popupParent = document.getElementById('center-popup');
    
    if(popupParent.style.display != 'none') return;


    let paramsMenu = document.createElement("div");

    paramsMenu.id = 'mod-params-menu';

    let closeButton = document.createElement("button");
    closeButton.innerText = 'close';
    
    closeButton.onclick = () => {

        paramsMenu.remove();

        if(popupParent.childNodes.length == 0) popupParent.style.display = 'none';
    }

    
    paramsMenu.appendChild( closeButton );
    
    paramsMenu.appendChild(document.createElement("p"));

    let modInfos = allMods.find(m => m.name == modId);

    if(modInfos.params.forEach) {

        modInfos.params.forEach(
            param => {


                let paramName = document.createElement("span");

                paramName.innerText = param.name;

                paramsMenu.appendChild(paramName);

                let paramInput = document.createElement("input");
                // paramInput.style
                paramInput.type = 'checkbox';
                paramInput.ariaLabel = param.name;

                paramInput.checked = param.active == true;

                paramInput.onchange = () => {
                    param.active = paramInput.checked;
                    electronAPI.setModParam(modId, param.name, param.active);
                };

                paramsMenu.appendChild(paramInput);

                if(param.description) {

                    let paramDescr = document.createElement("p");

                    paramDescr.style.marginTop = '2px';
                    paramDescr.style.marginBottom = '2px';

                    paramDescr.innerText = param.description;

                    paramsMenu.appendChild(paramDescr);
                }

                paramsMenu.appendChild(document.createElement("p"));
                

            }
        );

    } else {

        let p = document.createElement("span");

        p.innerText = 'Mistake: in the mod.json the attribute "params" is not a list\nUse the "[" and "]" for making a list of params';

        paramsMenu.appendChild(p);

    }
    
    // paramsMenu.appendChild( closeButton );

    popupParent.appendChild( paramsMenu );

    popupParent.style.display = '';

    
};


const onToogleModClicked = (ev) => {
    let el = ev.target;

    let modNameID = el.parentElement.parentElement.getAttribute('data-mod-id');
    

    onButtonClicked(ev);
    // let isNowUsed = el.querySelector('input').checked;
    let isNowUsed = el.checked;
    setIsActivatedMod( modNameID, isNowUsed );
};

const onModMouseEnter = (ev) => {

    let el = ev.target;

    let modNameID = el.getAttribute('data-mod-id');

    let modinfo = allMods.find(m => m.name == modNameID);

    el.appendChild( modParam );
    modParam.style.display = '';
    
    // Show mod infos :
    modParam.querySelector('div > button').onclick = () => {

        let textInfo;

        if(modinfo.description && typeof(modinfo.description) == 'string') {
            textInfo = "Description :\n" + modinfo.description;
        } else {
            textInfo = "This mod has no description";
        }

        if(Object.entries( modinfo.addons ).length != 0) {
            textInfo += '\nThe mod uses :';

            for (const key in modinfo.addons) {
                if (Object.hasOwnProperty.call(modinfo.addons, key) && modinfo.addons[key]) {
                    textInfo += '\n' + key;
                }
            }
        } else {
            textInfo += "\nThe mod don't use anything, it can be an error.\nIf you are the mod creator check if you have correctly named your folders and try to use a mod.json without \"addons\":{} ";
        }

        showPopup(textInfo);
    }

    // Open mod folders :
    modParam.querySelectorAll('div > button')[1].onclick = () => {
        window.electronAPI.viewMod( modNameID );
    }

    // Uninstall/delete a mod :
    modParam.querySelectorAll('div > button')[2].onclick = () => {
        isOkTo( `Are you sure you want to delete the mod "${modNameID}"`, (wanttoremove) => {
            if(!wanttoremove) return;
            if(isPageFrozen) return;
            setIsPageFrozen(true);

            el.remove();

            window.electronAPI.removeMod( modNameID );
        });
    }
};

const onModMouseLeave = () => {
    modParam.style.display = 'none';
};


const modsWithBG = [];


const addMod = function(modinfo, isused, showModsBG, modsSlashPathDir) {

    allMods.push(modinfo);

    if(isused) {
        totalEnabledMods++;
        enabledModsLabelElement.innerText = totalEnabledMods + ' mods enabled';
    }
    

    let el = document.createElement('div');

    el.className = 'mod-display';

    let modNameID = modinfo.name;

    el.setAttribute('data-mod-id', modNameID);

    el.innerHTML = `
<span></span>
<div class="checkbox-box">
    <input type="checkbox"${isused ? ' checked="true"' : '' }>
    <div class="input-skin"></div>
</div>
<label></label>`;

    //<input type="checkbox" ${isused ? 'checked="true"' : '' }">
    el.querySelector('span').innerText = (modinfo.displayName || modNameID) + '';
    if(modinfo.subLine) {
        if(modinfo.author) {
            el.querySelector('label').innerText = 'made by ' + modinfo.author + ' ' + modinfo.subLine;
        } else {
            el.querySelector('label').innerText = '' + modinfo.subLine;
        }
    } else if(modinfo.author) {
        el.querySelector('label').innerText = 'made by ' + modinfo.author;
    }

    el.querySelector('input').onchange = onToogleModClicked;

    el.onmouseenter = onModMouseEnter;

    el.onmouseleave = onModMouseLeave;

    if(modinfo.params) {
        let paramsButton = document.createElement("button");
        paramsButton.classList.add('param-button');
        paramsButton.innerText = 'options';
        // paramsButton.setAttribute('data-parambmodid', modNameID)
        paramsButton.onclick = onParamButtonClicked;
        el.appendChild(paramsButton);
    }

    
    if(modinfo.hasImg && showModsBG) {
        
        let bgStyle = 'url(' + JSON.stringify(modsSlashPathDir + modNameID + '/img.png') + ')';
        // modsWithBG.push(el, bgStyle);
        modsWithBG.push(el);
        modsWithBG.push(bgStyle);
        el.style.backgroundImage = bgStyle;
    }

    modContainer.appendChild( el );

};

window.electronAPI.setAddMod( addMod );



function setIsActivatedMod(modname, isenable) {

    if(isPageFrozen) return;
    setIsPageFrozen(true); // the page will be unfreeze by the main process when the main process finish the modifications

    window.electronAPI.setModIsActivated(modname, isenable);

    totalEnabledMods += isenable ? 1 : -1;

    enabledModsLabelElement.innerText = totalEnabledMods + ' mods enabled';
}


// Code of the "..." button at the right of the mod profile
(()=>{

    modParam.querySelectorAll('button').forEach(
        el => {
            el.style = `
            padding: 5px 15px;
            border: 0.4px solid black;
            border: none;
            border-top: 1px solid gray;
            border-bottom: 1px solid gray;
            background: white;
            font-size: 20px;
            cursor: pointer;
            `;
        }
    );

    // Events to show/hide mod actions :
    
    modParam.onmouseenter = () => {
        
        const modActionStyle = modParam.querySelector('div').style;

        if(modActionStyle.display == 'flex') return;

        modActionStyle.display = 'flex';
    }

    modParam.onmouseleave = () => {
        
        const modActions = modParam.querySelector('div');

        if(modActions.style.display == 'none') return;

        modActions.style.display = 'none';
    }

})();



// document.body.

window.addEventListener('focus', (ev) => {

    // console.log('focus', ev);
    
    let index = modsWithBG.length;
    while (index > 1) {
        
        index -= 2;

        modsWithBG[index].style.backgroundImage = modsWithBG[index+1];

        // console.log(modsWithBG[index], modsWithBG[index+1]);
        
        
    }

});


window.addEventListener('blur', (ev) => {

    // console.log('blur', ev);
    
    let index = modsWithBG.length;
    while (index > 1) {
        
        index -= 2;

        modsWithBG[index].style.backgroundImage = '';
        
    }

});




document.querySelector('#add-mod').onclick = (ev) => {
    onButtonClicked(ev);
    if(isPageFrozen) return;

    setIsPageFrozen(true);
    window.electronAPI.addMod();
};
document.querySelector('#create-mod').onclick = (ev) => {
    onButtonClicked(ev);
    
    window.electronAPI.clickedCreateMod();
};

document.querySelector('#launch-game button').onclick = (ev) => {
    onButtonClicked(ev);
    if(isPageFrozen) return;
    setIsPageFrozen(true);

    window.electronAPI.launchGame();

    ev.target.blur();
}

document.querySelector("#input-search-mod").onkeyup = () => {

    let enabledModsOnly = document.querySelector('input[data-showenableonly="true"]').checked;

    let searchVal = (document.querySelector("#input-search-mod").value+"").toLowerCase();


    if(searchVal == "") {
        if(enabledModsOnly) {
            document.querySelectorAll(".mod-display > span").forEach(el => {

                if(el.parentElement.querySelector('input').checked) {
                    el.parentElement.style.display = "";
                } else {
                    el.parentElement.style.display = "none";
                }
        
            });
        } else {
            document.querySelectorAll(".mod-display > span").forEach(el => {

                el.parentElement.style.display = "";
        
            });
        }
        return;
    }

    if(enabledModsOnly) {
        document.querySelectorAll(".mod-display > span").forEach(el => {
        
            if(el.innerText.toLowerCase().includes(searchVal)) {
                
                if(el.parentElement.querySelector('input').checked) {
                    el.parentElement.style.display = "";
                } else {
                    el.parentElement.style.display = "none";
                }

            } else {
                el.parentElement.style.display = "none";
            }

        });
    } else {
        document.querySelectorAll(".mod-display > span").forEach(el => {
        
            if(el.innerText.toLowerCase().includes(searchVal)) {
                el.parentElement.style.display = "";
            } else {
                el.parentElement.style.display = "none";
            }

        });
    }

}




if(Math.random() < 0.09) {

    if(Math.random() > 0.6) {

        document.querySelector("h1").innerText = 'Kernel Fusion Laundry';
    
    } else {

        if(Math.random() > 0.9) {
        
            document.querySelector("h1").style.rotate = '350deg';
        
        } else {

            const txtsTitles = [
                'Lost hours on a ";" 👍',
                'For safety, avoid touching the sun',
                'computer electricity detected✅',
                'KF: Yo thanks for using me again!\nI wont crash this ti-'
            ];

            document.querySelector("h1").innerText += '\n' + txtsTitles[Math.floor(Math.random() * txtsTitles.length)];

        }
    }
}




let lastElIFocus;
const setElFocused = (el) => {
    if(lastElIFocus) lastElIFocus.classList.remove('inputfocus');
    el.focus();
    el.classList.add('inputfocus');
    lastElIFocus = el;
}

const gotoNext = (skipEl = false) => {
    
    if(!document.hasFocus()) return;

    if(isShowingPopup) {
        let okButton = document.querySelector("#center-popup button");
        if(okButton) {
            okButton.focus();
        }
        return;
    }
    
    if(document.activeElement) {
        if(document.activeElement.id == 'add-mod') {
            setElFocused(document.querySelector("#launch-game button"));
            // document.querySelector("#input-search-mod"))
            return;
        }

        if(document.activeElement.id == 'input-search-mod') {
            let allModsInputs = [];
            document.querySelectorAll(".mod-display input").forEach(
                elInput => {
                    if(elInput.parentElement.parentElement.style.display != 'none') allModsInputs.push(elInput);
                }
            );
            let nextEl = allModsInputs[0];
            

            if(nextEl) {
                setElFocused(nextEl);
                return;
            }
        }

        if(document.activeElement == document.querySelector("#launch-game button")) {
            // document.querySelector("#add-mod"))
            setElFocused(document.querySelector("#input-search-mod"));
            return;
        }

        if(skipEl == false && document.activeElement.parentElement && document.activeElement.parentElement.parentElement && document.activeElement.parentElement.parentElement.classList.contains('mod-display')) {
            // if(document.activeElement.nextElementSibling) {
            //     document.activeElement.nextElementSibling)
            //     document.activeElement.nextElementSibling.scrollIntoView();
            //     return;
            // }

            let allModsInputs = [];
            document.querySelectorAll(".mod-display input").forEach(
                elInput => {
                    if(elInput.parentElement.parentElement.style.display != 'none') allModsInputs.push(elInput);
                }
            );


            let index = allModsInputs.length;
            while (index > 0) {
                index--;
                let o = allModsInputs[index];
                if(o == document.activeElement) {
                    let nextEl = allModsInputs[index + 1];
                    if(nextEl) {
                        setElFocused(nextEl);
                        // nextEl.scrollIntoView();
                        window.scrollTo({
                            'behavior': 'instant',
                            top: nextEl.clientTop - 40
                        });
                    } else {
                        setElFocused(document.querySelector("#launch-game button"));
                    }
                    return;
                }
            }

        }

        // document.querySelector("#input-search-mod"))
        
        setElFocused(document.querySelector("#launch-game button"));

    } else {
        setElFocused(document.querySelector("#launch-game button"));
    }

}

function gotoPrev() {

    if(!document.hasFocus()) return;

    if(isShowingPopup) {
        let okButton = document.querySelector("#center-popup button");
        if(okButton) okButton.focus();
        return;
    }

    if(document.activeElement) {

        if(document.activeElement.parentElement && document.activeElement.parentElement.id == 'launch-game') {
            setElFocused(document.querySelector("#add-mod"));
            return;
        }

        if(document.activeElement.id == 'input-search-mod') {
            setElFocused(document.querySelector("#launch-game button"));
            return;
        }
        
        if(document.activeElement.id == 'add-mod') {
            setElFocused(document.querySelector("#input-search-mod"));
            return;
        }
        
        if(document.activeElement.parentElement && document.activeElement.parentElement.parentElement && document.activeElement.parentElement.parentElement.classList.contains('mod-display')) {
            // if(document.activeElement.nextElementSibling) {
            //     document.activeElement.nextElementSibling.focus();
            //     document.activeElement.nextElementSibling.scrollIntoView();
            //     return;
            // }

            let allModsInputs = [];
            document.querySelectorAll(".mod-display input").forEach(
                elInput => {
                    if(elInput.parentElement.parentElement.style.display != 'none') allModsInputs.push(elInput);
                }
            );

            let index = allModsInputs.length;
            while (index > 0) {
                index--;
                let o = allModsInputs[index];
                if(o == document.activeElement) {
                    let nextEl = allModsInputs[index - 1];
                    if(nextEl) {
                        setElFocused(nextEl);
                        // nextEl.scrollIntoView();
                        // window.scrollY -= 40;
                        window.scrollTo({
                            'behavior': 'instant',
                            top: nextEl.clientTop - 40
                        });
                    } else {
                        setElFocused(document.querySelector("#launch-game button"));
                    }
                    return;
                }
            }

        }


        let prevEl = document.activeElement.previousElementSibling;

        if(prevEl) setElFocused(prevEl);

    } else {
        setElFocused(document.querySelector("#launch-game button"));
    }
}

addEventListener('keydown', ev => {

    let key = (ev.key+'').toLowerCase();

    if(ev.ctrlKey) {
        if(key == 'r') {
            location.reload();
            return;
        }

        if(key == 'f') {
            document.querySelector("#input-search-mod").focus();
            return;
        }
    }

    if(true) {
        
        if(key == 'arrowright' || key == 'arrowdown') {

            if((!document.activeElement) || document.activeElement.nodeName != 'INPUT' || document.activeElement.type != 'text' || document.activeElement.selectionStart == document.activeElement.value.length) {
                gotoNext(ev.shiftKey);
            }
        }
        if(key == 'arrowleft' || key == 'arrowup') {
            if((!document.activeElement) || document.activeElement.nodeName != 'INPUT' || document.activeElement.type != 'text' || document.activeElement.selectionStart == 0) {
                gotoPrev();
            }
        }
    }


    if(key == 'tab') {
        if(ev.shiftKey) {
            gotoPrev();
        } else {
            gotoNext();
        }
        ev.preventDefault();
    }

});


addEventListener('gamepadconnected', (ev) => {
    
    let intervId = 0;

    let lastY = 0;
    let lastX = 0;

    let canClick = true;

    let intervalTime = 50;

    let holdButtonTime = 0;

    let isWindowHidden = false;

    let didControllerLeaved = false;

    function onFocusWindowChanged() {
        
        if(didControllerLeaved) {
            removeEventListener('focus', onFocusWindowChanged);
            
            return;
        }

        if(document.hasFocus()) {

            if(isWindowHidden) {
                isWindowHidden = false;
                intervId = setInterval(tickOnController, intervalTime);
                console.log('window visible now');
            }

            return;
        }

        if(!isWindowHidden) {
            isWindowHidden = true;
            clearInterval(intervId);
            console.log('window hidden now');
        }

    }

    function tickOnController() {
        let gamepad = navigator.getGamepads(); // Get the first controller
    
        if(gamepad) gamepad = gamepad[0];

        if(document.hidden || (!document.hasFocus())) {
            onFocusWindowChanged();
            return;
        }

        if(gamepad) {

            // console.log(holdButtonTime);
            

            // gamepad.axes[0] // == 1 : right
            // gamepad.axes[1] // == -1 : up

            let x = gamepad.axes[0];
            let y = gamepad.axes[1];
            
            if(x > 0.35) x = 1;
            if(x < -0.35) x = -1;

            if(y > 0.35) y = 1;
            if(y < -0.35) y = -1;

            let hasMadeIt = false;

            if(x != lastX) {

                if(x == 1) {
                    hasMadeIt = true;
                    gotoNext();
                }
                else if(x == -1) {
                    hasMadeIt = true;
                    gotoPrev();
                }

            } else {


                if(holdButtonTime > 400) {
                    if(x == 1 || y == 1) {
                        hasMadeIt = true;
                        gotoNext();
                    }
                    else if(x == -1 || y == -1) {
                        hasMadeIt = true;
                        gotoPrev();
                    }
                } else {
                    
                    if(x == 1 || x == -1) {
                        hasMadeIt = true;
                        holdButtonTime += intervalTime;
                    } else {
                        if(y == 1 || y == -1) {
                            holdButtonTime += intervalTime;
                            hasMadeIt = true;
                        }
                        // else {
                        //     holdButtonTime = 0;
                        // }
                    }
                }
                

            }

            if(y != lastY && hasMadeIt == false) {
                if(y == 1) {
                    gotoNext(true);
                }
                else if(y == -1) {
                    gotoPrev();
                }
                else {
                    holdButtonTime = 0;
                }
            }

            lastX = x;
            lastY = y;


            const buttons = gamepad.buttons;
            
            if(buttons[1] && buttons[1].pressed) {
                
                if(canClick) {
                    
                    if(document.hasFocus() && document.activeElement) document.activeElement.click();
                }

                canClick = false;
            } else {
                canClick = true;
            }

            // for (let i = 0; i < buttons.length; i++) {
            //     if (buttons[i].pressed) {
            //         console.log(buttons[i]);
                    
            //     }
            // }
        } else {
            clearInterval(intervId);
            console.log('controller disconnected');
            didControllerLeaved = true;
            
            removeEventListener('focus', onFocusWindowChanged);
            
        }
    }

    console.log('controller connected');
    intervId = setInterval(tickOnController, intervalTime);
    
    
    addEventListener('focus', onFocusWindowChanged);
    

});