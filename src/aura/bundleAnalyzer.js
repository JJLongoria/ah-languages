const { FileReader, FileChecker, PathUtils } = require('@aurahelper/core').FileSystem;
const { AuraAttribute, Token, Position } = require('@aurahelper/core').Types;
const JSParser = require('../javascript/parser');
const AuraParser = require('./parser');
const AuraTokenTypes = require('./tokenTypes');
const ApexParser = require('../apex/parser');
const system = require('../system/system');
const baseComponentsDetail = system.getAuraComponentDetails();


class BundleAnalyzer {

    constructor(file, systemData) {
        this._file = file;
        this._systemData = systemData;
        this._fileName;
        this._content;
        this._component;
    }

    setFile(file) {
        this._file = file;
        return this;
    }

    setContent(content) {
        this._content = content;
        return this;
    }

    setSystemData(systemData) {
        this._systemData = systemData;
        return this;
    }

    setFileName(fileName) {
        this._fileName = fileName;
        return this;
    }

    setComponent(component) {
        this._component = component;
        return this;
    }

    analize(position) {
        if (this._file && !this._component) {
            this._component = new AuraParser(this._file, this._fileName).setContent(this._content).setCursorPosition(position).parse();
        } else {
            this._file = this._component.file;
        }
        if (!this._component)
            return undefined;
        const componentName = this._component.fileName || this._fileName;
        if (!this._component.attributes) {
            this._component.attributes = [];
        }
        for (const rootDetail of baseComponentsDetail['root']['component']) {
            const newAttribute = new AuraAttribute();
            for (const field of Object.keys(rootDetail)) {
                newAttribute[field] = {
                    name: new Token(AuraTokenTypes.ENTITY.TAG.ATTRIBUTE, field, new Position(0, 0), new Position(0, field.length)),
                    value: new Token(AuraTokenTypes.ENTITY.TAG.ATTRIBUTE_VALUE, rootDetail[field].toString(), new Position(0, 0), new Position(0, rootDetail[field].length)),
                };
            }
            this._component.attributes.push(newAttribute);
        }
        const jsController = BundleAnalyzer.getController(this._file);
        const helperController = BundleAnalyzer.getHelper(this._file);
        if (jsController && jsController.positionData)
            this._component.positionData = jsController.positionData;
        if (helperController && helperController.positionData)
            this._component.positionData = helperController.positionData;
        this._component.controllerFunctions = (jsController) ? jsController.methods : [];
        this._component.helperFunctions = (helperController) ? helperController.methods : [];
        if (this._component.controller && this._component.controller.value.textToLower) {
            let apexNode;
            if (this._systemData && this._systemData.userClassesData && this._systemData.userClassesData[this._component.controller.value.textToLower]) {
                apexNode = new ApexParser().setSystemData(this._systemData).resolveReferences(this._systemData.userClassesData[this._component.controller.value.textToLower]);
            } else {
                let classPath = this._file.replace('aura/' + componentName + '/' + componentName + '.cmp', 'classes/' + this._component.controller.value.text + '.cls');
                apexNode = new ApexParser(classPath, this._systemData).resolveReferences();

            }
            this._component.apexFunctions = apexNode.methods;
        }
        let parentComponent = this._component;
        while (parentComponent.extends) {
            const parentComponentName = parentComponent.extends.value.text.replace('c:', '');
            const parentFile = this._file.replace(new RegExp(componentName, 'g'), parentComponentName);
            if(!FileChecker.isExists(parentFile))
                break;
            parentComponent = new AuraParser(parentFile).parse();
            const jsController = BundleAnalyzer.getController(parentFile);
            const helperController = BundleAnalyzer.getHelper(parentFile);
            parentComponent.controllerFunctions = (jsController) ? jsController.methods : [];
            parentComponent.helperFunctions = (helperController) ? helperController.methods : [];
            if (parentComponent.controller && parentComponent.controller.value.textToLower) {
                let apexNode;
                if (this._systemData && this._systemData.userClassesData && this._systemData.userClassesData[parentComponent.controller.value.textToLower]) {
                    apexNode = new ApexParser().setSystemData(this._systemData).resolveReferences(this._systemData.userClassesData[parentComponent.controller.value.textToLower]);
                } else {
                    let classPath = parentFile.replace('aura/' + componentName + '/' + componentName + '.cmp', 'classes\/' + parentComponent.controller.value.text + '.cls');
                    classPath = classPath.replace('aura/' + componentName + '/' + componentName + '.app', 'classes\/' + parentComponent.controller.value.text + '.cls');
                    classPath = classPath.replace('aura/' + componentName + '/' + componentName + '.evt', 'classes\/' + parentComponent.controller.value.text + '.cls');
                    apexNode = new ApexParser(classPath, this._systemData).resolveReferences();
                }
                if (apexNode) {
                    for (const methodKey of Object.keys(apexNode.methods)) {
                        if (!this._component.apexFunctions[methodKey])
                            this._component.apexFunctions[methodKey] = apexNode.methods[methodKey];
                    }
                }
            }
            if (parentComponent.attributes) {
                for (const element of parentComponent.attributes) {
                    let exists = false;
                    for (const existingElement of this._component.attributes) {
                        if (element.name === existingElement.name) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists)
                        this._component.attributes.push(element);
                }
            }
            if (parentComponent.implements) {
                const implementValues = parentComponent.implements.value.text.split(',');
                for (let i = 0; i < implementValues.length; i++) {
                    let value = implementValues[i].trim();
                    if (!this._component.implementsValues.includes(value))
                        this._component.implementsValues.push(value);
                }
            }
            if (parentComponent.events) {
                for (const element of parentComponent.events) {
                    let existing = false;
                    for (const existingElement of this._component.events) {
                        if (existingElement === element) {
                            existing = true;
                            break;
                        }
                    }
                    if (!existing)
                        this._component.events.push(element);
                }
            }
            if (parentComponent.handlers) {
                for (const element of parentComponent.handlers) {
                    let existing = false;
                    for (const existingElement of this._component.handlers) {
                        if (existingElement === element) {
                            existing = true;
                            break;
                        }
                    }
                    if (!existing)
                        this._component.handlers.push(element);
                }
            }
            if (parentComponent.controllerFunctions) {
                for (const element of parentComponent.controllerFunctions) {
                    let existing = false;
                    for (const existingElement of this._component.controllerFunctions) {
                        if (existingElement === element) {
                            existing = true;
                            break;
                        }
                    }
                    if (!existing)
                        this._component.controllerFunctions.push(element);
                }
            }
            if (parentComponent.helperFunctions) {
                for (const element of parentComponent.helperFunctions) {
                    let existing = false;
                    for (const existingElement of this._component.helperFunctions) {
                        if (existingElement === element) {
                            existing = true;
                            break;
                        }
                    }
                    if (!existing)
                        this._component.helperFunctions.push(element);
                }
            }
        }
        if (this._component.implementsValues && this._component.implementsValues.length > 0) {
            for (const implement of this._component.implementsValues) {
                let interfaceToCheck = implement;
                if (interfaceToCheck.indexOf('lightning:isUrlAddressable') !== -1)
                    interfaceToCheck = 'lightning:hasPageReference';
                const splits = interfaceToCheck.split(':');
                const ns = splits[0];
                const componentName = splits[1];
                const interfaceNS = baseComponentsDetail[ns];
                if (interfaceNS) {
                    const attributes = interfaceNS[componentName];
                    if (attributes && attributes.length > 0) {
                        for (const attribute of attributes) {
                            let existing = false;
                            for (const existingAttr of this._component.attributes) {
                                if (attribute.name === existingAttr.name) {
                                    existing = true;
                                    break;
                                }
                            }
                            if (!existing) {
                                const newAttribute = new AuraAttribute();
                                for (const field of Object.keys(attribute)) {
                                    newAttribute[field] = {
                                        name: new Token(AuraTokenTypes.ENTITY.TAG.ATTRIBUTE, field, new Position(0, 0), new Position(0, field.length)),
                                        value: new Token(AuraTokenTypes.ENTITY.TAG.ATTRIBUTE_VALUE, attribute[field].toString(), new Position(0, 0), new Position(0, attribute[field].length)),
                                    };
                                }
                                newAttribute.namespace = ns;
                                newAttribute.tagName = componentName;
                                this._component.attributes.push(newAttribute);
                            }
                        }
                    }
                }
            }
        }
        return this._component;
    }

    static getController(componentPath) {
        let controllerPath = componentPath.replace('.cmp', 'Controller.js').replace('.app', 'Controller.js').replace('.evt', 'Controller.js');
        if (FileChecker.isExists(controllerPath) && FileChecker.isAuraControllerJS(controllerPath)) {
            const jsFileData = new JSParser(controllerPath).parse();
            return jsFileData;
        }
        return undefined;
    }

    static getHelper(componentPath) {
        let helperPath = componentPath.replace('.cmp', 'Helper.js').replace('.app', 'Helper.js').replace('.evt', 'Helper.js');
        if (FileChecker.isExists(helperPath) && FileChecker.isAuraHelperJS(helperPath)) {
            const jsFileData = new JSParser(helperPath).parse();
            return jsFileData;
        }
        return undefined;
    }

}
module.exports = BundleAnalyzer;