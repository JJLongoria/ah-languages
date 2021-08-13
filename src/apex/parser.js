const { Types, Values, CoreUtils } = require('@ah/core');
const { PathUtils, FileReader, FileWriter, FileChecker } = require('@ah/core').FileSystem;
const ApexGetter = Types.ApexGetter;
const ApexSetter = Types.ApexSetter;
const ApexProperty = Types.ApexProperty;
const ApexMethod = Types.ApexMethod;
const ApexConstructor = Types.ApexConstructor;
const ApexInitializer = Types.ApexInitializer;
const ApexComment = Types.ApexComment;
const ApexCommentBlock = Types.ApexCommentBlock;
const ApexClass = Types.ApexClass;
const ApexTrigger = Types.ApexTrigger;
const ApexEnum = Types.ApexEnum;
const ApexInterface = Types.ApexInterface;
const ApexDatatype = Types.ApexDatatype;
const ApexStaticConstructor = Types.ApexStaticConstructor;
const ApexVariable = Types.ApexVariable;
const ApexAnnotation = Types.ApexAnnotation;
const PositionData = Types.PositionData;
const Token = Types.Token;
const TokenType = require('./tokenTypes');
const Lexer = require('./lexer');
const LangUtils = require('../utils/languageUtils');
const ApexNodeType = Values.ApexNodeTypes;
const Utils = CoreUtils.Utils;
const Validator = CoreUtils.Validator;
const StrUtils = CoreUtils.StrUtils;
const OSUtils = CoreUtils.OSUtils;
const MathUtils = CoreUtils.MathUtils;

let accessModifier;
let definitionModifier;
let sharingModifier;
let staticKeyword;
let webservice;
let final;
let override;
let transient;
let testMethod;
let annotation;
let comment;
let nComments = 0;
let nAnnotations = 0;
let datatype;
let nodesMap = {};
let percentage = 0;
let increment = 0;

class Parser {

