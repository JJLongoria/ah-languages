const { Types, FileSystem, CoreUtils } = require('@ah/core');
const FileReader = FileSystem.FileReader;
const FileWriter = FileSystem.FileWriter;
const FileChecker = FileSystem.FileChecker;
const JSParser = require('../../../src/javascript/parser');

describe('Testing ./src/javascript/parser.js', () => {
    test('Testing parse()', () => {
        const oneFile = false;
        const fileToProcess = 'cmp_HG_PopoverFiltro/cmp_HG_PopoverFiltroController.js';
        const folderPath = './test/assets/SFDXProject/force-app/main/default/aura';
        console.time('compilationTime');
        const nodes = {};
        if(oneFile){
            const filePath = folderPath + '/' + fileToProcess;
            /*console.time(fileToProcess + ' compilationTime');
            console.time(fileToProcess + ' parser');*/
            const node = JSParser.parse(filePath);
            /*console.timeEnd(fileToProcess + ' parser');
            console.timeEnd(fileToProcess + 'compilationTime');*/
        } else {
            for (const folder of FileReader.readDirSync(folderPath)) {
                const auraCmpFolder = folderPath + '/' + folder;
                for(const file of FileReader.readDirSync(auraCmpFolder)){
                    try {
                        const filePath = auraCmpFolder + '/' + file;
                        if(!FileChecker.isAuraControllerJS(filePath) && !FileChecker.isAuraHelperJS(filePath))
                            continue;
                        /*console.time(folder + ' compilationTime');
                        console.time(fileToProcess + ' parser');*/
                        const node = JSParser.parse(filePath);
                        /*console.timeEnd(fileToProcess + ' parser');
                        console.timeEnd(folder + 'compilationTime');*/
                    } catch(error){
                        console.log('Error en el archivo: ' + folder);
                        console.log(JSON.stringify(error));
                        throw error;
                    }
                }
            }
        }
        console.timeEnd('compilationTime');
    });
});