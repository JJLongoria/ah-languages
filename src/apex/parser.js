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
const SOQLQuery = Types.SOQLQuery;
const SOQLField = Types.SOQLField;
const ApexEnum = Types.ApexEnum;
const ApexInterface = Types.ApexInterface;
const ApexDatatype = Types.ApexDatatype;
const ApexStaticConstructor = Types.ApexStaticConstructor;
const ApexVariable = Types.ApexVariable;
const ApexAnnotation = Types.ApexAnnotation;
const PositionData = Types.PositionData;
const Token = Types.Token;
const TokenType = require('./tokenTypes');
const Lexer = require('./tokenizer');
const LangUtils = require('../utils/languageUtils');
const ApexNodeType = Values.ApexNodeTypes;
const Utils = CoreUtils.Utils;
const Validator = CoreUtils.Validator;
const StrUtils = CoreUtils.StrUtils;
const OSUtils = CoreUtils.OSUtils;
const MathUtils = CoreUtils.MathUtils;

/**
 * Class to parse an Apex Class file, content or tokens to extract the class information like fields, methods, variables, constructors, inner classes... and much more.
 */
class ApexParser {

    constructor(filePathOrTokens, systemData) {
        this.systemData = systemData;
        if (Utils.isArray(filePathOrTokens)) {
            this.tokens = filePathOrTokens;
            this.tokensLength = this.tokens.length;
        } else {
            this.tokens = [];
            this.filePath = filePathOrTokens;
        }
        this.content = undefined;
        this.nodesMap = {};
        this.accessModifier;
        this.definitionModifier;
        this.sharingModifier;
        this.staticKeyword;
        this.webservice;
        this.final;
        this.override;
        this.transient;
        this.testMethod;
        this.annotation;
        this.comment;
        this.nComments = 0;
        this.nAnnotations = 0;
        this.datatype;
        this.cursorPosition;
        this.declarationOnly = false;
        this.node;
    }

    setTokens(tokens) {
        this.tokens = tokens;
        this.tokensLength = this.tokens.length;
        return this;
    }

    setSystemData(systemData) {
        this.systemData = systemData;
        return this;
    }

    setFilePath(filePath) {
        this.filePath = filePath;
        return this;
    }

    setContent(content) {
        this.content = content;
        return this;
    }

    setCursorPosition(position) {
        this.cursorPosition = position;
        return this;
    }

    isDeclarationOnly(declarationOnly) {
        this.declarationOnly = (declarationOnly !== undefined && Utils.isBoolean(declarationOnly)) ? declarationOnly : false;
        return this;
    }

    getTokens() {
        return this.tokens;
    }