    static parse(pathContentOrTokens, position, systemData) {
        let tokens;
        if (Utils.isArray(pathContentOrTokens)) {
            tokens = pathContentOrTokens;
        } else if (Utils.isString(pathContentOrTokens)) {
            const content = PathUtils.isURI(pathContentOrTokens) ? FileReader.readFileSync(Validator.validateFilePath(pathContentOrTokens)) : pathContentOrTokens;
            tokens = Lexer.tokenize(content, systemData.sObject, systemData.userClasses, systemData.namespaceSummary);
        } else {
            throw new Error('You must to select a file path, file content or file tokens');
        }
        resetModifiers();
        const len = tokens.length;
        let node;
        nodesMap = {};
        let bracketIndent = 0;
        let positionData;
        for (let index = 0; index < len; index++) {
            const lastToken = LangUtils.getLastToken(tokens, index);
            const token = new Token(tokens[index]);
            const nextToken = LangUtils.getNextToken(tokens, index);
            const parentToken = (token.parentToken !== undefined && token.parentToken != -1) ? new Token(tokens[token.parentToken]) : undefined;
            const pairToken = (token.pairToken !== undefined) ? new Token(tokens[token.pairToken]) : undefined;
            if (position && node && !positionData) {
                let onPosition = false;
                if (token && token.range.start.line == position.line) {
                    if (token.range.start.character <= position.character && nextToken && position.character <= nextToken.range.start.character) {
                        onPosition = true;
                    }
                } else if (position && lastToken && lastToken.range.start.line < position.line && nextToken && position.line < nextToken.range.start.line) {
                    onPosition = true;
                }
                if (onPosition) {
                    const startIndex = position.character - token.range.start.character;
                    const startPart = token.content.substring(0, startIndex + 1);
                    const endPart = token.content.substring(startIndex + 1, token.content.length - 1);
                    positionData = new PositionData(startPart, endPart, node.type, node.id);
                }
            }
            if (openBracket(token)) {
                bracketIndent++;
                if (isInitializer(token)) {
                    const newNode = new ApexInitializer(node.id + '.initializer', 'Initializer', token);
                    newNode.parentId = node.id;
                    nodesMap[newNode.id] = newNode;
                    node.addChild(newNode);
                    node = newNode;
                    resetModifiers();
                }
            } else if (closeBracket(token)) {
                bracketIndent--;
                if (node) {
                    if (!token.isAux)
                        node.endToken = token;
                    if (node.parentId) {
                        let initializer = false;
                        if (pairToken) {
                            const auxLastPairToken = LangUtils.getLastToken(tokens, token.pairToken);
                            if (auxLastPairToken && openBracket(auxLastPairToken) && isInitializer(pairToken)) {
                                initializer = true;
                                node = nodesMap[node.parentId];
                            }
                        }
                        if (!initializer && parentToken && (isMethodDeclaration(parentToken) || isConstructorDeclaration(parentToken) || isProperty(parentToken) || isGetterAccessor(parentToken) || isSetterAccessor(parentToken) || isClass(parentToken) || isEnum(parentToken) || isInterface(parentToken) || isStaticConstructorDeclaration(parentToken))) {
                            node = nodesMap[node.parentId];
                        }
                    }
                }
            } else if (token.type === TokenType.PUNCTUATION.SEMICOLON) {
                if (node && node.parentId) {
                    if ((node.type === ApexNodeType.GETTER || node.type === ApexNodeType.SETTER) && lastToken && (lastToken.type === TokenType.KEYWORD.DECLARATION.PROPERTY_GETTER || lastToken.type === TokenType.KEYWORD.DECLARATION.PROPERTY_SETTER)) {
                        node = nodesMap[node.parentId];
                    } else if ((node.type === ApexNodeType.CONSTRUCTOR || node.type === ApexNodeType.METHOD) && lastToken && lastToken.type === TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE) {
                        node = nodesMap[node.parentId];
                    }
                }
            } else if (isAccessModifier(token)) {
                accessModifier = token;
            } else if (isDefinitionModifier(token)) {
                definitionModifier = token;
            } else if (isSharingModifier(token)) {
                sharingModifier = token;
            } else if (isStatic(token)) {
                staticKeyword = token;
            } else if (isFinal(token)) {
                final = token;
            } else if (isOverride(token)) {
                override = token;
            } else if (isTestMethod(token)) {
                testMethod = token;
            } else if (isTransient(token)) {
                transient = token;
            } else if (isWebservice(token)) {
                webservice = token;
            } else if (isCommentLine(token)) {
                const newNode = new ApexComment('comment.' + nComments, 'LineComment.' + nComments, token);
                index = processCommentLine(newNode, tokens, index);
                comment = newNode;
                nComments++;
            } else if (openCommentBlock(token)) {
                const newNode = new ApexCommentBlock('comment.' + nComments, 'BlockComment.' + nComments, token);
                index = processCommentBlock(newNode, tokens, index);
                comment = newNode;
                nComments++;
            } else if (isAnnotation(token)) {
                const newNode = new ApexAnnotation('annotation.' + nComments, 'Annotation.' + nAnnotations, token);
                index = processAnnotation(newNode, tokens, index);
                annotation = newNode;
                nAnnotations++;
            } else if (isClass(token)) {
                const newNode = new ApexClass(((node) ? node.id : 'InitialNode') + '.class.' + token.textToLower, token.text, token);
                newNode.accessModifier = accessModifier;
                newNode.definitionModifier = definitionModifier;
                newNode.parentId = (node) ? node.id : undefined;
                newNode.sharingModifier = sharingModifier;
                newNode.scope = bracketIndent;
                if (annotation) {
                    annotation.parentId = newNode.id;
                    annotation.id = newNode.id + '.' + annotation.id;
                    nodesMap[annotation.id] = annotation;
                    newNode.annotation = annotation;
                    annotation = undefined;
                }
                if (comment) {
                    comment.parentId = newNode.id;
                    comment.id = newNode.id + '.' + comment.id;
                    nodesMap[comment.id] = comment;
                    newNode.comment = comment;
                    comment = undefined;
                }
                nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode;
                resetModifiers();
            } else if (isInterface(token)) {
                const newNode = new ApexInterface(((node) ? node.id : 'InitialNode') + '.interface.' + token.textToLower, token.text, token);
                newNode.accessModifier = accessModifier;
                newNode.definitionModifier = definitionModifier;
                newNode.parentId = (node) ? node.id : undefined;
                newNode.sharingModifier = sharingModifier;
                newNode.scope = bracketIndent;
                if (annotation) {
                    annotation.parentId = newNode.id;
                    annotation.id = newNode.id + '.' + annotation.id;
                    nodesMap[annotation.id] = annotation;
                    newNode.annotation = annotation;
                    annotation = undefined;
                }
                if (comment) {
                    comment.parentId = newNode.id;
                    comment.id = newNode.id + '.' + comment.id;
                    nodesMap[comment.id] = comment;
                    newNode.comment = comment;
                    comment = undefined;
                }
                nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode;
                resetModifiers();
            } else if (isEnum(token)) {
                const newNode = new ApexEnum(((node) ? node.id : 'InitialNode') + '.enum.' + token.textToLower, token.text, token);
                newNode.accessModifier = accessModifier;
                newNode.definitionModifier = definitionModifier;
                newNode.parentId = (node) ? node.id : undefined;
                newNode.sharingModifier = sharingModifier;
                newNode.scope = bracketIndent;
                if (annotation) {
                    annotation.parentId = newNode.id;
                    annotation.id = newNode.id + '.' + annotation.id;
                    nodesMap[annotation.id] = annotation;
                    newNode.annotation = annotation;
                    annotation = undefined;
                }
                if (comment) {
                    comment.parentId = newNode.id;
                    comment.id = newNode.id + '.' + comment.id;
                    nodesMap[comment.id] = comment;
                    newNode.comment = comment;
                    comment = undefined;
                }
                nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode;
                resetModifiers();
            } else if (isOnImplements(token)) {
                const data = getInterfaces(tokens, index);
                index = data.index;
                if (data.positionData) {
                    positionData = data.positionData;
                    positionData.isOnClass = true;
                }
                node.implementTypes = data.interfaces;
            } else if (isOnExtends(token)) {
                const data = getExtends(tokens, index);
                index = data.index;
                if (data.positionData) {
                    positionData = data.positionData;
                    positionData.isOnClass = true;
                }
                node.extendsType = data.extendsName;
            } else if (isEnumValue(token)) {
                node.addChild(token);
            } else if (isProperty(token)) {
                const newNode = new ApexProperty(node.id + '.property.' + token.textToLower, token.text, token);
                newNode.accessModifier = accessModifier;
                newNode.definitionModifier = definitionModifier;
                newNode.parentId = node.id;
                newNode.annotation = annotation;
                newNode.transient = transient;
                newNode.static = staticKeyword;
                newNode.scope = bracketIndent;
                if (annotation) {
                    annotation.parentId = newNode.id;
                    annotation.id = newNode.id + '.' + annotation.id;
                    nodesMap[annotation.id] = annotation;
                    newNode.annotation = annotation;
                    annotation = undefined;
                }
                if (comment) {
                    comment.parentId = newNode.id;
                    comment.id = newNode.id + '.' + comment.id;
                    nodesMap[comment.id] = comment;
                    newNode.comment = comment;
                    comment = undefined;
                }
                if (datatype) {
                    datatype.parentId = newNode.id;
                    datatype.id = newNode.id + '.' + datatype.id;
                    nodesMap[datatype.id] = datatype;
                    newNode.datatype = datatype;
                    datatype = undefined;
                }
                nodesMap[newNode.id] = newNode;
                node.addChild(newNode);
                node = newNode;
                resetModifiers();
            } else if (isGetterAccessor(token)) {
                const newNode = new ApexGetter(node.id + '.getter.' + token.textToLower, token.text, token);
                newNode.parentId = node.id;
                if (comment) {
                    comment.parentId = newNode.id;
                    comment.id = newNode.id + '.' + comment.id;
                    newNode.comment = comment;
                    comment = undefined;
                }
                nodesMap[newNode.id] = newNode;
                node.addChild(newNode);
                node = newNode
                resetModifiers();
            } else if (isSetterAccessor(token)) {
                const newNode = new ApexSetter(node.id + '.setter.' + token.textToLower, token.text, token);
                newNode.parentId = node.id;
                if (comment) {
                    comment.parentId = newNode.id;
                    comment.id = newNode.id + '.' + comment.id;
                    newNode.comment = comment;
                    comment = undefined;
                }
                nodesMap[newNode.id] = newNode;
                node.addChild(newNode);
                node = newNode;
                resetModifiers();
            } else if (isDatatype(token)) {
                const newNode = new ApexDatatype('datatype.', '', token);
                index = processDatatype(newNode, tokens, index);
                datatype = newNode;
            } else if (isStaticConstructorDeclaration(token)) {
                const newNode = new ApexStaticConstructor(node.id + '.staticConstructor.' + token.textToLower, token.text, token);
                newNode.parentId = node.id;
                newNode.scope = bracketIndent;
                if (annotation) {
                    annotation.parentId = newNode.id;
                    annotation.id = newNode.id + '.' + annotation.id;
                    nodesMap[annotation.id] = annotation;
                    newNode.annotation = annotation;
                    annotation = undefined;
                }
                if (comment) {
                    comment.parentId = newNode.id;
                    comment.id = newNode.id + '.' + comment.id;
                    nodesMap[comment.id] = comment;
                    newNode.comment = comment;
                    comment = undefined;
                }
                nodesMap[newNode.id] = newNode;
                node.addChild(newNode);
                node = newNode;
                resetModifiers();
            } else if (isConstructorDeclaration(token)) {
                const newNode = new ApexConstructor(node.id + '.constructor.' + token.textToLower, token.text, token);
                newNode.accessModifier = accessModifier;
                newNode.definitionModifier = definitionModifier;
                newNode.parentId = node.id;
                newNode.annotation = annotation;
                newNode.webservice = webservice;
                newNode.override = override;
                newNode.scope = bracketIndent;
                if (annotation) {
                    annotation.parentId = newNode.id;
                    annotation.id = newNode.id + '.' + annotation.id;
                    nodesMap[annotation.id] = annotation;
                    newNode.annotation = annotation;
                    annotation = undefined;
                }
                if (comment) {
                    comment.parentId = newNode.id;
                    comment.id = newNode.id + '.' + comment.id;
                    nodesMap[comment.id] = comment;
                    newNode.comment = comment;
                    comment = undefined;
                }
                index = processMethodSignature(newNode, tokens, index);
                nodesMap[newNode.id] = newNode;
                node.addChild(newNode);
                node = newNode;
                resetModifiers();
            } else if (isMethodDeclaration(token)) {
                const newNode = new ApexMethod(node.id + '.method.' + token.textToLower, token.text, token);
                newNode.accessModifier = accessModifier;
                newNode.definitionModifier = definitionModifier;
                newNode.parentId = node.id;
                newNode.annotation = annotation;
                newNode.webservice = webservice;
                newNode.static = staticKeyword;
                newNode.final = final;
                newNode.testMethod = testMethod;
                newNode.override = override;
                newNode.scope = bracketIndent;
                if (annotation) {
                    annotation.parentId = newNode.id;
                    annotation.id = newNode.id + '.' + annotation.id;
                    nodesMap[annotation.id] = annotation;
                    newNode.annotation = annotation;
                }
                if (comment) {
                    comment.parentId = newNode.id;
                    comment.id = newNode.id + '.' + comment.id;
                    nodesMap[comment.id] = comment;
                    newNode.comment = comment;
                }
                if (datatype) {
                    datatype.parentId = newNode.id;
                    datatype.id = newNode.id + '.' + datatype.id;
                    nodesMap[datatype.id] = datatype;
                    newNode.datatype = datatype;
                }
                index = processMethodSignature(newNode, tokens, index);
                nodesMap[newNode.id] = newNode;
                node.addChild(newNode);
                node = newNode;
                resetModifiers();
            } else if (isVariableDeclaration(token)) {
                const newNode = new ApexVariable(node.id + '.variable.' + token.textToLower, token.text, token);
                newNode.accessModifier = accessModifier;
                newNode.definitionModifier = definitionModifier;
                newNode.parentId = node.id;
                newNode.annotation = annotation;
                newNode.static = staticKeyword;
                newNode.final = final;
                newNode.scope = bracketIndent;
                if (annotation) {
                    annotation.parentId = newNode.id;
                    annotation.id = newNode.id + '.' + annotation.id;
                    nodesMap[annotation.id] = annotation;
                    newNode.annotation = annotation;
                }
                if (comment) {
                    comment.parentId = newNode.id;
                    comment.id = newNode.id + '.' + comment.id;
                    nodesMap[comment.id] = comment;
                    newNode.comment = comment;
                }
                if (datatype) {
                    datatype.parentId = newNode.id;
                    datatype.id = newNode.id + '.' + datatype.id;
                    nodesMap[datatype.id] = datatype;
                    newNode.datatype = datatype;
                }
                nodesMap[newNode.id] = newNode;
                node.addChild(newNode);
                if (nextToken.type === TokenType.PUNCTUATION.COMMA || nextToken.type === TokenType.OPERATOR.ASSIGN.ASSIGN) {
                    index++;
                    const len = tokens.length;
                    for (; index < len; index++) {
                        const auxToken = tokens[index];
                        if (auxToken.type === TokenType.PUNCTUATION.SEMICOLON)
                            break;
                        if (auxToken.type === TokenType.DECLARATION.ENTITY.VARIABLE || auxToken.type === TokenType.ENTITY.VARIABLE) {
                            let sameLineVar = new ApexVariable(node.id + '.variable.' + auxToken.textToLower, auxToken.text, auxToken);
                            sameLineVar.accessModifier = accessModifier;
                            sameLineVar.definitionModifier = definitionModifier;
                            sameLineVar.parentId = node.id;
                            sameLineVar.annotation = annotation;
                            sameLineVar.static = staticKeyword;
                            sameLineVar.final = final;
                            sameLineVar.scope = bracketIndent;
                            const dataTypeNode = new ApexDatatype(datatype);
                            dataTypeNode.id = sameLineVar.id + '.datatype.' + dataTypeNode.name;
                            nodesMap[dataTypeNode.id] = dataTypeNode;
                            sameLineVar.datatype = dataTypeNode;
                            if (annotation) {
                                annotation.parentId = newNode.id;
                                annotation.id = newNode.id + '.' + annotation.id;
                                nodesMap[annotation.id] = annotation;
                                newNode.annotation = annotation;
                            }
                            if (comment) {
                                comment.parentId = newNode.id;
                                comment.id = newNode.id + '.' + comment.id;
                                nodesMap[comment.id] = comment;
                                newNode.comment = comment;
                            }
                            nodesMap[sameLineVar.id] = sameLineVar;
                            node.addChild(sameLineVar);
                        }
                    }
                    comment = undefined;
                    datatype = undefined;
                    annotation = undefined;
                } else {
                    comment = undefined;
                    datatype = undefined;
                    annotation = undefined;
                }
                resetModifiers();
            }
        }
        node.positionData = positionData;
        return node;
    }

