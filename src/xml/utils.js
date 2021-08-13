const { DataTypes } = require('@ah/core').Values;

class XMLUtils {

    static cleanXMLFile(xmlDefinition, xmlData) {
        let result;
        if (xmlDefinition) {
            result = {};
            if (xmlData) {
                result = XMLUtils.createXMLFile(xmlDefinition);
                result = prepareXML(xmlData, result);
            } else {
                result = XMLUtils.createXMLFile(xmlDefinition);
            }
        }
        return result;
    }

    static createXMLFile(xmlMetadata) {
        let result = {};
        Object.keys(xmlMetadata).forEach(function (xmlField) {
            let elementData = xmlMetadata[xmlField];
            if (elementData.datatype === DataTypes.ARRAY) {
                result[xmlField] = [];
            } else if (elementData.datatype === DataTypes.OBJECT) {
                result[xmlField] = {};
            } else {
                result[xmlField] = undefined;
            }
        });
        return result;
    }

    static forceArray(element) {
        let result = [];
        if (element !== undefined) {
            if (Array.isArray(element))
                result = element;
            else
                result.push(element);
        }
        return result;
    }

    static sort(elements, fields) {
        if (Array.isArray(elements)) {
            elements.sort(function (a, b) {
                if (fields && fields.length > 0) {
                    let nameA = '';
                    let nameB = '';
                    let counter = 0;
                    for (const iterator of fields) {
                        let valA = (a[iterator] !== undefined) ? a[iterator] : "";
                        let valB = (b[iterator] !== undefined) ? b[iterator] : "";
                        if (counter == 0) {
                            nameA = '' + valA;
                            nameB = '' + valB;
                        } else {
                            nameA += '_' + valA;
                            nameB += '_' + valB;
                        }
                        counter++;
                    }
                    return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
                } else {
                    return '' + a.toLowerCase().localeCompare('' + b.toLowerCase());
                }
            });
        }
    }

    static getAttributes(data) {
        let attributes = [];
        if (data['@attrs'] !== undefined) {
            Object.keys(data['@attrs']).forEach(function (key) {
                attributes.push(key + '="' + data['@attrs'][key] + '"');
            });
        }
        return attributes;
    }

    static getText(data) {
        let text = undefined;
        if (data['#text'] !== undefined)
            text = data['#text'];
        return text;
    }

    static getTabs(nTabs) {
        let tabs = '';
        for (let i = 0; i < nTabs; i++) {
            tabs += '\t';
        }
        return tabs;
    }

}
module.exports = XMLUtils;

function prepareXML(source, target) {
    Object.keys(target).forEach(function (key) {
        if (source[key] !== undefined) {
            if (Array.isArray(target[key]) && source[key].length > 0) {
                target[key] = XMLUtils.forceArray(source[key]);
            } else if(typeof source[key] === 'object' && Object.keys(source[key])){
                target[key] = source[key];
            } else if(source[key] !== undefined){
                target[key] = source[key];
            }
        }
        if(target[key] === undefined)
            delete target[key];
    });
    if (source['@attrs'])
        target['@attrs'] = source['@attrs'];
    return target;
}