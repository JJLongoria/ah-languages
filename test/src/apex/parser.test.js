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
const ApexNodeTypes = Values.ApexNodeTypes;

function createApexClass(JSONData, parent) {
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
                apexClass.addChild(createApexInterface(JSONData.classes[key], apexClass));
            else
                apexClass.addChild(createApexClass(JSONData.classes[key], apexClass));
        }
    }
    if (JSONData.enums !== undefined) {
        for (const key of Object.keys(JSONData.enums)) {
            apexClass.addChild(createApexEnum(JSONData.enums[key], apexClass));
        }
    }
    if (JSONData.fields !== undefined) {
        for (const field of JSONData.fields) {
            apexClass.addChild(createApexField(field, apexClass));
        }
    }
    if (JSONData.constructors !== undefined) {
        for (const construct of JSONData.constructors) {
            apexClass.addChild(createApexConstructor(construct, apexClass));
        }
    }
    if (JSONData.methods !== undefined) {
        for (const method of JSONData.methods) {
            apexClass.addChild(createApexMethod(method, apexClass));
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

function createApexInterface(JSONData, parent) {
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
                apexInterface.addChild(createApexInterface(JSONData.classes[key], apexInterface));
            else
                apexInterface.addChild(createApexClass(JSONData.classes[key], apexInterface));
        }
    }
    if (JSONData.enums !== undefined) {
        for (const key of Object.keys(JSONData.enums)) {
            apexInterface.addChild(createApexEnum(JSONData.enums[key], apexInterface));
        }
    }
    if (JSONData.fields !== undefined) {
        for (const field of JSONData.fields) {
            apexInterface.addChild(createApexField(field, apexInterface));
        }
    }
    if (JSONData.constructors !== undefined) {
        for (const construct of JSONData.constructors) {
            apexInterface.addChild(createApexConstructor(construct, apexInterface));
        }
    }
    if (JSONData.methods !== undefined) {
        for (const method of JSONData.methods) {
            apexInterface.addChild(createApexMethod(method, apexInterface));
        }
    }
    apexInterface.description = JSONData.description;
    apexInterface.documentation = JSONData.docLink;
    return apexInterface;
}

function createApexField(field, parent) {
    const processedSignature = processFieldSignature(field.name, field.signature);
    if (processedSignature.hasGetter || processedSignature.hasSetter) {
        const property = new ApexProperty(parent.id + '.' + field.name.toLowerCase(), field.name, new Token(TokenType.DECLARATION.ENTITY.PROPERTY, field.name, -1));
        property.signature = field.signature;
        property.simplifiedSignature = processedSignature.simplifiedSignature;
        property.datatype = new ApexDatatype(property.id + '.' + processedSignature.datatype.toLowerCase(), processedSignature.datatype, undefined);
        property.description = field.description;
        property.accessModifier = (processedSignature.accessModifier) ? new Token(TokenType.KEYWORD.MODIFIER.ACCESS, processedSignature.accessModifier, -1) : undefined;
        property.definitionModifier = (processedSignature.definitionModifier) ? new Token(TokenType.KEYWORD.MODIFIER.DEFINITION, processedSignature.definitionModifier, -1) : undefined;
        property.static = (processedSignature.static) ? new Token(TokenType.KEYWORD.MODIFIER.STATIC, 'static', -1) : undefined;
        property.final = (processedSignature.static) ? new Token(TokenType.KEYWORD.MODIFIER.FINAL, 'final', -1) : undefined;
        property.transient = (processedSignature.static) ? new Token(TokenType.KEYWORD.MODIFIER.TRANSIENT, 'transient', -1) : undefined;
        if (processedSignature.hasGetter) {
            property.addChild(new ApexGetter(property.id + '.get', 'get', new Token(TokenType.KEYWORD.DECLARATION.PROPERTY_GETTER, 'get', -1)));
        }
        if (processedSignature.hasSetter) {
            property.addChild(new ApexSetter(property.id + '.set', 'set', new Token(TokenType.KEYWORD.DECLARATION.PROPERTY_SETTER, 'set', -1)));
        }
        return property;
    } else {
        const variable = new ApexVariable(parent.id + '.' + field.name.toLowerCase(), field.name, new Token(TokenType.DECLARATION.ENTITY.VARIABLE, field.name, -1));
        variable.signature = field.signature;
        variable.simplifiedSignature = processedSignature.simplifiedSignature;
        variable.datatype = new ApexDatatype(variable.id + '.' + processedSignature.datatype.toLowerCase(), processedSignature.datatype, undefined);
        variable.description = field.description;
        variable.accessModifier = (processedSignature.accessModifier) ? new Token(TokenType.KEYWORD.MODIFIER.ACCESS, processedSignature.accessModifier, -1) : undefined;
        variable.definitionModifier = (processedSignature.definitionModifier) ? new Token(TokenType.KEYWORD.MODIFIER.DEFINITION, processedSignature.definitionModifier, -1) : undefined;
        variable.static = (processedSignature.static) ? new Token(TokenType.KEYWORD.MODIFIER.STATIC, 'static', -1) : undefined;
        variable.final = (processedSignature.static) ? new Token(TokenType.KEYWORD.MODIFIER.FINAL, 'final', -1) : undefined;
        variable.transient = (processedSignature.static) ? new Token(TokenType.KEYWORD.MODIFIER.TRANSIENT, 'transient', -1) : undefined;
        return variable;
    }
}

