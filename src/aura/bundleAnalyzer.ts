import { ApexClass, AuraApplication, AuraAttribute, AuraComponent, AuraEvent, AuraTagData, AuraTokenTypes, FileChecker, ParserData, Position, Token } from "@aurahelper/core";
import { ApexParser } from "../apex";
import { JSParser } from "../javascript";
import { System } from "../system";
import { AuraParser } from "./parser";

const baseComponentsDetail = System.getAuraComponentDetails();

/**
 * Class to analize an entire Aura Bundle (including Apex Controllers)
 */
export class BundleAnalyzer {

    _file?: string;
    _systemData?: ParserData;
    _fileName?: string;
    _activeFile: string;
    _content?: string;
    _component?: AuraComponent | AuraApplication | AuraEvent;
    _tabSize: number;

    /**
     * Create new BundleAnalyzer instance to analize Aura Bundles
     * @param {string} file File path to analyze
     * @param {ParserData} [systemData] Parser Data object with data from Project and Salesforce to identify tokens with more precission   
     */
    constructor(file: string, systemData?: ParserData) {
        this._file = file;
        this._systemData = systemData;
        this._fileName;
        this._activeFile = this._file;
        this._content;
        this._component;
        this._tabSize = 4;
    }

    /**
     * Method to set file path
     * @param {string} file File path value
     * @returns {BundleAnalyzer} Return the BundleAnalyzer instance
     */
    setFile(file: string): BundleAnalyzer {
        this._file = file;
        return this;
    }

    /**
     * Method to set file content
     * @param {string} content File content value
     * @returns {BundleAnalyzer} Return the BundleAnalyzer instance
     */
    setContent(content: string): BundleAnalyzer {
        this._content = content;
        return this;
    }

    /**
     * Method to set Parser Data
     * @param {ParserData} systemData Parser Data object
     * @returns {BundleAnalyzer} Return the BundleAnalyzer instance
     */
    setSystemData(systemData: ParserData): BundleAnalyzer {
        this._systemData = systemData;
        return this;
    }

    /**
     * Method to set active file path
     * @param {string} activeFile active file path value
     * @returns {BundleAnalyzer} Return the BundleAnalyzer instance
     */
    setActiveFile(activeFile: string): BundleAnalyzer {
        this._activeFile = activeFile;
        return this;
    }

    /**
     * Method to set file name
     * @param {string} fileName File name value
     * @returns {BundleAnalyzer} Return the BundleAnalyzer instance
     */
    setFileName(fileName: string): BundleAnalyzer {
        this._fileName = fileName;
        return this;
    }

    /**
     * Method to set file tab size
     * @param {number} tabSize File tab size value
     * @returns {BundleAnalyzer} Return the BundleAnalyzer instance
     */
    setTabSize(tabSize: number): BundleAnalyzer {
        this._tabSize = tabSize;
        return this;
    }

