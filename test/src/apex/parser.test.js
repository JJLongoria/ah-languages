const { Types, FileSystem, CoreUtils, Values } = require('@aurahelper/core');
const FileReader = FileSystem.FileReader;
const FileWriter = FileSystem.FileWriter;
const FileChecker = FileSystem.FileChecker;
const PathUtils = FileSystem.PathUtils;
const ApexClass = Types.ApexClass;
const ApexInterface = Types.ApexInterface;
const ApexEnum = Types.ApexEnum;
const ApexVariable = Types.ApexVariable;
const ApexProperty = Types.ApexProperty;
const ApexGetter = Types.ApexGetter;
const ApexSetter = Types.ApexSetter;
const ApexDatatype = Types.ApexDatatype;
const ApexMethod = Types.ApexMethod;
const ApexConstructor = Types.ApexConstructor;
const Token = Types.Token;
const StrUtils = CoreUtils.StrUtils;
const Utils = CoreUtils.Utils;
const TokenType = require('../../../src/apex/tokenTypes')
const ApexLexer = require('../../../src/apex/tokenizer');
const ApexParser = require('../../../src/apex/parser');
const System = require('../../../src/system/system');
const ApexTokenizer = require('../../../src/apex/tokenizer');
const LangUtils = require('../../../src/utils/languageUtils');
const ApexNodeTypes = Values.ApexNodeTypes;

function createApexClass(JSONData, parent, systemData) {
    const apexClass = new ApexClass(JSONData.namespace + '.' + ((parent !== undefined) ? parent.name.toLowerCase() + '.' : '') + JSONData.name.toLowerCase(), JSONData.name, new Token(TokenType.DECLARATION.ENTITY.CLASS, JSONData.name, -1));
    apexClass.namespace = JSONData.namespace;
    apexClass.accessModifier = (JSONData.accessModifier) ? new Token(TokenType.KEYWORD.MODIFIER.ACCESS, JSONData.accessModifier, -1) : undefined;
    apexClass.definitionModifier = (JSONData.definitionModifier) ? new Token(TokenType.KEYWORD.MODIFIER.DEFINITION, JSONData.definitionModifier, -1) : undefined;
    if (JSONData.withSharing)
        apexClass.sharingModifier = new Token(TokenType.KEYWORD.MODIFIER.SHARING, 'with sharing', -1);
    else if (JSONData.inheritedSharing)
        apexClass.sharingModifier = new Token(TokenType.KEYWORD.MODIFIER.SHARING, 'inherited sharing', -1);
    else
        apexClass.sharingModifier = new Token(TokenType.KEYWORD.MODIFIER.SHARING, 'without sharing', -1);
    apexClass.extendsType = JSONData.extendsType;
    if (JSONData.classes !== undefined) {
        for (const key of Object.keys(JSONData.classes)) {
            if (JSONData.classes[key].isInterface)
                apexClass.addChild(createApexInterface(JSONData.classes[key], apexClass, systemData));
            else
                apexClass.addChild(createApexClass(JSONData.classes[key], apexClass, systemData));
        }
    }
    if (JSONData.enums !== undefined) {
        for (const key of Object.keys(JSONData.enums)) {
            apexClass.addChild(createApexEnum(JSONData.enums[key], apexClass));
        }
    }
    if (JSONData.fields !== undefined) {
        for (const field of JSONData.fields) {
            apexClass.addChild(createApexField(field, apexClass, systemData));
        }
    }
    if (JSONData.constructors !== undefined) {
        for (const construct of JSONData.constructors) {
            apexClass.addChild(createApexConstructor(construct, apexClass, systemData));
        }
    }
    if (JSONData.methods !== undefined) {
        for (const method of JSONData.methods) {
            apexClass.addChild(createApexMethod(method, apexClass, systemData));
        }
    }
    apexClass.description = JSONData.description;
    apexClass.documentation = JSONData.docLink;
    return apexClass;
}

function createApexEnum(JSONData, parent) {
    const apexEnum = new ApexEnum(JSONData.namespace + '.' + ((parent !== undefined) ? parent.name.toLowerCase() + '.' : '') + JSONData.name.toLowerCase(), JSONData.name, new Token(TokenType.DECLARATION.ENTITY.CLASS, JSONData.name, -1));
    apexEnum.namespace = JSONData.namespace;
    apexEnum.accessModifier = (JSONData.accessModifier) ? new Token(TokenType.KEYWORD.MODIFIER.ACCESS, JSONData.accessModifier, -1) : undefined;
    apexEnum.definitionModifier = (JSONData.definitionModifier) ? new Token(TokenType.KEYWORD.MODIFIER.DEFINITION, JSONData.definitionModifier, -1) : undefined;
    for (const enumValue of JSONData.enumValues) {
        apexEnum.addChild(new Token(TokenType.ENTITY.ENUM_VALUE, enumValue, -1));
    }
    apexEnum.description = JSONData.description;
    apexEnum.documentation = JSONData.docLink;
    return apexEnum;
}