function createApexMethod(method, parent) {
    let signature = '';
    let simplifiedSignature = '';
    const apexMethod = new ApexMethod(parent.id + '.' + method.name.toLowerCase(), method.name, new Token(TokenType.DECLARATION.ENTITY.FUNCTION, method.name, -1));
    const processedSignature = processMethodSignature(method.signature);
    let dataType = StrUtils.replace(method.datatype, ',', ', ');
    apexMethod.datatype = new ApexDatatype(apexMethod.id + '.' + dataType, dataType, undefined);
    apexMethod.accessModifier = (processedSignature.accessModifier) ? new Token(TokenType.KEYWORD.MODIFIER.ACCESS, processedSignature.accessModifier, -1) : undefined;
    apexMethod.definitionModifier = (processedSignature.definitionModifier) ? new Token(TokenType.KEYWORD.MODIFIER.DEFINITION, processedSignature.definitionModifier, -1) : undefined;
    apexMethod.static = (processedSignature.static) ? new Token(TokenType.KEYWORD.MODIFIER.STATIC, 'static', -1) : undefined;
    apexMethod.final = (processedSignature.final) ? new Token(TokenType.KEYWORD.MODIFIER.FINAL, 'final', -1) : undefined;
    apexMethod.transient = (processedSignature.transient) ? new Token(TokenType.KEYWORD.MODIFIER.TRANSIENT, 'transient', -1) : undefined;
    if (apexMethod.accessModifier)
        signature += apexMethod.accessModifier.text + ' ';
    if (apexMethod.definitionModifier)
        signature += apexMethod.definitionModifier.text + ' ';
    if (apexMethod.static)
        signature += apexMethod.static.text + ' ';
    if (apexMethod.final)
        signature += apexMethod.final.text + ' ';
    if (apexMethod.transient)
        signature += apexMethod.transient.text + ' ';
    signature += dataType + ' ' + apexMethod.name + '(';
    simplifiedSignature += apexMethod.name + '(';
    let index = 0;
    /*console.log(parent);
    console.log(method);*/
    for (const param of processedSignature.params) {
        //console.log(param);
        const paramSplits = param.split(' ');
        let paramName = paramSplits[1];
        dataType = StrUtils.replace(paramSplits[0], ',', ', ');
        const methodParam = new ApexVariable(apexMethod.id + '.' + paramName.toLowerCase(), paramName, new Token(TokenType.DECLARATION.ENTITY.VARIABLE, paramName, -1));
        methodParam.datatype = new ApexDatatype(apexMethod.id + '.' + dataType.toLowerCase(), dataType, undefined);
        // methodParam.description = param.description;
        methodParam.signature = dataType + ' ' + paramName;
        apexMethod.addChild(methodParam);
        if (index === 0) {
            signature += dataType + ' ' + paramName;
            simplifiedSignature += dataType;
        } else {
            signature += ', ' + dataType + ' ' + paramName;
            simplifiedSignature += ',' + dataType;
        }
        index++;
    }
    signature += ')';
    simplifiedSignature += ')';
    apexMethod.signature = signature;
    apexMethod.simplifiedSignature = simplifiedSignature;
    apexMethod.description = method.description;
    return apexMethod;
}