    static parseDeclarationNode(tokensOrContent, systemData) {
        let tokens;
        if (Utils.isArray(tokensOrContent)) {
            tokens = tokensOrContent;
        } else if (Utils.isString(tokensOrContent)) {
            tokens = Lexer.tokenize(tokensOrContent, systemData.sObject, systemData.userClasses, systemData.namespaceSummary);
        } else {
            throw new Error('You must to select a tokens or text to analize');
        }
        resetModifiers();
        const len = tokens.length;
        let node;
        for (let index = 0; index < len; index++) {
            const token = new Token(tokens[index]);
            const pairToken = (token.pairToken !== undefined) ? new Token(tokens[token.pairToken]) : undefined;
            if (openBracket(token) || token.type === TokenType.PUNCTUATION.SEMICOLON) {
                if (node.nodeType !== ApexNodeType.PROPERTY) {
                    break;
                }
            } else if (closeBracket(token)) {
                if (node.nodeType === ApexNodeType.PROPERTY) {
                    if (pairToken.id === node.startToken.id) {
                        break;
                    }
                } else {
                    break;
                }
            } else if (isAccessModifier(token)) {
                accessModifier = token;
            } else if (isDefinitionModifier(token)) {
                definitionModifier = token;
            } else if (isSharingModifier(token)) {
                sharingModifier = token;
            } else if (isStatic(token)) {
                staticKeyword = token;
            } else if (isFinal(token)) {
                final = token;
            } else if (isOverride(token)) {
                override = token;
            } else if (isTestMethod(token)) {
                testMethod = token;
            } else if (isTransient(token)) {
                transient = token;
            } else if (isWebservice(token)) {
                webservice = token;
            } else if (isCommentLine(token)) {
                break;
            } else if (openCommentBlock(token)) {
                break;
            } else if (isAnnotation(token)) {
                const newNode = new ApexAnnotation('annotation.' + nComments, 'Annotation.' + nAnnotations, token);
                index = processAnnotation(newNode, tokens, index);
                annotation = newNode;
                nAnnotations++;
            } else if (isClass(token)) {
                node = new ApexClass('InitialNode.class.' + token.textToLower, token.text, token);
                node.accessModifier = accessModifier;
                node.definitionModifier = definitionModifier;
                node.sharingModifier = sharingModifier;
                if (annotation) {
                    annotation.parentId = node.id;
                    annotation.id = node.id + '.' + annotation.id;
                    node.annotation = annotation;
                    annotation = undefined;
                }
                resetModifiers();
            } else if (isInterface(token)) {
                node = new ApexInterface('InitialNode.interface.' + token.textToLower, token.text, token);
                node.accessModifier = accessModifier;
                node.definitionModifier = definitionModifier;
                node.sharingModifier = sharingModifier;
                if (annotation) {
                    annotation.parentId = node.id;
                    annotation.id = node.id + '.' + annotation.id;
                    node.annotation = annotation;
                    annotation = undefined;
                }
                resetModifiers();
            } else if (isEnum(token)) {
                node = new ApexEnum('InitialNode.enum.' + token.textToLower, token.text, token);
                node.accessModifier = accessModifier;
                node.definitionModifier = definitionModifier;
                node.sharingModifier = sharingModifier;
                if (annotation) {
                    annotation.parentId = node.id;
                    annotation.id = node.id + '.' + annotation.id;
                    node.annotation = annotation;
                    annotation = undefined;
                }
                resetModifiers();
            } else if (isOnImplements(token)) {
                const data = getInterfaces(tokens, index);
                index = data.index;
                if (data.positionData) {
                    positionData = data.positionData;
                    positionData.isOnClass = true;
                }
                node.implementTypes = data.interfaces;
            } else if (isOnExtends(token)) {
                const data = getExtends(tokens, index);
                index = data.index;
                if (data.positionData) {
                    positionData = data.positionData;
                    positionData.isOnClass = true;
                }
                node.extendsType = data.extendsName;
            } else if (isProperty(token)) {
                node = new ApexProperty('InitialNode.property.' + token.textToLower, token.text, token);
                node.accessModifier = accessModifier;
                node.definitionModifier = definitionModifier;
                node.annotation = annotation;
                node.transient = transient;
                node.static = staticKeyword;
                if (annotation) {
                    annotation.parentId = node.id;
                    annotation.id = node.id + '.' + annotation.id;
                    node.annotation = annotation;
                    annotation = undefined;
                }
                if (datatype) {
                    datatype.parentId = newNode.id;
                    datatype.id = node.id + '.' + datatype.id;
                    node.datatype = datatype;
                    datatype = undefined;
                }
                resetModifiers();
            } else if (isGetterAccessor(token)) {
                if (node) {
                    const newNode = new ApexGetter(node.id + '.getter.' + token.textToLower, token.text, token);
                    newNode.parentId = node.id;
                    node.addChild(newNode);
                } else {
                    node = new ApexGetter('InitialNode.getter.' + token.textToLower, token.text, token);
                }
                resetModifiers();
            } else if (isSetterAccessor(token)) {
                if (node) {
                    const newNode = new ApexSetter(node.id + '.setter.' + token.textToLower, token.text, token);
                    newNode.parentId = node.id;
                    node.addChild(newNode);
                } else {
                    node = new ApexSetter('InitialNode.setter.' + token.textToLower, token.text, token);
                }
                resetModifiers();
            } else if (isDatatype(token)) {
                const newNode = new ApexDatatype('datatype.', '', token);
                index = processDatatype(newNode, tokens, index);
                datatype = newNode;
            } else if (isStaticConstructorDeclaration(token)) {
                node = new ApexStaticConstructor('InitialNode.constructor.' + token.textToLower, token.text, token);
                if (annotation) {
                    annotation.parentId = node.id;
                    annotation.id = node.id + '.' + annotation.id;
                    node.annotation = annotation;
                    annotation = undefined;
                }
                if (datatype) {
                    datatype.parentId = newNode.id;
                    datatype.id = node.id + '.' + datatype.id;
                    node.datatype = datatype;
                    datatype = undefined;
                }
                resetModifiers();
            } else if (isConstructorDeclaration(token)) {
                node = new ApexConstructor('InitialNode.constructor.' + token.textToLower, token.text, token);
                index = processMethodSignature(node, tokens, index);
                node.accessModifier = accessModifier;
                node.definitionModifier = definitionModifier;
                node.annotation = annotation;
                node.webservice = webservice;
                node.override = override;
                if (annotation) {
                    annotation.parentId = node.id;
                    annotation.id = node.id + '.' + annotation.id;
                    node.annotation = annotation;
                    annotation = undefined;
                }
                resetModifiers();
            } else if (isMethodDeclaration(token)) {
                node = new ApexMethod('InitialNode.method.' + token.textToLower, token.text, token);
                index = processMethodSignature(node, tokens, index);
                node.accessModifier = accessModifier;
                node.definitionModifier = definitionModifier;
                node.parentId = node.id;
                node.annotation = annotation;
                node.webservice = webservice;
                node.final = final;
                node.static = staticKeyword;
                node.testMethod = testMethod;
                node.override = override;
                if (annotation) {
                    annotation.parentId = node.id;
                    annotation.id = node.id + '.' + annotation.id;
                    node.annotation = annotation;
                    annotation = undefined;
                }
                if (datatype) {
                    datatype.parentId = newNode.id;
                    datatype.id = node.id + '.' + datatype.id;
                    node.datatype = datatype;
                    datatype = undefined;
                }
                resetModifiers();
            } else if (isVariableDeclaration(token)) {
                node = new ApexVariable('InitialNode.variable.' + token.textToLower, token.text, token);
                node.accessModifier = accessModifier;
                node.definitionModifier = definitionModifier;
                node.parentId = node.id;
                node.annotation = annotation;
                node.static = staticKeyword;
                node.final = final;
                if (annotation) {
                    annotation.parentId = node.id;
                    annotation.id = node.id + '.' + annotation.id;
                    node.annotation = annotation;
                    annotation = undefined;
                }
                if (datatype) {
                    datatype.parentId = newNode.id;
                    datatype.id = node.id + '.' + datatype.id;
                    node.datatype = datatype;
                    datatype = undefined;
                }
                resetModifiers();
            }
        }
        return node;
    }

