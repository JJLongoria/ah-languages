const { Types, FileSystem, CoreUtils } = require('@ah/core');
const FileReader = FileSystem.FileReader;
const FileWriter = FileSystem.FileWriter;
const FileChecker = FileSystem.FileChecker;
const AuraParser = require('../../../src/aura/parser');

describe('Testing ./src/aura/parser.js', () => {
    test('Testing parse()', () => {
        const oneFile = false;
        const fileToProcess = 'cmp_HG_PopoverFiltro/cmp_HG_PopoverFiltro.cmp';
        const folderPath = './test/assets/SFDXProject/force-app/main/default/aura';
        console.time('compilationTime');
        const nodes = {};
        if(oneFile){
            const filePath = folderPath + '/' + fileToProcess;
            /*console.time(fileToProcess + ' compilationTime');
            console.time(fileToProcess + ' parser');*/
            const node = new AuraParser(filePath).parse();
            /*console.timeEnd(fileToProcess + ' parser');
            console.timeEnd(fileToProcess + 'compilationTime');*/
        } else {
            for (const folder of FileReader.readDirSync(folderPath)) {
                const auraCmpFolder = folderPath + '/' + folder;
                for(const file of FileReader.readDirSync(auraCmpFolder)){
                    try {
                        const filePath = auraCmpFolder + '/' + file;
                        if(!FileChecker.isAuraFile(filePath))
                            continue;
                        /*console.time(folder + ' compilationTime');
                        console.time(fileToProcess + ' parser');*/
                        const node = new AuraParser(filePath).parse();
                        /*console.timeEnd(fileToProcess + ' parser');
                        console.timeEnd(folder + 'compilationTime');*/
                        nodes[node.fileName.toLowerCase()] = node;
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