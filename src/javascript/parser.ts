import { JSTokenTypes, CoreUtils, FileReader, Token, PathUtils, Position, FileChecker, InvalidFilePathException, PositionData, AuraJSComment, AuraJSCommentBlock, AuraJSFunction, SOQLQuery, SOQLField, AuraJSFile } from "@aurahelper/core";
import { LanguageUtils } from "../utils";
import { JSTokenizer } from "./tokenizer";

const Validator = CoreUtils.Validator;

/**
 * Class to Parse Aura Javascript files to extract data from files
 */
export class JSParser {

    fileName?: string;
    tokens: Token[];
    tokensLength: number;
    filePath?: string;
    content?: string;
    cursorPosition?: Position;
    node?: AuraJSFile;
    tabSize: number;

    /**
     * Create new JSParser instance to analize Aura Javscript file
     * @param {string | Token[]} filePathOrTokens File path or Tokens (tokens from JSTokenizer class)
     * @param {string} [fileName] File name 
     */
    constructor(filePathOrTokens: string | Token[], fileName?: string) {
        if (typeof filePathOrTokens !== 'string') {
            this.tokens = filePathOrTokens;
            this.tokensLength = this.tokens.length;
            this.fileName = fileName;
        } else {
            this.tokens = [];
            this.tokensLength = 0;
            this.filePath = filePathOrTokens;
            this.fileName = fileName || (this.filePath ? PathUtils.removeFileExtension(PathUtils.getBasename(this.filePath)) : undefined);
        }
        this.content = undefined;
        this.cursorPosition = undefined;
        this.node = undefined;
        this.tabSize = 4;
    }

    /**
     * Method to set the tab size
     * @param {number} tabSize Tab size value
     * @returns {JSParser} Return the JSParser instance
     */
    setTabSize(tabSize: number): JSParser {
        this.tabSize = tabSize;
        return this;
    }

    /**
     * Method to set the file tokens
     * @param {Token[]} tokens File tokens
     * @returns {JSParser} Return the JSParser instance
     */
    setTokens(tokens: Token[]): JSParser {
        this.tokens = tokens;
        this.tokensLength = this.tokens.length;
        return this;
    }

    /**
     * Method to set the file path
     * @param {string} filePath File path value
     * @returns {JSParser} Return the JSParser instance
     */
    setFilePath(filePath: string): JSParser {
        this.filePath = filePath;
        return this;
    }

    /**
     * Method to set the file name
     * @param {string} fileName File name value
     * @returns {JSParser} Return the JSParser instance
     */
    setFileName(fileName: string): JSParser {
        this.fileName = fileName;
        return this;
    }

    /**
     * Method to set the file content
     * @param {string} content File content value
     * @returns {JSParser} Return the JSParser instance
     */
    setContent(content: string): JSParser {
        this.content = content;
        return this;
    }

    /**
     * Method to set the cusor Position on file
     * @param {Position} position Cursor Position object
     * @returns {JSParser} Return the JSParser instance
     */
    setCursorPosition(position?: Position): JSParser {
        this.cursorPosition = position;
        return this;
    }

    /**
     * Method to parse Aura Javascript file and get file information
     * @returns Return the AuraJSFile node with file data
     */
    parse(): AuraJSFile | undefined {
        if (this.node) {
            return this.node;
        }
        if (this.filePath && !this.content && (!this.tokens || this.tokens.length === 0)) {
            this.filePath = Validator.validateFilePath(this.filePath);
            this.content = FileReader.readFileSync(this.filePath);
            if (!FileChecker.isJavaScript(this.filePath)) {
                throw new InvalidFilePathException(this.filePath, this.fileName);
            }
            this.tokens = JSTokenizer.tokenize(this.content);
            this.tokensLength = this.tokens.length;
        } else if (this.content && (!this.tokens || this.tokens.length === 0)) {
            this.tokens = JSTokenizer.tokenize(this.content);
            this.tokensLength = this.tokens.length;
        }
        const methods = [];
        let bracketIndent = 0;
        let parenthesisIndent = 0;
        let comment;
        let positionData;
        let strQueryStartIndex = -1;
        let strQueryEndIndex = -1;
        let strQueryFrom = false;
        this.node = new AuraJSFile(this.fileName);
        for (let index = 0; index < this.tokensLength; index++) {
            const lastToken = LanguageUtils.getLastToken(this.tokens, index);
            const token = new Token(this.tokens[index]);
            const nextToken = LanguageUtils.getNextToken(this.tokens, index);
            if (this.cursorPosition && this.node && !positionData) {
                if (LanguageUtils.isOnPosition(token, lastToken, nextToken, this.cursorPosition)) {
                    const startIndex = this.cursorPosition.character - token.range.start.character;
                    const startPart = token.text.substring(0, startIndex + 1);
                    const endPart = token.text.substring(startIndex + 1);
                    positionData = new PositionData(startPart, endPart, this.node.nodeType, undefined, 'JS');
                    positionData.onText = token.type === JSTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === JSTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === JSTokenTypes.LITERAL.STRING;
                    if (strQueryStartIndex !== -1 && strQueryEndIndex !== -1 && strQueryFrom) {
                        positionData.strQueryStartIndex = strQueryStartIndex;
                        positionData.strQueryEndIndex = strQueryEndIndex;
                    }
                }
                strQueryStartIndex = -1;
                strQueryEndIndex = -1;
            }
            if (openBracket(token)) {
                bracketIndent++;
            } else if (closeBracket(token)) {
                bracketIndent--;
            } else if (openParenthesis(token)) {
                parenthesisIndent++;
            } else if (closeParenthesis(token)) {
                parenthesisIndent--;
            } else if (isCommentLine(token)) {
                const newNode = new AuraJSComment();
                index = processCommentLine(newNode, this.tokens, index);
                comment = newNode;
            } else if (openCommentBlock(token)) {
                const newNode = new AuraJSCommentBlock();
                index = processCommentBlock(newNode, this.tokens, index);
                comment = newNode;
            } else if (isQuery(token, lastToken)) {
                const data = processQuery(this.tokens, index, this.cursorPosition);
                if (data.positionData && !positionData) {
                    positionData = data.positionData;
                } else if (positionData) {
                    positionData.query = data.query;
                }
            } else if (bracketIndent === 1 && parenthesisIndent === 1) {
                if (lastToken && nextToken && isFunction(lastToken, token, nextToken)) {
                    const newNode = new AuraJSFunction(lastToken!.text, lastToken, comment);
                    index = processFunction(newNode, this.tokens, index);
                    if (comment) {
                        comment = undefined;
                    }
                    methods.push(newNode);
                }
            }
        }
        this.node.methods = methods;
        if (positionData) {
            this.node.positionData = positionData;
        }
        return this.node;
    }
}

