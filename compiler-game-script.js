const customCodeChar = "@";


const customFuncs = {
}


function compileScriptCode(codetocompile, options) {
    
    // if no custom functions is used and dont edit anything with options, don't change anything
    if( options == null && codetocompile.includes(customCodeChar) == false ) return codetocompile;
    
    // Remove the comments :
    codetocompile = codetocompile.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '');

    let lastCheckedPart = 0;

    if(options) {
        if(options.replaceAlls != null) {
            options.replaceAlls.forEach(
                replaceD => {
                    // codetocompile = codetocompile.replaceAll(replaceD[0], replaceD[1]);
                    codetocompile = codetocompile.replace(replaceD[0], replaceD[1]);
                }
            );
        }
    }

    while(true) {
        let indexOfCustomLine = codetocompile.indexOf(customCodeChar, lastCheckedPart);
        
        if(indexOfCustomLine == -1) break;
        
        let customFuncPart = codetocompile.slice(indexOfCustomLine);
        
        let indexOfCEnd = customFuncPart.indexOf('\n');
        
        if(indexOfCEnd != -1) {
            customFuncPart = customFuncPart.slice(0, indexOfCEnd);
        }


        const charsToAvoidAtEnd = [';',' ','\t','\r','\n'];
        
        while (charsToAvoidAtEnd.includes( customFuncPart[customFuncPart.length - 1] )) {
            customFuncPart = customFuncPart.slice(0, -1);
        };

        // console.log(customFuncPart);
        
        let currentCustomFunc = customFuncs[customFuncPart.replace(customCodeChar, '').split(' ', 1)[0]];

        // console.log(JSON.stringify(customFuncPart));
        // console.log(
        //     customFuncPart.replace(customCodeChar, '').split(' ', 1)[0]
        // );
        
        let customCompiledLine = currentCustomFunc ? currentCustomFunc(customFuncPart) : '\n// Error : custom function not found';

        lastCheckedPart = indexOfCustomLine + customCompiledLine.length;

        
        codetocompile = codetocompile.slice(0, indexOfCustomLine) + customCompiledLine + '\n' + (indexOfCEnd == -1 ? '' : codetocompile.slice(indexOfCustomLine + indexOfCEnd));

        // // Don't continue the loop else the lastCheckedPart variable have a bad number
        // if(indexOfCEnd == -1) break;
    }

    return codetocompile;
}


let allImports = {
    messageapi: ""
    + '// Auto generated with the "import" command:'
    + "\nGlobal Bool JS_C_API_gotMsg;"
    + "\nGlobal Text JS_C_API_modId;"
    + "\nBool can_r_msg_JS_C_API(true);"
    + '\nGlobal CityArray C_API_SendDatas;'
    + '\nCityArray C_API_NewSendDatas;'
    // + '\nGlobal Number C_SendDatasListSize;'
    + '\nNumber C_argToSend(0);'
    + '\nText last_msg_i_JS_C_API("");'
};
allImports.msgapi = allImports.messageapi;



// function addNewCustomFunc()

customFuncs['ifMessage'] = (linetochange) => {

    let allArgsC = linetochange.split(' ');

    let cModId = allArgsC[1];
    let funcRefName = allArgsC[2];

    if((!cModId) || (!funcRefName)) {
        return '\n// Error : bad arguments\n';
    }


    let allMsgExceptions = [];

    if(allArgsC.length > 3) {

        let argCIndex = 3;
        while (argCIndex < allArgsC.length) {
            let argCLine = allArgsC[argCIndex];
            if(argCLine.startsWith('#oneThreadOnlyFor=')) {
                allMsgExceptions = argCLine.slice(18).split(',');
            }
            argCIndex++;
        }
    }

    // if line finish with ";" remove the ";"
    // funcRefName = funcRefName.replace(';', '');


    if(allMsgExceptions.length > 0) {
        
        let lineIsOneTDetection = 'if(';

        lineIsOneTDetection += 'last_msg_i_JS_C_API == msgId_JS_C_API && (';

        allMsgExceptions.forEach((elMsgI, elMsgIIndex) => {
            if(!elMsgI) return;

            lineIsOneTDetection += (elMsgIIndex == 0 ? '' : ' || ') + 'msgId_JS_C_API == ' + elMsgI
        });

        lineIsOneTDetection += '))';

        linetochange = ''
        + "// Auto generated :"
        //+ "\nGlobal Text JS_C_API_modId;"
        
        // + `\nif(JS_C_API_modId == "MOD_" + ${cModId}) {`
        + `\nif(JS_C_API_gotMsg && JS_C_API_modId == "MOD_" + ${cModId}) {`

        + "\n  Global CityArray JS_C_API_textArgs;"
        + "\n  Global CityArray JS_C_API_numberArgs;"
        + "\n  CityArray JS_C_API_d_textArgs( JS_C_API_textArgs.CreateCopy() );"
        + "\n  CityArray JS_C_API_d_numberArgs( JS_C_API_numberArgs.CreateCopy() );"
        
        + '\n  Text msgId_JS_C_API(JS_C_API_d_textArgs.Get(0));'
        // + '\n  Text msgId_JS_C_API(JS_C_API_textArgs.Get(0));'

        + '\n  if(!can_r_msg_JS_C_API) {'

        + '\n     ' + lineIsOneTDetection + ' {'
        + '\n          JS_C_API_modId = "";'
        + '\n          JS_C_API_gotMsg = false;'
        + '\n     }'

        + '\n  } else {'
        
        + "\n     can_r_msg_JS_C_API=false;"

        + '\n     JS_C_API_modId = "";'
        + '\n     JS_C_API_gotMsg = false;'
        + '\n     last_msg_i_JS_C_API = msgId_JS_C_API;'
        
        + `\n     ${funcRefName}(JS_C_API_d_textArgs, JS_C_API_d_numberArgs);`
        + "\n     can_r_msg_JS_C_API=true;"
        + '\n  }'

        + "\n}\n";
    } else {
        
        linetochange = ''
        + "// Auto generated :"
        //+ "\nGlobal Text JS_C_API_modId;"
        // + `\nif(JS_C_API_modId == "MOD_" + ${cModId} && can_r_msg_JS_C_API) {`
        + `\nif(JS_C_API_gotMsg && JS_C_API_modId == "MOD_" + ${cModId} && can_r_msg_JS_C_API) {`
        
        + "\n  can_r_msg_JS_C_API=false;"
        + "\n  Global CityArray JS_C_API_textArgs;"
        + "\n  Global CityArray JS_C_API_numberArgs;"
        + "\n  CityArray JS_C_API_d_textArgs( JS_C_API_textArgs.CreateCopy() );"
        + "\n  CityArray JS_C_API_d_numberArgs( JS_C_API_numberArgs.CreateCopy() );"
        + '\n  JS_C_API_modId = "";'
        + "\n  JS_C_API_gotMsg = false;" // MAYBE BECAUSE OF THAT, THE CreateCopy MAYBE DONT COPY
        + `\n  ${funcRefName}(JS_C_API_d_textArgs, JS_C_API_d_numberArgs);`
        + "\n  can_r_msg_JS_C_API = true;"
        + "\n}\n";
    }
    
    return linetochange;
}

