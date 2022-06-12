import { FileReader, ParserData } from "@aurahelper/core";
import { ApexFormatter, ApexTokenizer } from "../../apex";
import { System } from "../../system";

describe('Testing ./src/apex/formatter.js', () => {
    test('Testing format()', () => {
        const metadataTypes = JSON.parse(FileReader.readFileSync('./src/test/assets/types/metadataTypes.json'));
        const sObjectsData = JSON.parse(FileReader.readFileSync('./src/test/assets/types/sObjects.json'));
        const sObjects: string[] = [];
        const userClasses = [];
        const nsData = System.getAllNamespacesData();
        const nsSummary = System.getAllNamespacesSummary();
        const ns = System.getAllNamespaces();
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
        const systemData: ParserData = {
            sObjects: sObjects,
            sObjectsData: sObjectsData,
            userClasses: userClasses,
            namespacesData: nsData,
            namespaceSummary: nsSummary,
            namespaces: ns
        };
        const oneFile = true;
        const fileToProcess = 't_LeadTrigger.trigger';
        const folderPath = './src/test/assets/SFDXProject/force-app/main/default/triggers';
        console.time('formatTime');
        if (oneFile) {
            //console.time(fileToProcess + ' compilationTime');
            const filPath = folderPath + '/' + fileToProcess;
            const fileContent = FileReader.readFileSync(filPath);
            //console.time(fileToProcess + ' lexer');
            const tokens = ApexTokenizer.tokenize(fileContent, systemData);
            /*console.timeEnd(fileToProcess + ' lexer');
            console.time(fileToProcess + ' parser');*/
            const result = ApexFormatter.format(tokens);
            console.log(result);
            /*console.timeEnd(fileToProcess + ' parser');
            console.timeEnd(fileToProcess + 'compilationTime');*/
        } else {
            for (const file of FileReader.readDirSync(folderPath)) {
                if (!file.endsWith('.cls')) {
                    continue;
                }
                try {
                    //console.time(file + ' compilationTime');
                    const filPath = folderPath + '/' + file;
                    const fileContent = FileReader.readFileSync(filPath);
                    //console.time(file + ' lexer');
                    const tokens = ApexTokenizer.tokenize(fileContent, systemData);
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