function createApexInterface(JSONData, parent, systemData) {
    const apexInterface = new ApexInterface(JSONData.namespace + '.' + ((parent !== undefined) ? parent.name.toLowerCase() + '.' : '') + JSONData.name.toLowerCase(), JSONData.name, new Token(TokenType.DECLARATION.ENTITY.CLASS, JSONData.name, -1));
    apexInterface.namespace = JSONData.namespace;
    apexInterface.accessModifier = (JSONData.accessModifier) ? new Token(TokenType.KEYWORD.MODIFIER.ACCESS, JSONData.accessModifier, -1) : undefined;
    apexInterface.definitionModifier = (JSONData.definitionModifier) ? new Token(TokenType.KEYWORD.MODIFIER.DEFINITION, JSONData.definitionModifier, -1) : undefined;
    if (JSONData.withSharing)
        apexInterface.sharingModifier = new Token(TokenType.KEYWORD.MODIFIER.SHARING, 'with sharing', -1);
    else if (JSONData.inheritedSharing)
        apexInterface.sharingModifier = new Token(TokenType.KEYWORD.MODIFIER.SHARING, 'inherited sharing', -1);
    else
        apexInterface.sharingModifier = new Token(TokenType.KEYWORD.MODIFIER.SHARING, 'without sharing', -1);
    apexInterface.extendsType = JSONData.extendsType;
    if (JSONData.classes !== undefined) {
        for (const key of Object.keys(JSONData.classes)) {
            if (JSONData.classes[key].isInterface)
                apexInterface.addChild(createApexInterface(JSONData.classes[key], apexInterface, systemData));
            else
                apexInterface.addChild(createApexClass(JSONData.classes[key], apexInterface, systemData));
        }
    }
    if (JSONData.enums !== undefined) {
        for (const key of Object.keys(JSONData.enums)) {
            apexInterface.addChild(createApexEnum(JSONData.enums[key], apexInterface));
        }
    }
    if (JSONData.fields !== undefined) {
        for (const field of JSONData.fields) {
            apexInterface.addChild(createApexField(field, apexInterface, systemData));
        }
    }
    if (JSONData.constructors !== undefined) {
        for (const construct of JSONData.constructors) {
            apexInterface.addChild(createApexConstructor(construct, apexInterface, systemData));
        }
    }
    if (JSONData.methods !== undefined) {
        for (const method of JSONData.methods) {
            apexInterface.addChild(createApexMethod(method, apexInterface, systemData));
        }
    }
    apexInterface.description = JSONData.description;
    apexInterface.documentation = JSONData.docLink;
    return apexInterface;
}

function createApexField(field, parent, systemData) {
    try {
        const node = processFieldSignature(parent, field, systemData);
        return node; 
    } catch (error) {
        console.log(error);
    }
}

function createApexMethod(method, parent, systemDta) {
    const apexMethod = new ApexMethod(parent.id + '.' + method.name.toLowerCase(), method.name, new Token(TokenType.DECLARATION.ENTITY.FUNCTION, method.name, -1));
    apexMethod.parentId = parent.id;
    try {
        processMethodSignature(apexMethod, method.signature, systemDta);
        apexMethod.description = method.description;
        let params = method.params || method.methodParams;
        for (const param of params) {
            if (apexMethod.params[param.name.toLowerCase()])
                apexMethod.params[param.name.toLowerCase()].description = param.description;
            else
                console.log(parent);
        }
    } catch (error) {
        console.log(error);
    }
    return apexMethod;
}

function createApexConstructor(construct, parent, systemDta) {
    const apexConstructor = new ApexConstructor(parent.id + '.' + construct.name.toLowerCase(), construct.name, new Token(TokenType.DECLARATION.ENTITY.FUNCTION, construct.name, -1));
    apexConstructor.parentId = parent.id;
    try {
        processMethodSignature(apexConstructor, construct.signature, systemDta);
        apexConstructor.description = construct.description;
        let params = construct.params || construct.methodParams;
        for (const param of params) {
            if (apexConstructor.params[param.name.toLowerCase()])
                apexConstructor.params[param.name.toLowerCase()].description = param.description;
            else
                console.log(parent);
        }
    } catch (error) {
        console.log(error);
    }
    return apexConstructor;
}

