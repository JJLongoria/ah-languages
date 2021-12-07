import { ApexAnnotation, ApexClass, ApexComment, ApexCommentBlock, ApexConstructor, ApexDatatype, ApexDeclarationNode, ApexEnum, ApexGetter, ApexInitializer, ApexInterface, ApexMethod, ApexNode, ApexNodeTypes, ApexProperty, ApexSetter, ApexStaticConstructor, ApexTokenTypes, ApexTrigger, ApexVariable, CoreUtils, FileChecker, FileReader, FileWriter, ParserData, PathUtils, Position, PositionData, SObject, SOQLField, SOQLQuery, Token } from "@aurahelper/core";
import { LanguageUtils } from "../utils/languageUtils";
import { ApexTokenizer } from "./tokenizer";

const Utils = CoreUtils.Utils;
const Validator = CoreUtils.Validator;
const StrUtils = CoreUtils.StrUtils;
const OSUtils = CoreUtils.OSUtils;
const MathUtils = CoreUtils.MathUtils;

/**
 * Class to parse an Apex Class file, content or tokens to extract the class information like fields, methods, variables, constructors, inner classes... and much more.
 */
export class ApexParser {

    systemData?: ParserData;
    tokens: Token[];
    tokensLength: number;
    filePath?: string;
    content: string | undefined;
    nodesMap: { [key: string]: any };
    accessModifier?: Token;
    definitionModifier?: Token;
    sharingModifier?: Token;
    staticKeyword?: Token;
    webservice?: Token;
    final?: Token;
    override?: Token;
    transient?: Token;
    testMethod?: Token;
    annotation?: ApexAnnotation;
    comment?: ApexComment | ApexCommentBlock;
    datatype?: ApexDatatype;
    cursorPosition?: Position;
    declarationOnly: boolean;
    nComments: number;
    nAnnotations: number;
    node?: ApexTrigger | ApexClass | ApexInterface | ApexEnum;
    tabSize: number;

    /**
     * Create Apex Parser instance to parse Apex Files
     * @param {string | Token[]} [filePathOrTokens] File path or file tokens (tokenized with ApexTokenizer class)
     * @param {ParserData} [systemData] Parser Data object with data from Project and Salesforce to identify tokens with more precission 
     */
    constructor(filePathOrTokens?: string | Token[], systemData?: ParserData) {
        this.systemData = systemData;
        if (typeof filePathOrTokens !== 'string') {
            this.tokens = filePathOrTokens || [];
        } else {
            this.tokens = [];
            this.filePath = filePathOrTokens;
        }
        this.tokensLength = this.tokens.length;
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
        this.tabSize = 4;
    }

    /**
     * Method to set the tab size
     * @param {number} tabSize Tab size value
     * @returns {ApexParser} Returns the ApexParser instance
     */
    setTabSize(tabSize: number): ApexParser {
        this.tabSize = tabSize;
        return this;
    }

    /**
     * Method to set apex file tokens (tokenized with ApexTokenizer class)
     * @param {Token[]} tokens Apex file tokens
     * @returns {ApexParser} Returns the ApexParser instance
     */
    setTokens(tokens: Token[]): ApexParser {
        this.tokens = tokens;
        this.tokensLength = this.tokens.length;
        return this;
    }

    /**
     * Method to set Parser Data object with data from Project and Salesforce to identify tokens with more precission
     * @param {ParserData} systemData Parser data object
     * @returns {ApexParser} Returns the ApexParser instance
     */
    setSystemData(systemData: ParserData): ApexParser {
        this.systemData = systemData;
        return this;
    }

    /**
     * Method to set the file path
     * @param {string} filePath file path value
     * @returns {ApexParser} Returns the ApexParser instance
     */
    setFilePath(filePath: string): ApexParser {
        this.filePath = filePath;
        return this;
    }

    /**
     * Method to set apex file content
     * @param {string} content file content value
     * @returns {ApexParser} Returns the ApexParser instance
     */
    setContent(content: string): ApexParser {
        this.content = content;
        return this;
    }

    /**
     * Method to set the cursor position to get PositionData with parsed node 
     * @param {Position} position Position object with cursor position data
     * @returns {ApexParser} Returns the ApexParser instance
     */
    setCursorPosition(position: Position): ApexParser {
        this.cursorPosition = position;
        return this;
    }

    /**
     * Method to indicate to parser to analize only the next declaration from cursor position
     * @param {boolean} declarationOnly True to analize declaration only, false to parse entire file 
     * @returns {ApexParser} Returns the ApexParser instance
     */
    isDeclarationOnly(declarationOnly: boolean): ApexParser {
        this.declarationOnly = (declarationOnly !== undefined && Utils.isBoolean(declarationOnly)) ? declarationOnly : false;
        return this;
    }

    /**
     * Method to get the file tokens
     * @returns {token[]} Return file tokens
     */
    getTokens() {
        return this.tokens;
    }

