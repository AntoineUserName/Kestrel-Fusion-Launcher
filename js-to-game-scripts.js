const config = require('./config-manager');

const specialCharC = '_';

const logJSConnection = false;

const communicationCodes = {
    START: "KF_MODDING_VARIABLE_F547591_END",
    JS_CONNECTED: "JS_CONNECTED",

    MSG_SENT_STR: 2999999, // when send a string msg, int-c var is this
    MSG_SENT_INT: specialCharC + 'INT_SENT', // when send an int msg, str-c var is this
    MSG_SENT_FLOAT: specialCharC + 'FLOAT_SENT', // when send an int msg, str-c var is this
    MSG_SENT_FAST_FLOAT: specialCharC + 'F_FLOAT_SENT',
    MSG_SENT_NEGATIVE_FLOAT: specialCharC + 'N_FLOAT_SENT', // when send an int msg, str-c var is this
    // MSG_SENT_BIG_INT: specialCharC + 'INT_B_SENT', // when send an big int msg, str-c var is this

    // SMALL_INT_LIMIT: 2999998,

    END_MSG: specialCharC + 'END_MSG',

    responses: { // The responses of the INT-C var
        CONNECTED: 46543,
        MSG_RECEIVED: 2399999
    }
};


const memoryAddr = {
    mapLoaded: 0x17F86A0,
    playerRot: {
        offsets: [0x01C74920, 0x218],
        addr: null
    },
    playerPos: {
        initBase: 0x01C77C78,
        initX: 0x90,
        initY: 0x94,
        initZ: 0x98,
        base: null,
        x: null,
        y: null,
        z: null
    },
    vehicle: {
        initBase: 0x01C77C68,
        offsets: [0x90, 0x678, 0x428, 0, 0x348, 0xC8],
        varOffsets: {
            posX: 0,
            posY: 0x4,
            posZ: 0x4 + 0x4,
            
            // rot: 0x4 * 5,
            rot: 0x4 * 7,

            velX: 0x4 * 8,
            velY: 0x4 * 9,
            velZ: 0x4 * 10,
        },
        base: null
    },
    intCommunicationVar: {
        //initAddr: Number(0x017ECA08),
        // initAddr: 0x017ECA08,
        initAddr: 0x017ECA08,
        // offsets: [0xD10, 0xA10, 0x0, 0x10, 0xD0, 0x40, 0x48],
        offsets: [0x48, 0x40, 0xD0, 0x10, 0x0, 0xA10, 0xD10],
        resultAddr: null
    }
};


let memoryjs;
let gameProcess;

let strCommunicationVarAddr;
// let modRequests = [];
let canModsCommunicate = false;
let isJSConnected = false;
let isGameStopped = false;
let lastModifiedValue = communicationCodes.START;
let eventsOnConnected = [];
let eventsOnDisconnected = [];
let onMsgEvents = {};

let allModsShortcuts = [];



let isUsingNumberOnlyAnywhere = false;


let isUsingNumberOnly = false;
let detectSubLevels = false;

let isInSubLevel = false;


const sleep = (time) => new Promise((resolve) => {
    setTimeout(() => {
        resolve();
    }, time);
});

// function logConnectionState(msg) {
//     if(!logJSConnection) return;
//     console.log('[JS-to-game-scripts-API] : ' + msg);
// }


const logConnectionState = logJSConnection ? (
    
    () => {}

) : (

    (msg) => {
        console.log('[JS-to-game-scripts-API] : ' + msg);
    }

);


if(logJSConnection) {


    logConnectionState('logs enabled!');
    console.trace();
}




const reloadIntVarAddr = function() {
    try {
        memoryAddr.intCommunicationVar.resultAddr = getAddrWithOffsets(
            // Addr :
            gameProcess.modBaseAddr + memoryAddr.intCommunicationVar.initAddr,
            // Offsets :
            memoryAddr.intCommunicationVar.offsets
        );
    } catch (error) {
        console.error(error);
        console.log('ERROR WHILE RELOADING THE INT-C VAR ADDRESS');
    }
    
};

/**
 * If cannot read variable return null, else number
 * @returns {Number}
 */
const getIntCommunicationValue = function() {

    // if(gameProcess == null || isGameStopped) return null;
    if(isGameStopped) return null;


    if( memoryAddr.intCommunicationVar.resultAddr == null ) reloadIntVarAddr();
    
    let varIntValue = null;

    try {
        varIntValue = memoryjs.readMemory(gameProcess.handle, memoryAddr.intCommunicationVar.resultAddr, memoryjs.UINT32);
    } catch (error) {
        console.error(error);
        console.log('ERROR WHILE READING INT-C VARIABLE');
        console.log('trying reload addr..');
        reloadIntVarAddr();
        try {
            varIntValue = memoryjs.readMemory(gameProcess.handle, memoryAddr.intCommunicationVar.resultAddr, memoryjs.UINT32);
            console.log('VAR ADDRESS RELOADED SUCCESSFULLY, NO PROBLEMS FOR READING THE INT-C VARIABLE');
        } catch (error) {
            console.error(error);
            console.log("THE RELOAD DON'T WORKED, IMPOSSIBLE TO READ THE INT-C VARIABLE");
            varIntValue = null;
        }
    }
    

    return varIntValue;
};



/**
 * Return if the city is loaded
 * @returns {Boolean}
 */
const isMapLoaded = function() {

    let v;

    if(isInSubLevel) {
        // return v == 0;

        v = getIntCommunicationValue();
        
        // return lastSetIntCVal == v || v != 20 || v != 465412;
        return lastSetIntCVal == v || v != 465412;

        // return exports.player.position.getX() != null;
    }

    v = memoryjs.readMemory(gameProcess.handle, gameProcess.modBaseAddr + memoryAddr.mapLoaded, memoryjs.INT);

    return v != 0 && v != null;

    // return isInSubLevel || memoryjs.readMemory(gameProcess.handle, gameProcess.modBaseAddr + memoryAddr.mapLoaded, memoryjs.INT) != 0;
}
// exports.isMapLoaded = isMapLoaded;

const isSafeToEditVars = function() {
    
    return isJSConnected;

    // return isGameStopped == false && isMapLoaded(); 

    try {
        
        if(
            memoryjs.getProcesses().find(p => p.szExeFile == exports.modInfos.exeGameName)
            == null
        ) return false;

    } catch(err) {

        console.error(err);
        console.log('error while checking if can edit vars');
        return false;
    }

    return isMapLoaded();
}


/**
 * Change the value of the string communication variable
 * @param {String} newval 
 */
const setStringCommunicationVarValue = function(newval) {

if( false ) {
    try {
        let varU = memoryjs.readMemory(gameProcess.handle, strCommunicationVarAddr, memoryjs.STRING);

        if(varU != lastModifiedValue) {
            console.log('The variable changed his address, cannot communicate to game scripts.');
            return false;
        }
    } catch (error) {
        console.error(error);
        console.log('The variable changed his address, cannot communicate to game scripts.');
        return false;
    }
}

    if( !isSafeToEditVars() ) return false;
    
    try {

        memoryjs.writeMemory(gameProcess.handle, strCommunicationVarAddr, newval, memoryjs.STRING);
        lastModifiedValue = newval;
        return true;

    } catch (error) {
        console.log('ERROR WHILE EDITING COMMUNICATION VARIABLE VALUE');
        console.error(error);
        return false;
    }
};

let lastSetIntCVal = -1;

/**
 * Change value of the int communication variable
 * @param {Number} newval 
 * @returns {Boolean}
 */
const setIntCommunicationVarValue = function(newval) {
    
    if( !isSafeToEditVars() ) return false;
    
    function reloadIntVarAddr() {
        try {
            memoryAddr.intCommunicationVar.resultAddr = getAddrWithOffsets(
                // Addr :
                // Number(gameProcess.modBaseAddr),
                // not good Number(gameProcess.modBaseAddr) + Number(memoryjs.findModule(gameProcess.szExeFile, gameProcess.th32ProcessID).modBaseAddr),
                Number(gameProcess.modBaseAddr) + Number(memoryAddr.intCommunicationVar.initAddr),
                // Offsets :
                memoryAddr.intCommunicationVar.offsets
            );
        } catch (error) {
            console.error(error);
            console.log('ERROR WHILE RELOADING THE INT-C VAR ADDRESS');
        }
        
    }

    if( memoryAddr.intCommunicationVar.resultAddr == null ) reloadIntVarAddr();

    try {
        lastSetIntCVal = newval;
        memoryjs.writeMemory(gameProcess.handle, memoryAddr.intCommunicationVar.resultAddr, newval, memoryjs.UINT32);
    } catch (error) {
        console.error(error);
        console.log('ERROR WHILE EDITING INT-C VARIABLE');
        console.log('trying reload addr..');
        reloadIntVarAddr();
        try {
            memoryjs.writeMemory(gameProcess.handle, memoryAddr.intCommunicationVar.resultAddr, newval, memoryjs.UINT32);
            console.log('VAR ADDRESS RELOADED SUCCESSFULLY, NO PROBLEMS FOR EDITING THE INT-C VARIABLE');
        } catch (error) {
            console.error(error);
            console.log("THE RELOAD DON'T WORKED, IMPOSSIBLE TO EDIT THE INT-C VARIABLE");
            return false;
        }
    }

    return true;
};






