const profileListEl = document.getElementById('profile-list');
const activeProfileEl = document.getElementById('active-profile-name');
const currentProfileEl = document.getElementById('current-profile-name');
const gameSaveCountEl = document.getElementById('game-save-count');
const profileSaveCountEl = document.getElementById('profile-save-count');
const createBtn = document.getElementById('create-profile');
const renameBtn = document.getElementById('rename-profile');
const deleteBtn = document.getElementById('delete-profile');
const createModal = document.getElementById('create-profile-modal');
const newProfileInput = document.getElementById('new-profile-name');
const confirmCreateBtn = document.getElementById('confirm-create');
const cancelCreateBtn = document.getElementById('cancel-create');
const selectorModal = document.getElementById('select-modal');
const selectorTitle = document.getElementById('select-modal-title');
const selectorList = document.getElementById('select-modal-list');
const selectorOk = document.getElementById('select-confirm');
const selectorCancel = document.getElementById('select-cancel');
const importModal = document.getElementById('import-modal');
const importBtn = document.getElementById('import-saves');
const closeImportModal = document.getElementById('close-import');
const importProfileBtn = document.getElementById('import-profile-btn');
const importSlotBtn = document.getElementById('import-slot-btn');
const importBackupBtn = document.getElementById('import-backup-btn');
const exportModal = document.getElementById('export-modal');
const exportBtn = document.getElementById('export-saves');
const closeExportBtn = document.getElementById('close-export');
const exportProfileBtn = document.getElementById('export-profile-btn');
const exportSlotBtn = document.getElementById('export-slot-btn');
const dumpSavesBtns = document.querySelectorAll('.dump-saves-btn');
const loadProfileInGame = document.getElementById('load-profile');
const dumpSaveModal = document.getElementById('dump-save-modal');
const dumpSaveInput = document.getElementById('dump-save-name');
const dumpSaveConfirm = document.getElementById('dump-save-confirm');
const dumpSaveCancel = document.getElementById('dump-save-cancel');
const steamCloudModal = document.getElementById('steam-cloud-warning');
const steamCloudOk = document.getElementById('steam-cloud-ok');
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('close-help-btn');

let shouldReopenExportModal = false;

async function startUI() {
    if (!await window.saveAPI.checkJson()) {
        showSteamCloudWarning();
    }
    console.log('saveAPI:', window.saveAPI);
    const res = await window.saveAPI.init();
    if(!res.ok) {
        alert(res.error);
        return;
    }
    applyState(res);
}

function applyState(res) {
    renderStats(res);
    renderProfileList(res.profiles, res.currentProfile, res.activeProfile);
}

let lastSelectedVal = profileListEl.value;

function renderProfileList (profiles, currentProfile, activeProfile) {
    profileListEl.innerHTML = '';

    for (const name of profiles) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if(name === currentProfile) {
            opt.selected = true;
        }
        if(name === activeProfile) {
            opt.textContent += ' (loaded)';
        }
        profileListEl.appendChild(opt);
    }
    
    lastSelectedVal = profileListEl.value;
}

function renderStats (stats) {
    activeProfileEl.textContent = stats.activeProfile || '-';
    currentProfileEl.textContent = stats.currentProfile || '-';

    gameSaveCountEl.textContent = stats.savesInGame ?? '-';
    profileSaveCountEl.textContent = stats.savesInProfile ?? '-';
}

profileListEl.addEventListener('change', async () => {
    const selected = profileListEl.value;
    if(!selected) return;
    lastSelectedVal = selected;
    const res = await window.saveAPI.setCurrentProfile(selected);
    if(!res.ok) {
        alert(res.error);
        return;
    }
    profileListEl.blur();
    renderStats(res);
});
profileListEl.addEventListener('mouseup', (ev) => {

    if(!ev.target) return;
    
    if(ev.target.nodeName == 'OPTION') {

        
        const selected = ev.target.value;

        if(lastSelectedVal != selected) {

            return;
        }
    }

    profileListEl.blur();
    
});


document.querySelector("#see-profiles-backups").addEventListener('click', () => {
    window.saveAPI.seeProfilesBackups();
});


let isRenamingProfile = false;


createBtn.addEventListener('click', () => {
    isRenamingProfile = false;
    confirmCreateBtn.innerText = 'Create';
    newProfileInput.value = '';
    document.querySelector("#create-or-rename-profile-txt").innerText = 'Create New Profile';
    createModal.style.display = 'flex';
});

renameBtn.addEventListener('click', () => {
    isRenamingProfile = true;
    confirmCreateBtn.innerText = 'Rename';
    newProfileInput.value = '';
    document.querySelector("#create-or-rename-profile-txt").innerText = 'Rename Profile';
    createModal.style.display = 'flex';

});

cancelCreateBtn.addEventListener('click', () => {
    createModal.style.display = 'none';
});