    /**
     * Method to analize bundle and get all Aura component info
     * @param {Position} [position] Position to get data about cursor position on file  
     * @returns {AuraComponent | AuraApplication | AuraEvent | undefined} Return the analized Component or undefined if not exists
     */
    analize(position?: Position): AuraComponent | AuraApplication | AuraEvent | undefined {
        if (this._file && !this._component) {
            this._component = new AuraParser(this._file, this._fileName).setTabSize(this._tabSize).setContent(this._content).setCursorPosition((FileChecker.isAuraFile(this._activeFile)) ? position : undefined).parse();
        } else {
            this._file = this._component!.file;
        }
        if (!this._component) {
            return undefined;
        }
        const componentName: string | undefined = this._component.fileName || this._fileName;
        if (!componentName || !this._file) {
            return undefined;
        }
        if (!this._component.attributes) {
            this._component.attributes = [];
        }
        for (const rootDetail of baseComponentsDetail['root']['component']) {
            const newAttribute = new AuraAttribute('');
            for (const field of Object.keys(rootDetail)) {
                if (field === 'name' || field === 'type' || field === 'description' || field === 'access' || field === 'required' || field === 'default') {
                    const data: AuraTagData = {
                        name: new Token(AuraTokenTypes.ENTITY.TAG.ATTRIBUTE, field, 0, 0),
                        value: new Token(AuraTokenTypes.ENTITY.TAG.ATTRIBUTE_VALUE, rootDetail[field].toString(), 0, 0),
                    };
                    newAttribute[field] = data;
                }
            }
            this._component.attributes.push(newAttribute);
        }
        const jsController = getController(this._file, (FileChecker.isAuraControllerJS(this._activeFile)) ? position : undefined);
        const helperController = getHelper(this._file, (FileChecker.isAuraHelperJS(this._activeFile)) ? position : undefined);
        if (jsController && jsController.positionData) {
            this._component.positionData = jsController.positionData;
        }
        if (helperController && helperController.positionData) {
            this._component.positionData = helperController.positionData;
        }
        if (this._component instanceof AuraComponent) {
            this._component.controllerFunctions = (jsController) ? jsController.methods : [];
            this._component.helperFunctions = (helperController) ? helperController.methods : [];
            if (this._component.controller && this._component.controller.value.textToLower) {
                let apexNode;
                if (this._systemData && this._systemData.userClassesData && this._systemData.userClassesData[this._component.controller.value.textToLower]) {
                    apexNode = new ApexParser().setSystemData(this._systemData).resolveReferences(this._systemData.userClassesData[this._component.controller.value.textToLower]);
                } else {
                    let classPath = this._file!.replace('aura/' + componentName + '/' + componentName + '.cmp', 'classes/' + this._component.controller.value.text + '.cls');
                    apexNode = new ApexParser(classPath, this._systemData).resolveReferences();

                }
                if (apexNode instanceof ApexClass) {
                    this._component.apexFunctions = apexNode.methods;
                }
            }
            let parentComponent = this._component;
            while (parentComponent.extends) {
                const parentComponentName = parentComponent.extends.value.text.replace('c:', '');
                const parentFile = this._file!.replace(new RegExp(componentName, 'g'), parentComponentName);
                if (!FileChecker.isExists(parentFile)) {
                    break;
                }
                parentComponent = new AuraParser(parentFile).parse() as AuraComponent;
                const jsController = getController(parentFile);
                const helperController = getHelper(parentFile);
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
                    if (apexNode && apexNode instanceof ApexClass) {
                        for (const methodKey of Object.keys(apexNode.methods)) {
                            if (this._component && this._component.apexFunctions && !this._component.apexFunctions[methodKey]) {
                                this._component!.apexFunctions[methodKey] = apexNode.methods[methodKey];
                            }
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
                        if (!exists) {
                            this._component.attributes.push(element);
                        }
                    }
                }
                if (parentComponent.implements) {
                    const implementValues = parentComponent.implements.value.text.split(',');
                    for (let i = 0; i < implementValues.length; i++) {
                        let value = implementValues[i].trim();
                        if (this._component && this._component.implementsValues && !this._component.implementsValues.includes(value)) {
                            this._component.implementsValues.push(value);
                        }
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
                        if (!existing) {
                            this._component.events.push(element);
                        }
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
                        if (!existing) {
                            this._component.handlers.push(element);
                        }
                    }
                }
                if (parentComponent.controllerFunctions) {
                    for (const element of parentComponent.controllerFunctions) {
                        let existing = false;
                        if (!this._component.controllerFunctions) {
                            this._component.controllerFunctions = [];
                        }
                        for (const existingElement of this._component.controllerFunctions) {
                            if (existingElement === element) {
                                existing = true;
                                break;
                            }
                        }
                        if (!existing) {
                            this._component.controllerFunctions.push(element);
                        }
                    }
                }
                if (parentComponent.helperFunctions) {
                    for (const element of parentComponent.helperFunctions) {
                        let existing = false;
                        if (!this._component.helperFunctions) {
                            this._component.helperFunctions = [];
                        }
                        for (const existingElement of this._component.helperFunctions) {
                            if (existingElement === element) {
                                existing = true;
                                break;
                            }
                        }
                        if (!existing) {
                            this._component.helperFunctions.push(element);
                        }
                    }
                }
            }
            if (this._component.implementsValues && this._component.implementsValues.length > 0) {
                for (const implement of this._component.implementsValues) {
                    let interfaceToCheck = implement;
                    if (interfaceToCheck.indexOf('lightning:isUrlAddressable') !== -1) {
                        interfaceToCheck = 'lightning:hasPageReference';
                    }
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
                                    const newAttribute = new AuraAttribute('');
                                    for (const field of Object.keys(attribute)) {
                                        if (field === 'name' || field === 'type' || field === 'description' || field === 'access' || field === 'required' || field === 'default') {
                                            const data: AuraTagData = {
                                                name: new Token(AuraTokenTypes.ENTITY.TAG.ATTRIBUTE, field, 0, 0),
                                                value: new Token(AuraTokenTypes.ENTITY.TAG.ATTRIBUTE_VALUE, attribute[field].toString(), 0, 0),
                                            };
                                            newAttribute[field] = data;
                                        }
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
        }
        return this._component;
    }
}

function getController(componentPath: string, position?: Position) {
    let controllerPath = componentPath.replace('.cmp', 'Controller.js').replace('.app', 'Controller.js').replace('.evt', 'Controller.js');
    if (FileChecker.isExists(controllerPath) && FileChecker.isAuraControllerJS(controllerPath)) {
        const jsFileData = new JSParser(controllerPath).setCursorPosition(position).parse();
        return jsFileData;
    }
    return undefined;
}

function getHelper(componentPath: string, position?: Position) {
    let helperPath = componentPath.replace('.cmp', 'Helper.js').replace('.app', 'Helper.js').replace('.evt', 'Helper.js');
    if (FileChecker.isExists(helperPath) && FileChecker.isAuraHelperJS(helperPath)) {
        const jsFileData = new JSParser(helperPath).setCursorPosition(position).parse();
        return jsFileData;
    }
    return undefined;
}