/**
 * @param {Number} waitingvalue 
 */
const waitForIntCValue = function(waitingvalue, maxMStowait) {

    return new Promise(async(resolve, reject) => {

        let isRejected = false;

        try {
            
            while ( getIntCommunicationValue() != waitingvalue ) {
                if(maxMStowait != null) {
                    maxMStowait -= 35;
                    // maxsecondstowait -= 15;
                    
                    if(maxMStowait < 0) {
                        isRejected = true;
                        reject();
                        break;
                    }
                }
                await sleep(35);
                // await sleep(15);
            }
        } catch (error) {
            console.error(error);
            throw error;
        }

        if(!isRejected) resolve();
    });
};



const setIntCommunicationVarValue_NoCheck = function(newval) {
    
    if( isGameStopped ) return false;
    
    function reloadIntVarAddr() {
        try {
        
            lastSetIntCVal = newval;
            memoryAddr.intCommunicationVar.resultAddr = getAddrWithOffsets(
                // Addr :
                // Number(gameProcess.modBaseAddr),
                // not good Number(gameProcess.modBaseAddr) + Number(memoryjs.findModule(gameProcess.szExeFile, gameProcess.th32ProcessID).modBaseAddr),
                Number(gameProcess.modBaseAddr) + Number(memoryAddr.intCommunicationVar.initAddr),
                // Offsets :
                memoryAddr.intCommunicationVar.offsets
            );
        } catch (error) {
            console.error(error);
            console.log('ERROR WHILE RELOADING THE INT-C VAR ADDRESS');
        }
        
    }

    if( memoryAddr.intCommunicationVar.resultAddr == null ) reloadIntVarAddr();

    try {
        memoryjs.writeMemory(gameProcess.handle, memoryAddr.intCommunicationVar.resultAddr, newval, memoryjs.UINT32);
    } catch (error) {
        console.error(error);
        console.log('ERROR WHILE EDITING INT-C VARIABLE');
        console.log('trying reload addr..');
        reloadIntVarAddr();
        try {
            memoryjs.writeMemory(gameProcess.handle, memoryAddr.intCommunicationVar.resultAddr, newval, memoryjs.UINT32);
            console.log('VAR ADDRESS RELOADED SUCCESSFULLY, NO PROBLEMS FOR EDITING THE INT-C VARIABLE');
        } catch (error) {
            console.error(error);
            console.log("THE RELOAD DON'T WORKED, IMPOSSIBLE TO EDIT THE INT-C VARIABLE");
            return false;
        }
    }

    return true;
};



/**
 * @param {Number} address 
 * @param {Number[]} offsets 
 * @returns 
 */
const getAddrWithOffsets = (address, offsets) => {

    if(typeof(address) != 'number') address = Number(address);

    try {
        address = Number(
            memoryjs.readMemory(gameProcess.handle, address, memoryjs.INT64)
        );
    } catch (error) {
        console.log('error first address not pointer');
        throw error;
    }

    for (let i = 0; i < offsets.length - 1; i++)
    {
        try {
            address = memoryjs.readMemory(gameProcess.handle, address + Number(offsets[i]), memoryjs.INT64);

            if(!address) throw 'Offset returned "0"';

            address = Number(address);

            // console.log('worked with :');
            // console.log('addr : ' + address);
            // console.log('offset : ' + offsets[i]);
            // address = memoryjs.readMemory(gameProcess.handle, address + offsets[i], memoryjs.INT64);
        } catch (error) {
            
            error = 'not worked with :\nAddr : ' + address + '\noffset : ' + offsets[i] + '\n' + error;

            throw error;
            break;
        }
    }

    return address + offsets[offsets.length - 1];

    // return offsets.reduce((a, b, index, array) => {
    //     console.log('a : ' + a);
    //     console.log('b : ' + b);
    //     if(typeof(a) != 'Number') a = Number(a);
    //     if(typeof(b) != 'Number') b = Number(b);
    //     if (index === array.length - 1) {
    //         console.log('b');
    //         return Number(a + b);
    //     }
    //     const value = Number( memoryjs.readMemory(gameProcess.handle, Number(a + b), memoryjs.INT64) );
    //     // const value = Number( memoryjs.readMemory(gameProcess.handle, a + b, memoryjs.INT64) );
    //     // console.log('p : ' + value );
    //     return value;
    // }, address);
};

// const getValueWithOffsets = (address, offsets, type) => {
//     return offsets.reduce((a, b, index, array) => {
//         const value = memoryjs.readMemory(gameProcess.handle, a + b, memoryjs.INT64);
//         if (index === array.length - 1) {
//             return memoryjs.readMemory(gameProcess.handle, a + b, type); // If we're at the last offset, we don't want to read it's value as a pointer, but rather the type it should be, instead. If you want the end address instead of the value (then return a + b)
//         }
//         return value;
//     }, address);
// }


// When JS is connected to game scripts
function onTotallyConnected() {

    isJSConnected = true;

    if(isUsingNumberOnly) {
        
        // auto done

    } else {
    
        console.log('Response received successfully, communication openned.');
        canModsCommunicate = true;
    }

    eventsOnConnected.forEach(eventfunc=>{
        eventfunc({unsubscribe:()=>{eventsOnConnected = eventsOnConnected.filter(ev => ev != eventfunc)}});
    });

    // Check everytime if the map is loaded (else isJSConnected = false) :
    let intervDiscoUpdater = setInterval(() => {
        if(isGameStopped === false && isMapLoaded()) {

            // check if sent a msg
            if(canModsCommunicate) {
                checkMessagesFromScripts();
            }

            return;
        }

        onJSDisconnected();
    }, 900);
    
    eventsOnDisconnected.push((ev)=>{
        ev.unsubscribe();
        clearInterval(intervDiscoUpdater);
    });
}


// When JS is disconnected to game scripts
async function onJSDisconnected() {

    isJSConnected = false;
    canModsCommunicate = false;

    if(isInSubLevel) {
        isInSubLevel = false;
    }

    if(allModsShortcuts.length > 0) {
        let electronAPIShortcut = require('electron').globalShortcut;
        
        allModsShortcuts.forEach(modShortcut => {
            if(!electronAPIShortcut.isRegistered(modShortcut.shortcutKey)) return;

            electronAPIShortcut.unregister(modShortcut.shortcutKey);
        });

        allModsShortcuts = [];
    }

    exports.keyboard.removeAllInputs();

    onMsgEvents = {};

    // If the game is totally stopped
    if(isGameStopped) {
        console.log('JS communication closed.');

        if(gameProcess != null) memoryjs.closeProcess(gameProcess.handle);

        gameProcess = null;

        eventsOnDisconnected.forEach(eventfunc=>{
            eventfunc({cannotRestart: true, unsubscribe:()=>{eventsOnDisconnected = eventsOnDisconnected.filter(ev => ev != eventfunc)}});
        });
        
        // Remove the events when the game is closed :
        eventsOnConnected = [];
        eventsOnDisconnected = [];

        // Clear the onlineMod plugins :
        exports.onlineMod.clientPlugins = [];
        //exports.onlineMod.serverPlugins = [];
        return;
    }
    
    console.log('JS communication closed, waiting for level loaded..');

    eventsOnDisconnected.forEach(eventfunc=>{
        eventfunc({unsubscribe:()=>{eventsOnDisconnected = eventsOnDisconnected.filter(ev => ev != eventfunc)}});
    });

    memoryAddr.playerPos.base = null;


    if( true ) {

        resetSearchSubLevel();

        try {

            if(isUsingNumberOnlyAnywhere) {

                while ( checkSubLevel() == false ) {
                    await sleep(800);
                    if(isGameStopped) return;
                }

            } else {
            
                while ( isMapLoaded() == false && checkSubLevel() == false ) {

                    await sleep(800);
                    if(isGameStopped) return;
                }
            }

            console.log('level loaded');

        } catch (error) {
            console.error(error);
            console.log('ERROR WHILE WAITING FOR LOADING THE MAP');
            return;
        }
    } else {
        //await sleep(40 * 1000);
        await sleep(1000);
    }
    

    if(!isInSubLevel) {
        
        isUsingNumberOnly = isUsingNumberOnlyAnywhere;
        sendRequestJSMsg = isUsingNumberOnly ? sendRequestJSMsg_NumberOnly : sendRequestJSMsg_StringC;
    }
    
    
    if(isUsingNumberOnly) {
        onTotallyConnected();
        return;
    }
    
    await sleep(4000);

    strCommunicationVarAddr = null;
    memoryAddr.intCommunicationVar.resultAddr = null;

    try {
        await searchStrCVar();
    } catch (error) {
        console.error(error);
        return;
    }

    onTotallyConnected();
}

