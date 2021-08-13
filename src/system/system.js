const { FileReader, FileChecker } = require('@ah/core').FileSystem;
const { StrUtils, Utils } = require('@ah/core').CoreUtils;

const systemClassPath = './src/system/classes';
const auraClassPath = './src/system/aura';
const nsData = {}; 

class System {

    static getAllNamespacesData() {
        const nsData = {};
        const nsFiles = FileReader.readDirSync(systemClassPath);
        for (const nsFile of nsFiles) {
            const nsName = StrUtils.replace(nsFile, '.json', '');
            nsData[nsName] = System.getNamespaceData(nsName);
        }
        return nsData;
    }

    static getNamespaceData(nsName) {
        const nsFolder = systemClassPath + '/' + nsName.toLowerCase();
        if (FileChecker.isExists(nsFolder)) {
            const nsData = {};
            const nsFiles = FileReader.readDirSync(nsFolder);
            for (const classFile of nsFiles) {
                const className = StrUtils.replace(classFile, '.json', '');
                nsData[className] = JSON.parse(FileReader.readFileSync(nsFolder + '/' + classFile));
            }
            return nsData;
        } else {
            return undefined;
        }
    }

    static getAllNamespacesSummary() {
        const nsData = {};
        const nsFiles = FileReader.readDirSync(systemClassPath);
        for (const nsFile of nsFiles) {
            const nsName = StrUtils.replace(nsFile, '.json', '');
            nsData[nsName] = System.getNamespaceSummary(nsName);
        }
        return nsData;
    }

    static getNamespaceSummary(nsName) {
        const nsFolder = systemClassPath + '/' + nsName.toLowerCase();
        if (FileChecker.isExists(nsFolder)) {
            const nsData = {};
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

    static getClass(nsName, className) {
        const nsFolder = systemClassPath + '/' + nsName.toLowerCase();
        if (FileChecker.isExists(nsFolder)) {
            const classFile = nsFolder + '/' + className.toLowerCase() + '.json';
            if (FileChecker.isExists(classFile)) {
                return JSON.parse(FileReader.readFileSync(classFile));
            } else {
                return undefined;
            }
        } else {
            return undefined;
        }
    }

    static getAuraComponentDetails(){
        return JSON.parse(FileReader.readFileSync(auraClassPath + '/baseComponentsDetail.json'));
    }
}
module.exports = System;