function processFieldSignature(parent, field, systemData) {
    let signatureTokens = ApexTokenizer.tokenize(field.signature, systemData);
    const len = signatureTokens.length;
    if(len === 0)
        throw new Error('no signature tokens');
    const hasGetter = field.signature.indexOf('get;') !== -1;
    const hasSetter = field.signature.indexOf('set;') !== -1;
    let node;
    if (hasGetter || hasSetter) {
        node = new ApexProperty('', field.name, new Token(TokenType.DECLARATION.ENTITY.PROPERTY, field.name, -1));
    } else {
        node = new ApexVariable('', field.name, new Token(TokenType.DECLARATION.ENTITY.VARIABLE, field.name, -1));
    }
    node.parentId = parent.id;
    for (let index = 0; index < len; index++) {
        const token = signatureTokens[index];
        if (token.type === TokenType.DECLARATION.ENTITY.VARIABLE || token.type === TokenType.DECLARATION.ENTITY.PROPERTY) {
            node.name = token.text;
        }
        if (token.type === TokenType.KEYWORD.DECLARATION.PROPERTY_GETTER) {
            const newNode = new ApexGetter(((node) ? node.id : 'InitialNode') + '.getter.' + token.textToLower, token.text);
            newNode.parentId = (node) ? node.id : undefined;
            node.addChild(newNode);
        }
        if (token.type === TokenType.KEYWORD.DECLARATION.PROPERTY_SETTER) {
            const newNode = new ApexSetter(((node) ? node.id : 'InitialNode') + '.getter.' + token.textToLower, token.text);
            newNode.parentId = (node) ? node.id : undefined;
            node.addChild(newNode);
        }
        if (isAccessModifier(token)) {
            node.accessModifier = token;
        } else if (isDefinitionModifier(token)) {
            node.definitionModifier = token;
        } else if (isSharingModifier(token)) {
            node.sharingModifier = token;
        } else if (isStatic(token)) {
            node.static = token;
        } else if (isFinal(token)) {
            node.final = token;
        } else if (isOverride(token)) {
            node.override = token;
        } else if (isTestMethod(token)) {
            node.testMethod = token;
        } else if (isTransient(token)) {
            node.transient = token;
        } else if (isWebservice(token)) {
            node.webservice = token;
        } else if (isDatatype(token)) {
            let newNode = new ApexDatatype(node.id + '.datatype.', '', token);
            index = processDatatype(newNode, signatureTokens, index);
            newNode.parentId = (node) ? node.id : undefined;
            node.datatype = newNode;
        }
    }
    let signature = '';
    if (node.accessModifier) {
        signature += node.accessModifier.textToLower + ' ';
    }
    if (node.definitionModifier) {
        signature += node.definitionModifier.textToLower + ' ';
    }
    if (node.webservice) {
        signature += node.webservice.textToLower + ' ';
    }
    if (node.static) {
        signature += node.static.textToLower + ' ';
    }
    if (node.transient) {
        signature += node.transient.textToLower + ' ';
    }
    if (node.final) {
        signature += node.final.textToLower + ' ';
    }
    node.simplifiedSignature = node.datatype.name + ' ' + node.name;
    signature += StrUtils.replace(node.datatype.name, ',', ', ') + ' ' + node.name;
    if (node.getter || node.setter) {
        node.simplifiedSignature += '{';
        signature += ' { '
        if (node.getter) {
            node.simplifiedSignature += 'get;';
            signature += 'get; '
        }
        if (node.setter) {
            node.simplifiedSignature += 'set;';
            signature += 'set; '
        }
        node.simplifiedSignature += '}';
        signature += '}'
    }
    node.signature = signature;
    node.id = node.parentId + '.method.' + node.simplifiedSignature.toLowerCase();
    return node;
}