/**
 * Searching the string communication variable :
 */
async function searchStrCVar() {

    const offsetStrC = 2;
    
    const toPattern = str => Buffer.from(str).toString('hex').replace(/..\B/g, '$& ').toUpperCase();

    let varPattern = toPattern( communicationCodes.START ).replace(/ /g, '');

    varPattern = '0200' + varPattern;
    // varPattern = '0200' + varPattern + '00';

    console.log('Searching STR-C variable..');

    async function searchStringCVar() {

        let triesFindingPNumber = 0;

        while (true) {

            if(
                // memoryjs.getProcesses().find(p => p.szExeFile == exports.modInfos.exeGameName) == null
                isGameStopped
            ) {
                console.log('Process stopped, variable searching closed.');
                throw 'game process stopped';
                return;
            }

            console.log('wait for edit vars..');
            while (!isSafeToEditVars()) {
                await sleep(100);
            }

            let stringAddress;

            if(triesFindingPNumber == 0 && false) {
                // OLD METHOD, NOT USED :
                stringAddress = await new Promise((resolve) => {
                    // memoryjs.findPattern(gameProcess.handle, 501750802108, varPattern, 0, 0, (error, address) => {
                    memoryjs.findPattern(gameProcess.handle, 50802108, varPattern, 0, 0, (error, address) => {
                        if(error) {
                            console.log('error while searching str-c var with init offset :');
                            console.error(error);
                            resolve(null);
                            return;
                        }
                        resolve(address);
                    });
                });
            } else if(strCommunicationVarAddr) {
                stringAddress = await new Promise((resolve) => {
                    memoryjs.findPattern(gameProcess.handle, strCommunicationVarAddr + 5, varPattern, 0, 0, (error, address) => {
                    // memoryjs.findPattern(gameProcess.handle, gameProcess.modBaseAddr + (strCommunicationVarAddr + 5), varPattern, 0, 0, (error, address) => {
                        if(error) {
                            console.log('error while searching str-c var with offset :');
                            console.error(error);
                            resolve(null);
                            return;
                        }
                        resolve(address);
                    });
                });
            } else {
                stringAddress = await new Promise((resolve) => {
                    memoryjs.findPattern(gameProcess.handle, varPattern, 0, 0, (error, address) => {
                        if(error) {
                            console.log('error while searching str-c var :');
                            console.error(error);
                            resolve(null);
                            return;
                        }
                        resolve(address);
                    });
                });
            }

            triesFindingPNumber++;

            // // searching just on the main module :
            // const stringAddress = memoryjs.findPattern(gameProcess.handle, gameProcess.szExeFile, varPattern, 0, 0);

            if(stringAddress) {
                stringAddress = Number(stringAddress) + offsetStrC;
                strCommunicationVarAddr = stringAddress;
                console.log('STR-C variable found');
                break;
            } else {
                strCommunicationVarAddr = null;
                console.log('STR-C variable not found');
                console.log('Retry..');
            }

            await sleep(800);
        }

    }

    async function testNewSTRCVar() {

        let oldStrCVarAddr = strCommunicationVarAddr;

        await searchStringCVar();

        await sleep(1000);

        if(oldStrCVarAddr && getIntCommunicationValue() == communicationCodes.responses.CONNECTED) {
            console.log('finally the var addr was the good');
            strCommunicationVarAddr = oldStrCVarAddr;
            return;
        }
    
        console.log('saying that js is connected..');
        lastModifiedValue = communicationCodes.JS_CONNECTED;
        setStringCommunicationVarValue( communicationCodes.JS_CONNECTED );
        
        await sleep(150);
    
        console.log('waiting for response..');

        try {
            //await waitForIntCValue( communicationCodes.responses.CONNECTED, 5000 );
            await waitForIntCValue( communicationCodes.responses.CONNECTED, 18500 );
        } catch {
            
            console.log('no responses, trying to search another variable..');
    
            await testNewSTRCVar();
        }
    }
    
    await testNewSTRCVar();
}

let subLevelCheckerVal = -1;
function resetSearchSubLevel() {
    isInSubLevel = false;

    subLevelCheckerVal = -1;

    if(detectSubLevels) {
        setIntCommunicationVarValue_NoCheck(1); // THE JS PART SHOULD NEVER PUT 2
    }
    
}

function checkSubLevel() {

    // if(detectSubLevels) {
    if(true) {

        let newV = getIntCommunicationValue();

        if(newV == null) return false;
        

        if(newV == 20) {

            if(subLevelCheckerVal != 465412) {
                subLevelCheckerVal = newV;
                return false;
            }

        } else {

            if(newV == 465412) {
                
                if(subLevelCheckerVal != 20) {
                    subLevelCheckerVal = newV;
                    return false;
                }

            } else {
                subLevelCheckerVal = newV;
                return false;
            }

        }
        
        setIntCommunicationVarValue_NoCheck(321789);


        if(isMapLoaded()) {

            isInSubLevel = false;

            
            isUsingNumberOnly = isUsingNumberOnlyAnywhere;
            

        } else {
            isInSubLevel = true;
            isUsingNumberOnly = true;
        }

        if(isUsingNumberOnly) {
            
            canModsCommunicate = false;
            // setIntCommunicationVarValue_NoCheck(321789);

            console.log('Sent request for starting int-communication..');
            
            (async() => {

                let isRejected = false;

                await sleep(350);
                
                if(getIntCommunicationValue() == 465412) {
                    setIntCommunicationVarValue_NoCheck(321789);
                }

                try {
                    
                    while ( getIntCommunicationValue() != 2 ) {
                        // if(isInSubLevel == false || isMapLoaded()) {
                        //     isRejected = true;
                        //     return;
                        // }

                        if(!isMapLoaded()) {
                            isRejected = true;
                            console.log('communication closed, detected no map loaded now');
                            return;
                        }

                        if(getIntCommunicationValue() == 465412) {
                            setIntCommunicationVarValue_NoCheck(321789);
                        }

                        await sleep(185);
                        // await sleep(15);
                    }
                } catch (error) {
                    console.error(error);
                    isRejected = true;
                }

                if(!isRejected) {

                    console.log('Response received successfully, communication openned.');
                    canModsCommunicate = true;
                } else {

                    console.log('communication closed');
                }

            })();

        }

        sendRequestJSMsg = isUsingNumberOnly ? sendRequestJSMsg_NumberOnly : sendRequestJSMsg_StringC;
        

        return true;

    }

    return false;
}


// Executed when the game is started
exports.cModuleStart = async () => {
    
    isGameStopped = false;


    detectSubLevels = config.scriptsEverywhere;
    isUsingNumberOnlyAnywhere = config.isLightCommunication;


    const {gamePath, exeGameName, modulesLocation} = exports.modInfos;

    const path = require('path');
    memoryjs = require(path.join(modulesLocation, 'memoryjs'));

    // memoryjs.findModule()
    
    while (gameProcess == null) {
        console.log('searching game process..');
        
        //gameProcess = memoryjs.getProcesses().find(p => p.szExeFile == exeGameName);
        try {
            gameProcess = memoryjs.openProcess(exeGameName);
        } catch (error) {
            console.log('impossible to open the process, error :');
            console.error(error);
            return;
        }
    
        if(gameProcess == null) {
            console.log('game process not found');
            await sleep(1000);
        }
    }

    console.log('game process found');

    console.log('waiting for map loaded..');
    if( true ) {
        try {
            
            resetSearchSubLevel();
            
            if(isUsingNumberOnlyAnywhere) {

                while ( checkSubLevel() == false ) {
                    await sleep(800);
                    
                    if(isGameStopped) return;
                }

            } else {
            
                while ( isMapLoaded() == false && checkSubLevel() == false ) {

                    await sleep(800);
                    
                    if(isGameStopped) return;
                }
            }
            
            console.log('level loaded');

        } catch (error) {
            console.error(error);
            console.log('ERROR WHILE WAITING FOR LOADING THE MAP');
            return;
        }
    } else {
        //await sleep(40 * 1000);
        await sleep(1000);
    }
    

    if(!isInSubLevel) {
        
        isUsingNumberOnly = isUsingNumberOnlyAnywhere;
        sendRequestJSMsg = isUsingNumberOnly ? sendRequestJSMsg_NumberOnly : sendRequestJSMsg_StringC;

    }

    if(isUsingNumberOnly) {
        onTotallyConnected();
        return;
    }
    
    await sleep(4000);
    
    strCommunicationVarAddr = null;
    memoryAddr.intCommunicationVar.resultAddr = null;

    try {
        await searchStrCVar();
    } catch (error) {
        console.error(error);
        return;
    }

    onTotallyConnected();
};

