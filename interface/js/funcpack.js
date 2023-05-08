let isPageFrozen = false;

function setIsPageFrozen(isfrozen) {
    isPageFrozen = isfrozen == true; // be sure that its a boolean

    freezePageElement.style.height = document.body.offsetHeight + 100 + 'px';
    
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


function showPopup(text, infotype) {
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

    el.querySelector('p').innerText = text;
    el.querySelector('button').onclick = () => {
        el.remove();
        popupParent.style.display = 'none';
        setScrollLock(false);
    }

    popupParent.appendChild( el );

    popupParent.style.display = '';
    
    setScrollLock(true);
    scrollTo(0, 0);
}