    /**
     * Method to parse Apex file and get Node information
     * @returns {ApexTrigger | ApexClass | ApexInterface | ApexEnum} Return the Apex Node from the parsed file
     */
    parse(): ApexTrigger | ApexClass | ApexInterface | ApexEnum {
        if (this.node) {
            return this.node;
        }
        if (this.filePath && !this.content && (!this.tokens || this.tokens.length === 0)) {
            this.content = FileReader.readFileSync(Validator.validateFilePath(this.filePath));
            this.tokens = ApexTokenizer.tokenize(this.content, this.systemData, this.tabSize);
            this.tokensLength = this.tokens.length;
        } else if (this.content && (!this.tokens || this.tokens.length === 0)) {
            this.tokens = ApexTokenizer.tokenize(this.content, this.systemData, this.tabSize);
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
            const lastToken = LanguageUtils.getLastToken(this.tokens, index);
            const token = new Token(this.tokens[index]);
            const nextToken = LanguageUtils.getNextToken(this.tokens, index);
            const twoNextToken = LanguageUtils.getTwoNextToken(this.tokens, index);
            const twoLastToken = LanguageUtils.getTwoLastToken(this.tokens, index);
            const parentToken = (token.parentToken !== undefined && token.parentToken !== -1) ? new Token(this.tokens[token.parentToken]) : undefined;
            const pairToken = (token.pairToken !== undefined) ? new Token(this.tokens[token.pairToken]) : undefined;
            if (token.range.start.line < startLine) {
                continue;
            }
            if (this.cursorPosition && node && !positionData) {
                if (LanguageUtils.isOnPosition(token, lastToken, nextToken, this.cursorPosition)) {
                    const startIndex = this.cursorPosition.character - token.range.start.character;
                    const startPart = token.text.substring(0, startIndex + 1);
                    const endPart = token.text.substring(startIndex + 1);
                    positionData = new PositionData(startPart, endPart, node.nodeType, node.id, 'Apex');
                    positionData.onText = token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_START || token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_END || token.type === ApexTokenTypes.LITERAL.STRING;
                    positionData.signature = node.simplifiedSignature || node.signature;
                    positionData.parentName = node.parentName;
                    positionData.token = token;
                    positionData.nextToken = nextToken;
                    positionData.twoNextToken = twoNextToken;
                    positionData.lastToken = lastToken;
                    positionData.twoLastToken = twoLastToken;
                }
            }
            if (openBracket(token)) {
                if (this.declarationOnly && node.nodeType !== ApexNodeTypes.PROPERTY) {
                    break;
                }
                if (!node.startToken) {
                    node.startToken = token;
                }
                bracketIndent++;
                if (isInitializer(token)) {
                    const newNode: ApexInitializer = new ApexInitializer(((node) ? node.id : 'InitialNode') + '.initializer', 'Initializer', token);
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
                        if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template)) {
                            newNode.comment.processComment(this.systemData.template);
                        }
                        this.comment = undefined;
                        if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                            positionData.parentName = newNode.name;
                        }
                    }
                    this.nodesMap[newNode.id] = newNode;
                    if (node) {
                        node.addChild(newNode);
                    }
                    node = newNode;
                    resetModifiers(this);
                }
            } else if (closeBracket(token)) {
                bracketIndent--;
                if (this.declarationOnly && bracketIndent === 0) {
                    break;
                }
                if (node) {
                    if (!token.isAux) {
                        node.endToken = token;
                    }
                    if (node.parentId) {
                        let initializer = false;
                        if (pairToken && token.pairToken) {
                            const auxLastPairToken = LanguageUtils.getLastToken(this.tokens, token.pairToken);
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
            } else if (token.type === ApexTokenTypes.PUNCTUATION.SEMICOLON) {
                if (node && node.parentId) {
                    if ((node.nodeType === ApexNodeTypes.GETTER || node.nodeType === ApexNodeTypes.SETTER) && lastToken && (lastToken.type === ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_GETTER || lastToken.type === ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_SETTER)) {
                        if (!node.startToken) {
                            node.startToken = token;
                        }
                        if (!node.endToken) {
                            node.endToken = token;
                        }
                        node = this.nodesMap[node.parentId];
                    } else if ((node.nodeType === ApexNodeTypes.CONSTRUCTOR || node.nodeType === ApexNodeTypes.METHOD) && lastToken && lastToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE) {
                        if (!node.startToken) {
                            node.startToken = token;
                        }
                        if (!node.endToken) {
                            node.endToken = token;
                        }
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
                index = processCommentLine(newNode, this, index, this.cursorPosition);
                if (newNode.positionData) {
                    positionData = newNode.positionData;
                    newNode.positionData = undefined;
                    positionData.parentName = node.name;
                }
                this.comment = newNode;
                this.nComments++;
            } else if (openCommentBlock(token)) {
                const newNode = new ApexCommentBlock('comment.' + this.nComments, 'BlockComment.' + this.nComments, token);
                index = processCommentBlock(newNode, this, index, this.cursorPosition);
                if (newNode.positionData) {
                    positionData = newNode.positionData;
                    newNode.positionData = undefined;
                    positionData.parentName = node.name;
                }
                this.comment = newNode;
                this.nComments++;
            } else if (isAnnotation(token)) {
                const newNode = new ApexAnnotation('annotation.' + this.nAnnotations, token.text, token);
                index = processAnnotation(newNode, this, index);
                this.annotation = newNode;
                this.nAnnotations++;
            } else if (isClass(token)) {
                const newNode: ApexClass = new ApexClass(((node) ? node.id : 'InitialNode') + '.class.' + token.textToLower, token.text);
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
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template)) {
                        newNode.comment.processComment(this.systemData.template);
                    }
                    this.comment = undefined;
                    if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                        positionData.parentName = newNode.name;
                    }
                }
                this.nodesMap[newNode.id] = newNode;
                if (node) {
                    node.addChild(newNode);
                }
                node = newNode;
                resetModifiers(this);
            } else if (isInterface(token)) {
                const newNode: ApexInterface = new ApexInterface(((node) ? node.id : 'InitialNode') + '.interface.' + token.textToLower, token.text);
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
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template)) {
                        newNode.comment.processComment(this.systemData.template);
                    }
                    this.comment = undefined;
                    if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                        positionData.parentName = newNode.name;
                    }
                }
                this.nodesMap[newNode.id] = newNode;
                if (node) {
                    node.addChild(newNode);
                }
                node = newNode;
                resetModifiers(this);
            } else if (isEnum(token)) {
                const newNode: ApexEnum = new ApexEnum(((node) ? node.id : 'InitialNode') + '.enum.' + token.textToLower, token.text);
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
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template)) {
                        newNode.comment.processComment(this.systemData.template);
                    }
                    this.comment = undefined;
                    if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                        positionData.parentName = newNode.name;
                    }
                }
                this.nodesMap[newNode.id] = newNode;
                if (node) {
                    node.addChild(newNode);
                }
                node = newNode;
                resetModifiers(this);
            } else if (isOnTrigger(token)) {
                const newNode: ApexTrigger = new ApexTrigger(((node) ? node.id : 'InitialNode') + '.trigger.', nextToken!.text);
                index = processTrigger(this.tokens, index, newNode);
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template)) {
                        newNode.comment.processComment(this.systemData.template);
                    }
                    this.comment = undefined;
                    if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                        positionData.parentName = newNode.name;
                    }
                }
                this.nodesMap[newNode.id] = newNode;
                if (node) {
                    node.addChild(newNode);
                }
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
                if (node) {
                    node.addChild(token);
                }
            } else if (isQuery(token, lastToken)) {
                const data = processQuery(this.tokens, index, this.cursorPosition, node);
                index = data.index;
                if (data.positionData && !positionData) {
                    positionData = data.positionData;
                }
                if (node && data.query) {
                    node.addChild(data.query);
                }
            } else if (isProperty(token)) {
                const newNode: ApexProperty = new ApexProperty(((node) ? node.id : 'InitialNode') + '.property.' + token.textToLower, token.text);
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
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template)) {
                        newNode.comment.processComment(this.systemData.template);
                    }
                    this.comment = undefined;
                    if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                        positionData.parentName = newNode.name;
                    }
                }
                if (this.datatype) {
                    this.datatype.parentId = newNode.id;
                    this.datatype.id = newNode.id + '.' + this.datatype.id;
                    this.nodesMap[this.datatype.id] = this.datatype;
                    newNode.datatype = this.datatype;
                    this.datatype = undefined;
                    if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                        positionData.parentName = newNode.name;
                    }
                }
                this.nodesMap[newNode.id] = newNode;
                if (node) {
                    node.addChild(newNode);
                }
                node = newNode;
                resetModifiers(this);
            } else if (isGetterAccessor(token)) {
                const newNode: ApexGetter = new ApexGetter(((node) ? node.id : 'InitialNode') + '.getter.' + token.textToLower, token.text);
                newNode.parentId = (node) ? node.id : undefined;
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    this.comment = undefined;
                    if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                        positionData.parentName = newNode.name;
                    }
                }
                this.nodesMap[newNode.id] = newNode;
                if (node) {
                    node.addChild(newNode);
                }
                node = newNode;
                resetModifiers(this);
            } else if (isSetterAccessor(token)) {
                const newNode: ApexSetter = new ApexSetter(((node) ? node.id : 'InitialNode') + '.setter.' + token.textToLower, token.text);
                newNode.parentId = (node) ? node.id : undefined;
                if (this.comment) {
                    this.comment.parentId = newNode.id;
                    this.comment.id = newNode.id + '.' + this.comment.id;
                    this.nodesMap[this.comment.id] = this.comment;
                    newNode.comment = this.comment;
                    this.comment = undefined;
                    if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                        positionData.parentName = newNode.name;
                    }
                }
                this.nodesMap[newNode.id] = newNode;
                if (node) {
                    node.addChild(newNode);
                }
                node = newNode;
                resetModifiers(this);
            } else if (isDatatype(token)) {
                const newNode: ApexDatatype = new ApexDatatype('datatype.', '', token);
                index = processDatatype(newNode, this, index);
                if (newNode.positionData) {
                    positionData = newNode.positionData;
                    newNode.positionData = undefined;
                    positionData.nodeType = (node) ? node.nodeType : undefined;
                    positionData.signature = (node) ? node.simplifiedSignature || node.signature : undefined;
                    positionData.parentName = (node) ? node.name : undefined;
                }
                this.datatype = newNode;
            } else if (isStaticConstructorDeclaration(token)) {
                const newNode: ApexStaticConstructor = new ApexStaticConstructor(((node) ? node.id : 'InitialNode') + '.staticConstructor.' + token.textToLower, token.text);
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
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template)) {
                        newNode.comment.processComment(this.systemData.template);
                    }
                    this.comment = undefined;
                    if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                        positionData.parentName = newNode.name;
                    }
                }
                this.nodesMap[newNode.id] = newNode;
                if (node) {
                    node.addChild(newNode);
                }
                node = newNode;
                resetModifiers(this);
            } else if (isConstructorDeclaration(token)) {
                const newNode: ApexConstructor = new ApexConstructor(((node) ? node.id : 'InitialNode') + '.constructor.' + token.textToLower, token.text);
                newNode.accessModifier = this.accessModifier;
                newNode.definitionModifier = this.definitionModifier;
                newNode.parentId = (node) ? node.id : undefined;;
                newNode.webservice = this.webservice;
                newNode.override = this.override;
                newNode.scope = bracketIndent;
                index = processMethodSignature(newNode, this, index);
                if (newNode.positionData) {
                    positionData = newNode.positionData;
                    newNode.positionData = undefined;
                    positionData.parentName = node.name;
                }
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
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template)) {
                        newNode.comment.processComment(this.systemData.template);
                    }
                    this.comment = undefined;
                    if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                        positionData.parentName = newNode.name;
                        positionData.signature = newNode.simplifiedSignature;
                    }
                }
                this.nodesMap[newNode.id] = newNode;
                if (node) {
                    node.addChild(newNode);
                }
                node = newNode;
                resetModifiers(this);
            } else if (isMethodDeclaration(token)) {
                const newNode: ApexMethod = new ApexMethod(((node) ? node.id : 'InitialNode') + '.method.' + token.textToLower, token.text);
                newNode.accessModifier = this.accessModifier;
                newNode.definitionModifier = this.definitionModifier;
                newNode.parentId = (node) ? node.id : undefined;;
                newNode.webservice = this.webservice;
                newNode.static = this.staticKeyword;
                newNode.final = this.final;
                newNode.testMethod = this.testMethod;
                newNode.override = this.override;
                newNode.scope = bracketIndent;
                if (this.datatype) {
                    this.datatype.parentId = newNode.id;
                    this.datatype.id = newNode.id + '.' + this.datatype.id;
                    this.nodesMap[this.datatype.id] = this.datatype;
                    newNode.datatype = this.datatype;
                }
                index = processMethodSignature(newNode, this, index);
                if (newNode.positionData) {
                    positionData = newNode.positionData;
                    newNode.positionData = undefined;
                    positionData.parentName = node.name;
                }
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
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template)) {
                        newNode.comment.processComment(this.systemData.template);
                    }
                    this.comment = undefined;
                    if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                        positionData.parentName = newNode.name;
                        positionData.signature = newNode.simplifiedSignature;
                    }
                }
                this.nodesMap[newNode.id] = newNode;
                if (node) {
                    node.addChild(newNode);
                }
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
                    if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template)) {
                        newNode.comment.processComment(this.systemData.template);
                    }
                    if (positionData && (positionData.nodeType === ApexNodeTypes.BLOCK_COMMENT || positionData.nodeType === ApexNodeTypes.COMMENT)) {
                        positionData.parentName = newNode.name;
                    }
                }
                if (this.datatype) {
                    this.datatype.parentId = newNode.id;
                    this.datatype.id = newNode.id + '.' + this.datatype.id;
                    this.nodesMap[this.datatype.id] = this.datatype;
                    newNode.datatype = this.datatype;
                }
                this.nodesMap[newNode.id] = newNode;
                if (node) {
                    node.addChild(newNode);
                }
                else if (this.declarationOnly) {
                    node = newNode;
                    break;
                }
                if (this.cursorPosition && node && !positionData) {
                    if (LanguageUtils.isOnPosition(token, lastToken, nextToken, this.cursorPosition)) {
                        const startIndex = this.cursorPosition.character - token.range.start.character;
                        const startPart = token.text.substring(0, startIndex + 1);
                        const endPart = token.text.substring(startIndex + 1);
                        positionData = new PositionData(startPart, endPart, node.nodeType, node.id, 'Apex');
                        positionData.onText = token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_START || token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_END || token.type === ApexTokenTypes.LITERAL.STRING;
                        positionData.signature = node.simplifiedSignature || node.signature;
                        positionData.parentName = node.name;
                        positionData.token = token;
                        positionData.nextToken = nextToken;
                        positionData.twoNextToken = twoNextToken;
                        positionData.lastToken = lastToken;
                        positionData.twoLastToken = twoLastToken;
                    }
                }
                if (nextToken && (nextToken.type === ApexTokenTypes.PUNCTUATION.COMMA || nextToken.type === ApexTokenTypes.OPERATOR.ASSIGN.ASSIGN)) {
                    index++;
                    let paramIndent = 0;
                    for (; index < this.tokensLength; index++) {
                        const auxToken = this.tokens[index];
                        const nextTokenAux = LanguageUtils.getNextToken(this.tokens, index);
                        const lastTokenAux = LanguageUtils.getLastToken(this.tokens, index);
                        const twoNextTokenAux = LanguageUtils.getTwoNextToken(this.tokens, index);
                        const twoLastTokenAux = LanguageUtils.getTwoLastToken(this.tokens, index);
                        if (this.cursorPosition && node && !positionData) {
                            if (LanguageUtils.isOnPosition(token, lastTokenAux, nextTokenAux, this.cursorPosition)) {
                                const startIndex = this.cursorPosition.character - token.range.start.character;
                                const startPart = token.text.substring(0, startIndex + 1);
                                const endPart = token.text.substring(startIndex + 1);
                                positionData = new PositionData(startPart, endPart, node.nodeType, node.id, 'Apex');
                                positionData.onText = token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_START || token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_END || token.type === ApexTokenTypes.LITERAL.STRING;
                                positionData.signature = node.simplifiedSignature || node.signature;
                                positionData.parentName = node.name;
                                positionData.token = token;
                                positionData.nextToken = nextToken;
                                positionData.twoNextToken = twoNextTokenAux;
                                positionData.lastToken = lastToken;
                                positionData.twoLastToken = twoLastTokenAux;
                            }
                        }
                        if (auxToken.type === ApexTokenTypes.PUNCTUATION.SEMICOLON) {
                            break;
                        }
                        if (auxToken.type === ApexTokenTypes.BRACKET.QUERY_START) {
                            index--;
                            break;
                        }
                        if (auxToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN) {
                            paramIndent++;
                        } else if (auxToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_CLOSE) {
                            paramIndent--;
                        }
                        if (paramIndent === 0 && (auxToken.type === ApexTokenTypes.DECLARATION.ENTITY.VARIABLE || auxToken.type === ApexTokenTypes.ENTITY.VARIABLE)) {
                            if (lastTokenAux && lastTokenAux.type === ApexTokenTypes.OPERATOR.ASSIGN.ASSIGN) {
                                continue;
                            }
                            let sameLineVar = new ApexVariable(((node) ? node.id : 'InitialNode') + '.variable.' + auxToken.textToLower, auxToken.text, auxToken);
                            sameLineVar.accessModifier = this.accessModifier;
                            sameLineVar.definitionModifier = this.definitionModifier;
                            sameLineVar.parentId = (node) ? node.id : undefined;
                            sameLineVar.static = this.staticKeyword;
                            sameLineVar.final = this.final;
                            sameLineVar.scope = bracketIndent;
                            sameLineVar.endToken = auxToken;
                            const dataTypeNode = (this.datatype) ? new ApexDatatype(this.datatype) : new ApexDatatype('');
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
                                if (!this.declarationOnly && this.systemData && this.systemData.template && Utils.hasKeys(this.systemData.template)) {
                                    newNode.comment.processComment(this.systemData.template);
                                }
                            }
                            this.nodesMap[sameLineVar.id] = sameLineVar;
                            if (node) {
                                node.addChild(sameLineVar);
                            }
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
        if (node) {
            node.positionData = positionData;

        }
        this.node = node;
        return node;
    }

    /**
     * Method to resolve resolve extend and implement references from Apex Class or Apex Interface
     * @param {ApexClass | ApexInterface} node Node to resolve references 
     * @returns 
     */
    resolveReferences(node?: ApexClass | ApexInterface) {
        let nodeToResolve = node || this.node;
        if (!nodeToResolve) {
            nodeToResolve = this.parse();
        }
        if (nodeToResolve instanceof ApexClass || nodeToResolve instanceof ApexClass) {
            if (nodeToResolve && nodeToResolve.extendsType) {
                const resolved = resolveDatatypeReference(nodeToResolve.extendsType, this.systemData!.userClassesData, this.systemData!.namespacesData);
                if (resolved instanceof ApexClass || resolved instanceof ApexInterface) {
                    nodeToResolve.extends = resolved;
                }
            }
            if (nodeToResolve && nodeToResolve.implementTypes && nodeToResolve.implementTypes.length > 0) {
                const resolved = resolveImplements(nodeToResolve.implementTypes, this.systemData!.userClassesData, this.systemData!.namespacesData);
                const implementTypes: { [key: string]: ApexInterface } = {};
                if (resolved) {
                    for (const key of Object.keys(resolved)) {
                        const resolvedType = resolved[key];
                        if (resolvedType instanceof ApexInterface) {
                            implementTypes[key] = resolvedType;
                        }
                    }
                }
                nodeToResolve.implements = implementTypes;
            }
        }
        return nodeToResolve;
    }

    /**
     * Method to resolve a datatype reference to get the Class, interface, SObject or other datatype
     * @param {string} datatype Datatype to resolve 
     * @returns {ApexClass | ApexInterface | ApexEnum | SObject | undefined} Return the resolved datatype or undefined if cant resolve it
     */
    resolveDatatype(datatype: string): ApexClass | ApexInterface | ApexEnum | SObject | undefined {
        let resolved = resolveDatatypeReference(datatype, this.systemData!.userClassesData, this.systemData!.namespacesData);
        if (!resolved && this.systemData && this.systemData.sObjectsData) {
            resolved = this.systemData.sObjectsData[datatype.toLowerCase()];
        }
        return resolved;
    }

    /**
     * Static method to parse and save the specified class data on async mode
     * @param {string} filePath Apex file path
     * @param {string} targetfolder Target folder to save
     * @param {ParserData} [systemData] Parser Data object with data from Project and Salesforce to identify tokens with more precission 
     * @returns {Promise<ApexClass | ApexInterface | ApexEnum | ApexTrigger>} Return a promise with the saved node
     */
    static saveClassData(filePath: string, targetfolder: string, systemData?: ParserData): Promise<ApexClass | ApexInterface | ApexEnum | ApexTrigger> {
        return new Promise<ApexClass | ApexInterface | ApexEnum | ApexTrigger>((resolve, reject) => {
            try {
                if (!FileChecker.isExists(targetfolder)) {
                    FileWriter.createFolderSync(targetfolder);
                }
                const node = new ApexParser(filePath, systemData).parse();
                if (node) {
                    FileWriter.createFile(targetfolder + '/' + node.name + '.json', JSON.stringify(node, null, 2), function (err) {
                        if (!err) {
                            resolve(node);
                        } else {
                            reject(err);
                        }
                    });
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Static method to parse and save the specified class data on sync mode
     * @param {string} filePath Apex file path
     * @param {string} targetfolder Target folder to save
     * @param {ParserData} [systemData] Parser Data object with data from Project and Salesforce to identify tokens with more precission 
     * @returns {ApexClass | ApexInterface | ApexEnum | ApexTrigger | undefined} Return a the saved node or undefined if not exists
     */
    static saveClassDataSync(filePath: string, targetfolder: string, systemData?: ParserData): ApexClass | ApexInterface | ApexEnum | ApexTrigger | undefined {
        if (!FileChecker.isExists(targetfolder)) {
            FileWriter.createFolderSync(targetfolder);
        }
        const node = new ApexParser(filePath, systemData).parse();
        if (node) {
            FileWriter.createFileSync(targetfolder + '/' + node.name + '.json', JSON.stringify(node, null, 2));
        }
        return node;
    }

    /**
     * Static method to parse and save the several classes data on async mode 
     * @param {string[]} filePaths File paths to parse and save
     * @param {string} targetfolder Target folder to save
     * @param {ParserData} [systemData] Parser Data object with data from Project and Salesforce to identify tokens with more precission  
     * @returns {Promise<void>} Return an empty promise when finish
     */
    static saveClassesData(filePaths: string[], targetfolder: string, systemData?: ParserData): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                targetfolder = PathUtils.getAbsolutePath(targetfolder);
                if (!FileChecker.isExists(targetfolder)) {
                    FileWriter.createFolderSync(targetfolder);
                }
                for (const file of filePaths) {
                    ApexParser.saveClassDataSync(file, targetfolder, systemData);
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Method to parse and save all classes from a specified folder on async mode
     * @param {string} classesPath Classes folder path
     * @param {string} targetfolder Target folder to save
     * @param {ParserData} [systemData] Parser Data object with data from Project and Salesforce to identify tokens with more precission
     * @param {boolean} [multiThread] True to use several threads to analize classes, false to use single thread.
     * @returns {Promise<void>} Return an empty promise when process finish
     */
    static saveAllClassesData(classesPath: string, targetfolder: string, systemData?: ParserData, multiThread?: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                classesPath = Validator.validateFolderPath(classesPath);
                const files = FileReader.readDirSync(classesPath, {
                    onlyFiles: true,
                    absolutePath: true,
                    extensions: ['.cls']
                });
                if (!files || files.length === 0) {
                    resolve();
                    return;
                }
                let increment = calculateIncrement(files);
                let percentage;
                const batchesToProcess = getBatches(files, multiThread);
                for (const batch of batchesToProcess) {
                    ApexParser.saveClassesData(batch.records, targetfolder, systemData).then(() => {
                        batch.completed = true;
                        let nCompleted = 0;
                        for (const resultBatch of batchesToProcess) {
                            if (resultBatch.completed) {
                                nCompleted++;
                            }
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

    /**
     * Method to check if a class or interface has the specified method
     * @param {ApexClass | ApexInterface} classOrInterface Class or interface to check if method exists
     * @param {ApexMethod} method Method to check
     * @returns {boolean} Return true if method exists, false in otherwise
     */
    static isMethodExists(classOrInterface: ApexClass | ApexInterface, method: ApexMethod): boolean {
        return !Utils.isNull(classOrInterface.methods[method.simplifiedSignature!.toLowerCase()]);
    }

    /**
     * Method to check if a class or interface has the specified constructor
     * @param {ApexClass | ApexInterface} classOrInterface Class or interface to check if constructor exists
     * @param {ApexConstructor} constructor Constructor to check
     * @returns {boolean} Return true if constructor exists, false in otherwise
     */
    static isConstructorExists(classOrInterface: ApexClass | ApexInterface, constructor: ApexConstructor): boolean {
        return !Utils.isNull(classOrInterface.constructors[constructor.simplifiedSignature!.toLowerCase()]);
    }

    /**
     * Method to check if a class or interface has the specified field
     * @param {ApexClass | ApexInterface} classOrInterface Class or interface to check if field exists
     * @param {ApexVariable | ApexProperty} variable Field to check
     * @returns {boolean} Return true if field exists, false in otherwise
     */
    static isFieldExists(classOrInterface: ApexClass | ApexInterface, variable: ApexVariable | ApexProperty): boolean {
        return !Utils.isNull(classOrInterface.methods[variable.name.toLowerCase()]);
    }

    /**
     * Method to check if a class or interface has the specified class
     * @param {ApexClass | ApexInterface} classOrInterface Class or interface to check if class exists
     * @param {ApexClass} apexClass Class to check
     * @returns {boolean} Return true if class exists, false in otherwise
     */
    static isClassExists(classOrInterface: ApexClass | ApexInterface, apexClass: ApexClass): boolean {
        return !Utils.isNull(classOrInterface.classes[apexClass.name.toLowerCase()]);
    }

    /**
     * Method to check if a class or interface has the specified interface
     * @param {ApexClass | ApexInterface} classOrInterface Class or interface to check if interface exists
     * @param {ApexInterface} apexInterface Interface to check
     * @returns {boolean} Return true if interface exists, false in otherwise
     */
    static isInterfaceExists(classOrInterface: ApexClass | ApexInterface, apexInterface: ApexInterface): boolean {
        return !Utils.isNull(classOrInterface.interfaces[apexInterface.name.toLowerCase()]);
    }

    /**
     * Method to check if a class or interface has the specified enum
     * @param {ApexClass | ApexInterface} classOrInterface Class or interface to check if enum exists
     * @param {ApexEnum} apexEnum Enum to check
     * @returns {boolean} Return true if enum exists, false in otherwise
     */
    static isEnumExists(classOrInterface: ApexClass | ApexInterface, apexEnum: ApexEnum): boolean {
        return !Utils.isNull(classOrInterface.enums[apexEnum.name.toLowerCase()]);
    }

    /**
     * Method to check if a class or interface extends from the specified class
     * @param {ApexClass | ApexInterface} classOrInterface Class or interface to check if extends from the specified type
     * @param {ApexClass} extendsType Class to check
     * @returns {boolean} Return true if extends from class, false in otherwise
     */
    static extendsFrom(classOrInterface: ApexClass, extendsType: ApexClass): boolean {
        return !Utils.isNull(classOrInterface.extends) && classOrInterface.extends!.name.toLowerCase() === extendsType.name.toLowerCase();
    }

    /**
     * Method to check if a class or interface implments from the specified interface
     * @param {ApexClass | ApexInterface} classOrInterface Class or interface to check if implements from the specified type
     * @param {ApexInterface} implementsType Interface to check
     * @returns {boolean} Return true if implments from interface, false in otherwise
     */
    static implementsFrom(classOrInterface: ApexClass | ApexInterface, implementsType: ApexInterface): boolean {
        return !Utils.isNull(classOrInterface.implements[implementsType.name.toLowerCase()]);
    }

}

function cleanDatatype(datatype: string) {
    if (StrUtils.contains(datatype, '<')) {
        datatype = datatype.split('<')[0];
    } else if (StrUtils.contains(datatype, '[') && StrUtils.contains(datatype, ']')) {
        datatype = "List";
    }
    return datatype.toLowerCase();
}

function resolveDatatypeReference(datatype: string, classes?: any, namespacesData?: any): ApexClass | ApexInterface | ApexEnum {
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
                extendsObject = classes[parentClassOrNs];
            } else if (namespacesData && namespacesData[parentClassOrNs]) {
                let namespaceData = namespacesData[parentClassOrNs];
                if (namespaceData[className]) {
                    extendsObject = namespaceData[className];
                }
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
                if (namespaceData[parentClassName]) {
                    extendsObject = namespaceData[parentClassName];
                }
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
        if (extendsObject.extendsType) {
            extendsObject.extends = resolveDatatypeReference(extendsObject.extendsType, classes, namespacesData);
        }
        if (extendsObject.implementTypes && extendsObject.implementTypes.length > 0) {
            extendsObject.implements = resolveImplements(extendsObject.implementTypes, classes, namespacesData);
        }
    }
    return extendsObject;
}

function resolveImplements(implementTypes: string[], classes: any, namespacesData: any): { [key: string]: ApexClass | ApexInterface | ApexEnum } {
    const implementObjects: { [key: string]: ApexClass | ApexInterface | ApexEnum } = {};
    for (let impType of implementTypes) {
        const reference = resolveDatatypeReference(impType, classes, namespacesData);
        if (!Utils.isNull(reference)) {
            implementObjects[reference.name.toLowerCase()] = reference;
        }
    }
    return implementObjects;
}

function resetModifiers(parser: ApexParser): void {
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

function isDatatype(token: Token): boolean {
    return token && (token.type === ApexTokenTypes.DATATYPE.COLLECTION || token.type === ApexTokenTypes.DATATYPE.CUSTOM_CLASS || token.type === ApexTokenTypes.DATATYPE.PRIMITIVE || token.type === ApexTokenTypes.DATATYPE.SOBJECT || token.type === ApexTokenTypes.DATATYPE.SUPPORT_CLASS || token.type === ApexTokenTypes.DATATYPE.SUPPORT_NAMESPACE || token.type === ApexTokenTypes.ENTITY.CLASS_MEMBER || token.type === ApexTokenTypes.ENTITY.SUPPORT_CLASS_MEMBER);
}

function isAnnotation(token: Token): boolean {
    return token && token.type === ApexTokenTypes.ANNOTATION.ENTITY;
}

function isConstructorDeclaration(token: Token): boolean {
    return token && token.type === ApexTokenTypes.DECLARATION.ENTITY.CONSTRUCTOR;
}

function isMethodDeclaration(token: Token): boolean {
    return token && token.type === ApexTokenTypes.DECLARATION.ENTITY.FUNCTION;
}

function isStaticConstructorDeclaration(token: Token): boolean {
    return token && token.type === ApexTokenTypes.KEYWORD.DECLARATION.STATIC_CONSTRUCTOR;
}

function isVariableDeclaration(token: Token): boolean {
    return token && token.type === ApexTokenTypes.DECLARATION.ENTITY.VARIABLE;
}

function openBracket(token: Token): boolean {
    return token && (token.type === ApexTokenTypes.BRACKET.CURLY_OPEN || token.type === ApexTokenTypes.BRACKET.INITIALIZER_OPEN);
}

function closeBracket(token: Token): boolean {
    return token && (token.type === ApexTokenTypes.BRACKET.CURLY_CLOSE || token.type === ApexTokenTypes.BRACKET.INITIALIZER_CLOSE);
}

function isAccessModifier(token: Token): boolean {
    return token && token.type === ApexTokenTypes.KEYWORD.MODIFIER.ACCESS;
}

function openCommentBlock(token: Token): boolean {
    return token && token.type === ApexTokenTypes.COMMENT.BLOCK_START;
}

function closeCommentBlock(token: Token): boolean {
    return token && token.type === ApexTokenTypes.COMMENT.BLOCK_END;
}

function isCommentLine(token: Token): boolean {
    return token && (token.type === ApexTokenTypes.COMMENT.LINE || token.type === ApexTokenTypes.COMMENT.LINE_DOC);
}

function isDefinitionModifier(token: Token): boolean {
    return token && token.type === ApexTokenTypes.KEYWORD.MODIFIER.DEFINITION;
}

function isSharingModifier(token: Token): boolean {
    return token && token.type === ApexTokenTypes.KEYWORD.MODIFIER.SHARING;
}

function isStatic(token: Token): boolean {
    return token && token.type === ApexTokenTypes.KEYWORD.MODIFIER.STATIC;
}

function isFinal(token: Token): boolean {
    return token && token.type === ApexTokenTypes.KEYWORD.MODIFIER.FINAL;
}

function isWebservice(token: Token): boolean {
    return token && token.type === ApexTokenTypes.KEYWORD.MODIFIER.WEB_SERVICE;
}

function isTestMethod(token: Token): boolean {
    return token && token.type === ApexTokenTypes.KEYWORD.MODIFIER.TEST_METHOD;
}

function isOverride(token: Token): boolean {
    return token && token.type === ApexTokenTypes.KEYWORD.MODIFIER.OVERRIDE;
}

function isTransient(token: Token): boolean {
    return token && token.type === ApexTokenTypes.KEYWORD.MODIFIER.TRANSIENT;
}

function isClass(token: Token): boolean {
    return token && token.type === ApexTokenTypes.DECLARATION.ENTITY.CLASS;
}

function isInterface(token: Token): boolean {
    return token && token.type === ApexTokenTypes.DECLARATION.ENTITY.INTERFACE;
}

function isEnum(token: Token): boolean {
    return token && token.type === ApexTokenTypes.DECLARATION.ENTITY.ENUM;
}

function isProperty(token: Token): boolean {
    return token && token.type === ApexTokenTypes.DECLARATION.ENTITY.PROPERTY;
}

function isGetterAccessor(token: Token): boolean {
    return token && token.type === ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_GETTER;
}

function isSetterAccessor(token: Token): boolean {
    return token && token.type === ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_SETTER;
}

function isInitializer(token: Token): boolean {
    return token && token.type === ApexTokenTypes.BRACKET.INITIALIZER_OPEN;
}

function isOnImplements(token: Token): boolean {
    return token.type === ApexTokenTypes.KEYWORD.DECLARATION.IMPLEMENTS;
}

function isOnExtends(token: Token): boolean {
    return token.type === ApexTokenTypes.KEYWORD.DECLARATION.EXTENDS;
}

function isOnTrigger(token: Token): boolean {
    return token.type === ApexTokenTypes.KEYWORD.DECLARATION.TRIGGER;
}

function isQuery(token: Token, lastToken?: Token): boolean {
    if (token.type === ApexTokenTypes.BRACKET.QUERY_START) {
        return true;
    }
    if (lastToken && lastToken.type === ApexTokenTypes.PUNCTUATION.QUOTTES_START && token.textToLower === 'select') {
        return true;
    }
    return false;
}

function processQuery(tokens: Token[], index: number, position: Position | undefined, node: ApexMethod | ApexConstructor | ApexGetter | ApexSetter | ApexClass | ApexTrigger | SOQLQuery): any {
    const len = tokens.length;
    let token = tokens[index];
    let lastToken = LanguageUtils.getLastToken(tokens, index);
    let isDynamic = (lastToken && lastToken.type === ApexTokenTypes.PUNCTUATION.QUOTTES_START && token.textToLower === 'select');
    let nodeId = '';
    let nodeName;
    let positionData;
    if (node instanceof SOQLQuery && node.nodeType === ApexNodeTypes.SOQL) {
        nodeId = node.id + '.innerquery';
    } else if (!(node instanceof SOQLQuery)) {
        nodeId = node.id + '.query.' + node.queries.length, 'query.' + node.queries.length;
        nodeName = 'query.' + node.queries.length;
    }
    let query: SOQLQuery | undefined = new SOQLQuery(nodeId, nodeName, (isDynamic) ? lastToken : token);
    if (!isDynamic) {
        index++;
    }
    let onProjection = false;
    let field = '';
    let fieldStartToken;
    let isQueryNode = false;
    for (; index < len; index++) {
        lastToken = LanguageUtils.getLastToken(tokens, index);
        token = tokens[index];
        const nextToken = LanguageUtils.getNextToken(tokens, index);
        const twoNextToken = LanguageUtils.getTwoNextToken(tokens, index);
        const twoLastToken = LanguageUtils.getTwoLastToken(tokens, index);
        if (position && query && !positionData) {
            if (LanguageUtils.isOnPosition(token, lastToken, nextToken, position)) {
                const startIndex = position.character - token.range.start.character;
                const startPart = token.text.substring(0, startIndex + 1);
                const endPart = token.text.substring(startIndex + 1);
                positionData = new PositionData(startPart, endPart, query.nodeType, query.id, 'Apex');
                positionData.onText = token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_START || token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_END || token.type === ApexTokenTypes.LITERAL.STRING;
                positionData.parentName = node.name;
                positionData.signature = (node instanceof ApexMethod || node instanceof ApexConstructor) ? (node.simplifiedSignature || node.signature) : node.name;
                positionData.token = token;
                positionData.nextToken = nextToken;
                positionData.twoNextToken = twoNextToken;
                positionData.lastToken = lastToken;
                positionData.twoLastToken = twoLastToken;
            }
        }
        if (!isDynamic) {
            if (token.type === ApexTokenTypes.QUERY.CLAUSE.FROM) {
                if (field) {
                    query.projection!.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                    field = '';
                    fieldStartToken = undefined;
                }
                onProjection = false;
                query.from = nextToken;
            } else if (token.type === ApexTokenTypes.QUERY.CLAUSE.SELECT) {
                onProjection = true;
            } else if (token.type === ApexTokenTypes.BRACKET.QUERY_END || token.type === ApexTokenTypes.BRACKET.INNER_QUERY_END) {
                query.endToken = token;
                break;
            } else if (onProjection) {
                if (token.type === ApexTokenTypes.PUNCTUATION.COMMA) {
                    query.projection!.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                    field = '';
                    fieldStartToken = undefined;
                } else if (isQuery(token, lastToken)) {
                    const data = processQuery(tokens, index, position, query);
                    index = data.index;
                    query.projection!.push(data.query);
                    if (data.positionData && !positionData) {
                        positionData = data.positionData;
                    }
                } else {
                    field += token.text;
                    if (!fieldStartToken) {
                        fieldStartToken = token;
                    }
                }
            }
        } else {
            if (token.textToLower === 'from') {
                isQueryNode = true;
                if (field) {
                    query.projection!.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                    field = '';
                    fieldStartToken = undefined;
                }
                onProjection = false;
                query.from = nextToken;
            } else if (token.textToLower === 'select') {
                onProjection = true;
            } else if (token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_END) {
                query.endToken = token;
                break;
            } else if (onProjection) {
                if (token.textToLower === ',') {
                    query.projection!.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                    field = '';
                    fieldStartToken = undefined;
                } else if (isQuery(token, lastToken)) {
                    const data = processQuery(tokens, index, position, query);
                    index = data.index;
                    if (data.query) {
                        query.projection!.push(data.query);
                    }
                    if (data.positionData && !positionData) {
                        positionData = data.positionData;
                    }
                } else {
                    field += token.text;
                    if (!fieldStartToken) {
                        fieldStartToken = token;
                    }
                }
            }
        }
    }
    if (isDynamic && !isQueryNode) {
        query = undefined;
    }
    if (positionData) {
        positionData.query = query;
    }
    return {
        query: query,
        positionData: positionData,
        index: index
    };
}

function getInterfaces(tokens: Token[], index: number): any {
    var interfaceName = "";
    let token = tokens[index];
    let aBracketIndent = 0;
    let interfaces = [];
    const len = tokens.length;
    for (; index < len; index++) {
        token = tokens[index];
        if (token.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_OPEN) {
            aBracketIndent++;
        }
        else if (token.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE) {
            aBracketIndent--;
        }
        if (token.type === ApexTokenTypes.PUNCTUATION.COMMA && aBracketIndent === 0) {
            interfaces.push(interfaceName);
            interfaceName = "";
        } else if (token.type !== ApexTokenTypes.KEYWORD.DECLARATION.IMPLEMENTS && token.type !== ApexTokenTypes.BRACKET.CURLY_OPEN) {
            interfaceName += token.text;
        }
        if (token.type === ApexTokenTypes.KEYWORD.DECLARATION.EXTENDS || token.type === ApexTokenTypes.BRACKET.CURLY_OPEN) {
            break;
        }
    }
    interfaces.push(interfaceName);
    if (token.type === ApexTokenTypes.KEYWORD.DECLARATION.EXTENDS) {
        index = index - 2;
    }
    if (token.type === ApexTokenTypes.BRACKET.CURLY_OPEN) {
        index = index - 2;
    }
    return {
        index: index,
        interfaces: interfaces,
    };
}

function getExtends(tokens: Token[], index: number): any {
    // TODO
    var extendsName = "";
    let aBracketIndent = 0;
    const len = tokens.length;
    for (; index < len; index++) {
        const token = tokens[index];
        if (token.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_OPEN) {
            aBracketIndent++;
        }
        else if (token.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE) {
            aBracketIndent--;
        }
        if (token.type !== ApexTokenTypes.KEYWORD.DECLARATION.EXTENDS && token.type !== ApexTokenTypes.KEYWORD.DECLARATION.IMPLEMENTS && token.type !== ApexTokenTypes.BRACKET.CURLY_OPEN) {
            extendsName += token.text;
        }
        if (token.type === ApexTokenTypes.BRACKET.CURLY_OPEN || token.type === ApexTokenTypes.KEYWORD.DECLARATION.IMPLEMENTS || (token.type === ApexTokenTypes.PUNCTUATION.COMMA && aBracketIndent === 0)) {
            if (token.type === ApexTokenTypes.BRACKET.CURLY_OPEN || token.type === ApexTokenTypes.KEYWORD.DECLARATION.IMPLEMENTS) {
                index = index - 2;
            }
            break;
        }
    }
    return {
        extendsName: extendsName,
        index: index,
    };
}

function isEnumValue(token: Token): boolean {
    return token && token.type === ApexTokenTypes.ENTITY.ENUM_VALUE;
}

function processTrigger(tokens: Token[], index: number, node: ApexTrigger) {
    const len = tokens.length;
    for (; index < len; index++) {
        const lastToken = LanguageUtils.getLastToken(tokens, index);
        const token = tokens[index];
        if (token.type === ApexTokenTypes.BRACKET.TRIGGER_GUARD_CLOSE) {
            break;
        }
        if (lastToken && lastToken.textToLower === 'on') {
            node.sObject = token.text;
        }
        if (lastToken && lastToken.type === ApexTokenTypes.DATABASE.TRIGGER_EXEC) {
            if (lastToken.textToLower === 'before') {
                if (token.textToLower === 'insert') {
                    node.beforeInsert = true;
                }
                if (token.textToLower === 'update') {
                    node.beforeUpdate = true;
                }
                if (token.textToLower === 'delete') {
                    node.beforeDelete = true;
                }
                if (token.textToLower === 'undelete') {
                    node.beforeUndelete = true;
                }

            } else if (lastToken.textToLower === 'after') {
                if (token.textToLower === 'insert') {
                    node.afterInsert = true;
                }
                if (token.textToLower === 'update') {
                    node.afterUpdate = true;
                }
                if (token.textToLower === 'delete') {
                    node.afterDelete = true;
                }
                if (token.textToLower === 'undelete') {
                    node.afterUndelete = true;
                }
            }
        }
    }
    return index;
}

function processMethodSignature(node: ApexMethod | ApexConstructor, parser: ApexParser, index: number) {
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
        const lastToken = LanguageUtils.getLastToken(parser.tokens, index);
        const nextToken = LanguageUtils.getNextToken(parser.tokens, index);
        const twoNextToken = LanguageUtils.getTwoNextToken(parser.tokens, index);
        const twoLastToken = LanguageUtils.getTwoLastToken(parser.tokens, index);
        if (parser.cursorPosition && !node.positionData) {
            if (LanguageUtils.isOnPosition(token, lastToken, nextToken, parser.cursorPosition)) {
                const startIndex = parser.cursorPosition.character - token.range.start.character;
                const startPart = token.text.substring(0, startIndex + 1);
                const endPart = token.text.substring(startIndex + 1);
                node.positionData = new PositionData(startPart, endPart, node.nodeType, node.id, 'Apex');
                node.positionData.onText = token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_START || token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_END || token.type === ApexTokenTypes.LITERAL.STRING;
                node.positionData.signature = node.simplifiedSignature || node.signature;
                node.positionData.token = token;
                node.positionData.nextToken = nextToken;
                node.positionData.twoNextToken = twoNextToken;
                node.positionData.lastToken = lastToken;
                node.positionData.twoLastToken = twoLastToken;
            }
        }
        if (token.type === ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE) {
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
            if (newNode.positionData) {
                node.positionData = newNode.positionData;
                newNode.positionData = undefined;
                node.positionData.nodeType = (node) ? node.nodeType : undefined;
                node.positionData.signature = node.simplifiedSignature || node.signature;
            }
            newNode.parentId = (node) ? node.id : undefined;;
            datatype = newNode;
        } else if (datatype && paramName && (token.type === ApexTokenTypes.PUNCTUATION.COMMA || token.type === ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE)) {
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
        parser.nodesMap[param.datatype.id] = param.datatype;
        newNode.parentId = (node) ? node.id : undefined;;
        newNode.datatype = param.datatype;
        newNode.final = param.final;
        newNode.endToken = param.name;
        newNode.scope = node.scope + 1;
        parser.nodesMap[newNode.id] = newNode;
        if (node) {
            node.addParam(newNode);
        }
    }
    if (node.positionData) {
        node.positionData.signature = node.simplifiedSignature || node.signature;
    }
    index--;
    return index;
}

function processAnnotation(node: ApexAnnotation, parser: ApexParser, index: number, _position?: Position): number {
    const len = parser.tokens.length;
    for (; index < len; index++) {
        const token = parser.tokens[index];
        if (token.type === ApexTokenTypes.ANNOTATION.NAME || token.type === ApexTokenTypes.BRACKET.ANNOTATION_PARAM_OPEN || token.type === ApexTokenTypes.BRACKET.ANNOTATION_PARAM_CLOSE || token.type === ApexTokenTypes.ANNOTATION.ENTITY) {
            node.addToken(token);
        } else {
            break;
        }
    }
    return index;
}

function processCommentBlock(node: ApexCommentBlock, parser: ApexParser, index: number, position?: Position): number {
    const len = parser.tokens.length;
    for (; index < len; index++) {
        const token = parser.tokens[index];
        const lastToken = LanguageUtils.getLastToken(parser.tokens, index);
        const nextToken = LanguageUtils.getNextToken(parser.tokens, index);
        const twoNextToken = LanguageUtils.getTwoNextToken(parser.tokens, index);
        const twoLastToken = LanguageUtils.getTwoLastToken(parser.tokens, index);
        if (position && node && !node.positionData) {
            if (LanguageUtils.isOnPosition(token, lastToken, nextToken, parser.cursorPosition)) {
                const startIndex = parser.cursorPosition!.character - token.range.start.character;
                const startPart = token.text.substring(0, startIndex + 1);
                const endPart = token.text.substring(startIndex + 1);
                node.positionData = new PositionData(startPart, endPart, node.nodeType, node.id, 'Apex');
                node.positionData.token = token;
                node.positionData.nextToken = nextToken;
                node.positionData.twoNextToken = twoNextToken;
                node.positionData.lastToken = lastToken;
                node.positionData.twoLastToken = twoLastToken;
            }
        }
        if (!closeCommentBlock(token)) {
            node.addToken(token);
        } else {
            node.addToken(token);
            break;
        }
    }
    return index;
}

function processCommentLine(node: ApexComment, parser: ApexParser, index: number, position?: Position) {
    const len = parser.tokens.length;
    for (; index < len; index++) {
        const token = parser.tokens[index];
        const lastToken = LanguageUtils.getLastToken(parser.tokens, index);
        const nextToken = LanguageUtils.getNextToken(parser.tokens, index);
        const twoNextToken = LanguageUtils.getTwoNextToken(parser.tokens, index);
        const twoLastToken = LanguageUtils.getTwoLastToken(parser.tokens, index);
        if (position && node && !node.positionData) {
            if (LanguageUtils.isOnPosition(token, lastToken, nextToken, parser.cursorPosition)) {
                const startIndex = parser.cursorPosition!.character - token.range.start.character;
                const startPart = token.text.substring(0, startIndex + 1);
                const endPart = token.text.substring(startIndex + 1);
                node.positionData = new PositionData(startPart, endPart, node.nodeType, node.id, 'Apex');
                node.positionData.token = token;
                node.positionData.nextToken = nextToken;
                node.positionData.twoNextToken = twoNextToken;
                node.positionData.lastToken = lastToken;
                node.positionData.twoLastToken = twoLastToken;
            }
        }
        if (token.type === ApexTokenTypes.COMMENT.LINE || token.type === ApexTokenTypes.COMMENT.LINE_DOC || token.type === ApexTokenTypes.COMMENT.CONTENT) {
            node.addToken(token);
        } else {
            break;
        }
    }
    index--;
    return index;
}

function processDatatype(node: ApexDatatype, parser: ApexParser, index: number): number {
    let aBracketIndent = 0;
    let sqBracketIndent = 0;
    let datatype = '';
    const len = parser.tokens.length;
    let type = '';
    let valueTokens: Token[] = [];
    let valueText = '';
    let keyTokens: Token[] = [];
    let keyText = '';
    for (; index < len; index++) {
        const token = parser.tokens[index];
        const nextToken = LanguageUtils.getNextToken(parser.tokens, index);
        const twoNextToken = LanguageUtils.getTwoNextToken(parser.tokens, index);
        const lastToken = LanguageUtils.getLastToken(parser.tokens, index);
        const twoLastToken = LanguageUtils.getTwoLastToken(parser.tokens, index);
        if (token) {
            if (parser.cursorPosition && node && !node.positionData) {
                if (LanguageUtils.isOnPosition(token, lastToken, nextToken, parser.cursorPosition)) {
                    const startIndex = parser.cursorPosition.character - token.range.start.character;
                    const startPart = token.text.substring(0, startIndex + 1);
                    const endPart = token.text.substring(startIndex + 1);
                    node.positionData = new PositionData(startPart, endPart, node.nodeType, node.id, 'Apex');
                    node.positionData.onText = token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_START || token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_END || token.type === ApexTokenTypes.LITERAL.STRING;
                    node.positionData.token = token;
                    node.positionData.nextToken = nextToken;
                    node.positionData.twoNextToken = twoNextToken;
                    node.positionData.lastToken = lastToken;
                    node.positionData.twoLastToken = twoLastToken;
                }
            }
            if (isDatatype(token)) {
                datatype += token.text;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_OPEN) {
                aBracketIndent++;
                if (aBracketIndent > 1) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
                datatype += token.text;
            } else if (token.type === ApexTokenTypes.BRACKET.SQUARE_OPEN) {
                sqBracketIndent++;
                datatype += token.text;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE) {
                aBracketIndent--;
                datatype += token.text;
                if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === ApexTokenTypes.BRACKET.SQUARE_CLOSE) {
                sqBracketIndent--;
                datatype += token.text;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === ApexTokenTypes.PUNCTUATION.COMMA && aBracketIndent > 0) {
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
            } else if (token.type === ApexTokenTypes.PUNCTUATION.OBJECT_ACCESSOR) {
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

function processDatatypeTokens(node: ApexNode, text: string, tokens: Token[], isKey: boolean): ApexDatatype | undefined {
    if (!tokens || tokens.length === 0) {
        return undefined;
    }
    let aBracketIndent = 0;
    let sqBracketIndent = 0;
    let type = '';
    let valueTokens: Token[] = [];
    let valueText = '';
    let keyTokens: Token[] = [];
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
            } else if (token.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_OPEN) {
                aBracketIndent++;
                if (aBracketIndent > 1) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === ApexTokenTypes.BRACKET.SQUARE_OPEN) {
                sqBracketIndent++;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE) {
                aBracketIndent--; if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === ApexTokenTypes.BRACKET.SQUARE_CLOSE) {
                sqBracketIndent--;
                if (aBracketIndent === 0) {
                    type += token.text;
                } else if (aBracketIndent > 0) {
                    valueTokens.push(token);
                    valueText += token.text;
                }
            } else if (token.type === ApexTokenTypes.PUNCTUATION.COMMA && aBracketIndent > 0) {
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
            } else if (token.type === ApexTokenTypes.PUNCTUATION.OBJECT_ACCESSOR) {
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

function getBatches(objects: string[], multiThread?: boolean): BatchData[] {
    const nBatches = (multiThread) ? OSUtils.getAvailableCPUs() : 1;
    const recordsPerBatch = Math.ceil(objects.length / nBatches);
    const batches = [];
    let counter = 0;
    let batch: BatchData | undefined;
    for (const object of objects) {
        if (!batch) {
            batch = {
                batchId: 'Bacth_' + counter,
                records: [],
                completed: false
            };
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
    if (batch) {
        batches.push(batch);
    }
    return batches;
}

function calculateIncrement(objects: string[]) {
    return MathUtils.round(100 / objects.length, 2);
}

interface BatchData {
    batchId: string;
    records: string[];
    completed: boolean;
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