// On game stopped
exports.cModuleClose = async () => {
    isGameStopped = true;
    onJSDisconnected();
};

// *************************************** API Functions : ***************************************

exports.onConnected = (eventfunc) => {

    eventsOnConnected.push(eventfunc);

    if( isJSConnected ) {
        eventfunc({unsubscribe:()=>{eventsOnConnected = eventsOnConnected.filter(ev => ev != eventfunc)}});
    }

    // while (true) {
    //     if(isJSConnected) break;
    //     await sleep(20);
    // }
}

exports.isConnected = () => isJSConnected;

exports.onDisconnected = (eventfunc) => {

    eventsOnDisconnected.push(eventfunc);

    // This was a bad idea :
    // if( !isJSConnected ) {
    //     eventfunc({unsubscribe:()=>{eventsOnDisconnected = eventsOnDisconnected.filter(ev => ev != eventfunc)}});
    // }

    // while (true) {
    //     if(isJSConnected && canModsCommunicate) break;
    //     await sleep(20);
    // }
};


exports.onMessage = (channelId, ev) => {

    if(!onMsgEvents[channelId]) onMsgEvents[channelId] = [];

    onMsgEvents[channelId].push(ev);

};


exports.sendMessage = (modid, ...args) => {

    // // If cannot send message just put it to a list
    // if((!isJSConnected) || (!canModsCommunicate)) {
    //     modRequests.push({
    //         modid,
    //         messageid,
    //         args
    //     });
    // }

    if(typeof modid == 'string') {
        modid = 'MOD_' + modid;
    } else {
        modid = {...modid}; // clone the object for not change the base object
        modid.id = 'MOD_' + modid.id;
    }

    return sendRequestToScripts(modid, ...args);
}






