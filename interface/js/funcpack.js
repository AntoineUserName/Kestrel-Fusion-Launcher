let isPageFrozen = false;

function setIsPageFrozen(isfrozen) {
    isPageFrozen = isfrozen == true; // be sure that its a boolean

    freezePageElement.style.height = document.body.offsetHeight + 370 + 'px';
    
    freezePageElement.style.display = isfrozen ? '' : 'none';
}



function setScrollLock(islock) {
    document.body.style.overflow = islock ? 'hidden' : '';
}


/**
 * Request to the user to response yes or no from a text gived
 * @param {String} text 
 * @param {Function} after 
 */
function isOkTo(text, after) {

    const popupParent = document.getElementById('center-popup');

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
    <button class="classic-button" style="margin: 5px;">No</button>
    <button class="classic-button" style="margin: 5px;">Yes</button>
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

// DONT ACTIVATE "customisable" FOR TEXT THAT ANYBODY CAN EDIT
function showPopup(text, customisable) {

    const oldScrollY = scrollY;
    const oldScrollX = scrollX;

    const popupParent = document.getElementById('center-popup');

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
    animation: anim-scale-poping 0.2s ease;
    `;

    el.innerHTML = `
    <p></p>
    <button class="classic-button">OK</button>
    `;

    const textElement = el.querySelector('p');

    textElement.innerText = text;

    if(customisable) {
        let isFirstStar = true;
        for (let index = 0; index < textElement.innerHTML.length; index++) {
            const charTxt = textElement.innerHTML[index];
            
            if(charTxt == '*') {

                if(isFirstStar) {
                    textElement.innerHTML = textElement.innerHTML.slice(0, index) + '<strong>' + textElement.innerHTML.slice(index + 1);
                } else {
                    textElement.innerHTML = textElement.innerHTML.slice(0, index) + '</strong>' + textElement.innerHTML.slice(index + 1);
                }

                isFirstStar = !isFirstStar;
            }
        }
    }

    el.querySelector('button').onclick = () => {
        el.remove();
        if(popupParent.childNodes.length == 0) popupParent.style.display = 'none';
        setScrollLock(false);
        scrollTo(oldScrollX, oldScrollY);
    }

    popupParent.appendChild( el );

    popupParent.style.display = '';
    
    setScrollLock(true);
    scrollTo(0, 0);
}

electronAPI.setShowPopup(showPopup);