function createApexConstructor(construct, parent) {
    let signature = '';
    let simplifiedSignature = '';
    const apexConstructor = new ApexConstructor(parent.id + '.' + construct.name.toLowerCase(), construct.name, new Token(TokenType.DECLARATION.ENTITY.FUNCTION, construct.name, -1));
    const processedSignature = processMethodSignature(construct.signature);
    apexConstructor.datatype = new ApexDatatype(apexConstructor.id + '.constructor', parent.name, undefined);
    apexConstructor.accessModifier = (processedSignature.accessModifier) ? new Token(TokenType.KEYWORD.MODIFIER.ACCESS, processedSignature.accessModifier, -1) : undefined;
    apexConstructor.definitionModifier = (processedSignature.definitionModifier) ? new Token(TokenType.KEYWORD.MODIFIER.DEFINITION, processedSignature.definitionModifier, -1) : undefined;
    apexConstructor.static = (processedSignature.static) ? new Token(TokenType.KEYWORD.MODIFIER.STATIC, 'static', -1) : undefined;
    apexConstructor.final = (processedSignature.final) ? new Token(TokenType.KEYWORD.MODIFIER.FINAL, 'final', -1) : undefined;
    apexConstructor.transient = (processedSignature.transient) ? new Token(TokenType.KEYWORD.MODIFIER.TRANSIENT, 'transient', -1) : undefined;
    if (apexConstructor.accessModifier)
        signature += apexConstructor.accessModifier.text + ' ';
    if (apexConstructor.definitionModifier)
        signature += apexConstructor.definitionModifier.text + ' ';
    if (apexConstructor.static)
        signature += apexConstructor.static.text + ' ';
    if (apexConstructor.final)
        signature += apexConstructor.final.text + ' ';
    if (apexConstructor.transient)
        signature += apexConstructor.transient.text + ' ';
    signature += apexConstructor.name + '(';
    simplifiedSignature += apexConstructor.name + '(';
    let index = 0;
    for (const param of processedSignature.params) {
        const paramSplits = param.split(' ');
        let paramName = paramSplits[1];
        let dataType = StrUtils.replace(paramSplits[0], ',', ', ');
        const constructorParam = new ApexVariable(apexConstructor.id + '.' + paramName.toLowerCase(), paramName, new Token(TokenType.DECLARATION.ENTITY.VARIABLE, paramName, -1));
        constructorParam.datatype = new ApexDatatype(apexConstructor.id + '.' + dataType.toLowerCase(), dataType, undefined);
        constructorParam.description = param.description;
        constructorParam.signature = dataType + ' ' + paramName;
        apexConstructor.addChild(constructorParam);
        if (index === 0) {
            signature += dataType + ' ' + paramName;
            simplifiedSignature += dataType;
        } else {
            signature += ', ' + dataType + ' ' + paramName;
            simplifiedSignature += ',' + dataType;
        }
        index++;
    }
    signature += ')';
    simplifiedSignature += ')';
    apexConstructor.signature = signature;
    apexConstructor.simplifiedSignature = simplifiedSignature;
    apexConstructor.description = construct.description;
    return apexConstructor;
}