//   *******************   "player" object API :   *******************
(()=>{
    

exports.gameMemory = {
    
    getBaseAddress: () => gameProcess && gameProcess.modBaseAddr,

    /**
     * If cannot read value, return null
     * @example
     * read(0x0000, "int");
     * read(0x0000, "int64");
     * read(0x0000, "uint32");
     * read(0x0000, "float");
     * read(0x0000, "string");
     * @param {Number} memoryAddress 
     * @param {String} variabletype 
     * @returns {Any | Null}
     */
    read: (memoryAddress, variabletype) => {
        if(!isSafeToEditVars()) return null;
    
        try {
            return memoryjs.readMemory(gameProcess.handle, memoryAddress, memoryjs[(variabletype+'').toUpperCase()]);
        } catch (error) {
            console.error(error);
            return null;
        }
    },
    /**
     * If cannot write value, return false else true
     * @example
     * write(0x0000, 5, "int");
     * write(0x0000, 5, "int64");
     * write(0x0000, 5, "uint32");
     * write(0x0000, 5.123, "float");
     * write(0x0000, "hello", "string");
     * @param {Number} memoryAddress 
     * @param {String} variabletype 
     * @returns {Boolean}
     */
    write: (memoryAddress, newvalue, variabletype) => {
        if(!isSafeToEditVars()) return false;
    
        try {
            memoryjs.writeMemory(gameProcess.handle, memoryAddress, newvalue, memoryjs[(variabletype+'').toUpperCase()]);
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    },

    /**
     * @example getAddressWithOffsets(0x00000, 0x00, 0x00, 0x00)
     * @param {Number} initaddress 
     * @param {...Number} offsets 
     */
    getAddressWithOffsets: (initaddress, ...offsets) => {
        return getAddrWithOffsets(initaddress, offsets)
    },

    getListAddresses: () => memoryAddr
};

function reloadPlayerAddr(forcereload) {
    if((!forcereload) && memoryAddr.playerPos.base != null) return true;

    try {
        
        memoryAddr.playerPos.base = gameProcess.modBaseAddr + memoryAddr.playerPos.initBase;

        memoryAddr.playerPos.x = getAddrWithOffsets(memoryAddr.playerPos.base, [memoryAddr.playerPos.initX]);
        memoryAddr.playerPos.y = getAddrWithOffsets(memoryAddr.playerPos.base, [memoryAddr.playerPos.initY]);
        memoryAddr.playerPos.z = getAddrWithOffsets(memoryAddr.playerPos.base, [memoryAddr.playerPos.initZ]);

        memoryAddr.playerRot.addr = getAddrWithOffsets(gameProcess.modBaseAddr + memoryAddr.playerRot.offsets[0], [memoryAddr.playerRot.offsets[1]]);

        // Actually it's not possible to get "THREADSTACK0"
        // memoryAddr.playerVel.base = getAddrWithOffsets( ("THREADSTACK0").modBaseAddr + memoryAddr.playerVel.initBase, memoryAddr.playerVel.baseOffsets);

        // memoryAddr.playerVel.x = getAddrWithOffsets(memoryAddr.playerVel.base, [memoryAddr.playerVel.initX]);
        // memoryAddr.playerVel.y = getAddrWithOffsets(memoryAddr.playerVel.base, [memoryAddr.playerVel.initY]);
        // memoryAddr.playerVel.z = getAddrWithOffsets(memoryAddr.playerVel.base, [memoryAddr.playerVel.initZ]);
    } catch (error) {
        console.error(error);
        return false;
    }

    return true;
}

function getPos(posid) {
    // if(!isSafeToEditVars()) return null;
    if(isGameStopped) return null;

    if( !reloadPlayerAddr() ) return null;

    try {
        return memoryjs.readMemory(gameProcess.handle, memoryAddr.playerPos[posid], memoryjs.FLOAT);
    } catch (error) {
        console.error(error);
        return null;
    }
}
function setPos(posid, val) {
    if(!isSafeToEditVars()) return false;

    if( !reloadPlayerAddr() ) return false;

    try {
        memoryjs.writeMemory(gameProcess.handle, memoryAddr.playerPos[posid], val, memoryjs.FLOAT);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}


exports.player = {
    position: {
        getX: () => getPos('x'),
        getY: () => getPos('y'),
        getZ: () => getPos('z'),

        setX: (val) => setPos('x', val),
        setY: (val) => setPos('y', val),
        setZ: (val) => setPos('z', val),

        set: (x, y, z) => setPos('x', x) && setPos('y', y) && setPos('z', z)
    },
    rotation: {
        get: function() {
            if(!isSafeToEditVars()) return null;
        
            if( !reloadPlayerAddr() ) return null;
        
            try {
                return memoryjs.readMemory(gameProcess.handle, memoryAddr.playerRot.addr, memoryjs.FLOAT);
            } catch (error) {
                console.error(error);
                return null;
            }
        },
        // set: function(val) {
        //     if(!isSafeToEditVars()) return false;
        
        //     if( !reloadPlayerAddr() ) return false;
        
        //     try {
        //         memoryjs.writeMemory(gameProcess.handle, memoryAddr.playerRot.addr, val, memoryjs.FLOAT);
        //         return true;
        //     } catch (error) {
        //         console.error(error);
        //         return false;
        //     }
        // }
    },

    reloadPlayerAddr: () => reloadPlayerAddr(true),
}
})();


//   *******************   "playerVehicle" object API :   *******************
(()=>{


let addrVehX;
let addrVehY;
let addrVehZ;

let addrVehRot;

let addrVehVelX;
let addrVehVelY;
let addrVehVelZ;


function reloadVehicleAddr(forcereload) {
    if((!forcereload) && memoryAddr.vehicle.base != null) return true;
    
    let newBaseVehiAddr;

    try {
        
        newBaseVehiAddr = getAddrWithOffsets(gameProcess.modBaseAddr + memoryAddr.vehicle.initBase, memoryAddr.vehicle.offsets);
        
        if(!newBaseVehiAddr) throw "";
        
    } catch (error) {
        exports.playerVehicle.lastIsExisting = false;
        return false;
    }

    exports.playerVehicle.lastIsExisting = true;
    

    // If is the same addr, don't reload pointers
    if(newBaseVehiAddr == memoryAddr.vehicle.base) return true;
    
    memoryAddr.vehicle.base = newBaseVehiAddr;
    
    try {

        addrVehX = getAddrWithOffsets(memoryAddr.vehicle.base, [memoryAddr.vehicle.varOffsets.posX]);
        addrVehY = getAddrWithOffsets(memoryAddr.vehicle.base, [memoryAddr.vehicle.varOffsets.posY]);
        addrVehZ = getAddrWithOffsets(memoryAddr.vehicle.base, [memoryAddr.vehicle.varOffsets.posZ]);
        
        addrVehRot = getAddrWithOffsets(memoryAddr.vehicle.base, [memoryAddr.vehicle.varOffsets.rot]);
        
        let rotVal = memoryjs.readMemory(gameProcess.handle, addrVehRot, memoryjs.FLOAT);
        if(typeof rotVal != 'number') throw "VEHICLE ROTATION NOT NORMAL";

        addrVehVelX = getAddrWithOffsets(memoryAddr.vehicle.base, [memoryAddr.vehicle.varOffsets.velX]);
        addrVehVelY = getAddrWithOffsets(memoryAddr.vehicle.base, [memoryAddr.vehicle.varOffsets.velY]);
        addrVehVelZ = getAddrWithOffsets(memoryAddr.vehicle.base, [memoryAddr.vehicle.varOffsets.velZ]);

    } catch (error) {
        exports.playerVehicle.lastIsExisting = false;
        memoryAddr.vehicle.base = null;
        return false;
    }

    return true;
}

function getPos(addrPos) {
    if(!isSafeToEditVars()) return null;

    try {
        return memoryjs.readMemory(gameProcess.handle, addrPos, memoryjs.FLOAT);
    } catch (error) {
        console.error(error);
        return null;
    }
}
function setPos(addrPos, val) {
    if(!isSafeToEditVars()) return false;

    try {
        memoryjs.writeMemory(gameProcess.handle, addrPos, val, memoryjs.FLOAT);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}


exports.playerVehicle = {

    // To verify if the car exist, TO USE BEFORE DOING ANY OTHER FUNCTIONS IN THIS OBJECT
    checkExisting: () => reloadVehicleAddr(true),

    // is the last result of the checkExisting function
    lastIsExisting: false,

    position: {
        getX: () => getPos(addrVehX),
        getY: () => getPos(addrVehY),
        getZ: () => getPos(addrVehZ),
        
        setX: (val) => setPos(addrVehX, val),
        setY: (val) => setPos(addrVehY, val),
        setZ: (val) => setPos(addrVehZ, val),

        set: (x, y, z) => setPos(addrVehX, x) && setPos(addrVehY, y) && setPos(addrVehZ, z)
    },
    rotation: {
        get: function() {
            if(!isSafeToEditVars()) return null;
            if(!addrVehRot) return null;
            
            try {
                let vehicleRot = memoryjs.readMemory(gameProcess.handle, addrVehRot, memoryjs.FLOAT);
                if(typeof vehicleRot != 'number') return null;
                return vehicleRot;

            } catch (error) {
                console.error(error);
                return null;
            }
        }
    },
    velocity: {
        getX: () => getPos(addrVehVelX),
        getY: () => getPos(addrVehVelY),
        getZ: () => getPos(addrVehVelZ),
        
        setX: (val) => setPos(addrVehVelX, val),
        setY: (val) => setPos(addrVehVelY, val),
        setZ: (val) => setPos(addrVehVelZ, val),

        set: (x, y, z) => setPos(addrVehVelX, x) && setPos(addrVehVelY, y) && setPos(addrVehVelZ, z)
    },
}
})();

exports.isInCity = () => isJSConnected && !isInSubLevel;

// ********************************* USER INTERFACE API *********************************
    
exports.interface = {
    // ********* Asking or show messages to user : *********
    showMessage: (messagetxt) => {
        return require('electron').dialog.showMessageBox({
            message: messagetxt,
            buttons: [],
            type: 'info'
        });
    },
    showError: (messagetxt) => {
        return require('electron').dialog.showMessageBox({
            message: messagetxt,
            buttons: [],
            type: 'error'
        });
    },
    showBooleanQuestion: async (question, cancelbuttontext, acceptbuttontext) => {

        let boxButtons;

        if(cancelbuttontext && acceptbuttontext) {
            boxButtons = [cancelbuttontext, acceptbuttontext]
        } else {
            boxButtons = ['No', 'Yes'];
            //cancelbuttontext = ['No', 'Yes'];
        }
        
        return 1 == (await require('electron').dialog.showMessageBox({
            message: question,
            buttons: boxButtons,
            type: 'info'
        })).response;
    },
    showTextQuestion: (question, enterbuttontext) => new Promise((resolve, reject) => {

        let resolvePromise = (val) => {
            resolve(val);
            resolvePromise = () => {};
        }

        let askWindow = require('./global-variables').createWindow('common/asking-text.html', 'common/asking-text-preload.js');
        askWindow.once('close', () => {
            resolvePromise(null);
        });
        askWindow.webContents.once('dom-ready', () => {
            askWindow.webContents.send('questiondatas', question, enterbuttontext || 'Ok');
        });
        askWindow.webContents.on('ipc-message', (ev, channelMsg, textResponse) => {
            if(channelMsg == 'textResponse') {
                resolvePromise(textResponse);
                askWindow.close();
            }
        });
    }),

    // ********* Create a menu : *********
    createMenu: (windowPath, customPreload) => {
        return require('./global-variables').createWindow('_' + windowPath, customPreload ? '_' + customPreload : false);
    },

    // isAppHidden: () => process.platform == 'darwin' ? require('electron').app.isHidden() : require('electron').BrowserWindow.getFocusedWindow() && require('electron').BrowserWindow.getFocusedWindow().isVisible(),
    isAppHidden: () => process.platform == 'darwin' ? require('electron').app.isHidden() : (!(require('electron').BrowserWindow.getFocusedWindow() && require('electron').BrowserWindow.getFocusedWindow().isFocused() && require('electron').BrowserWindow.getFocusedWindow().isVisible())),
}



// ************* global keyboard API *************

if(true) {

exports.keyboard = {};

let registeredEvents = [];

let keyboardListener;

exports.keyboard.initialise = () => {
    exports.keyboard.initialise = () => {};


    const GlobalKeyboardListener = require('./modules-for-node-global-key-listener/index');
    
    //exports.keyboard.globalKeyListenerModule = require('./modules-for-node-global-key-listener/index');
    // old exports.keyboard.globalKeyListenerModule = require('./node-global-key-listener-main/src/index');


    // keyboardListener = new exports.keyboard.globalKeyListenerModule.GlobalKeyboardListener({
    keyboardListener = new GlobalKeyboardListener({
        windows: {
            onError: (errorCode) => {
                exports.interface.showError('Error with the keyboard listener, code: ' + errorCode);
                console.error("ERROR WITH KEYBOARD LISTENER: " + errorCode);
            },
            onInfo: (info) => console.log("KEYBOARD LISTENER INFO: " + info)
        },
        mac: {
            onError: (errorCode) => console.error("KEYBOARD LISTENER INFO: " + errorCode),
        }
    });

    
    let startedShortcuts = [];

    keyboardListener.addListener( (e,down) => {
        
        const keyName = e.name;

        if(startedShortcuts.length == 0) {

            registeredEvents.forEach(ev=>{
                if(ev.keyId == keyName) {
                    if(ev.keyShortcuts !== undefined) {
                        if(e.state != 'DOWN') return;
                        ev.lastKeyIndex = 0;
                        startedShortcuts.push(ev);
                        return;
                    }
                    ev.onPressed(e,down);
                }
            });

            return;
        }

        if(e.state != 'DOWN') return;

        let willCancelInput = false;

        startedShortcuts = startedShortcuts.filter(sShortcut => {
            
            let currentKey = sShortcut.keyShortcuts[sShortcut.lastKeyIndex];

            if(currentKey != keyName) {
                sShortcut.lastKeyIndex = 0;
                return false;
            }

            sShortcut.lastKeyIndex++;

            if(sShortcut.keyShortcuts.length <= sShortcut.lastKeyIndex) {
                sShortcut.lastKeyIndex = 0;
                if( sShortcut.onPressed(e, down) === true ) willCancelInput = true;
                return false;
            }

            return true;

        });

        if(willCancelInput) return true;

        // registeredEvents.forEach(ev=>{
        //     if(ev.keyShortcuts === undefined || ev.keyId != keyName) return;
        //     startedShortcuts = startedShortcuts.filter(sShortcut => sShortcut != )
        //     ev.onPressed(e,down);
        // });
    });
}

exports.keyboard.initialise();

exports.keyboard.askUserForCustomInput = (questionParams) => {

    let modName = questionParams.modName;

    modName = modName ? ('The mod "' + (modName+'').replace(/\n/g,'').replace(/"/g,'') + '" ask which key you want to use\nPress a key') : 'Press a key';

    return new Promise((resolve, reject) => {
        
        let windowInputQuestion = require('./global-variables').createWindow(
            'common/asking-key-input.html',
            'common/asking-key-input-preload.js'
        );

        let lastChoosedKey;

        function closeTheW() {
            if(windowInputQuestion) windowInputQuestion.close();
        }

        let disableKeyInput = () => {};

        function onGiveCustomKey(e) {

            if(!windowInputQuestion.isFocused()) return;

            if(e.state != "UP") return;

            if(!e.name) return;

            lastChoosedKey = e.name+'';

            windowInputQuestion.webContents.send('keySelected', lastChoosedKey);
        }
        
        let onFinallyChoosed = () => {

            onFinallyChoosed = () => {};

            const responseK = lastChoosedKey || null;

            disableKeyInput();
            closeTheW();

            resolve(responseK);

        };
        
        windowInputQuestion.webContents.on('dom-ready', () => {
            if(!windowInputQuestion) return;
            
            windowInputQuestion.webContents.send('customTxt', modName);
            
            setTimeout(() => {
                if(!windowInputQuestion) return;
                
                disableKeyInput = () => {
                    keyboardListener.removeListener(onGiveCustomKey);
                    disableKeyInput = () => {};
                };
                keyboardListener.addListener(onGiveCustomKey);
            }, 300);

        });
        

        windowInputQuestion.once('close', () => {
            windowInputQuestion = null;
            lastChoosedKey = null;
            onFinallyChoosed();
        });

        windowInputQuestion.webContents.on('ipc-message', (ev, channelMsg) => {
            
            switch (channelMsg) {
                
                case 'user-accepted-key-i':{
                    onFinallyChoosed();
                    break;}
            }
        });

    });

};


// FOR ADD CUSTOM INPUTS

/**
 * @example // EXAMPLE :
 * onInput(exports.modInfos.modName, 'enable-superpower', 'T', // T is the key that will be detected
 * (ev) => {  console.log('THE KEY IS ' + ev.state)  });
 * @param {String} modName 
 * @param {String} uniqueEventId 
 * @param {String} keyId 
 * @param {Function} onPressed 
 * @returns 
 */
exports.keyboard.onInput = (modName, uniqueEventId, keyId, onPressed) => {

    if(typeof modName != 'string' || typeof uniqueEventId != 'string' || (typeof keyId == 'string' && (!keyId)) || (typeof keyId == 'object' && keyId.forEach == null) || typeof onPressed != 'function') {
        exports.interface.showError('ERROR: arguments bad at keyboard.onInput(...) \nThe arguments must be 3 strings and 1 function\nMODENAME: ' + modName + ', UNIQUEID: ' + uniqueEventId);
        return false;
    }

    if(typeof keyId == 'object' && keyId.toUpperCase == null) {
        if(keyId.length == 0) {
            exports.interface.showError('ERROR: arguments bad at keyboard.onInput(...) \nThe "keyId" is an EMPTY ARRAY. To fix this issue add 1 or more key names in this array.');
            return false;
        }
        if(keyId.length == 1) {
            keyId = keyId[0];
        } else {

            registeredEvents.push({
                modName, uniqueEventId,
                keyId: keyId.shift(), keyShortcuts: keyId, lastKeyIndex: 0,
                onPressed
            });
            return true;
        }
    }

    registeredEvents.push({
        modName, uniqueEventId,
        keyId, onPressed
    });
    return true;
};

exports.keyboard.removeInputEvent = (modName, uniqueEventId) => {

    if(typeof modName != 'string' || typeof uniqueEventId != 'string') {
        exports.interface.showError('ERROR: arguments bad at keyboard.removeInputEvent(...) \nThe arguments must be 2 strings');
        return false;
    }

    registeredEvents = registeredEvents.filter(rEv => rEv.modName != modName || rEv.uniqueEventId != uniqueEventId);

    return true;
};


exports.keyboard.editEventKeyId = (modName, uniqueEventId, keyId) => {

    if(typeof modName != 'string' || typeof uniqueEventId != 'string' || (typeof keyId == 'string' && (!keyId)) || (typeof keyId == 'object' && keyId.forEach == null) ) {
        exports.interface.showError('ERROR: arguments bad at keyboard.editEventKeyId(...) \nThe arguments must be 3 strings');
        return false;
    }
    
    if(!keyId) return false;

    let eventToEdit = registeredEvents.find(rEv => rEv.modName == modName && rEv.uniqueEventId == uniqueEventId);

    if(!eventToEdit) return false;

    // If is an array
    if(typeof keyId != 'string') {
        
        eventToEdit.keyId = keyId.shift();
        eventToEdit.keyShortcuts = keyId;
        eventToEdit.lastKeyIndex = 0;
        return true;
    }

    eventToEdit.keyId = keyId;
    eventToEdit.keyShortcuts = undefined;
    eventToEdit.lastKeyIndex = undefined;
    return true;
};

exports.keyboard.removeAllInputs = () => {
    registeredEvents = [];
}


}

// ************* OLD and useless shorcuts API *************
if(true) {

let shortcutElectronAPI;

function removeShortcutWithSTR(shortcutKeyStr) {
    return require('electron').globalShortcut.isRegistered(shortcutKeyStr) && require('electron').globalShortcut.unregister(shortcutKeyStr) && true;
}


// OLD API DO NOT WORK IN THE GAME UNFORTUNALLY
exports.shortcuts = {
    
    addWithBaseShortcut: (modNameId, uniqueShortcutId, shortcutKey, onPressed) => {
        shortcutElectronAPI = shortcutElectronAPI || require('electron').globalShortcut;

        let finalShortcutK = config.baseShortcut + '+' + shortcutKey;

        let registerS = shortcutElectronAPI.register(finalShortcutK, onPressed);

        allModsShortcuts.push(
            {
                uniqueShortcutId,
                modId: modNameId,
                shortcut: registerS,
                shortcutKey: finalShortcutK,
                initShortcutKey: shortcutKey,
                useBase: true
            }
        );
    },

    add: (modNameId, uniqueShortcutId, shortcutKey, onPressed) => {
        shortcutElectronAPI = shortcutElectronAPI || require('electron').globalShortcut;

        let registerS = shortcutElectronAPI.register(shortcutKey, onPressed);

        allModsShortcuts.push(
            {
                uniqueShortcutId,
                modId: modNameId,
                shortcut: registerS,
                shortcutKey
            }
        );
    },

    removeWithUniqueIdFromMod: (modid, uniqueShortcutId) => {
        
        let shortcutToR = allModsShortcuts.filter(shortcutM => shortcutM.modId == modid && shortcutM.uniqueShortcutId == uniqueShortcutId);

        if(shortcutToR.length == 0) return false;
        
        shortcutToR.forEach((shortcToRemove)=>{
            removeShortcutWithSTR(shortcToRemove.shortcutKey);
        });

        allModsShortcuts = allModsShortcuts.filter(shortcutM => shortcutM.modId != modid || shortcutM.uniqueShortcutId != uniqueShortcutId);

        return true;
    },

    removeAllsFromMod: (modIdS) => {
        
        let shortcutToR = allModsShortcuts.filter(shortcutM => shortcutM.modId == modIdS);

        if(shortcutToR.length == 0) return false;
        
        shortcutToR.forEach((shortcToRemove)=>{
            removeShortcutWithSTR(shortcToRemove.shortcutKey);
        });

        allModsShortcuts = allModsShortcuts.filter(shortcutM => shortcutM.modId != modIdS);

        return true;
    },

    reloadShortcutsUsingBaseShortcut: () => {

        let allShortcutsToChange = [];

        for (let index = 0; index < allModsShortcuts.length; index++) {
            const shortcutToChange = allModsShortcuts[index];
            if(shortcutToChange.useBase) {
                allShortcutsToChange.push(shortcutToChange);
                removeShortcutWithSTR(shortcToRemove.shortcutKey);
            }
        }
        
        allModsShortcuts = allModsShortcuts.filter(shortcutM => shortcutM.useBase != true);

        allShortcutsToChange.forEach(
            shortcutToAdd => {
                exports.shortcuts.addWithBaseShortcut(shortcutToAdd.modId, shortcutToAdd.uniqueShortcutId, shortcutToAdd.initShortcutKey, shortcutToAdd.onPressed)
            }
        );

    }
};

};




// ************************** Online mod plugins API **************************

exports.onlineMod = {
    createServerPlugin: (pluginObj) => {
        if((!pluginObj) || (!pluginObj.name)) {
            exports.interface.showMessage("Error: a plugin haven't a name. Error at createServerPlugin(...)");
            return;
        }
        
        // If the user re-launch the game it's possible that the server plugins are duplicated so just not add any new plugins with the same id than the plugins that already exist
        if(exports.onlineMod.serverPlugins.find(rPlugin => rPlugin.name == pluginObj.name) != null) return;

        // bad method:
        //exports.onlineMod.serverPlugins = exports.onlineMod.serverPlugins.filter(rPlugin => rPlugin.name != pluginObj.name);
        
        pluginObj.isEnabled = false;
        // if(customButtons && typeof customButtons.forEach == 'function') {
        //     pluginObj.manageButtons = customButtons;
        // } else {
        //     pluginObj.manageButtons = [];
        // }
        pluginObj.manageButtons = [];
        exports.onlineMod.serverPlugins.push(pluginObj);
    },
    createClientPlugin: (pluginObj) => {
        if((!pluginObj) || (!pluginObj.name)) {
            exports.interface.showMessage("Error: a plugin haven't a name. Error at createClientPlugin(...)");
            return;
        }
        // Don't have 2 plugins with the same id
        if(exports.onlineMod.clientPlugins.find(rPlugin => rPlugin.name == pluginObj.name) != null) return;
        exports.onlineMod.clientPlugins.push(pluginObj);
    },
    serverPlugins: [],
    clientPlugins: []
};



let msgCList = [];
let isMsgProcessing = false;


let sendRequestJSMsg;

/**
 * 
 * @param {String} requesttype 
 * @param {String[]|Number[]} args 
 */ 
function sendRequestToScripts(requesttype, ...args) {

    // if(msgCList.length != 0) {
    if(isMsgProcessing) {
        return new Promise((resolve) => {
            msgCList.push([requesttype, args, resolve]);
        });
    }

    isMsgProcessing = true;

    return new Promise(async(resolveFirst) => {
        
        let res = await sendRequestJSMsg(requesttype, ...args);

        resolveFirst(res);

        while (msgCList.length > 0) {
            let req = msgCList.shift();
            res = await sendRequestJSMsg(req[0], ...req[1]);
            req[2](res);
        }

        isMsgProcessing = false;

    })

}




/**
 * 
 * @param {String} requesttype 
 * @param {String[]|Number[]} args 
 */ 
async function sendRequestJSMsg_StringC(requesttype, ...args) {
    
    if(gameProcess == null || isGameStopped) return {canceled: true};

    
    if(typeof requesttype == 'string' || requesttype.maxWaitingTime == null) {
        
        while (!(isSafeToEditVars() && isJSConnected && canModsCommunicate)) {
            await sleep(30);
        }

        if(typeof requesttype != 'string') requesttype = requesttype.id;

    } else {
        
        requesttype = {...requesttype}; // clone the object for not change the base object

        while (!(isSafeToEditVars() && isJSConnected && canModsCommunicate)) {
            requesttype.maxWaitingTime -= 30;
            if(requesttype.maxWaitingTime < 0) {
                // console.log('[DEBUG] cancelling request');
                return {canceled: true}; // If waited too much cancel the request
            }
            await sleep(30);
        }
        requesttype = requesttype.id;
    }

    
    await checkMessagesFromScripts();

    // while (!(isSafeToEditVars() && isJSConnected && canModsCommunicate)) {
    //     await sleep(30);
    // }
    if(logJSConnection) logConnectionState('send req: ' + args);
    canModsCommunicate = false;
    
    // Send the number of args : (useless)
    // setIntCommunicationVarValue(args.length);
    
    setIntCommunicationVarValue(communicationCodes.MSG_SENT_STR);

    setStringCommunicationVarValue( requesttype );
    if(logJSConnection) logConnectionState('request type : ' + requesttype);

    await new Promise((resolve) => {
        
    waitForIntCValue(communicationCodes.responses.MSG_RECEIVED)
      .then(
        () => { resolve(); }
      )
      .catch(console.error);

    });
    if(logJSConnection) logConnectionState('waited');

    for (let index = 0; index < args.length; index++) {
        let argMsg = args[index];

        if(logJSConnection) logConnectionState('arg : ' + argMsg);

        if(typeof argMsg == "string") {
            setStringCommunicationVarValue(argMsg);
            setIntCommunicationVarValue(communicationCodes.MSG_SENT_STR);
        } else if(typeof argMsg == 'number' || typeof argMsg == "bigint") {
            argMsg = Number(argMsg);

            if(Number.isInteger(argMsg) && argMsg >= 0) {
                setStringCommunicationVarValue(communicationCodes.MSG_SENT_INT);
                setIntCommunicationVarValue(argMsg);
            }
            else if(argMsg < 1000 || argMsg > -1000) {
                setStringCommunicationVarValue(communicationCodes.MSG_SENT_FAST_FLOAT);
                setIntCommunicationVarValue(parseInt((argMsg + 1000) * 100));
            }
            else {

                const isNegativeIMsg = argMsg < 0;

                setStringCommunicationVarValue(
                    isNegativeIMsg ? communicationCodes.MSG_SENT_NEGATIVE_FLOAT : communicationCodes.MSG_SENT_FLOAT
                );
                
                if(isNegativeIMsg) argMsg *= -1;
                
                let notFloatVal = Math.floor(argMsg);
                
                // Get the float part and convert it to int :
                argMsg = ((argMsg - notFloatVal) + '').slice(2);
                while (argMsg.length < 7) {
                    argMsg += '0';
                }
                
                // Be sure that the max length is 7 and convert it to number
                argMsg = Number( argMsg.slice(0,7) );

                // Send the float part into an int : (it will be converted to float by the custom game script)
                setIntCommunicationVarValue(argMsg);
                
                await waitForIntCValue(communicationCodes.responses.MSG_RECEIVED);
                
                // Send the int part :
                setStringCommunicationVarValue(communicationCodes.MSG_SENT_INT);
                setIntCommunicationVarValue(notFloatVal);
            }

        }

        if(logJSConnection) logConnectionState('sended +1 argument');

        await waitForIntCValue(communicationCodes.responses.MSG_RECEIVED);
        if(logJSConnection) logConnectionState('waited');
    }

    setStringCommunicationVarValue(communicationCodes.END_MSG);
    setIntCommunicationVarValue(communicationCodes.MSG_SENT_STR);
    
    await waitForIntCValue(communicationCodes.responses.MSG_RECEIVED);

    if(logJSConnection) logConnectionState('Message sent');

    if(isJSConnected) canModsCommunicate = true;

    return {};
}





const waitForReceivedNumberOnlyReq = () => new Promise(async(resolve) => {


    // let maxMStowait;

    try {
        
        while ( getIntCommunicationValue() != 2 ) {
            // if(maxMStowait != null) {
            //     maxMStowait -= 35;
            //     // maxsecondstowait -= 15;
                
            //     if(maxMStowait < 0) {
            //         isRejected = true;
            //         reject();
            //         break;
            //     }
            // }

            if(!isJSConnected) {
                
                if(isGameStopped) {
                    resolve();
                    // reject();
                    return;
                }

                resolve();
                return;
            }

            await sleep(35);
            // await sleep(15);
        }

        resolve();

    } catch (error) {
        console.error(error);
        resolve();
        // reject(error);
    }

});


const waitForReceivedNbrOnlyReq_End = () => new Promise(async(resolve) => {


    // let maxMStowait;

    let currNbr = getIntCommunicationValue();

    if(currNbr == 2) {
        resolve(false);
        return;
    }
    if(currNbr == 3) {
        resolve(true);
        return;
    }

    try {

        let v = currNbr;
        
        while ( v == currNbr || v == null ) {
            // if(maxMStowait != null) {
            //     maxMStowait -= 35;
            //     // maxsecondstowait -= 15;
                
            //     if(maxMStowait < 0) {
            //         isRejected = true;
            //         reject();
            //         break;
            //     }
            // }

            await sleep(35);
            // await sleep(15);

            
            if(!isJSConnected) {
                
                if(isGameStopped) {
                    resolve(false);
                    // reject();
                    return;
                }

                resolve(false);
                return;
            }
            
            v = getIntCommunicationValue();
        }


        if(v == 2) {
            resolve(false);
            return;
        }
        if(v == 3) {
            resolve(true);
            return;
        }

        if(logJSConnection) logConnectionState('replied with wrong nbr: ' + v);

        waitForReceivedNbrOnlyReq_End().then(resolve);

        return;


    } catch (error) {
        console.error(error);
        resolve(false);
        // reject(error);
    }

});

const waitForDifferentIntCVal = (currNbr) => new Promise(async(resolve) => {



    try {
        
        let v = currNbr;

        while ( v == currNbr || v == null ) {
            // if(maxMStowait != null) {
            //     maxMStowait -= 35;
            //     // maxsecondstowait -= 15;
                
            //     if(maxMStowait < 0) {
            //         isRejected = true;
            //         reject();
            //         break;
            //     }
            // }

            await sleep(35);

            
            if(!isJSConnected) {
                
                if(isGameStopped) {
                    resolve(false);
                    // reject();
                    return;
                }

                resolve(false);
                return;
            }

            v = getIntCommunicationValue();

            // await sleep(15);
        }

        resolve(v);

        return;


    } catch (error) {
        console.error(error);
        resolve(false);
        // reject(error);
    }

});

/**
 * 
 * @param {String} requesttype 
 * @param {String[]|Number[]} args 
 */ 
async function sendRequestJSMsg_NumberOnly(requesttype, ...args) {
    
    if(gameProcess == null || isGameStopped) return {canceled: true};

    if(logJSConnection) {
        logConnectionState('new req asked');
        console.log(isJSConnected, isGameStopped, isInSubLevel, canModsCommunicate);
        console.log(getIntCommunicationValue());
    }
    
    
    if(typeof requesttype == 'string' || requesttype.maxWaitingTime == null) {
        
        // while (!(isSafeToEditVars() && isJSConnected && canModsCommunicate)) {
        while (!( isJSConnected && canModsCommunicate )) {
            await sleep(30);
        }

        if(typeof requesttype != 'string') requesttype = requesttype.id;

    } else {
        
        requesttype = {...requesttype}; // clone the object for not change the base object

        // while (!(isSafeToEditVars() && isJSConnected && canModsCommunicate)) {
        while (!( isJSConnected && canModsCommunicate )) {
            requesttype.maxWaitingTime -= 30;
            if(requesttype.maxWaitingTime < 0) {
                // console.log('[DEBUG] cancelling request');
                return {canceled: true}; // If waited too much cancel the request
            }
            await sleep(30);
        }
        requesttype = requesttype.id;
    }

    await checkMessagesFromScripts();

    // while (!(isSafeToEditVars() && isJSConnected && canModsCommunicate)) {
    //     await sleep(30);
    // }
    if(logJSConnection) logConnectionState('send req: '+ args);
    canModsCommunicate = false;
    
    // Send the number of args : (useless)
    // setIntCommunicationVarValue(args.length);


    async function sendStringInNumbs(str) {
        let i = 0;
        while (i < str.length) {
            
            setIntCommunicationVarValue((str.charCodeAt(i) || 0) + 5);

            await waitForReceivedNumberOnlyReq();

            // while (getIntCommunicationValue() != 2) {
            //     let timeWait = 0;
            //     await new Promise((resolve) => {

            //         timeWait += 45;

            //         if(timeWait > 16000) {
            //             return;
            //         }

            //         setTimeout(resolve, 45);
            //     });
            // }

            i++;

        }
        
        setIntCommunicationVarValue( 1 );

        await waitForReceivedNumberOnlyReq();

        // while (getIntCommunicationValue() != 2) {
        //     let timeWait = 0;
        //     await new Promise((resolve) => {

        //         timeWait += 45;

        //         if(timeWait > 16000) {
        //             return;
        //         }

        //         setTimeout(resolve, 45);
        //     });
        // }
        
    }

    
    // setIntCommunicationVarValue(communicationCodes.MSG_SENT_STR);

    if(logJSConnection) logConnectionState('send id ' + requesttype);
    await sendStringInNumbs( requesttype );
    
    if(logJSConnection) logConnectionState('waited');

    for (let index = 0; index < args.length; index++) {
        let argMsg = args[index];

        if(logJSConnection) logConnectionState('arg : ' + argMsg);

        if(typeof argMsg == "string") {
            
            setIntCommunicationVarValue(8);
            await waitForReceivedNumberOnlyReq();
            await sendStringInNumbs(argMsg);

        } else if(typeof argMsg == 'number' || typeof argMsg == "bigint") {
            argMsg = Number(argMsg);

            if(Number.isInteger(argMsg) && argMsg >= 0) {
                setIntCommunicationVarValue(4); // int
                await waitForReceivedNumberOnlyReq();
                setIntCommunicationVarValue(argMsg + 5);
            }
            else if(argMsg < 1000 || argMsg > -1000) {
                setIntCommunicationVarValue(7); // fastfloat
                await waitForReceivedNumberOnlyReq();
                setIntCommunicationVarValue(parseInt((argMsg + 1000) * 100));
            }
            else {

                const isNegativeIMsg = argMsg < 0;

                // await sendStringInNumbs(
                //     isNegativeIMsg ? communicationCodes.MSG_SENT_NEGATIVE_FLOAT : communicationCodes.MSG_SENT_FLOAT
                // );
                
                setIntCommunicationVarValue(
                    isNegativeIMsg ? 6 : 5
                );
                await waitForReceivedNumberOnlyReq();
                
                if(isNegativeIMsg) argMsg *= -1;
                
                let notFloatVal = Math.floor(argMsg);
                
                // Get the float part and convert it to int :
                argMsg = ((argMsg - notFloatVal) + '').slice(2);
                while (argMsg.length < 7) {
                    argMsg += '0';
                }
                
                // Be sure that the max length is 7 and convert it to number
                argMsg = Number( argMsg.slice(0,7) );

                // Send the float part into an int : (it will be converted to float by the custom game script)
                setIntCommunicationVarValue(argMsg + 5);
                
                await waitForReceivedNumberOnlyReq();
                
                // Send the int part :
                setIntCommunicationVarValue(4);
                await waitForReceivedNumberOnlyReq();
                setIntCommunicationVarValue(notFloatVal + 5);
            }

            
            await waitForReceivedNumberOnlyReq();
            // await waitForIntCValue(communicationCodes.responses.MSG_RECEIVED, 16000);
        }


        if(logJSConnection) logConnectionState('arg sent');
    }

    setIntCommunicationVarValue(1);

    if(logJSConnection) logConnectionState('Message sent');
    
    let response;

    if( await waitForReceivedNbrOnlyReq_End() ) {

        response = [];

        let v;

        while (v != 2) {
            
            setIntCommunicationVarValue(1);

            v = await waitForDifferentIntCVal(1);
            
            if(v === false) return {};

            response.push(v);
        }

        response.pop();
        

    }

    if(isJSConnected) canModsCommunicate = true;

    return {response};
}


sendRequestJSMsg = isUsingNumberOnly ? sendRequestJSMsg_NumberOnly : sendRequestJSMsg_StringC;


// to use it ONLY if canModsCommunicate is true !
const checkMessagesFromScripts = async function() {
    
    if(getIntCommunicationValue() == 3) {
        canModsCommunicate = false;

        setIntCommunicationVarValue(1);
        
        if(logJSConnection) logConnectionState('Receiving..');
        
        // let v = (await waitForDifferentIntCVal(1));

        // if( v === false ) return;

        // setIntCommunicationVarValue(1);

        // let size = v - 5;

        let v = (await waitForDifferentIntCVal(1));

        if( v === false ) return;

        let idSize = v - 5;

        if(logJSConnection) logConnectionState('Id Size: ' + idSize);

        // let argsSize = size - idSize;

        let id = '';

        while (idSize > 0) {
            idSize--;

            setIntCommunicationVarValue(1);

            v = (await waitForDifferentIntCVal(1));

            if( v === false ) return;

            if(v == 2) {
                canModsCommunicate = true;
                return;
            }

            v -= 5;

            let v2 = parseInt(v / 255) || 0;

            v -= (255 * v2);
            

            id += String.fromCharCode(v2) + (v > 0 ? String.fromCharCode(v) : '');
        }
        
        if(logJSConnection) logConnectionState('ID: ' + id);

        let args = [];

        setIntCommunicationVarValue(1);
        v = (await waitForDifferentIntCVal(1));
        while (v != 2 && v !== false) {

            setIntCommunicationVarValue(1);

            // v -= 5;

            // args.push(v - 5 - 32000);
            args.push(v - 32000);

            v = (await waitForDifferentIntCVal(1));

        }
        // while (argsSize > 0) {
        //     argsSize--;
        // }

        if(logJSConnection) logConnectionState('RECEIVED args: [ ' + args.join(', ') + ' ]');
        

        let ev = {
            id,
            args
        };

        let evs = onMsgEvents[id];

        if(evs) {

            let index = 0;
            while (index < evs.length) {
                
                evs[index](ev);
                
                index++;
            }


        } else {
            
            console.log('no code listening for : ' + JSON.stringify(id));
        }
        
        canModsCommunicate = true;
    }
};
