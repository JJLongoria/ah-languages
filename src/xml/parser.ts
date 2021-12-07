const parser = require('fast-xml-parser');
const he = require('he');

/**
 * Class to parse and extract data from XML files
 */
export class XMLParser {

    /**
     * Method to get the XML to JSON Options
     * @returns Return XML To JSON Options object
     */
    static getParserXMLToJSONOptions() {
        return {
            attributeNamePrefix: "",
            attrNodeName: "@attrs", //default is 'false'
            textNodeName: "#text",
            ignoreAttributes: false,
            ignoreNameSpace: false,
            allowBooleanAttributes: true,
            parseNodeValue: true,
            parseAttributeValue: false,
            trimValues: true,
            cdataTagName: "__cdata", //default is 'false'
            cdataPositionChar: "\\c",
            localeRange: "", //To support non english character in tag/attribute values.
            parseTrueNumberOnly: false,
            arrayMode: false, //"strict"
            attrValueProcessor: (val: any, _attrName: any) => he.decode(val, { isAttributeValue: true }),//default is a=>a
            tagValueProcessor: (val: any, _tagName: any) => he.decode(val), //default is a=>a
            stopNodes: ["parse-me-as-string"]
        };
    }

    /**
     * Method to get the JSON to XML Options
     * @returns Return JSON To XML Options object
     */
    static getParserJSONToXMLOptions() {
        return {
            attributeNamePrefix: "",
            attrNodeName: "@attrs", //default is false
            textNodeName: "#text",
            ignoreAttributes: false,
            cdataTagName: "__cdata", //default is false
            cdataPositionChar: "\\c",
            format: true,
            indentBy: "\t",
            supressEmptyNode: false,
            tagValueProcessor: (a: any) => he.encode(a, { useNamedReferences: true }),// default is a=>a
            attrValueProcessor: (a: any) => he.encode(a, { useNamedReferences: true })// default is a=>a
        };
    }

    /**
     * Method to parse XML file
     * @param {string} [content] XML file content 
     * @param {boolean} [parseComments] true tu parse comments too. 
     * @returns {any} Return the XML file data
     */
    static parseXML(content?: string, parseComments?: boolean): any {
        if (content && content.length > 0) {
            if (parseComments) {
                content = content.split('<!--').join('«!--');
                content = content.split('-->').join('--»');
            }
            return parser.parse(content, XMLParser.getParserXMLToJSONOptions());
        }
        return {};
    }

    /**
     * Method to transform JSON Object into XML file
     * @param {any} jsonObj JSON to transform
     * @returns {string} Return the XML Content
     */
    static toXML(jsonObj: any): string {
        jsonObj = fixObjValues(jsonObj);
        let xmlParser = new parser.j2xParser(XMLParser.getParserJSONToXMLOptions());
        let content = xmlParser.parse(jsonObj);
        content = XMLParser.getXMLFirstLine() + '\n' + content;
        return content;
    }

    /**
     * Method to get the XML first line
     * @returns {string} Return XML first line
     */
    static getXMLFirstLine() {
        return '<?xml version="1.0" encoding="UTF-8"?>';
    }

    /**
     * Method to check if start tags exists on string
     * @param {string} text Text to get tag 
     * @param {string} tag tag name
     * @returns {string | undefined} return the tag name or undefined if not exists
     */
    static startTag(text: string, tag: string): string | undefined {
        if (text.indexOf('<' + tag + '>') !== -1) {
            return tag;
        }
        return undefined;
    }

    /**
     * Method to check if end tag exists on string
     * @param {string} text Text to get tag 
     * @param {string} tag tag name
     * @returns {string | undefined} return the tag name or undefined if not exists
     */
    static endTag(text: string, tag: string): string | undefined {
        if (text.indexOf('</' + tag + '>') !== -1)
            return tag;
        return undefined;
    }

