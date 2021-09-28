const { FileReader, FileChecker, PathUtils } = require('@aurahelper/core').FileSystem;
const { StrUtils, Utils } = require('@aurahelper/core').CoreUtils;
const { ApexNodeTypes } = require('@aurahelper/core').Values;
const { ApexClass, ApexInterface, ApexEnum } = require('@aurahelper/core').Types;
const systemClassPath = __dirname + '/classes';
const auraDataPath = __dirname + '/aura';
const nsData = {};

class System {

    static getAllNamespacesData() {
        const nsData = {};
        const nsFiles = FileReader.readDirSync(PathUtils.getAbsolutePath(systemClassPath));
        for (const nsFile of nsFiles) {
            const nsName = StrUtils.replace(nsFile, '.json', '');
            nsData[nsName] = System.getNamespaceData(nsName);
        }
        return nsData;
    }

    static getNamespaceData(nsName) {
        const nsFolder = PathUtils.getAbsolutePath(systemClassPath) + '/' + nsName.toLowerCase();
        if (FileChecker.isExists(nsFolder)) {
            const nsData = {};
            const nsFiles = FileReader.readDirSync(nsFolder);
            for (const classFile of nsFiles) {
                const className = StrUtils.replace(classFile, '.json', '');
                const obj = JSON.parse(FileReader.readFileSync(nsFolder + '/' + classFile));
                if(obj.nodeType === ApexNodeTypes.CLASS){
                    nsData[className] = new ApexClass(obj);
                } else if(obj.nodeType === ApexNodeTypes.INTERFACE){
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

    static getAllNamespacesSummary() {
        const nsData = {};
        const nsFiles = FileReader.readDirSync(PathUtils.getAbsolutePath(systemClassPath));
        for (const nsFile of nsFiles) {
            const nsName = StrUtils.replace(nsFile, '.json', '');
            nsData[nsName] = System.getNamespaceSummary(nsName);
        }
        return nsData;
    }

    static getNamespaceSummary(nsName) {
        const nsFolder = PathUtils.getAbsolutePath(systemClassPath) + '/' + nsName.toLowerCase();
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

    static getAllNamespaces() {
        const nsData = [];
        const nsFiles = FileReader.readDirSync(PathUtils.getAbsolutePath(systemClassPath));
        for (const nsFile of nsFiles) {
            const nsName = StrUtils.replace(nsFile, '.json', '');
            nsData.push(getNamespaceName(nsName));
        }
        return nsData;
    }

    static getClass(nsName, className) {
        const nsFolder = PathUtils.getAbsolutePath(systemClassPath) + '/' + nsName.toLowerCase();
        if (FileChecker.isExists(nsFolder)) {
            const classFile = nsFolder + '/' + className.toLowerCase() + '.json';
            if (FileChecker.isExists(classFile)) {
                let obj = JSON.parse(FileReader.readFileSync(classFile));
                if(obj.nodeType === ApexNodeTypes.CLASS){
                    obj = new ApexClass(obj);
                } else if(obj.nodeType === ApexNodeTypes.INTERFACE){
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

    static getAuraComponentDetails() {
        return JSON.parse(FileReader.readFileSync(PathUtils.getAbsolutePath(auraDataPath) + '/baseComponentsDetail.json'));
    }
}
module.exports = System;

function getNamespaceName(nsName) {
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