function processMethodSignature(node, signatureToProcess, systemData) {
    let signatureTokens = ApexTokenizer.tokenize(signatureToProcess, systemData);
    let datatype;
    let paramName;
    let methodParams = [];
    let types = [];
    let params = [];
    let onParams = false;
    let final;
    const len = signatureTokens.length;
    if(len === 0)
        throw new Error('no signature tokens');
    for (let index = 0; index < len; index++) {
        const token = signatureTokens[index];
        if (token.type === TokenType.ENTITY.FUNCTION || token.type === TokenType.DECLARATION.ENTITY.FUNCTION) {
            node.name = token.text;
        }
        if (token.type === TokenType.BRACKET.PARENTHESIS_PARAM_OPEN || token.type === TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN) {
            onParams = true;
        }
        if (token.type === TokenType.BRACKET.PARENTHESIS_PARAM_CLOSE || token.type === TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE) {
            onParams = false;
            if (datatype && paramName) {
                types.push(datatype.name);
                params.push(datatype.name + ' ' + paramName.text);
                methodParams.push({
                    name: paramName,
                    datatype: datatype
                });
                datatype = undefined;
                paramName = undefined;
            }
            break;
        }
        if (isAccessModifier(token)) {
            node.accessModifier = token;
        } else if (isDefinitionModifier(token)) {
            node.definitionModifier = token;
        } else if (isSharingModifier(token)) {
            node.sharingModifier = token;
        } else if (isStatic(token)) {
            node.static = token;
        } else if (isFinal(token)) {
            if (!onParams)
                node.final = token;
            else
                final = token;
        } else if (isOverride(token)) {
            node.override = token;
        } else if (isTestMethod(token)) {
            node.testMethod = token;
        } else if (isTransient(token)) {
            node.transient = token;
        } else if (isWebservice(token)) {
            node.webservice = token;
        } else if (!onParams && isDatatype(token)) {
            let newNode = new ApexDatatype(node.id + '.datatype.', '', token);
            index = processDatatype(newNode, signatureTokens, index);
            newNode.parentId = (node) ? node.id : undefined;;
            node.datatype = newNode;
        } else if (onParams && !paramName && isDatatype(token)) {
            let newNode = new ApexDatatype(node.id + '.datatype.', '', token);
            index = processDatatype(newNode, signatureTokens, index);
            newNode.parentId = (node) ? node.id : undefined;;
            datatype = newNode;
        } else if (onParams && datatype && paramName && (token.type === TokenType.PUNCTUATION.COMMA || token.type === TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE)) {
            types.push(datatype.name);
            params.push(((final) ? (final.text + ' ') : '') + datatype.name + ' ' + paramName.text);
            methodParams.push({
                name: paramName,
                final: final,
                datatype: datatype
            });
            final = undefined;
            datatype = undefined;
            paramName = undefined;
        } else if (onParams && datatype) {
            paramName = token;
        }
    }
    node.simplifiedSignature = node.name + '(' + types.join(',') + ')';
    let signature = '';
    let overrideSignature = '';
    if (node.accessModifier) {
        signature += node.accessModifier.textToLower + ' ';
        overrideSignature += node.accessModifier.textToLower + ' ';
    }
    if (node.definitionModifier) {
        signature += node.definitionModifier.textToLower + ' ';
    }
    if (node.nodeType === ApexNodeTypes.METHOD && node.testMethod) {
        signature += node.testMethod.textToLower + ' ';
    }
    if (node.nodeType === ApexNodeTypes.METHOD && node.webservice) {
        signature += node.webservice.textToLower + ' ';
        overrideSignature += node.webservice.textToLower + ' ';
    }
    if (node.nodeType === ApexNodeTypes.METHOD && node.static) {
        signature += node.static.textToLower + ' ';
        overrideSignature += node.static.textToLower + ' ';
    }
    if (node.override) {
        signature += node.override.textToLower + ' ';
    }
    const nameAndParams = ((node.datatype) ? node.datatype.name + ' ' : '') + node.name + '(' + params.join(', ') + ')';
    overrideSignature = overrideSignature + 'override ' + nameAndParams;
    signature += nameAndParams;
    node.signature = signature;
    node.overrideSignature = overrideSignature;
    node.id = node.parentId + '.method.' + node.simplifiedSignature.toLowerCase();
    for (const param of methodParams) {
        let newNode = new ApexVariable(node.id + '.varParam.' + param.name.textToLower, param.name.text, param.name);
        newNode.parentId = (node) ? node.id : undefined;;
        newNode.datatype = param.datatype;
        newNode.final = param.final;
        newNode.endToken = param.name;
        newNode.scope = node.scope + 1;
        if (node)
            node.addParam(newNode);
    }
    return node;
}

function fixApexNode(apexNode, systemData) {
    let fixed = false;
    if (Utils.hasKeys(apexNode.classes)) {
        for (const key of Object.keys(apexNode.classes)) {
            let fixedTmp = fixApexNode(apexNode.classes[key], systemData);
            if (!fixed && fixedTmp)
                fixed = fixedTmp;
        }
    } else if (Utils.hasKeys(apexNode.interfaces)) {
        for (const key of Object.keys(apexNode.interfaces)) {
            let fixedTmp = fixApexNode(apexNode.interfaces[key], systemData);
            if (!fixed && fixedTmp)
                fixed = fixedTmp;
        }
    } else if (Utils.hasKeys(apexNode.methods)) {
        for (const key of Object.keys(apexNode.methods)) {
            let fixedTmp = fixApexNode(apexNode.methods[key], systemData);
            if (!fixed && fixedTmp)
                fixed = fixedTmp;
        }
    } else if (Utils.hasKeys(apexNode.constructors)) {
        for (const key of Object.keys(apexNode.constructors)) {
            let fixedTmp = fixApexNode(apexNode.constructors[key], systemData);
            if (!fixed && fixedTmp)
                fixed = fixedTmp;
        }
    } else if (!Utils.isNull(apexNode.staticConstructor)) {
        let fixedTmp = fixApexNode(apexNode.staticConstructor, systemData);
        if (!fixed && fixedTmp)
            fixed = fixedTmp;
    } else if (!Utils.isNull(apexNode.initializer)) {
        let fixedTmp = fixApexNode(apexNode.initializer, systemData);
        if (!fixed && fixedTmp)
            fixed = fixedTmp;
    } else if (Utils.hasKeys(apexNode.variables)) {
        for (const key of Object.keys(apexNode.variables)) {
            let fixedTmp = fixApexNode(apexNode.variables[key], systemData);
            if (!fixed && fixedTmp)
                fixed = fixedTmp;
        }
    } else if (Utils.hasKeys(apexNode.params)) {
        for (const key of Object.keys(apexNode.params)) {
            let fixedTmp = fixApexNode(apexNode.params[key], systemData);
            if (!fixed && fixedTmp)
                fixed = fixedTmp;
        }
    }
    if (!Utils.isNull(apexNode.datatype) && Utils.isNull(apexNode.datatype.type)) {
        const tokens = ApexTokenizer.tokenize(apexNode.datatype.name, systemData);
        apexNode.datatype = fixDatatype(apexNode.datatype, tokens);
        fixed = true;
    }
    return fixed;
}

