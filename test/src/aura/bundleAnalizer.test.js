const { Types, FileSystem, CoreUtils } = require('@ah/core');
const System = require('../../../src/system/system');
const FileReader = FileSystem.FileReader;
const FileWriter = FileSystem.FileWriter;
const FileChecker = FileSystem.FileChecker;
const BundleAnalyzer = require('../../../src/aura/bundleAnalyzer');

describe('Testing ./src/aura/parser.js', () => {
    test('Testing parse()', () => {
        const metadataTypes = JSON.parse(FileReader.readFileSync('./test/assets/types/metadataTypes.json'));
        const sObjectsData = JSON.parse(FileReader.readFileSync('./test/assets/types/sObjects.json'));
        const sObjects = [];
        const userClasses = [];
        const nsSummary = System.getAllNamespacesData();
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
        const systemData = {
            sObjects: sObjects,
            sObjectsData: sObjectsData,
            userClasses: userClasses,
            namespace: nsSummary
        };
        const oneFile = false;
        const fileToProcess = 'cmp_HG_PopoverFiltro/cmp_HG_PopoverFiltro.cmp';
        const folderPath = './test/assets/SFDXProject/force-app/main/default/aura';
        console.time('compilationTime');
        const nodes = {};
        if (oneFile) {
            const filePath = folderPath + '/' + fileToProcess;
            /*console.time(fileToProcess + ' compilationTime');
            console.time(fileToProcess + ' parser');*/
            const node = new BundleAnalyzer(filePath, systemData).analize();
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
                        const node = new BundleAnalyzer(filePath, systemData).analize();
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