function processFunction(newNode: AuraJSFunction, tokens: Token[], index: number): number {
    const len = tokens.length;

    let varNames = [];
    for (; index < len; index++) {
        const token = new Token(tokens[index]);
        if (token.type === JSTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE) {
            break;
        }
        if (token.type === JSTokenTypes.ENTITY.VARIABLE) {
            varNames.push(token.text);
            newNode.params.push(token);
        }
    }
    newNode.signature = newNode.name + '(' + varNames.join(', ') + ')';
    newNode.auraSignature = newNode.name + ' : function(' + varNames.join(', ') + ')';
    return index;
}

function openBracket(token: Token): boolean {
    return token && token.type === JSTokenTypes.BRACKET.CURLY_OPEN;
}

function closeBracket(token: Token): boolean {
    return token && token.type === JSTokenTypes.BRACKET.CURLY_CLOSE;
}

function openParenthesis(token: Token): boolean {
    return token && token.type === JSTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN;
}

function closeParenthesis(token: Token): boolean {
    return token && token.type === JSTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE;
}

function openCommentBlock(token: Token): boolean {
    return token && token.type === JSTokenTypes.COMMENT.BLOCK_START;
}

function closeCommentBlock(token: Token): boolean {
    return token && token.type === JSTokenTypes.COMMENT.BLOCK_END;
}

function isCommentLine(token: Token): boolean {
    return token && (token.type === JSTokenTypes.COMMENT.LINE || token.type === JSTokenTypes.COMMENT.LINE_DOC);
}

function isFunction(lastToken: Token, token: Token, nextToken: Token): boolean {
    return token.type === JSTokenTypes.PUNCTUATION.COLON && lastToken.type === JSTokenTypes.ENTITY.VARIABLE && nextToken && nextToken.type === JSTokenTypes.KEYWORD.DECLARATION.FUNCTION;
}

function processCommentBlock(node: AuraJSCommentBlock, tokens: Token[], index: number): number {
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

function processCommentLine(node: AuraJSComment, tokens: Token[], index: number): number {
    const len = tokens.length;
    for (; index < len; index++) {
        const token = tokens[index];
        if (token.type === JSTokenTypes.COMMENT.LINE || token.type === JSTokenTypes.COMMENT.LINE_DOC || token.type === JSTokenTypes.COMMENT.CONTENT) {
            node.addToken(token);
        } else {
            break;
        }
    }
    index--;
    return index;
}

function isQuery(token: Token, lastToken?: Token): boolean {
    if (lastToken && (lastToken.type === JSTokenTypes.PUNCTUATION.QUOTTES_START || lastToken.type === JSTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_START) && token.textToLower === 'select') {
        return true;
    }
    return false;
}

function processQuery(tokens: Token[], index: number, position?: Position): any {
    const len = tokens.length;
    let token = tokens[index];
    let lastToken = LanguageUtils.getLastToken(tokens, index);
    let positionData;
    const query = new SOQLQuery('query', 'Query', token);
    let onProjection = false;
    let field = '';
    let fieldStartToken;
    for (; index < len; index++) {
        lastToken = LanguageUtils.getLastToken(tokens, index);
        token = tokens[index];
        let nextToken = LanguageUtils.getNextToken(tokens, index);
        if (position && query && !positionData) {
            if (LanguageUtils.isOnPosition(token, lastToken, nextToken, position)) {
                const startIndex = position.character - token.range.start.character;
                const startPart = token.text.substring(0, startIndex + 1);
                const endPart = token.text.substring(startIndex + 1);
                positionData = new PositionData(startPart, endPart, query.nodeType, query.id, 'Aura');
                positionData.onText = token.type === JSTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === JSTokenTypes.PUNCTUATION.QUOTTES_START || token.type === JSTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === JSTokenTypes.PUNCTUATION.QUOTTES_END || token.type === JSTokenTypes.LITERAL.STRING;
            }
        }
        if (token.textToLower === 'from') {
            if (field) {
                query.projection!.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                field = '';
                fieldStartToken = undefined;
            }
            onProjection = false;
            query.from = nextToken;
        } else if (token.textToLower === 'select') {
            onProjection = true;
        } else if ((token.type === JSTokenTypes.PUNCTUATION.QUOTTES_END || token.type === JSTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_END)) {
            query.endToken = token;
            break;
        } else if (onProjection) {
            if (token.textToLower === ',') {
                query.projection!.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                field = '';
                fieldStartToken = undefined;
            } else if (isQuery(token, lastToken)) {
                const data = processQuery(tokens, index, position);
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