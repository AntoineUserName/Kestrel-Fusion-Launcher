let updaterPopup;

function constructUpdaterElement() {

    if(updaterPopup) return;

    updaterPopup = document.createElement('div');

    updaterPopup.id = 'updater-element';

    updaterPopup.innerHTML = `
    
    <p
    style="
    margin-top: 5px;
    margin-bottom: 5px;
    "
    >A new version exists!\nDo you want to update the app ?</p>
    
    <button
    style="
    font-size: 18px;
    cursor: pointer;
    "
    >Yes</button>
    
    <button
    style="
    font-size: 18px;
    cursor: pointer;
    "
    >Later</button>`;

    updaterPopup.querySelector('button').onclick = () => {
        updaterPopup.remove();
        electronAPI.updateTheApp();
    }
    
    updaterPopup.querySelectorAll('button')[1].onclick = () => {
        updaterPopup.remove();
    }

    document.body.appendChild(updaterPopup);
}


window.onload = () => {
    
    setTimeout(() => {
        
        electronAPI.canUpdate().then(
            canupdate => {
                console.log('can update : ' + canupdate);
                if(!canupdate) return;

                constructUpdaterElement();
            }
        ).catch(
            err => {

                if(err && err.message == 'json is not defined') {
                    console.log(err);
                    return;
                }
                
                console.error(err);

                showPopup("Error while searching an update :\n" + err);
            }
        )

    }, 350);
}