confirmCreateBtn.addEventListener('click', async () => {
    let name = (newProfileInput.value||'');
    

    name = name.replace(/\//g, '').replace(/\\/g, '').replace(/\./g, '').trim();

    if(!name) return;


    if(isRenamingProfile) {
        isRenamingProfile = false;

        const res = await window.saveAPI.renameProfile(name);
        if(!res.ok) {
            if(res.error) alert(res.error);
            return;
        }
        createModal.style.display = 'none';
        applyState(res);

        return;
    }

    const res = await window.saveAPI.createProfile(name);
    if(!res.ok) {
        alert(res.error);
        return;    
    }
    createModal.style.display = 'none';
    applyState(res);
});

deleteBtn.addEventListener('click', async () => {
    const res = await window.saveAPI.deleteProfile();
    if(!res.ok){
        alert(res.error);
        return;
    }
    applyState(res);
});

function openSelector(title, entries, onConfirm) {
    selectorTitle.textContent = title;
    selectorList.innerHTML = '';
    for (const name of entries) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        selectorList.appendChild(opt);
    }
    selectorModal.style.display = 'flex';
    selectorOk.onclick = () => {
        const value = selectorList.value;
        selectorModal.style.display = 'none';
        if (value) onConfirm(value);
    };
    selectorCancel.onclick = () => {
        selectorModal.style.display = 'none';
    };
}

importSlotBtn.addEventListener('click', async () => {
    importModal.style.display = 'none';
    const r = await window.saveAPI.importSaveToCurrentProfile();
        if (!r.ok) {
            alert(r.error);
            return;
        }
        applyState(r);
});

importBtn.addEventListener('click', () => {
    importModal.style.display = 'flex';
});

closeImportModal.addEventListener('click', () => {
    importModal.style.display = 'none';
});

importProfileBtn.addEventListener('click', async () => {
    const res = await window.saveAPI.importSaveProfile();
    if (!res.ok) {
        alert(res.error);
        return;
    }
    applyState(res);     
});

importBackupBtn.addEventListener('click', async () => {
    const res = await window.saveAPI.getBackups();
    if(!res.ok) {
        alert(res.error);
        return;
    }
    importModal.style.display = 'none';
    openSelector(
        'Select Backup',
        res.entries,
        async (backup) => {
            const r = await window.saveAPI.importBackup(backup);
            if(!r.ok) {
                alert(r.error);
                return;
            }
            applyState(r);
        }
    );
});

exportBtn.addEventListener('click', () => {
    exportModal.style.display = 'flex';
    shouldReopenExportModal = true;
});

closeExportBtn.addEventListener('click', () => {
    exportModal.style.display = 'none';
});

exportProfileBtn.addEventListener('click', async () => {
    const res = await window.saveAPI.exportProfile();
    if(!res.ok) {
        alert(res.error);
        return;
    };
    exportModal.style.display = 'none';
});

exportSlotBtn.addEventListener('click', async () => {
    const res = await window.saveAPI.getGameSaves();
    if(!res.ok) {
        alert(res.error);
        return;
    };
    exportModal.style.display = 'none';
    openSelector(
        'Select game save slot',
        res.entries,
        async (chosenSlot) => {
            const r = await window.saveAPI.exportSaveToProfile(chosenSlot);
            if(!r.ok) {
                alert(r.error);
                return;
            }
            applyState(r);
        }
    );
});

dumpSavesBtns.forEach(
    el => {

        el.addEventListener('click', () => {
            if(exportModal.style.display != 'none') {
                shouldReopenExportModal = false;
                exportModal.style.display = 'none';
            }
            
            dumpSaveInput.value = '';
            dumpSaveModal.style.display = 'flex';
        });
    }
);


dumpSaveCancel.addEventListener('click', () => {
    dumpSaveModal.style.display = 'none';
    if(shouldReopenExportModal) exportModal.style.display = 'flex';
});

dumpSaveConfirm.addEventListener('click', async () => {

    let name = (dumpSaveInput.value||'');

    name = name.replace(/\//g, '').replace(/\\/g, '').replace(/\./g, '').trim();

    if(!name) return;

    const res = await window.saveAPI.dumpAllSaves(name);
    if (!res.ok) {
        alert(res.error);
        return;
    }
    dumpSaveModal.style.display = 'none';
    applyState(res);
});

loadProfileInGame.addEventListener('click', async () => {
    
    // if (!confirm('Do you really want to load a new profile?\nCurrent profile and active profile must be different.')) {
    //     return;
    // }

    const res = await window.saveAPI.loadProfileToGame();
    if(!res.ok) {
        alert(res.error);
        return;
    }
    applyState(res);
});

function showSteamCloudWarning() {
    steamCloudModal.style.display = 'flex';
}

steamCloudOk.addEventListener('click', () => {
    steamCloudModal.style.display = 'none';
});

helpBtn.onclick = () => {
    helpModal.style.display = 'flex';
};

closeHelpBtn.onclick = () => {
    helpModal.style.display = 'none';
};

startUI();