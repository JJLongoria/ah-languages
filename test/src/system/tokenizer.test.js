const { Types, FileSystem, CoreUtils } = require('@ah/core');
const FileReader = FileSystem.FileReader;
const FileWriter = FileSystem.FileWriter;
const FileChecker = FileSystem.FileChecker;
const SystemTokenizer = require('../../../src/system/tokenizer');

describe('Testing ./src/system/tokenizer.js', () => {
    test('Testing tokenize()', () => {
        const oneFile = false;
        const fileToProcess = 'cmp_HG_PopoverFiltro/cmp_HG_PopoverFiltro.cmp';
        const folderPath = './test/assets/SFDXProject/force-app/main/default/aura';
        console.time('compilationTime');
        const nodes = {};
        if (oneFile) {
            const filePath = folderPath + '/' + fileToProcess;
            /*console.time(fileToProcess + ' compilationTime');
            console.time(fileToProcess + ' parser');*/
            SystemTokenizer.tokenize(FileReader.readFileSync(filePath));
            /*console.timeEnd(fileToProcess + ' parser');
            console.timeEnd(fileToProcess + 'compilationTime');*/
        } else {
            for (const folder of FileReader.readDirSync(folderPath)) {
                const auraCmpFolder = folderPath + '/' + folder;
                for (const file of FileReader.readDirSync(auraCmpFolder)) {
                    try {
                        const filePath = auraCmpFolder + '/' + file;
                        if (!FileChecker.isAuraFile(filePath))
                            continue;
                        /*console.time(folder + ' compilationTime');
                        console.time(fileToProcess + ' parser');*/
                        SystemTokenizer.tokenize(FileReader.readFileSync(filePath));
                        /*console.timeEnd(fileToProcess + ' parser');
                        console.timeEnd(folder + 'compilationTime');*/
                        //nodes[node.fileName.toLowerCase()] = node;
                    } catch (error) {
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