    static isPositionOnText(tokensOrContent, position, systemData) {
        let tokens;
        if (Utils.isArray(tokensOrContent)) {
            tokens = tokensOrContent;
        } else if (Utils.isString(tokensOrContent)) {
            tokens = Lexer.tokenize(tokensOrContent, systemData.sObject, systemData.userClasses, systemData.namespaceSummary);
        } else {
            throw new Error('You must to select a tokens or text to analize');
        }
        const len = tokens.length;
        for (let index = 0; index < len; index++) {
            let token = new Token(tokens[index]);
            if (token.range.start.isBeforeOrEqual(position) && token.range.end.isAfterOrEqual(position) && (token.type === TokenType.PUNCTUATION.QUOTTES_START || token.type === TokenType.PUNCTUATION.QUOTTES_END || token.type === TokenType.LITERAL.STRING))
                return true;

        }
        return false;
    }

    static resolveReferences(classFileOrContent, systemData) {
        let apexNode;
        if (Utils.isObject(pathContentOrTokens)) {
            apexClass = classFileOrContent;
        } else if (Utils.isString(pathContentOrTokens)) {
            const content = PathUtils.isURI(pathContentOrTokens) ? FileReader.readFileSync(Validator.validateFilePath(pathContentOrTokens)) : pathContentOrTokens;
            apexNode = Parser.parse(content, systemData.sObject, systemData.userClasses, systemData.namespaceSummary);
        } else {
            throw new Error('You must to select a file path, file content or file tokens');
        }
        if (fileStructure.extendsType)
            fileStructure.extends = resolveDatatypeReference(fileStructure.extendsType, systemData.userClasses, systemData.namespacesData);
        if (fileStructure.implementTypes && fileStructure.implementTypes.length > 0)
            fileStructure.implements = resolveImplements(fileStructure.extendsType, systemData.userClasses, systemData.namespacesData);
        return apexNode;
    }