    parse() {
        if (this.node)
            return this.node;
        if (this.filePath && !this.content && (!this.tokens || this.tokens.length === 0)) {
            this.content = FileReader.readFileSync(Validator.validateFilePath(this.filePath));
            this.tokens = Lexer.tokenize(this.content, this.systemData);
            this.tokensLength = this.tokens.length;
        } else if (this.content && (!this.tokens || this.tokens.length === 0)) {
            this.tokens = Lexer.tokenize(this.content, this.systemData);
            this.tokensLength = this.tokens.length;
        } else if (!this.tokens) {
            this.tokens = [];
        }
        resetModifiers(this);
        let node;
        let bracketIndent = 0;
        let positionData;
        let startLine = (this.cursorPosition && this.declarationOnly) ? this.cursorPosition.line : 0;
        for (let index = 0; index < this.tokensLength; index++) {
            const lastToken = LangUtils.getLastToken(this.tokens, index);
            const token = new Token(this.tokens[index]);
            const nextToken = LangUtils.getNextToken(this.tokens, index);
            const parentToken = (token.parentToken !== undefined && token.parentToken != -1) ? new Token(this.tokens[token.parentToken]) : undefined;
            const pairToken = (token.pairToken !== undefined) ? new Token(this.tokens[token.pairToken]) : undefined;
            if (token.range.start.line < startLine)
                continue;
            if (this.cursorPosition && node && !positionData) {
                if (LangUtils.isOnPosition(token, lastToken, nextToken, this.cursorPosition)) {
                    const startIndex = this.cursorPosition.character - token.range.start.character;
                    const startPart = token.text.substring(0, startIndex + 1);
                    const endPart = token.text.substring(startIndex + 1);
                    positionData = new PositionData(startPart, endPart, node.nodeType, node.id, 'Apex');
                    positionData.onText = token.type === TokenType.PUNCTUATION.QUOTTES_START || token.type === TokenType.PUNCTUATION.QUOTTES_END || token.type === TokenType.LITERAL.STRING;
                    positionData.signature = node.simplifiedSignature || node.signature;
                }
            }
            if (openBracket(token)) {
                if (this.declarationOnly && node.nodeType !== ApexNodeType.PROPERTY) {
                    break;
                }
                bracketIndent++;
                if (isInitializer(token)) {
                    const newNode = new ApexInitializer(((node) ? node.id : 'InitialNode') + '.initializer', 'Initializer', token);
                    newNode.parentId = (node) ? node.id : undefined;
                    if (this.annotation) {
                        this.annotation.parentId = newNode.id;
                        this.annotation.id = newNode.id + '.' + this.annotation.id;
                        this.nodesMap[this.annotation.id] = this.annotation;
                        newNode.annotation = this.annotation;
                        this.annotation = undefined;
                    }
                    if (this.comment) {
                        this.comment.parentId = newNode.id;
                        this.comment.id = newNode.id + '.' + this.comment.id;
                        this.nodesMap[this.comment.id] = this.comment;
                        newNode.comment = this.comment;
                        if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template))
                            newNode.comment.processComment(this.systemData.template);
                        this.comment = undefined;
                    }
                    this.nodesMap[newNode.id] = newNode;
                    if (node)
                        node.addChild(newNode);
                    node = newNode;
                    resetModifiers(this);
                }
            } else if (closeBracket(token)) {
                bracketIndent--;
                if (this.declarationOnly && bracketIndent === 0) {
                    break;
                }
                if (node) {
                    if (!token.isAux)
                        node.endToken = token;
                    if (node.parentId) {
                        let initializer = false;
                        if (pairToken) {
                            const auxLastPairToken = LangUtils.getLastToken(this.tokens, token.pairToken);
                            if (auxLastPairToken && openBracket(auxLastPairToken) && isInitializer(pairToken)) {
                                initializer = true;
                                node = this.nodesMap[node.parentId];
                            }
                        }
                        if (!initializer && parentToken && (isMethodDeclaration(parentToken) || isConstructorDeclaration(parentToken) || isProperty(parentToken) || isGetterAccessor(parentToken) || isSetterAccessor(parentToken) || isClass(parentToken) || isEnum(parentToken) || isInterface(parentToken) || isStaticConstructorDeclaration(parentToken))) {
                            node = this.nodesMap[node.parentId];
                        }
                    }
                }
            } else if (token.type === TokenType.PUNCTUATION.SEMICOLON) {
                if (node && node.parentId) {
                    if ((node.nodeType === ApexNodeType.GETTER || node.nodeType === ApexNodeType.SETTER) && lastToken && (lastToken.type === TokenType.KEYWORD.DECLARATION.PROPERTY_GETTER || lastToken.type === TokenType.KEYWORD.DECLARATION.PROPERTY_SETTER)) {
                        node = this.nodesMap[node.parentId];
                    } else if ((node.nodeType === ApexNodeType.CONSTRUCTOR || node.nodeType === ApexNodeType.METHOD) && lastToken && lastToken.type === TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE) {
                        node = this.nodesMap[node.parentId];
                    }
                }
            } else if (isAccessModifier(token)) {
                this.accessModifier = token;
            } else if (isDefinitionModifier(token)) {
                this.definitionModifier = token;
            } else if (isSharingModifier(token)) {
                this.sharingModifier = token;
            } else if (isStatic(token)) {
                this.staticKeyword = token;
            } else if (isFinal(token)) {
                this.final = token;
            } else if (isOverride(token)) {
                this.override = token;
            } else if (isTestMethod(token)) {
                this.testMethod = token;
            } else if (isTransient(token)) {
                this.transient = token;
            } else if (isWebservice(token)) {
                this.webservice = token;
            } else if (isCommentLine(token)) {
                const newNode = new ApexComment('comment.' + this.nComments, 'LineComment.' + this.nComments, token);
                index = processCommentLine(newNode, this, index);
                this.comment = newNode;
                this.nComments++;
            } else if (openCommentBlock(token)) {
                const newNode = new ApexCommentBlock('comment.' + this.nComments, 'BlockComment.' + this.nComments, token);
                index = processCommentBlock(newNode, this, index);
                this.comment = newNode;
                this.nComments++;
            } else if (isAnnotation(token)) {
                const newNode = new ApexAnnotation('annotation.' + this.nAnnotations, token.text, token);
                index = processAnnotation(newNode, this, index);
                this.annotation = newNode;
                this.nAnnotations++;
            } else if (isClass(token)) {
                const newNode = new ApexClass(((node) ? node.id : 'InitialNode') + '.class.' + token.textToLower, token.text, token);
                newNode.accessModifier = this.accessModifier;
                newNode.definitionModifier = this.definitionModifier;
                newNode.parentId = (node) ? node.id : undefined;
                newNode.sharingModifier = this.sharingModifier;
                newNode.scope = bracketIndent;
                if (this.annotation) {
                    this.annotation.parentId = newNode.id;
                    this.annotation.id = newNode.id + '.' + this.annotation.id;
                    this.nodesMap[this.annotation.id] = this.annotation;
                    newNode.annotation = this.annotation;
                    this.annotation = undefined;
                }
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template))
                        newNode.comment.processComment(this.systemData.template);
                    this.comment = undefined;
                }
                this.nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode;
                resetModifiers(this);
            } else if (isInterface(token)) {
                const newNode = new ApexInterface(((node) ? node.id : 'InitialNode') + '.interface.' + token.textToLower, token.text, token);
                newNode.accessModifier = this.accessModifier;
                newNode.definitionModifier = this.definitionModifier;
                newNode.parentId = (node) ? node.id : undefined;
                newNode.sharingModifier = this.sharingModifier;
                newNode.scope = bracketIndent;
                if (this.annotation) {
                    this.annotation.parentId = newNode.id;
                    this.annotation.id = newNode.id + '.' + this.annotation.id;
                    this.nodesMap[this.annotation.id] = this.annotation;
                    newNode.annotation = this.annotation;
                    this.annotation = undefined;
                }
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template))
                        newNode.comment.processComment(this.systemData.template);
                    this.comment = undefined;
                }
                this.nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode;
                resetModifiers(this);
            } else if (isEnum(token)) {
                const newNode = new ApexEnum(((node) ? node.id : 'InitialNode') + '.enum.' + token.textToLower, token.text, token);
                newNode.accessModifier = this.accessModifier;
                newNode.definitionModifier = this.definitionModifier;
                newNode.parentId = (node) ? node.id : undefined;
                newNode.sharingModifier = this.sharingModifier;
                newNode.scope = bracketIndent;
                if (this.annotation) {
                    this.annotation.parentId = newNode.id;
                    this.annotation.id = newNode.id + '.' + this.annotation.id;
                    this.nodesMap[this.annotation.id] = this.annotation;
                    newNode.annotation = this.annotation;
                    this.annotation = undefined;
                }
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template))
                        newNode.comment.processComment(this.systemData.template);
                    this.comment = undefined;
                }
                this.nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode;
                resetModifiers(this);
            } else if (isOnTrigger(token)) {
                const newNode = new ApexTrigger(((node) ? node.id : 'InitialNode') + '.trigger.');
                index = processTrigger(this.tokens, index, newNode);
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template))
                        newNode.comment.processComment(this.systemData.template);
                    this.comment = undefined;
                }
                this.nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode;
                resetModifiers(this);
            } else if (isOnImplements(token)) {
                const data = getInterfaces(this.tokens, index);
                index = data.index;
                node.implementTypes = data.interfaces;
            } else if (isOnExtends(token)) {
                const data = getExtends(this.tokens, index);
                index = data.index;
                node.extendsType = data.extendsName;
            } else if (isEnumValue(token)) {
                if (node)
                    node.addChild(token);
            } else if (isQuery(token, lastToken)) {
                const data = processQuery(this.tokens, index, this.cursorPosition, node);
                index = data.index;
                if (data.positionData && !positionData) {
                    positionData = data.positionData;
                }
                if (node && data.query)
                    node.addChild(data.query);
            } else if (isProperty(token)) {
                const newNode = new ApexProperty(((node) ? node.id : 'InitialNode') + '.property.' + token.textToLower, token.text, token);
                newNode.accessModifier = this.accessModifier;
                newNode.definitionModifier = this.definitionModifier;
                newNode.parentId = (node) ? node.id : undefined;
                newNode.transient = this.transient;
                newNode.static = this.staticKeyword;
                newNode.scope = bracketIndent;
                if (this.annotation) {
                    this.annotation.parentId = newNode.id;
                    this.annotation.id = newNode.id + '.' + this.annotation.id;
                    this.nodesMap[this.annotation.id] = this.annotation;
                    newNode.annotation = this.annotation;
                    this.annotation = undefined;
                }
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template))
                        newNode.comment.processComment(this.systemData.template);
                    this.comment = undefined;
                }
                if (this.datatype) {
                    this.datatype.parentId = newNode.id;
                    this.datatype.id = newNode.id + '.' + this.datatype.id;
                    this.nodesMap[this.datatype.id] = this.datatype;
                    newNode.datatype = this.datatype;
                    this.datatype = undefined;
                }
                this.nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode;
                resetModifiers(this);
            } else if (isGetterAccessor(token)) {
                const newNode = new ApexGetter(((node) ? node.id : 'InitialNode') + '.getter.' + token.textToLower, token.text, token);
                newNode.parentId = (node) ? node.id : undefined;
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    this.comment = undefined;
                }
                this.nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode
                resetModifiers(this);
            } else if (isSetterAccessor(token)) {
                const newNode = new ApexSetter(((node) ? node.id : 'InitialNode') + '.setter.' + token.textToLower, token.text, token);
                newNode.parentId = (node) ? node.id : undefined;
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    this.comment = undefined;
                }
                this.nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode;
                resetModifiers(this);
            } else if (isDatatype(token)) {
                const newNode = new ApexDatatype('datatype.', '', token);
                index = processDatatype(newNode, this, index);
                this.datatype = newNode;
            } else if (isStaticConstructorDeclaration(token)) {
                const newNode = new ApexStaticConstructor(((node) ? node.id : 'InitialNode') + '.staticConstructor.' + token.textToLower, token.text, token);
                newNode.parentId = (node) ? node.id : undefined;
                newNode.scope = bracketIndent;
                if (this.annotation) {
                    this.annotation.parentId = newNode.id;
                    this.annotation.id = newNode.id + '.' + this.annotation.id;
                    this.nodesMap[this.annotation.id] = this.annotation;
                    newNode.annotation = this.annotation;
                    this.annotation = undefined;
                }
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template))
                        newNode.comment.processComment(this.systemData.template);
                    this.comment = undefined;
                }
                this.nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode;
                resetModifiers(this);
            } else if (isConstructorDeclaration(token)) {
                const newNode = new ApexConstructor(((node) ? node.id : 'InitialNode') + '.constructor.' + token.textToLower, token.text, token);
                newNode.accessModifier = this.accessModifier;
                newNode.definitionModifier = this.definitionModifier;
                newNode.parentId = (node) ? node.id : undefined;;
                newNode.webservice = this.webservice;
                newNode.override = this.override;
                newNode.scope = bracketIndent;
                if (this.annotation) {
                    this.annotation.parentId = newNode.id;
                    this.annotation.id = newNode.id + '.' + this.annotation.id;
                    this.nodesMap[this.annotation.id] = this.annotation;
                    newNode.annotation = this.annotation;
                    this.annotation = undefined;
                }
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template))
                        newNode.comment.processComment(this.systemData.template);
                    this.comment = undefined;
                }
                index = processMethodSignature(newNode, this, index);
                this.nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode;
                resetModifiers(this);
            } else if (isMethodDeclaration(token)) {
                const newNode = new ApexMethod(((node) ? node.id : 'InitialNode') + '.method.' + token.textToLower, token.text, token);
                newNode.accessModifier = this.accessModifier;
                newNode.definitionModifier = this.definitionModifier;
                newNode.parentId = (node) ? node.id : undefined;;
                newNode.webservice = this.webservice;
                newNode.static = this.staticKeyword;
                newNode.final = this.final;
                newNode.testMethod = this.testMethod;
                newNode.override = this.override;
                newNode.scope = bracketIndent;
                if (this.annotation) {
                    this.annotation.parentId = newNode.id;
                    this.annotation.id = newNode.id + '.' + this.annotation.id;
                    this.nodesMap[this.annotation.id] = this.annotation;
                    newNode.annotation = this.annotation;
                }
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template))
                        newNode.comment.processComment(this.systemData.template);
                    this.comment = undefined;
                }
                if (this.datatype) {
                    this.datatype.parentId = newNode.id;
                    this.datatype.id = newNode.id + '.' + this.datatype.id;
                    this.nodesMap[this.datatype.id] = this.datatype;
                    newNode.datatype = this.datatype;
                }
                index = processMethodSignature(newNode, this, index);
                this.nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                node = newNode;
                resetModifiers(this);
            } else if (isVariableDeclaration(token)) {
                const newNode = new ApexVariable(((node) ? node.id : 'InitialNode') + '.variable.' + token.textToLower, token.text, token);
                newNode.accessModifier = this.accessModifier;
                newNode.definitionModifier = this.definitionModifier;
                newNode.parentId = (node) ? node.id : undefined;;
                newNode.static = this.staticKeyword;
                newNode.final = this.final;
                newNode.scope = bracketIndent;
                newNode.endToken = token;
                if (this.annotation) {
                    this.annotation.parentId = newNode.id;
                    this.annotation.id = newNode.id + '.' + this.annotation.id;
                    this.nodesMap[this.annotation.id] = this.annotation;
                    newNode.annotation = this.annotation;
                }
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template))
                        newNode.comment.processComment(this.systemData.template);
                }
                if (this.datatype) {
                    this.datatype.parentId = newNode.id;
                    this.datatype.id = newNode.id + '.' + this.datatype.id;
                    this.nodesMap[this.datatype.id] = this.datatype;
                    newNode.datatype = this.datatype;
                }
                this.nodesMap[newNode.id] = newNode;
                if (node)
                    node.addChild(newNode);
                else if (this.declarationOnly) {
                    node = newNode;
                    break;
                }
                if (nextToken.type === TokenType.PUNCTUATION.COMMA || nextToken.type === TokenType.OPERATOR.ASSIGN.ASSIGN) {
                    index++;
                    for (; index < this.tokensLength; index++) {
                        const auxToken = this.tokens[index];
                        if (auxToken.type === TokenType.PUNCTUATION.SEMICOLON)
                            break;
                        if (auxToken.type === TokenType.BRACKET.QUERY_START) {
                            index--;
                            break;
                        }
                        if (auxToken.type === TokenType.DECLARATION.ENTITY.VARIABLE || auxToken.type === TokenType.ENTITY.VARIABLE) {
                            let sameLineVar = new ApexVariable(((node) ? node.id : 'InitialNode') + '.variable.' + auxToken.textToLower, auxToken.text, auxToken);
                            sameLineVar.accessModifier = this.accessModifier;
                            sameLineVar.definitionModifier = this.definitionModifier;
                            sameLineVar.parentId = (node) ? node.id : undefined;
                            sameLineVar.static = this.staticKeyword;
                            sameLineVar.final = this.final;
                            sameLineVar.scope = bracketIndent;
                            sameLineVar.endToken = auxToken;
                            const dataTypeNode = new ApexDatatype(this.datatype);
                            dataTypeNode.id = sameLineVar.id + '.datatype.' + dataTypeNode.name;
                            this.nodesMap[dataTypeNode.id] = dataTypeNode;
                            sameLineVar.datatype = dataTypeNode;
                            if (this.annotation) {
                                this.annotation.parentId = newNode.id;
                                this.annotation.id = newNode.id + '.' + this.annotation.id;
                                this.nodesMap[this.annotation.id] = this.annotation;
                                newNode.annotation = this.annotation;
                            }
                            if (this.comment) {
                                this.comment.parentId = newNode.id;
                                this.comment.id = newNode.id + '.' + this.comment.id;
                                this.nodesMap[this.comment.id] = this.comment;
                                newNode.comment = this.comment;
                                if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template))
                                    newNode.comment.processComment(this.systemData.template);
                            }
                            this.nodesMap[sameLineVar.id] = sameLineVar;
                            if (node)
                                node.addChild(sameLineVar);
                        }
                    }
                    this.comment = undefined;
                    this.datatype = undefined;
                    this.annotation = undefined;
                } else {
                    this.comment = undefined;
                    this.datatype = undefined;
                    this.annotation = undefined;
                }
                resetModifiers(this);
            }
        }
        if (node)
            node.positionData = positionData;
        this.node = node;
        return node;
    }

    isPositionOnText() {
        if (this.node && this.node.positionData) {
            return this.node.positionData.onText;
        } else {
            let tokens = this.tokens;
            if (this.filePath && !this.content && (!this.tokens || this.tokens.length === 0)) {
                let content = FileReader.readFileSync(Validator.validateFilePath(this.filePath));
                tokens = Lexer.tokenize(content, this.systemData);
            } else if (this.content && (!this.tokens || this.tokens.length === 0)) {
                tokens = Lexer.tokenize(this.content, this.systemData);

            }
            const tokensLength = tokens.length;
            for (let index = 0; index < tokensLength; index++) {
                const token = new Token(tokens[index]);
                if (token.range.start.isBeforeOrEqual(this.cursorPosition) && token.range.end.isAfterOrEqual(this.cursorPosition) && (token.type === TokenType.PUNCTUATION.QUOTTES_START || token.type === TokenType.PUNCTUATION.QUOTTES_END || token.type === TokenType.LITERAL.STRING))
                    return true;

            }
            return false;
        }
    }

    resolveReferences(node) {
        let nodeToResolve = node || this.node;
        if (!nodeToResolve) {
            nodeToResolve = this.parse();
        }
        if (nodeToResolve && nodeToResolve.extendsType)
            nodeToResolve.extends = resolveDatatypeReference(nodeToResolve.extendsType, this.systemData.userClassesData, this.systemData.namespacesData);
        if (nodeToResolve && nodeToResolve.implementTypes && nodeToResolve.implementTypes.length > 0)
            nodeToResolve.implements = resolveImplements(nodeToResolve.implementTypes, this.systemData.userClassesData, this.systemData.namespacesData);
        return nodeToResolve;
    }

    resolveDatatype(datatype) {
        let resolved = resolveDatatypeReference(datatype, this.systemData.userClassesData, this.systemData.namespacesData);
        if (!resolved && this.systemData && this.systemData.sObjectsData)
            resolved = this.systemData.sObjectsData[datatype.toLowerCase()];
        return resolved;
    }

    static saveClassData(filePath, targetfolder, systemData) {
        return new Promise((resolve, reject) => {
            try {
                if (!FileChecker.isExists(targetfolder))
                    FileWriter.createFolderSync(targetfolder);
                const node = new ApexParser(filePath, systemData).parse();
                if (node) {
                    FileWriter.createFile(targetfolder + '/' + node.name + '.json', JSON.stringify(node, null, 2), function (path, err) {
                        if (!err)
                            resolve(node);
                        else
                            reject(err);
                    });
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    static saveClassDataSync(filePath, targetfolder, systemData) {
        if (!FileChecker.isExists(targetfolder))
            FileWriter.createFolderSync(targetfolder);
        const node = new ApexParser(filePath, systemData).parse();
        if (node)
            FileWriter.createFileSync(targetfolder + '/' + node.name + '.json', JSON.stringify(node, null, 2));
        return node;
    }

    static saveClassesData(filePaths, targetfolder, systemData) {
        return new Promise(async (resolve, reject) => {
            try {
                targetfolder = PathUtils.getAbsolutePath(targetfolder);
                if (!FileChecker.isExists(targetfolder))
                    FileWriter.createFolderSync(targetfolder);
                for (const file of filePaths) {
                    ApexParser.saveClassDataSync(file, targetfolder, systemData);
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    static saveAllClassesData(classesPath, targetfolder, systemData, multiThread) {
        return new Promise((resolve, reject) => {
            try {
                classesPath = Validator.validateFolderPath(classesPath);
                const files = FileReader.readDirSync(classesPath, {
                    onlyFiles: true,
                    absolutePath: true,
                    extensions: ['.cls']
                });
                let increment = calculateIncrement(files);
                let percentage;
                const batchesToProcess = getBatches(files, multiThread);
                for (const batch of batchesToProcess) {
                    ApexParser.saveClassesData(batch.records, targetfolder, systemData).then(() => {
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
module.exports = ApexParser;

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
    const systemMetadata = namespacesData ? namespacesData['system'] : undefined;
    datatype = cleanDatatype(datatype);
    if (StrUtils.contains(datatype, '.')) {
        let splits = datatype.split('.');
        if (splits.length === 2) {
            let parentClassOrNs = splits[0];
            className = splits[1];
            if (classes && classes[parentClassOrNs]) {
                extendsObject = classes[parentClassOrNs]
            } else if (namespacesData && namespacesData[parentClassOrNs]) {
                let namespaceData = namespacesData[parentClassOrNs];
                if (namespaceData[className])
                    extendsObject = namespaceData[className];
            }
            if (!extendsObject && systemMetadata && systemMetadata[parentClassOrNs]) {
                extendsObject = systemMetadata[parentClassOrNs];
            }
        } else if (splits.length > 2) {
            let nsName = splits[0];
            let parentClassName = splits[1];
            className = splits[2];
            if (classes && classes[parentClassName]) {
                extendsObject = classes[parentClassName];
            } else if (namespacesData && namespacesData[nsName]) {
                let namespaceData = namespacesData[nsName];
                if (namespaceData[parentClassName])
                    extendsObject = namespaceData[parentClassName];
            }
            if (!extendsObject && systemMetadata && systemMetadata[className]) {
                extendsObject = systemMetadata[className];
            }
        }
    } else {
        if (classes && classes[datatype]) {
            extendsObject = classes[datatype];
        } else if (systemMetadata && systemMetadata[datatype]) {
            extendsObject = systemMetadata[datatype];
        }
    }
    if (extendsObject && className) {
        extendsObject = extendsObject.classes[className] || extendsObject.interfaces[className] || extendsObject.enums[className];
    }
    if (extendsObject) {
        if (extendsObject.extendsType)
            extendsObject.extends = resolveDatatypeReference(extendsObject.extendsType, classes, namespacesData);
        if (extendsObject.implementTypes && extendsObject.implementTypes.length > 0)
            extendsObject.implements = resolveImplements(extendsObject.implementTypes, classes, namespacesData);
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

function resetModifiers(parser) {
    parser.accessModifier = undefined;
    parser.definitionModifier = undefined;
    parser.sharingModifier = undefined;
    parser.staticKeyword = undefined;
    parser.final = undefined;
    parser.override = undefined;
    parser.transient = undefined;
    parser.testMethod = undefined;
    parser.annotation = undefined;
    parser.datatype = undefined;
    parser.comment = undefined;
    parser.webservice = undefined;
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

function isOnTrigger(token) {
    return token.type === TokenType.KEYWORD.DECLARATION.TRIGGER;
}

function isQuery(token, lastToken) {
    if (token.type === TokenType.BRACKET.QUERY_START)
        return true;
    if (lastToken && lastToken.type === TokenType.PUNCTUATION.QUOTTES_START && token.textToLower === 'select')
        return true;
    return false;
}

function processQuery(tokens, index, position, node) {
    const len = tokens.length;
    let token = tokens[index];
    let lastToken = LangUtils.getLastToken(tokens, index);
    let isDynamic = (lastToken && lastToken.type === TokenType.PUNCTUATION.QUOTTES_START && token.textToLower === 'select');
    let nodeId;
    let nodeName;
    let positionData;
    if (node.type === ApexNodeType.SOQL) {

    } else {
        nodeId = node.id + '.query.' + node.queries.length, 'query.' + node.queries.length;
        nodeName = 'query.' + node.queries.length;
    }
    const query = new SOQLQuery(nodeId, nodeName, (isDynamic) ? lastToken : token);
    if (!isDynamic)
        index++;
    let onProjection = false;
    let field = '';
    let fieldStartToken;
    for (; index < len; index++) {
        lastToken = LangUtils.getLastToken(tokens, index);
        token = tokens[index];
        const nextToken = LangUtils.getNextToken(tokens, index);
        if (position && query && !positionData) {
            if (LangUtils.isOnPosition(token, lastToken, nextToken, position)) {
                const startIndex = position.character - token.range.start.character;
                const startPart = token.text.substring(0, startIndex + 1);
                const endPart = token.text.substring(startIndex + 1);
                positionData = new PositionData(startPart, endPart, query.nodeType, query.id, 'Apex');
                positionData.onText = token.type === TokenType.PUNCTUATION.QUOTTES_START || token.type === TokenType.PUNCTUATION.QUOTTES_END || token.type === TokenType.LITERAL.STRING;
            }
        }
        if (!isDynamic) {
            if (token.type === TokenType.QUERY.CLAUSE.FROM) {
                if (field) {
                    query.projection.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                    field = '';
                    fieldStartToken = undefined;
                }
                onProjection = false;
                query.from = nextToken;
            } else if (token.type === TokenType.QUERY.CLAUSE.SELECT) {
                onProjection = true;
            } else if (token.type === TokenType.BRACKET.QUERY_END || token.type === TokenType.BRACKET.INNER_QUERY_END) {
                query.endToken = token;
                break;
            } else if (onProjection) {
                if (token.type === TokenType.PUNCTUATION.COMMA) {
                    query.projection.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                    field = '';
                    fieldStartToken = undefined;
                } else if (isQuery(token, lastToken)) {
                    const data = processQuery(tokens, index, position, query);
                    index = data.index;
                    query.projection.push(data.query);
                    if (data.positionData && !positionData) {
                        positionData = data.positionData;
                    }
                } else {
                    field += token.text;
                    if (!fieldStartToken)
                        fieldStartToken = token;
                }
            }
        } else {
            if (token.textToLower === 'from') {
                if (field) {
                    query.projection.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                    field = '';
                    fieldStartToken = undefined;
                }
                onProjection = false;
                query.from = nextToken;
            } else if (token.textToLower === 'select') {
                onProjection = true;
            } else if (token.type === TokenType.PUNCTUATION.QUOTTES_END) {
                query.endToken = token;
                break;
            } else if (onProjection) {
                if (token.textToLower === ',') {
                    query.projection.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                    field = '';
                    fieldStartToken = undefined;
                } else if (isQuery(token, lastToken)) {
                    const data = processQuery(tokens, index, position, query);
                    index = data.index;
                    query.projection.push(data.query);
                    if (data.positionData && !positionData) {
                        positionData = data.positionData;
                    }
                } else {
                    field += token.text;
                    if (!fieldStartToken)
                        fieldStartToken = token;
                }
            }
        }
    }
    if (positionData)
        positionData.query = query;
    return {
        query: query,
        positionData: positionData,
        index: index
    };
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
    let aBracketIndent = 0;
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

function processTrigger(tokens, index, node) {
    const len = tokens.length;
    for (; index < len; index++) {
        const lastToken = LangUtils.getLastToken(tokens, index);
        const token = tokens[index];
        if (token.type === TokenType.BRACKET.TRIGGER_GUARD_CLOSE) {
            break;
        }
        if (lastToken && lastToken.type === TokenType.DATABASE.TRIGGER_EXEC) {
            if (lastToken.textToLower === 'before') {
                if (token.textToLower === 'insert')
                    node.beforeInsert = true;
                if (token.textToLower === 'update')
                    node.beforeUpdate = true;
                if (token.textToLower === 'delete')
                    node.beforeDelete = true;
                if (token.textToLower === 'undelete')
                    node.beforeUndelete = true;

            } else if (lastToken.textToLower === 'after') {
                if (token.textToLower === 'insert')
                    node.afterInsert = true;
                if (token.textToLower === 'update')
                    node.afterUpdate = true;
                if (token.textToLower === 'delete')
                    node.afterDelete = true;
                if (token.textToLower === 'undelete')
                    node.afterUndelete = true;
            }
        }
    }
    return index;
}

function processMethodSignature(node, parser, index) {
    index++;
    let datatype;
    let paramName;
    let methodParams = [];
    let types = [];
    let params = [];
    const len = parser.tokens.length;
    let final = undefined;
    for (; index < len; index++) {
        const token = parser.tokens[index];
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
        if (isFinal(token)) {
            final = token;
        } else if (!paramName && isDatatype(token)) {
            let newNode = new ApexDatatype(node.id + '.datatype.', '', token);
            index = processDatatype(newNode, parser, index);
            newNode.parentId = (node) ? node.id : undefined;;
            datatype = newNode;
        } else if (datatype && paramName && (token.type === TokenType.PUNCTUATION.COMMA || token.type === TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE)) {
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
        } else if (datatype) {
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
    if (node.nodeType === ApexNodeType.METHOD && node.testMethod) {
        signature += node.testMethod.textToLower + ' ';
    }
    if (node.nodeType === ApexNodeType.METHOD && node.webservice) {
        signature += node.webservice.textToLower + ' ';
        overrideSignature += node.webservice.textToLower + ' ';
    }
    if (node.nodeType === ApexNodeType.METHOD && node.static) {
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
        parser.nodesMap[param.datatype.id] = param.datatype;
        newNode.parentId = (node) ? node.id : undefined;;
        newNode.datatype = param.datatype;
        newNode.final = param.final;
        newNode.endToken = param.name;
        newNode.scope = node.scope + 1;
        parser.nodesMap[newNode.id] = newNode;
        if (node)
            node.addParam(newNode);
    }
    index--;
    return index;
}

function processAnnotation(node, parser, index) {
    const len = parser.tokens.length;
    for (; index < len; index++) {
        const token = parser.tokens[index];
        if (token.type === TokenType.ANNOTATION.NAME || token.type === TokenType.BRACKET.ANNOTATION_PARAM_OPEN || token.type === TokenType.BRACKET.ANNOTATION_PARAM_CLOSE || token.type === TokenType.ANNOTATION.ENTITY) {
            node.addToken(token);
        } else {
            break;
        }
    }
    return index;
}

function processCommentBlock(node, parser, index) {
    const len = parser.tokens.length;
    for (; index < len; index++) {
        const token = parser.tokens[index];
        if (!closeCommentBlock(token)) {
            node.addToken(token);
        } else {
            node.addToken(token);
            break;
        }
    }
    return index;
}

function processCommentLine(node, parser, index) {
    const len = parser.tokens.length;
    for (; index < len; index++) {
        const token = parser.tokens[index];
        if (token.type === TokenType.COMMENT.LINE || token.type === TokenType.COMMENT.LINE_DOC || token.type === TokenType.COMMENT.CONTENT) {
            node.addToken(token);
        } else {
            break;
        }
    }
    index--;
    return index;
}

function processDatatype(node, parser, index) {
    let bracketIndent = 0;
    let datatype = '';
    const len = parser.tokens.length;
    for (; index < len; index++) {
        const token = parser.tokens[index];
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
/*
function callProgressCalback(progressCallback, stage, file, data) {
    if (progressCallback)
        progressCallback.call(this, {
            stage: stage,
            increment: increment,
            percentage: MathUtils.round(percentage, 2),
            file: file,
            data: data
        });
}*/