function processFieldSignature(name, signature) {
    let cleanSignature = signature;
    cleanSignature = StrUtils.replace(cleanSignature, '{', '');
    cleanSignature = StrUtils.replace(cleanSignature, '}', '');
    cleanSignature = StrUtils.replace(cleanSignature, 'get;', '');
    cleanSignature = StrUtils.replace(cleanSignature, 'set;', '');
    cleanSignature = cleanSignature.trim();
    let signatureSplits = cleanSignature.split(' ');
    let accessModifier;
    let definitionModifier;
    let isStatic = false;
    let transient = false;
    let final = false;
    let override = false;
    let datatype;
    const hasGetter = signature.indexOf('get;') !== -1;
    const hasSetter = signature.indexOf('set;') !== -1;
    for (const split of signatureSplits) {
        const splitToLower = split.toLowerCase();
        if (splitToLower === 'public' || splitToLower === 'global' || splitToLower === 'protected' || splitToLower === 'private') {
            accessModifier = splitToLower;
            continue;
        } else if (splitToLower === 'abstract' || splitToLower === 'virtual') {
            definitionModifier = splitToLower;
            continue;
        } else if (splitToLower === 'static') {
            isStatic = true;
            continue;
        } else if (splitToLower === 'transient') {
            transient = true;
            continue;
        } else if (splitToLower === 'final') {
            final = true;
            continue;
        } else if (splitToLower === 'override') {
            override = true;
            continue;
        } else if (name === split) {
            continue;
        } else {
            datatype = split;
        }
    }
    signatureSplits = cleanSignature.split(' ');
    let simplifiedSignature = datatype + ' ' + name;
    if (hasGetter || hasSetter) {
        simplifiedSignature += ' { ';
        simplifiedSignature += (hasGetter) ? 'get; ' : '';
        simplifiedSignature += (hasSetter) ? 'set; ' : '';
        simplifiedSignature += '}'
    }
    return {
        hasGetter: hasGetter,
        hasSetter: hasSetter,
        accessModifier: accessModifier,
        definitionModifier: definitionModifier,
        static: isStatic,
        transient: transient,
        final: final,
        override: override,
        datatype: datatype,
        simplifiedSignature: simplifiedSignature,
    };
}

function processMethodSignature(signature) {
    let cleanSignature = signature;
    cleanSignature = StrUtils.replace(cleanSignature, '(', ' ( ');
    cleanSignature = StrUtils.replace(cleanSignature, ')', ' )');
    cleanSignature = StrUtils.replace(cleanSignature, '<', ' <');
    cleanSignature = StrUtils.replace(cleanSignature, '>', ' >');
    cleanSignature = StrUtils.replace(cleanSignature, '[', ' [');
    cleanSignature = StrUtils.replace(cleanSignature, ']', ' ]');
    cleanSignature = StrUtils.replace(cleanSignature, ' , ', ':');
    cleanSignature = StrUtils.replace(cleanSignature, ', ', ':');
    cleanSignature = StrUtils.replace(cleanSignature, ',', ':');
    cleanSignature = StrUtils.replace(cleanSignature, ' ,', ':');
    cleanSignature = StrUtils.replace(cleanSignature, ':', ' , ');
    cleanSignature = cleanSignature.trim();
    let signatureSplits = cleanSignature.split(' ');
    let accessModifier;
    let definitionModifier;
    let isStatic = false;
    let transient = false;
    let final = false;
    let override = false;
    let onParams = false;
    let bracketIndent = 0;
    let params = [];
    let param = undefined;
    for (const split of signatureSplits) {
        const splitToLower = split.toLowerCase();
        if (splitToLower === 'public' || splitToLower === 'global' || splitToLower === 'protected' || splitToLower === 'private') {
            accessModifier = splitToLower;
            continue;
        } else if (splitToLower === 'abstract' || splitToLower === 'virtual') {
            definitionModifier = splitToLower;
            continue;
        } else if (splitToLower === 'static') {
            isStatic = true;
            continue;
        } else if (splitToLower === 'transient') {
            transient = true;
            continue;
        } else if (splitToLower === 'final') {
            final = true;
            continue;
        } else if (splitToLower === 'override') {
            override = true;
            continue;
        } else if (splitToLower === '(') {
            onParams = true;
            continue;
        } else if (splitToLower === ')') {
            if (param) {
                params.push(param);
                param = undefined;
            }
            onParams = false;
            continue;
        } else if (onParams) {
            if (splitToLower === '<') {
                if (!param)
                    param = split;
                else
                    param += split;
                bracketIndent++;
                continue;
            } else if (splitToLower === '>') {
                if (!param)
                    param = split;
                else
                    param += split;
                bracketIndent--;
                continue;
            } else if (splitToLower === '[') {
                if (!param)
                    param = split;
                else
                    param += split;
                bracketIndent++;
                continue;
            } else if (splitToLower === ']') {
                if (!param)
                    param = split;
                else
                    param += split;
                bracketIndent--;
                continue;
            } else if (splitToLower === ',') {
                if (bracketIndent === 0) {
                    if (param) {
                        params.push(param);
                        param = undefined;
                    }
                } else {
                    if (!param)
                        param = split;
                    else
                        param += split;
                }
            } else {
                if (!param)
                    param = split;
                else
                    param += ' ' + split;
            }
        }
    }
    if (param) {
        params.push(param);
        param = undefined;
    }
    return {
        accessModifier: accessModifier,
        definitionModifier: definitionModifier,
        static: isStatic,
        transient: transient,
        final: final,
        override: override,
        params: params
    };
}

