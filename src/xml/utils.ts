import { Datatypes, CoreUtils } from "@aurahelper/core";

const Utils = CoreUtils.Utils;

/**
 * Class with utils methos to use when analize XML Files
 */
export class XMLUtils {

    /**
     * Method to Clean an XML file
     * @param {any} xmlDefinition XML File Definition
     * @param {any} [xmlData] XML File parsed data
     * @returns {any} Return the content file cleaned
     */
    static cleanXMLFile(xmlDefinition: any, xmlData?: any): any {
        let result;
        if (xmlDefinition) {
            result = {};
            if (xmlData) {
                result = XMLUtils.createXMLFile(xmlDefinition);
                result = prepareXML(xmlData, result, xmlDefinition);
            } else {
                result = XMLUtils.createXMLFile(xmlDefinition);
            }
        }
        return result;
    }

    /**
     * Method to create an XML file using XML definition
     * @param {any} xmlMetadata XML file definition
     * @returns {any} Return the XML created file (as JSON object)
     */
    static createXMLFile(xmlMetadata: any): any {
        const result: any = {};
        Object.keys(xmlMetadata).forEach(function (xmlField) {
            let elementData = xmlMetadata[xmlField];
            if (elementData.datatype === Datatypes.ARRAY) {
                result[xmlField] = [];
            } else if (elementData.datatype === Datatypes.OBJECT) {
                result[xmlField] = {};
            } else {
                result[xmlField] = undefined;
            }
        });
        return result;
    }

    /**
     * Method to force xml element to be an array
     * @param {any} element XML element 
     * @returns {any} Return the element on array
     */
    static forceArray(element: any): any[] {
        let result: any[] = [];
        if (element !== undefined) {
            if (Array.isArray(element)) {
                result = element;
            } else {
                result.push(element);
            }
        }
        return result;
    }

    /**
     * Method to sort XML files
     * @param {any[]} elements elements to sort 
     * @param {string[]} fields fields to use to sort data
     * @returns {any[]} Return the elements sorted
     */
    static sort(elements: any[], fields?: string[]): any[] {
        if (Array.isArray(elements)) {
            elements.sort((a, b) => {
                if (fields && fields.length > 0) {
                    let nameA = '';
                    let nameB = '';
                    let counter = 0;
                    for (const field of fields) {
                        let valA = (a[field] !== undefined) ? a[field] : "";
                        let valB = (b[field] !== undefined) ? b[field] : "";
                        if (counter === 0) {
                            nameA = valA;
                            nameB = valB;
                        } else {
                            nameA += '_' + valA;
                            nameB += '_' + valB;
                        }
                        counter++;
                    }
                    if (Utils.isNumber(nameA) && Utils.isNumber(nameB)) {
                        if (nameA > nameB) {
                            return 1;
                        } else if (nameA < nameB) {
                            return -1;
                        } else {
                            return 0;
                        }
                    } else {
                        nameA = '' + nameA;
                        nameB = '' + nameB;
                        return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
                    }
                } else {
                    a = '' + a;
                    b = '' + b;
                    return a.toLowerCase().localeCompare(b.toLowerCase());
                }
            });
        }
        return elements;
    }

    /**
     * Method to get XML field attributes
     * @param {any} data XMLField data 
     * @returns {string[]} Return the attribute list as XML format
     */
    static getAttributes(data: any): string[] {
        let attributes: string[] = [];
        if (data['@attrs'] !== undefined) {
            Object.keys(data['@attrs']).forEach(function (key) {
                attributes.push(key + '="' + data['@attrs'][key] + '"');
            });
        }
        return attributes;
    }

    /**
     * Method to get tag text
     * @param {any} data XML Tag data 
     * @returns {string | undefined} Return text data
     */
    static getText(data: any) {
        let text = undefined;
        if (data['#text'] !== undefined) {
            text = data['#text'];
        }
        return text;
    }

    /**
     * Method to get N tabs
     * @param {number} nTabs Tabs number
     * @returns {string} Retunr a text with N tabs symbols (\t)
     */
    static getTabs(nTabs: number): string {
        let tabs = '';
        for (let i = 0; i < nTabs; i++) {
            tabs += '\t';
        }
        return tabs;
    }

}

function prepareXML(source: any, target: any, definition: any): any {
    Object.keys(target).forEach(function (key) {
        if (source[key] !== undefined) {
            if (Array.isArray(target[key]) && source[key].length > 0) {
                target[key] = XMLUtils.forceArray(source[key]);
            } else if (typeof source[key] === 'object' && Object.keys(source[key])) {
                target[key] = source[key];
            } else if (source[key] !== undefined) {
                target[key] = source[key];
            }
            if (definition[key].datatype === Datatypes.OBJECT && !Utils.isObject(target[key])) {
                target[key] = {};
            } else if (definition[key].datatype === Datatypes.ARRAY && !Utils.isArray(target[key]) && target[key]) {
                target[key] = Utils.forceArray(target[key]);
            }
        }
        if (target[key] === undefined) {
            delete target[key];
        }
    });
    if (source['@attrs']) {
        target['@attrs'] = source['@attrs'];
    }
    return target;
}