customFuncs.ifMsg = customFuncs.ifMessage;

/**
 * 
 * @param {string} linetochange 
 * @returns 
 */
customFuncs['sendRequest'] = (linetochange) => {


    let allArgsC = linetochange.split(' ').map(v => v.endsWith(',') ? v.slice(0, -1) : v).filter(v => v);

    let cModId = allArgsC[1];

    if(cModId[0] == '"') cModId = cModId.slice(1);
    if(cModId[cModId.length - 1] == '"') cModId = cModId.slice(0, -1);


    let args = allArgsC;
    args.shift();
    args.shift();
    

    let cModIdSizeHalf = cModId.length / 2;

    if(!Number.isInteger(cModIdSizeHalf)) cModIdSizeHalf = parseInt(cModIdSizeHalf) + 1;
    
    let lineResult = '';

    

    let mode = 4;


    // if(mode == 1) lineResult += '\n  Number C_argToSend(0);';

    let listToEditId = 'C_API_SendDatas';

    if(mode == 3 || mode == 4) {

        listToEditId = 'C_API_NewSendDatas';

        // lineResult += '\n  CityArray ' + listToEditId + '( CityArray_Create("Number") );';
        lineResult = '\n  ' + listToEditId + ' = CityArray_Create("Number");';

        // lineResult += '\n  While(' + listToEditId + '.Size() > 0) {';
        // lineResult += '\n    wait(0.1);';
        // lineResult += '\n  }';
        // lineResult += '\n  ' + listToEditId + ' = CityArray_Create("Number");';
    }

    const addArg = (argCodeVal) => {

        if(mode == 0 || mode == 3) {
            lineResult += '\n  ' + listToEditId + '.Add(' + argCodeVal + ');';
        }

        if(mode == 1 || mode == 4) {
            lineResult += '\n  C_argToSend = ' + argCodeVal + ';';
            lineResult += '\n  ' + listToEditId + '.Add(C_argToSend);';
        }

        if(mode == 2) {
            
            
            lineResult += '\n  C_argToSend = ' + argCodeVal + ';';
            lineResult += '\n  ' + listToEditId + '.Set(C_SendDatasListSize, C_argToSend);';

            lineResult += '\n  C_SendDatasListSize = C_SendDatasListSize + 1;';
            
        }
    };


    mode = 0;

    addArg( cModIdSizeHalf + args.length + 2 );
    lineResult += ' // count of all numbers messages, including this number so it cannot be less than 1';

    addArg( 5 + cModIdSizeHalf );
    lineResult += ' // count of all messages for the name plus 5';

    let index = 0;
    while (index < cModId.length) { // Sending the id with numbers:
        
        addArg( 5 + ( (cModId.charCodeAt(index) * 255) + ( index + 1 < cModId.length ? cModId.charCodeAt(index + 1) : 0 ) ) );
        
        index += 2;
    }

    mode = 4;

    lineResult += '\n  // Args';

    index = 0;
    while (index < args.length) {
        
        addArg( '32000 + ' + args[index]);
        
        index++;
    }

    
    if(mode == 3 || mode == 4) {
        
        lineResult += '\n  While(C_API_SendDatas.Size() > 0) {';
        lineResult += '\n    wait(0.1);';
        lineResult += '\n  }';
        lineResult += '\n  C_API_SendDatas = C_API_NewSendDatas;';
    }

    return lineResult;

};

// @sendRequest sender_id, 8, 12345, -123;




customFuncs['import'] = (linetochange) => {

    let stuffToImport = linetochange.split(' ');
    stuffToImport.shift();

    if(stuffToImport.length < 1) {
        return '\n// Error : no arguments with the "import" command\n';
    }

    linetochange = '';

    stuffToImport.forEach(importId => {
        if(!importId) return;
        importId = importId.toLowerCase();
        if(importId[0] == '#') importId = importId.slice(1);
        let importTxt = allImports[importId];
        linetochange += (
            importTxt ? '\n' + importTxt + '\n'
            : '\n//ERROR:\n//Import id not existing: "' + importId + '"'
        );
    });
    
    return linetochange;
}


customFuncs.test = (cline) => {
    // console.log(cline)
    return "// test";
}

exports.compileScriptCode = compileScriptCode;