describe('Testing ./src/apex/parser.js', () => {
    test('Testing parse()', () => {
        /*const classesPath = './resources/apex/classes';
        const nsFolders = FileReader.readDirSync(classesPath);
        for (const nsFolder of nsFolders) {
            if (nsFolder === 'namespacesMetadata.json')
                continue;
            const nsData = {};
            const nsFolderPath = classesPath + '/' + nsFolder;
            const classFiles = FileReader.readDirSync(nsFolderPath);
            for (const classFile of classFiles) {
                if (classFile === 'namespaceMetadata.json')
                    continue;
                const classFilePath = nsFolderPath + '/' + classFile;
                const JSONData = JSON.parse(FileReader.readFileSync(classFilePath));
                let data;
                if (!JSONData.isEnum && !JSONData.isInterface) {
                    data = createApexClass(JSONData);
                } else if (JSONData.isInterface) {
                    data = createApexInterface(JSONData);
                } else {
                    data = createApexEnum(JSONData);
                }
                if (data) {
                    if (!FileChecker.isExists('./src/system'))
                        FileWriter.createFolderSync('./src/system');
                    if (!FileChecker.isExists('./src/system/classes'))
                        FileWriter.createFolderSync('./src/system/classes');
                    if (!FileChecker.isExists('./src/system/classes/' + nsFolder))
                        FileWriter.createFolderSync('./src/system/classes/' + nsFolder);
                    FileWriter.createFileSync('./src/system/classes/' + nsFolder + '/' + data.name.toLowerCase() + '.json', JSON.stringify(data, null, 2));
                    //nsData[data.name.toLowerCase()] = data;
                }
            }
        }*/
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
        const oneFile = true;
        const fileToProcess = 'a_BaseComponentController.cls';
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
        if (oneFile) {
            const filPath = classesPath + '/' + fileToProcess;
            //console.time(fileToProcess + ' compilationTime');
            //console.time(fileToProcess + ' lexer');
            //const tokens = ApexLexer.tokenize(fileContent, systemData);
            /*console.timeEnd(fileToProcess + ' lexer');
            console.time(fileToProcess + ' parser');*/
            const node = new ApexParser(filPath, systemData).parse();
            if (node.nodeType === ApexNodeTypes.CLASS || node.nodeType === ApexNodeTypes.INTERFACE || node.nodeType === ApexNodeTypes.TRIGGER) {
                validateNode(node);
            }
            /*console.timeEnd(fileToProcess + ' parser');
            console.timeEnd(fileToProcess + 'compilationTime');*/
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
                    /*console.timeEnd(file + ' lexer');
                    console.time(file + ' parser');*/
                    const node = new ApexParser(filPath, systemData).parse();
                    if (node.nodeType === ApexNodeTypes.CLASS || node.nodeType === ApexNodeTypes.INTERFACE || node.nodeType === ApexNodeTypes.TRIGGER) {
                        validateNode(node);
                    }
                    nodes[node.name.toLowerCase()] = node;
                    /*console.timeEnd(file + ' parser');
                    console.timeEnd(file + 'compilationTime');*/
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
                    /*console.timeEnd(file + ' lexer');
                    console.time(file + ' parser');*/
                    const node = new ApexParser(filPath, systemData).parse();
                    nodes[node.name.toLowerCase()] = node;
                    /*console.timeEnd(file + ' parser');
                    console.timeEnd(file + 'compilationTime');*/
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