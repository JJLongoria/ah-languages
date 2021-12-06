import { FileReader, PathUtils, CoreUtils, FileChecker, ApexNodeTypes, ApexClass, ApexInterface, ApexEnum, ClassSummary } from "@aurahelper/core";
const StrUtils = CoreUtils.StrUtils;

const systemClassPath = __dirname + '/classes';
const auraDataPath = __dirname + '/aura';

export class System {

    /**
     * Method to get all namespaces data
     * @returns {{ [key: string]: { [key: string]: ApexClass | ApexInterface | ApexEnum } }} Return a Map with NS name as key and Map as value with class, enum or interface name as key and Apex node data as value
     */
    static getAllNamespacesData(): { [key: string]: { [key: string]: ApexClass | ApexInterface | ApexEnum } } {
        const allNsData: { [key: string]: { [key: string]: ApexClass | ApexInterface | ApexEnum } } = {};
        const nsFiles = FileReader.readDirSync(PathUtils.getAbsolutePath(systemClassPath));
        for (const nsFile of nsFiles) {
            const nsName = StrUtils.replace(nsFile, '.json', '');
            const nsData = System.getNamespaceData(nsName);
            if (nsData) {
                allNsData[nsName] = nsData;
            }
        }
        return allNsData;
    }

    /**
     * Method to get data from specified namespace
     * @param {string} nsName Namespace name to get all data 
     * @returns {{ [key: string]: ApexClass | ApexInterface | ApexEnum } | undefined } Return a Map with class, enum or interface name as key and Apex node data as value  
     */
    static getNamespaceData(nsName: string): { [key: string]: ApexClass | ApexInterface | ApexEnum } | undefined {
        const nsFolder = PathUtils.getAbsolutePath(systemClassPath) + '/' + nsName.toLowerCase();
        if (FileChecker.isExists(nsFolder)) {
            const nsData: { [key: string]: ApexClass | ApexInterface | ApexEnum } = {};
            const nsFiles = FileReader.readDirSync(nsFolder);
            for (const classFile of nsFiles) {
                const className = StrUtils.replace(classFile, '.json', '');
                const obj = JSON.parse(FileReader.readFileSync(nsFolder + '/' + classFile));
                if (obj.nodeType === ApexNodeTypes.CLASS) {
                    nsData[className] = new ApexClass(obj);
                } else if (obj.nodeType === ApexNodeTypes.INTERFACE) {
                    nsData[className] = new ApexInterface(obj);
                } else {
                    nsData[className] = new ApexEnum(obj);
                }
            }
            return nsData;
        } else {
            return undefined;
        }
    }

    /**
     * Method to get All Namespaces summary
     * @returns { [key: string]: { [key: string]: ClassSummary } } Return a Map with NS name as key and Map value with class name as key and Class summary as value
     */
    static getAllNamespacesSummary(): { [key: string]: { [key: string]: ClassSummary } } {
        const allNsDataSummary: { [key: string]: { [key: string]: ClassSummary } } = {};
        const nsFiles = FileReader.readDirSync(PathUtils.getAbsolutePath(systemClassPath));
        for (const nsFile of nsFiles) {
            const nsName = StrUtils.replace(nsFile, '.json', '');
            const nsSummary = System.getNamespaceSummary(nsName)
            if (nsSummary) {
                allNsDataSummary[nsName] = nsSummary;
            }

        }
        return allNsDataSummary;
    }

    /**
     * Method to get namespace classes summary
     * @param {string} nsName Namespace name to get summary 
     * @returns {{ [key: string]: ClassSummary } | undefined} Return a Map with class, inerface or enum as key and ClassSummary object as data
     */
    static getNamespaceSummary(nsName: string): { [key: string]: ClassSummary } | undefined {
        const nsFolder = PathUtils.getAbsolutePath(systemClassPath) + '/' + nsName.toLowerCase();
        if (FileChecker.isExists(nsFolder)) {
            const nsData: { [key: string]: ClassSummary } = {};
            const nsFiles = FileReader.readDirSync(nsFolder);
            for (const classFile of nsFiles) {
                const className = StrUtils.replace(classFile, '.json', '');
                const data = JSON.parse(FileReader.readFileSync(nsFolder + '/' + classFile));
                nsData[className] = {
                    name: data['name'],
                    namespace: data["namespace"],
                    description: data["description"],
                    documentation: data["documentation"],
                };
            }
            return nsData;
        } else {
            return undefined;
        }
    }

    /**
     * Method to get all namespace names
     * @returns {string[]} Return a list with all namespace names
     */
    static getAllNamespaces(): string[] {
        const nsNames: string[] = [];
        const nsFiles = FileReader.readDirSync(PathUtils.getAbsolutePath(systemClassPath));
        for (const nsFile of nsFiles) {
            const nsData = StrUtils.replace(nsFile, '.json', '');
            const nsName = getNamespaceName(nsData);
            if(nsName){
                nsNames.push(nsName);
            }
        }
        return nsNames;
    }

    /**
     * Method to get class data from specified namespace
     * @param {string} nsName Namespace name to get class
     * @param {string} className Class name to get data
     * @returns {ApexInterface | ApexClass | ApexEnum | undefined} Return the selected Apex Node or undefined if namespace or class not exists (or Aura Helper has no data)
     */
    static getClass(nsName: string, className: string): ApexInterface | ApexClass | ApexEnum | undefined {
        const nsFolder = PathUtils.getAbsolutePath(systemClassPath) + '/' + nsName.toLowerCase();
        if (FileChecker.isExists(nsFolder)) {
            const classFile = nsFolder + '/' + className.toLowerCase() + '.json';
            if (FileChecker.isExists(classFile)) {
                let obj = JSON.parse(FileReader.readFileSync(classFile));
                if (obj.nodeType === ApexNodeTypes.CLASS) {
                    obj = new ApexClass(obj);
                } else if (obj.nodeType === ApexNodeTypes.INTERFACE) {
                    obj = new ApexInterface(obj);
                } else {
                    obj = new ApexEnum(obj);
                }
                return obj;
            } else {
                return undefined;
            }
        } else {
            return undefined;
        }
    }

    /**
     * Method to get the Aura Base Components Details
     * @returns {any} Return a JSON with Aura Components system data
     */
    static getAuraComponentDetails() {
        return JSON.parse(FileReader.readFileSync(PathUtils.getAbsolutePath(auraDataPath) + '/baseComponentsDetail.json'));
    }
}

function getNamespaceName(nsName: string): string | undefined {
    const nsFolder = PathUtils.getAbsolutePath(systemClassPath) + '/' + nsName.toLowerCase();
    if (FileChecker.isExists(nsFolder)) {
        const nsFiles = FileReader.readDirSync(nsFolder);
        for (const classFile of nsFiles) {
            const data = JSON.parse(FileReader.readFileSync(nsFolder + '/' + classFile));
            return data["namespace"];
        }
    }
    return undefined;
}