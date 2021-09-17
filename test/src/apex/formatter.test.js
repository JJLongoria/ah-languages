const { FileSystem, CoreUtils } = require('@ah/core');
const FileReader = FileSystem.FileReader;
const ApexLexer = require('../../../src/apex/tokenizer');
const ApexFormatter = require('../../../src/apex/formatter');
const System = require('../../../src/system/system');

describe('Testing ./src/apex/formatter.js', () => {
    test('Testing format()', () => {
        const metadataTypes = JSON.parse(FileReader.readFileSync('./test/assets/types/metadataTypes.json'));
        const sObjectsData = JSON.parse(FileReader.readFileSync('./test/assets/types/sObjects.json'));
        const sObjects = [];
        const userClasses = [];
        for (const metadataTypeName of Object.keys(metadataTypes)) {
            const metadataType = metadataTypes[metadataTypeName];
            for (const metadataObjectName of Object.keys(metadataType.childs)) {
                if (metadataTypeName === 'ApexClass') {
                    userClasses.push(metadataObjectName.toLowerCase());
                } else if (metadataTypeName === 'CustomObject') {
                    sObjects.push(metadataObjectName.toLowerCase());
                }
            }
        }
        const oneFile = false;
        const fileToProcess = 'a_AccountTriggerHandler.cls';
        console.time('nsSummary');
        const nsSummary = System.getAllNamespacesSummary();
        console.timeEnd('nsSummary');
        const folderPath = './test/assets/SFDXProject/force-app/main/default/classes';
        console.time('formatTime');
        if (oneFile) {
            //console.time(fileToProcess + ' compilationTime');
            const filPath = folderPath + '/' + fileToProcess;
            const fileContent = FileReader.readFileSync(filPath);
            //console.time(fileToProcess + ' lexer');
            const tokens = ApexLexer.tokenize(fileContent, sObjects, userClasses, nsSummary);
            /*console.timeEnd(fileToProcess + ' lexer');
            console.time(fileToProcess + ' parser');*/
            ApexFormatter.format(tokens);
            /*console.timeEnd(fileToProcess + ' parser');
            console.timeEnd(fileToProcess + 'compilationTime');*/
        } else {
            for (const file of FileReader.readDirSync(folderPath)) {
                if (!file.endsWith('.cls'))
                    continue;
                try {
                    //console.time(file + ' compilationTime');
                    const filPath = folderPath + '/' + file;
                    const fileContent = FileReader.readFileSync(filPath);
                    //console.time(file + ' lexer');
                    const tokens = ApexLexer.tokenize(fileContent, sObjects, userClasses, nsSummary);
                    /*console.timeEnd(file + ' lexer');
                    console.time(file + ' parser');*/
                    ApexFormatter.format(tokens);
                    /*console.timeEnd(file + ' parser');
                    console.timeEnd(file + 'compilationTime');*/
                } catch (error) {
                    console.log('Error en el archivo: ' + file);
                    console.log(JSON.stringify(error));
                    throw error;
                }
            }
        }
        console.timeEnd('formatTime');
    });
});