    /**
     * Method to get an XML Element String
     * @param {string} tag Tag name 
     * @param {string[]} attributes Attributes to add 
     * @param {any} value value to add 
     * @returns 
     */
    static getXMLElement(tag: string, attributes?: string[], value?: any) {
        let empty = value === undefined || value === null || value === '';
        if (!empty && value['#text'] !== undefined) {
            value = value['#text'];
        }
        if (!empty && value !== undefined && value['@attrs'] !== undefined) {
            delete value['@attrs'];
        }
        if (value && !Array.isArray(value) && typeof value === 'object' && Object.keys(value).length === 0) {
            value = '';
            empty = true;
        }
        let isJSONValue;
        if (empty)
            return XMLParser.getStartTag(tag, attributes, empty);
        else {
            try {
                let jsonVal = JSON.parse(value);
                if (jsonVal) {
                    isJSONValue = true
                } else {
                    isJSONValue = false;
                }
            } catch (error) {
                isJSONValue = false;
            }
            if (typeof value === 'string' && !isJSONValue) {
                value = escapeChars(value);
            }
            if (attributes && attributes.includes('xsi:type="xsd:double"')) {
                let strVal = '' + value;
                if (strVal.indexOf('.') === -1)
                    strVal += '.0';
                value = strVal;
            }
            return XMLParser.getStartTag(tag, attributes, empty) + value + XMLParser.getEndTag(tag);
        }
    }

    /**
     * Method to get start tag string
     * @param {string} tag Tag name
     * @param {string[]} attributes Attributes to add 
     * @param {boolean} empty true if tag is empty
     * @returns {string} Return an string with starts tag
     */
    static getStartTag(tag: string, attributes?: string[], empty?: boolean): string {
        if (!empty) {
            if (attributes && attributes.length > 0)
                return '<' + tag.trim() + ' ' + attributes.join(' ') + '>';
            else
                return '<' + tag.trim() + '>';
        } else {
            if (attributes && attributes.length > 0)
                return '<' + tag.trim() + ' ' + attributes.join(' ') + '/>';
            else
                return '<' + tag.trim() + '/>';
        }
    }

    /**
     * Method to get end tag string
     * @param {string} tag Tag name 
     * @returns {string} Return end tag as string
     */
    static getEndTag(tag: string) {
        return '</' + tag.trim() + '>';
    }

}

function escapeChars(value: any) {
    if (typeof value === "string") {
        value = value.split('&amp;').join('&');
        value = value.split('&quot;').join('"');
        value = value.split('&apos;').join('\'');
        value = value.split('&lt;').join('<');
        value = value.split('&gt;').join('>');

        value = value.split('«!--').join('<!--');
        value = value.split('--»').join('-->');
        value = value.split('&').join('&amp;');
        value = value.split('"').join('&quot;');
        value = value.split('\'').join('&apos;');
        if (value.indexOf('<!') === -1) {
            value = value.split('<').join('&lt;');
            value = value.split('>').join('&gt;');
        }
    }
    return value;
}

function fixObjValues(jsonObj: any): any {
    let jsonRes: any = {};
    Object.keys(jsonObj).forEach(function (key) {
        let value = jsonObj[key];
        if (Array.isArray(value)) {
            jsonRes[key] = fixArrayValues(value);
        } else if (typeof value === 'object') {
            jsonRes[key] = fixObjValues(value);
        } else {
            if (value !== undefined)
                jsonRes[key] = value.toString();
            else
                jsonRes[key] = value;
        }
    });
    return jsonRes;
}

function fixArrayValues(jsonArray: any): any[] {
    let arrayRes = [];
    for (const element of jsonArray) {
        if (Array.isArray(element)) {
            arrayRes.push(fixArrayValues(element));
        } else if (typeof element === 'object') {
            arrayRes.push(fixObjValues(element));
        } else {
            arrayRes.push(element.toString());
        }
    }
    return arrayRes;
}