    static saveClassData(classFileOrContent, targetFolder, systemData) {
        if (!FileChecker.isExists(targetFolder))
            FileWriter.createFolderSync(targetFolder);
        const node = Parser.resolveReferences(classFileOrContent, systemData);
        FileWriter.createFileSync(targetFolder + '/' + node.name + '.json', JSON.stringify(node, null, 2));
        return node;
    }

    static saveClassDataAsync(classFileOrContent, targetFolder, systemData) {
        return new Promise((resolve, reject) => {
            try {
                if (!FileChecker.isExists(targetFolder))
                    FileWriter.createFolderSync(targetFolder);
                const node = Parser.resolveReferences(classFileOrContent, systemData);
                FileWriter.createFile(targetFolder + '/' + node.name + '.json', JSON.stringify(node, null, 2), function (path, errorWrite) {
                    if (errorWrite)
                        reject(errorWrite);
                    else
                        resolve(node);
                });
            } catch (error) {
                reject(error);
            }
        });
        const node = Parser.resolveReferences(classFileOrContent, systemData);
    }

    static saveClassesData(classFiles, targetFolder, systemData, progressCallback) {
        return new Promise((resolve, reject) => {
            try {
                if (!FileChecker.isExists(targetFolder))
                    FileWriter.createFolderSync(targetFolder);
                for (const file of classFiles) {
                    callProgressCalback(progressCallback, 'start file', file);
                    const node = saveClassData(file, targetFolder, systemData);
                    callProgressCalback(progressCallback, 'end file', file, node);
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    static saveAllClasesData(classPathOrFiles, targetFolder, multithread, systemData, progressCallback) {
        percentage = 0;
        increment = 0;
        return new Promise(async (resolve, reject) => {
            try {
                let files = [];
                if (Utils.isArray(classPathOrFiles)) {
                    files = classPathOrFiles;
                } else if (Utils.isString(classPathOrFiles)) {
                    classPathOrFiles = Validator.validateFolderPath(classPathOrFiles);
                    files = FileReader.readDirSync(classPathOrFiles, {
                        onlyFiles: true,
                        extensions: ['.cls']
                    })
                } else {
                    reject('Wrong parameter. Expect a class folder path or array with files and receive ' + classPathOrFiles);
                }
                if (files.length > 0) {
                    files = Utils.sort(files, null, false);
                    increment = calculateIncrement(files);
                    callProgressCalback(progressCallback, 'prepare');
                    const batchesToProcess = getBatches(files, multithread);
                    for (const batch of batchesToProcess) {
                        Parser.saveClassesData(batch.records, targetFolder, systemData, progressCallback).then(() => {
                            batch.completed = true;
                            let nCompleted = 0;
                            for (const resultBatch of batchesToProcess) {
                                if (resultBatch.completed)
                                    nCompleted++;
                            }
                            if (nCompleted === batchesToProcess.length) {
                                resolve();
                                return;
                            }
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    static isMethodExists(classOrInterface, method) {
        return !Utils.isNull(classOrInterface.methods[method.simplifiedSignature.toLowerCase()]);
    }

    static isConstructorExists(classOrInterface, constructor) {
        return !Utils.isNull(classOrInterface.constructors[constructor.simplifiedSignature.toLowerCase()]);
    }

    static isFieldExists(classOrInterface, variable) {
        return !Utils.isNull(classOrInterface.methods[variable.name.toLowerCase()]);
    }

    static isClassExists(classOrInterface, apexClass) {
        return !Utils.isNull(classOrInterface.classes[apexClass.name.toLowerCase()]);
    }

    static isInterfaceExists(classOrInterface, apexInterface) {
        return !Utils.isNull(classOrInterface.interfaces[apexInterface.name.toLowerCase()]);
    }

    static isEnumExists(classOrInterface, apexEnum) {
        return !Utils.isNull(classOrInterface.enums[apexEnum.name.toLowerCase()]);
    }

    static extendsFrom(classOrInterface, extendsType) {
        return !Utils.isNull(classOrInterface.extends) && classOrInterface.extends.name.toLowerCase() === extendsType.name.toLowerCase();
    }

    static implementsFrom(classOrInterface, implementsType) {
        return !Utils.isNull(classOrInterface.implements[implementsType.name.toLowerCase()]);
    }

}
module.exports = Parser;

function cleanDatatype(datatype) {
    if (StrUtils.contains(datatype, '<'))
        datatype = datatype.split('<')[0];
    else if (StrUtils.contains(datatype, '[') && StrUtils.contains(datatype, ']'))
        datatype = "List";
    return datatype.toLowerCase();
}

function resolveDatatypeReference(datatype, classes, namespacesData) {
    let extendsObject;
    let className;
    const systemMetadata = namespacesData['system'];
    datatype = cleanDatatype(datatype);
    if (StrUtils.contains(datatype, '.')) {
        let splits = extendType.split('.');
        if (splits.length === 2) {
            let parentClassOrNs = splits[0];
            className = splits[1];
            if (classes[parentClassOrNs]) {
                extendsObject = classes[parentClassOrNs]
            } else if (namespacesData[parentClassOrNs]) {
                let namespaceData = namespacesData[parentClassOrNs];
                if (namespaceData[className])
                    extendsObject = namespaceData[className];
            }
            if (!extendsObject && systemMetadata[parentClassOrNs]) {
                extendsObject = systemMetadata[parentClassOrNs];
            }
        } else if (splits.length > 2) {
            let nsName = splits[0];
            let parentClassName = splits[1];
            className = splits[2];
            if (classes[parentClassName]) {
                extendsObject = classes[parentClassName];
            } else if (namespacesData[nsName]) {
                let namespaceData = applicationContext.namespacesData[nsName];
                if (namespaceData[parentClassName])
                    extendsObject = namespaceData[parentClassName];
            }
            if (!extendsObject && systemMetadata[className]) {
                extendsObject = systemMetadata[className];
            }
        }
    } else {
        if (classes[datatype]) {
            struct = classes[datatype];
        } else if (systemMetadata[datatype]) {
            struct = systemMetadata[datatype];
        }
    }
    if (extendsObject && className) {
        Object.keys(extendsObject.classes).forEach(function (key) {
            if (key === classNam) {
                extendsObject = extendsObject.classes[key];
            }
        });
    }
    if (extendsObject) {
        if (extendsObject.extendsType)
            extendsObject.extends = resolveDatatypeReference(extendsObject.extendsType, classes, namespacesMetadata);
        if (extendsObject.implementTypes && extendsObject.implementTypes.length > 0)
            extendsObject.implements = resolveImplements(extendsObject.implementTypes, classes, namespacesMetadata);
    }
    return extendsObject;
}

function resolveImplements(implementTypes, classes, namespacesData) {
    const implementObjects = {};
    for (let impType of implementTypes) {
        const reference = resolveDatatypeReference(impType, classes, namespacesData);
        if (!Utils.isNull(reference))
            implementObjects[reference.name.toLowerCase()] = reference;
    }
    return implementObjects;
}

function resetModifiers() {
    accessModifier = undefined;
    definitionModifier = undefined;
    sharingModifier = undefined;
    staticKeyword = undefined;
    final = undefined;
    override = undefined;
    transient = undefined;
    testMethod = undefined;
    annotation = undefined;
    datatype = undefined;
    comment = undefined;
    webservice = undefined;
}

function isDatatype(token) {
    return token && (token.type === TokenType.DATATYPE.COLLECTION || token.type === TokenType.DATATYPE.CUSTOM_CLASS || token.type === TokenType.DATATYPE.PRIMITIVE || token.type === TokenType.DATATYPE.SOBJECT || token.type === TokenType.DATATYPE.SUPPORT_CLASS || token.type === TokenType.DATATYPE.SUPPORT_NAMESPACE || token.type === TokenType.ENTITY.CLASS_MEMBER || token.type === TokenType.ENTITY.SUPPORT_CLASS_MEMBER);
}

function isAnnotation(token) {
    return token && token.type === TokenType.ANNOTATION.ENTITY;
}

function isConstructorDeclaration(token) {
    return token && token.type === TokenType.DECLARATION.ENTITY.CONSTRUCTOR;
}

function isMethodDeclaration(token) {
    return token && token.type === TokenType.DECLARATION.ENTITY.FUNCTION;
}

function isStaticConstructorDeclaration(token) {
    return token && token.type === TokenType.KEYWORD.DECLARATION.STATIC_CONSTRUCTOR;
}

function isVariableDeclaration(token) {
    return token && token.type === TokenType.DECLARATION.ENTITY.VARIABLE;
}

function openBracket(token) {
    return token && (token.type === TokenType.BRACKET.CURLY_OPEN || token.type === TokenType.BRACKET.INITIALIZER_OPEN);
}

function closeBracket(token) {
    return token && (token.type === TokenType.BRACKET.CURLY_CLOSE || token.type === TokenType.BRACKET.INITIALIZER_CLOSE);
}

function isAccessModifier(token) {
    return token && token.type === TokenType.KEYWORD.MODIFIER.ACCESS;
}

function openCommentBlock(token) {
    return token && token.type === TokenType.COMMENT.BLOCK_START;
}

function closeCommentBlock(token) {
    return token && token.type === TokenType.COMMENT.BLOCK_END;
}

function isCommentLine(token) {
    return token && (token.type === TokenType.COMMENT.LINE || token.type === TokenType.COMMENT.LINE_DOC);
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

function isClass(token) {
    return token && token.type === TokenType.DECLARATION.ENTITY.CLASS;
}

function isInterface(token) {
    return token && token.type === TokenType.DECLARATION.ENTITY.INTERFACE;
}

function isEnum(token) {
    return token && token.type === TokenType.DECLARATION.ENTITY.ENUM;
}

function isProperty(token) {
    return token && token.type === TokenType.DECLARATION.ENTITY.PROPERTY;
}

function isGetterAccessor(token) {
    return token && token.type === TokenType.KEYWORD.DECLARATION.PROPERTY_GETTER;
}

function isSetterAccessor(token) {
    return token && token.type === TokenType.KEYWORD.DECLARATION.PROPERTY_SETTER;
}

function isInitializer(token) {
    return token && token.type === TokenType.BRACKET.INITIALIZER_OPEN;
}

function isOnImplements(token) {
    return token.type === TokenType.KEYWORD.DECLARATION.IMPLEMENTS;
}

function isOnExtends(token) {
    return token.type === TokenType.KEYWORD.DECLARATION.EXTENDS;
}

function getInterfaces(tokens, index) {
    var interfaceName = "";
    let token = tokens[index];
    let aBracketIndent = 0;
    let interfaces = [];
    const len = tokens.length;
    for (; index < len; index++) {
        const token = tokens[index];
        if (token.type === TokenType.BRACKET.PARAMETRIZED_TYPE_OPEN) {
            aBracketIndent++;
        }
        else if (token.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE) {
            aBracketIndent--;
        }
        if (token.type === TokenType.PUNCTUATION.COMMA && aBracketIndent == 0) {
            interfaces.push(interfaceName);
            interfaceName = "";
        } else if (token.type !== TokenType.KEYWORD.DECLARATION.IMPLEMENTS && token.type !== TokenType.BRACKET.CURLY_OPEN) {
            interfaceName += token.text;
        }
        if (token.type === TokenType.KEYWORD.DECLARATION.EXTENDS || token.type === TokenType.BRACKET.CURLY_OPEN)
            break;
    }
    interfaces.push(interfaceName);
    if (token.type === TokenType.KEYWORD.DECLARATION.EXTENDS)
        index = index - 2;
    if (token.type === TokenType.BRACKET.CURLY_OPEN)
        index = index - 2;
    return {
        index: index,
        interfaces: interfaces,
    };
}

function getExtends(tokens, index) {
    // TODO
    var extendsName = "";
    let aBracketIndent;
    const len = tokens.length;
    for (; index < len; index++) {
        const token = tokens[index];
        if (token.type === TokenType.BRACKET.PARAMETRIZED_TYPE_OPEN) {
            aBracketIndent++;
        }
        else if (token.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE) {
            aBracketIndent--;
        }
        if (token.type !== TokenType.KEYWORD.DECLARATION.EXTENDS && token.type !== TokenType.KEYWORD.DECLARATION.IMPLEMENTS && token.type !== TokenType.BRACKET.CURLY_OPEN) {
            extendsName += token.text;
        }
        if (token.type === TokenType.BRACKET.CURLY_OPEN || token.type === TokenType.KEYWORD.DECLARATION.IMPLEMENTS || (token.type === TokenType.PUNCTUATION.COMMA && aBracketIndent == 0)) {
            if (token.type === TokenType.BRACKET.CURLY_OPEN || token.type === TokenType.KEYWORD.DECLARATION.IMPLEMENTS)
                index = index - 2;
            break;
        }
    }
    return {
        extendsName: extendsName,
        index: index,
    };
}

function isEnumValue(token) {
    return token && token.type === TokenType.ENTITY.ENUM_VALUE;
}

function processMethodSignature(node, tokens, index) {
    index++;
    let datatype;
    let paramName;
    let methodParams = [];
    let types = [];
    let params = [];
    const len = tokens.length;
    for (; index < len; index++) {
        const token = tokens[index];
        if (token.type === TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE) {
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
        if (!paramName && isDatatype(token)) {
            let newNode = new ApexDatatype(node.id + '.datatype.', '', token);
            index = processDatatype(newNode, tokens, index);
            newNode.parentId = node.id;
            datatype = newNode;
        } else if (datatype && paramName && (token.type === TokenType.PUNCTUATION.COMMA || token.type === TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE)) {
            types.push(datatype.name);
            params.push(datatype.name + ' ' + paramName.text);
            methodParams.push({
                name: paramName,
                datatype: datatype
            });
            datatype = undefined;
            paramName = undefined;
        } else if (datatype) {
            paramName = token;
        }
    }
    node.simplifiedSignature = node.name + '(' + types.join(',') + ')';
    let signature = '';
    if (node.accessModifier) {
        signature += node.accessModifier.textToLower + ' ';
    }
    if (node.definitionModifier) {
        signature += node.definitionModifier.textToLower + ' ';
    }
    if (node.type === ApexNodeType.METHOD && node.testMethod) {
        signature += node.testMethod.textToLower + ' ';
    }
    if (node.type === ApexNodeType.METHOD && node.webservice) {
        signature += node.webservice.textToLower + ' ';
    }
    if (node.type === ApexNodeType.METHOD && node.static) {
        signature += node.static.textToLower + ' ';
    }
    if (node.override) {
        signature += node.override.textToLower + ' ';
    }
    const nameAndParams = ((node.return) ? node.return.name + ' ' : '') + node.name.textToLower + '(' + params.join(', ') + ')';
    const overrideSignature = signature + 'override ' + nameAndParams;
    signature += nameAndParams;
    node.signature = signature;
    node.overrideSignature = overrideSignature;
    node.id = node.parentId + '.method.' + node.simplifiedSignature.toLowerCase();
    for (const param of methodParams) {
        let newNode = new ApexVariable(node.id + '.varParam.' + param.name.textToLower, param.name.text, param.name);
        nodesMap[param.datatype.id] = param.datatype;
        newNode.parentId = node.id;
        newNode.datatype = param.datatype;
        nodesMap[newNode.id] = newNode;
        node.addChild(newNode);
    }
    index--;
    return index;
}

function processAnnotation(node, tokens, index) {
    const len = tokens.length;
    for (; index < len; index++) {
        const token = tokens[index];
        if (token.type === TokenType.ANNOTATION.NAME || token.type === TokenType.BRACKET.ANNOTATION_PARAM_OPEN || token.type === TokenType.BRACKET.ANNOTATION_PARAM_CLOSE || token.type === TokenType.ANNOTATION.ENTITY) {
            node.addToken(token);
        } else {
            break;
        }
    }
    return index;
}

function processCommentBlock(node, tokens, index) {
    const len = tokens.length;
    for (; index < len; index++) {
        const token = tokens[index];
        if (!closeCommentBlock(token)) {
            node.addToken(token);
        } else {
            node.addToken(token);
            break;
        }
    }
    return index;
}

function processCommentLine(node, tokens, index) {
    const len = tokens.length;
    for (; index < len; index++) {
        const token = tokens[index];
        if (token.type === TokenType.COMMENT.LINE || token.type === TokenType.COMMENT.LINE_DOC || token.type === TokenType.COMMENT.CONTENT) {
            node.addToken(token);
        } else {
            break;
        }
    }
    index--;
    return index;
}

function processDatatype(node, tokens, index) {
    let bracketIndent = 0;
    let datatype = '';
    const len = tokens.length;
    for (; index < len; index++) {
        const token = tokens[index];
        if (token) {
            if (isDatatype(token)) {
                datatype += token.text;
            } else if (token.type === TokenType.BRACKET.PARAMETRIZED_TYPE_OPEN || token.type === TokenType.BRACKET.SQUARE_OPEN) {
                bracketIndent++;
                datatype += token.text;
            }
            else if (token.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE || token.type === TokenType.BRACKET.SQUARE_CLOSE) {
                bracketIndent--;
                datatype += token.text;
            } else if (token.type === TokenType.PUNCTUATION.COMMA && bracketIndent > 0) {
                datatype += token.text;
            } else if (token.type === TokenType.PUNCTUATION.OBJECT_ACCESSOR) {
                datatype += token.text;
            } else {
                break;
            }
        }
    }
    node.name = datatype;
    node.id += datatype;
    index--;
    return index;
}

function getBatches(objects, multiThread) {
    const nBatches = (multiThread) ? OSUtils.getAvailableCPUs() : 1;
    const recordsPerBatch = Math.ceil(objects.length / nBatches);
    const batches = [];
    let counter = 0;
    let batch;
    for (const object of objects) {
        if (!batch) {
            batch = {
                batchId: 'Bacth_' + counter,
                records: [],
                completed: false
            }
            counter++;
        }
        if (batch) {
            batch.records.push(object);
            if (batch.records.length === recordsPerBatch) {
                batches.push(batch);
                batch = undefined;
            }
        }
    }
    if (batch)
        batches.push(batch);
    return batches;
}

function calculateIncrement(objects) {
    return MathUtils.round(100 / objects.length, 2);
}

function callProgressCalback(progressCallback, stage, file, data) {
    if (progressCallback)
        progressCallback.call(this, {
            stage: stage,
            increment: increment,
            percentage: MathUtils.round(percentage, 2),
            file: file,
            data: data
        });
}