function processDatatype(node, tokens, index) {
    let aBracketIndent = 0;
    let sqBracketIndent = 0;
    let datatype = '';
    const len = tokens.length;
    let type = '';
    let valueTokens = [];
    let valueText = '';
    let keyTokens = [];
    let keyText = '';
    for (; index < len; index++) {
        const token = tokens[index];
        if (token) {
            if (isDatatype(token)) {
                datatype += token.text;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.BRACKET.PARAMETRIZED_TYPE_OPEN) {
                aBracketIndent++;
                if (aBracketIndent > 1) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
                datatype += token.text;
            } else if (token.type === TokenType.BRACKET.SQUARE_OPEN) {
                sqBracketIndent++;
                datatype += token.text;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE) {
                aBracketIndent--;
                datatype += token.text;
                if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.BRACKET.SQUARE_CLOSE) {
                sqBracketIndent--;
                datatype += token.text;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.PUNCTUATION.COMMA && aBracketIndent > 0) {
                datatype += token.text;
                if (aBracketIndent > 1) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
                if (aBracketIndent === 1) {
                    keyTokens = valueTokens;
                    keyText = valueText;
                    valueText = '';
                    valueTokens = [];
                }
            } else if (token.type === TokenType.PUNCTUATION.OBJECT_ACCESSOR) {
                datatype += token.text;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else {
                break;
            }
        }
    }
    node.name = datatype;
    node.id += datatype;
    node.type = type;
    node.value = processDatatypeTokens(node, valueText, valueTokens, false);
    node.key = processDatatypeTokens(node, keyText, keyTokens, true);
    index--;
    return index;
}

function fixDatatype(node, tokens) {
    let aBracketIndent = 0;
    let sqBracketIndent = 0;
    const len = tokens.length;
    let type = '';
    let valueTokens = [];
    let valueText = '';
    let keyTokens = [];
    let keyText = '';
    for (let index = 0; index < len; index++) {
        const token = tokens[index];
        if (token) {
            if (isDatatype(token)) {
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.BRACKET.PARAMETRIZED_TYPE_OPEN) {
                aBracketIndent++;
                if (aBracketIndent > 1) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.BRACKET.SQUARE_OPEN) {
                sqBracketIndent++;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE) {
                aBracketIndent--;
                if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.BRACKET.SQUARE_CLOSE) {
                sqBracketIndent--;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.PUNCTUATION.COMMA && aBracketIndent > 0) {
                if (aBracketIndent > 1) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
                if (aBracketIndent === 1) {
                    keyTokens = valueTokens;
                    keyText = valueText;
                    valueText = '';
                    valueTokens = [];
                }
            } else if (token.type === TokenType.PUNCTUATION.OBJECT_ACCESSOR) {
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else {
                break;
            }
        }
    }
    node.type = type;
    node.value = processDatatypeTokens(node, valueText, valueTokens, false);
    node.key = processDatatypeTokens(node, keyText, keyTokens, true);
    return node;
}

function processDatatypeTokens(node, text, tokens, isKey) {
    if (!tokens || tokens.length === 0)
        return undefined;
    let aBracketIndent = 0;
    let sqBracketIndent = 0;
    let type = '';
    let valueTokens = [];
    let valueText = '';
    let keyTokens = [];
    let keyText = '';
    const datatypeNode = new ApexDatatype(node.id + '.' + (isKey ? 'key.' : 'value.') + text, text, tokens[0]);
    const len = tokens.length;
    for (let index = 0; index < len; index++) {
        const token = tokens[index];
        if (token) {
            if (isDatatype(token)) {
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.BRACKET.PARAMETRIZED_TYPE_OPEN) {
                aBracketIndent++;
                if (aBracketIndent > 1) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.BRACKET.SQUARE_OPEN) {
                sqBracketIndent++;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE) {
                aBracketIndent--; if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.BRACKET.SQUARE_CLOSE) {
                sqBracketIndent--;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === TokenType.PUNCTUATION.COMMA && aBracketIndent > 0) {
                if (aBracketIndent > 1) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
                if (aBracketIndent === 1) {
                    keyTokens = valueTokens;
                    keyText = valueText;
                    valueText = '';
                    valueTokens = [];
                }
            } else if (token.type === TokenType.PUNCTUATION.OBJECT_ACCESSOR) {
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else {
                break;
            }
        }
    }
    datatypeNode.type = type;
    datatypeNode.value = processDatatypeTokens(datatypeNode, valueText, valueTokens, false);
    datatypeNode.key = processDatatypeTokens(datatypeNode, keyText, keyTokens, true);
    return datatypeNode;
}

function isDatatype(token) {
    return token && (token.type === TokenType.DATATYPE.COLLECTION || token.type === TokenType.DATATYPE.CUSTOM_CLASS || token.type === TokenType.DATATYPE.PRIMITIVE || token.type === TokenType.DATATYPE.SOBJECT || token.type === TokenType.DATATYPE.SUPPORT_CLASS || token.type === TokenType.DATATYPE.SUPPORT_NAMESPACE || token.type === TokenType.ENTITY.CLASS_MEMBER || token.type === TokenType.ENTITY.SUPPORT_CLASS_MEMBER);
}

function isAccessModifier(token) {
    return token && token.type === TokenType.KEYWORD.MODIFIER.ACCESS;
}

function isDefinitionModifier(token) {
    return token && token.type === TokenType.KEYWORD.MODIFIER.DEFINITION;
}

function isSharingModifier(token) {
    return token && token.type === TokenType.KEYWORD.MODIFIER.SHARING;
}

function isStatic(token) {
    return token && token.type === TokenType.KEYWORD.MODIFIER.STATIC;
}

function isFinal(token) {
    return token && token.type === TokenType.KEYWORD.MODIFIER.FINAL;
}

function isWebservice(token) {
    return token && token.type === TokenType.KEYWORD.MODIFIER.WEB_SERVICE;
}

function isTestMethod(token) {
    return token && token.type === TokenType.KEYWORD.MODIFIER.TEST_METHOD;
}

function isOverride(token) {
    return token && token.type === TokenType.KEYWORD.MODIFIER.OVERRIDE;
}

function isTransient(token) {
    return token && token.type === TokenType.KEYWORD.MODIFIER.TRANSIENT;
}

describe('Testing ./src/apex/parser.js', () => {
    test('Testing parse()', () => {
        const metadataTypes = JSON.parse(FileReader.readFileSync('./test/assets/types/metadataTypes.json'));
        const sObjectsData = JSON.parse(FileReader.readFileSync('./test/assets/types/sObjects.json'));
        const sObjects = [];
        const userClasses = [];
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
        const oneFile = false;
        const fileToProcess = 't_AccountTeamMemberTrigger.trigger';
        console.time('nsSummary');
        const nsSummary = System.getAllNamespacesSummary();
        console.timeEnd('nsSummary');
        const classesPath = './test/assets/SFDXProject/force-app/main/default/classes';
        const triggersPath = './test/assets/SFDXProject/force-app/main/default/triggers';
        console.time('compilationTime');
        const nodes = {};
        const systemData = {
            sObjects: sObjects,
            sObjectsData: sObjectsData,
            userClasses: userClasses,
            namespaceSummary: nsSummary
        };
        /*const oldClassesPath = './test/assets/oldClasses';
        const nsFolders = FileReader.readDirSync(oldClassesPath);
        for (const nsFolder of nsFolders) {
            if (nsFolder === 'namespacesMetadata.json')
                continue;
            const nsData = {};
            const nsFolderPath = oldClassesPath + '/' + nsFolder;
            const classFiles = FileReader.readDirSync(nsFolderPath);
            for (const classFile of classFiles) {
                if (classFile === 'namespaceMetadata.json')
                    continue;
                const classFilePath = nsFolderPath + '/' + classFile;
                const JSONData = JSON.parse(FileReader.readFileSync(classFilePath));
                let data;
                if (!JSONData.isEnum && !JSONData.isInterface) {
                    data = createApexClass(JSONData, undefined, systemData);
                } else if (JSONData.isInterface) {
                    data = createApexInterface(JSONData, undefined, systemData);
                } else {
                    data = createApexEnum(JSONData);
                }
                if (data) {
                    if (!FileChecker.isExists('./src/system/classes'))
                        FileWriter.createFolderSync('./src/system/classes');
                    if (!FileChecker.isExists('./src/system/classes/' + nsFolder))
                        FileWriter.createFolderSync('./src/system/classes/' + nsFolder);
                    FileWriter.createFileSync('./src/system/classes/' + nsFolder + '/' + data.name.toLowerCase() + '.json', JSON.stringify(data, null, 2));
                    //nsData[data.name.toLowerCase()] = data;
                }
            }
        }

        const allClasses = System.getAllNamespacesData();
        for (const ns of Object.keys(allClasses)) {
            const nsData = allClasses[ns];
            for (const nodeKey of Object.keys(nsData)) {
                const apexNode = nsData[nodeKey];
                let fixed = fixApexNode(apexNode, systemData);
                if (fixed) {
                    const folder = './test/assets/fixedClasses/' + ns;
                    if (!FileChecker.isExists(folder))
                        FileWriter.createFolderSync(folder);
                    FileWriter.createFileSync(folder + '/' + nodeKey + '.json', JSON.stringify(apexNode, null, 2));
                }
            }
        }*/

        if (oneFile) {
            let filPath;
            if (fileToProcess.endsWith('.trigger')) {
                filPath = triggersPath + '/' + fileToProcess;
            } else {
                filPath = classesPath + '/' + fileToProcess;
            }
            //console.time(fileToProcess + ' compilationTime');
            //console.time(fileToProcess + ' lexer');
            //const tokens = ApexLexer.tokenize(fileContent, systemData);
            //console.timeEnd(fileToProcess + ' lexer');
            //console.time(fileToProcess + ' parser');
            const node = new ApexParser(filPath, systemData).parse();
            if (node.nodeType === ApexNodeTypes.CLASS || node.nodeType === ApexNodeTypes.INTERFACE || node.nodeType === ApexNodeTypes.TRIGGER) {
                validateNode(node);
            }
            //console.timeEnd(fileToProcess + ' parser');
            //console.timeEnd(fileToProcess + 'compilationTime');
        } else {
            for (const file of FileReader.readDirSync(classesPath)) {
                if (!file.endsWith('.cls'))
                    continue;
                try {
                    //console.time(file + ' compilationTime');
                    const filPath = classesPath + '/' + file;
                    //const fileContent = FileReader.readFileSync(filPath);
                    //console.time(file + ' lexer');
                    //const tokens = ApexLexer.tokenize(fileContent, sObjects, userClasses, nsSummary);
                    //console.timeEnd(file + ' lexer');
                    //console.time(file + ' parser');
                    const node = new ApexParser(filPath, systemData).parse();
                    if (node.nodeType === ApexNodeTypes.CLASS || node.nodeType === ApexNodeTypes.INTERFACE || node.nodeType === ApexNodeTypes.TRIGGER) {
                        validateNode(node);
                    }
                    nodes[node.name.toLowerCase()] = node;
                    //console.timeEnd(file + ' parser');
                    //console.timeEnd(file + 'compilationTime');
                } catch (error) {
                    console.log('Error en el archivo: ' + file);
                    console.log(JSON.stringify(error));
                    throw error;
                }
            }
            for (const file of FileReader.readDirSync(triggersPath)) {
                if (!file.endsWith('.trigger'))
                    continue;
                try {
                    //console.time(file + ' compilationTime');
                    const filPath = triggersPath + '/' + file;
                    //const fileContent = FileReader.readFileSync(filPath);
                    //console.time(file + ' lexer');
                    //const tokens = ApexLexer.tokenize(fileContent, sObjects, userClasses, nsSummary);
                    //console.timeEnd(file + ' lexer');
                    //console.time(file + ' parser');
                    const node = new ApexParser(filPath, systemData).parse();
                    nodes[node.name.toLowerCase()] = node;
                    //console.timeEnd(file + ' parser');
                    //console.timeEnd(file + 'compilationTime');
                } catch (error) {
                    console.log('Error en el archivo: ' + file);
                    console.log(JSON.stringify(error));
                    throw error;
                }
            }
        }
        console.timeEnd('compilationTime');
    });

    test('Testing saveAllClasesData()', async (done) => {
        const metadataTypes = JSON.parse(FileReader.readFileSync('./test/assets/types/metadataTypes.json'));
        const sObjectsData = JSON.parse(FileReader.readFileSync('./test/assets/types/sObjects.json'));
        const sObjects = [];
        const userClasses = [];
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
        const oneFile = false;
        const fileToProcess = 'a_DML_Utils.cls';
        console.time('nsSummary');
        const nsSummary = System.getAllNamespacesSummary();
        console.timeEnd('nsSummary');
        const folderPath = './test/assets/SFDXProject/force-app/main/default/classes';
        const nodes = {};
        const systemData = {
            sObjects: sObjects,
            userClasses: userClasses,
            namespaceSummary: nsSummary,
            sObjectsData: sObjectsData
        };
        let compiledClassesFolder = PathUtils.getAbsolutePath('./test/assets/compiledClasses');
        if (FileChecker.isExists(compiledClassesFolder))
            FileWriter.delete(compiledClassesFolder);
        FileWriter.createFolderSync(compiledClassesFolder);
        console.time('compilationTime');
        if (oneFile) {
            //console.time(fileToProcess + ' compilationTime');
            //const filPath = folderPath + '/' + fileToProcess;
            //const fileContent = FileReader.readFileSync(filPath);
            //console.time(fileToProcess + ' lexer');
            //const tokens = ApexLexer.tokenize(fileContent, sObjects, userClasses, nsSummary);
            // console.timeEnd(fileToProcess + ' lexer');
            // console.time(fileToProcess + ' parser');
            //ApexParser.parse(tokens);
            // console.timeEnd(fileToProcess + ' parser');
            // console.timeEnd(fileToProcess + 'compilationTime');
        } else {
            await ApexParser.saveAllClassesData(folderPath, compiledClassesFolder, systemData, true);
        }
        console.timeEnd('compilationTime');
        done();
    }, 3000000);
});

function validateNode(node) {
    try {
        if (node.initializer && !Utils.isNull(node.initializer)) {
            validateInitOrStaticConst(node.initializer);
        }
        if (node.staticConstructor && !Utils.isNull(node.staticConstructor)) {
            validateInitOrStaticConst(node.staticConstructor);
        }
        if (node.classes && Utils.hasKeys(node.classes)) {
            for (const key of Object.keys(node.classes)) {
                const nodeTmp = node.classes[key];
                validateNode(nodeTmp);
            }
        }
        if (node.interfaces && Utils.hasKeys(node.interfaces)) {
            for (const key of Object.keys(node.interfaces)) {
                const nodeTmp = node.interfaces[key];
                validateNode(nodeTmp);
            }
        }
        if (node.enums && Utils.hasKeys(node.enums)) {
            for (const key of Object.keys(node.enums)) {
                const nodeTmp = node.enums[key];
                validateNode(nodeTmp);
            }
        }
        if (node.variables && Utils.hasKeys(node.variables)) {
            for (const key of Object.keys(node.variables)) {
                const nodeTmp = node.variables[key];
                validateVariable(nodeTmp);
            }
        }
        if (node.methods && Utils.hasKeys(node.methods)) {
            for (const key of Object.keys(node.methods)) {
                const nodeTmp = node.methods[key];
                validateMethod(nodeTmp);
            }
        }
        if (node.constructors && Utils.hasKeys(node.constructors)) {
            for (const key of Object.keys(node.constructors)) {
                const nodeTmp = node.constructors[key];
                validateConstructor(nodeTmp);
            }
        }
    } catch (error) {
        throw new Error(node.name + ' => ' + error.message);
    }
}

function validateVariable(node) {
    if (!node.name)
        throw new Error(node.nodeType + ' => ' + node.id + ' => Missing name');
    if (!node.datatype)
        throw new Error(node.nodeType + ' => ' + node.name + ' => Missing datatype');
}

function validateMethod(node) {
    if (!node.name)
        throw new Error(node.nodeType + ' => ' + node.id + ' => Missing name');
    if (!node.datatype)
        throw new Error(node.nodeType + ' => ' + node.name + ' => Missing datatype');
    try {
        if (node.variables && Utils.hasKeys(node.variables)) {
            for (const key of Object.keys(node.variables)) {
                const nodeTmp = node.variables[key];
                validateVariable(nodeTmp);
            }
        }
        if (node.params && Utils.hasKeys(node.params)) {
            for (const key of Object.keys(node.params)) {
                const nodeTmp = node.params[key];
                validateVariable(nodeTmp);
            }
        }
    } catch (error) {
        throw new Error(node.nodeType + ' => ' + node.name + ' => ' + error.message);
    }
}

function validateConstructor(node) {
    if (!node.name)
        throw new Error(node.nodeType + ' => ' + node.id + ' => Missing name');
    try {
        if (node.variables && Utils.hasKeys(node.variables)) {
            for (const key of Object.keys(node.variables)) {
                const nodeTmp = node.variables[key];
                validateVariable(nodeTmp);
            }
        }
        if (node.params && Utils.hasKeys(node.params)) {
            for (const key of Object.keys(node.params)) {
                const nodeTmp = node.params[key];
                validateVariable(nodeTmp);
            }
        }
    } catch (error) {
        throw new Error(node.nodeType + ' => ' + node.name + ' => ' + error.message);
    }
}

function validateInitOrStaticConst(node) {
    try {
        if (node.variables && Utils.hasKeys(node.variables)) {
            for (const key of Object.keys(node.variables)) {
                const nodeTmp = node.variables[key];
                validateVariable(nodeTmp);
            }
        }
    } catch (error) {
        throw new Error(node.nodeType + ' => ' + node.name + ' => ' + error.message);
    }
}