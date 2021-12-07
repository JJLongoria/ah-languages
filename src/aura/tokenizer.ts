import { AuraTokenTypes, CoreUtils, FileReader, Token } from "@aurahelper/core";

const StrUtils = CoreUtils.StrUtils;
const Utils = CoreUtils.Utils;
const Validator = CoreUtils.Validator;

const symbolTokens: { [key: string]: string } = {
    '{': AuraTokenTypes.BRACKET.CURLY_OPEN,
    '}': AuraTokenTypes.BRACKET.CURLY_CLOSE,
    '<': AuraTokenTypes.BRACKET.START_TAG_OPEN,
    '>': AuraTokenTypes.BRACKET.START_TAG_CLOSE,
    '</': AuraTokenTypes.BRACKET.END_TAG_OPEN,
    '/>': AuraTokenTypes.BRACKET.TAG_EMPTY_CLOSE,
    '<? ': AuraTokenTypes.BRACKET.TAG_EXMARK_OPEN,
    '?>': AuraTokenTypes.BRACKET.TAG_EXMARK_CLOSE,
    '<!': AuraTokenTypes.BRACKET.TAG_ENTITY_OPEN,
    '"': AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES,
    '<!--': AuraTokenTypes.COMMENT.START,
    '-->': AuraTokenTypes.COMMENT.END,
    ',': AuraTokenTypes.PUNCTUATION.COMMA,
    ':': AuraTokenTypes.PUNCTUATION.COLON,
    ';': AuraTokenTypes.PUNCTUATION.SEMICOLON,
    '\\': AuraTokenTypes.PUNCTUATION.BACKSLASH,
    '@': AuraTokenTypes.PUNCTUATION.AT,
    '?': AuraTokenTypes.PUNCTUATION.EXMARK,
    '=': AuraTokenTypes.OPERATOR.ASSIGN.ASSIGN,
    ".": AuraTokenTypes.PUNCTUATION.OBJECT_ACCESSOR,
    "?.": AuraTokenTypes.PUNCTUATION.SAFE_OBJECT_ACCESSOR,
};

/**
 * Class to tokenize Aura XML files
 */
export class AuraTokenizer {

    /**
     * Method to Tokenize Aura XML files
     * @param {string} filePathOrContent File path or File content to tokenize
     * @param {number} [tabSize] File tab size
     * @returns {Token[]} Return file tokens
     */
    static tokenize(filePathOrContent: string, tabSize?: number) {
        if (!tabSize) {
            tabSize = 4;
        }
        let content;
        if (Utils.isString(filePathOrContent)) {
            try {
                content = FileReader.readFileSync(Validator.validateFilePath(filePathOrContent));
            } catch (error) {
                content = filePathOrContent;
            }
        } else {
            throw new Error('You must to select a file path,or file content');
        }
        const NUM_FORMAT = /[0-9]/;
        const ID_FORMAT = /([a-zA-Z0-9À-ÿ]|_|–)/;
        content = StrUtils.replace(content, '\r\n', '\n');
        const tokens: Token[] = [];
        let lineNumber = 0;
        let column = 0;
        let onCommentBlock = false;
        let onText = false;
        const startTagIndex: number[] = [];
        const quottesIndex: number[] = [];
        const commentBlockIndex: number[] = [];
        for (let charIndex = 0, len = content.length; charIndex < len; charIndex++) {
            const fourChars = content.substring(charIndex, charIndex + 4);
            const threeChars = content.substring(charIndex, charIndex + 3);
            const twoChars = content.substring(charIndex, charIndex + 2);
            let char = content.charAt(charIndex);
            let token;
            let lastToken = (tokens.length > 0) ? tokens[tokens.length - 1] : undefined;
            const twoLastToken = (tokens.length > 1) ? tokens[tokens.length - 2] : undefined;
            if (fourChars.length === 4 && symbolTokens[fourChars]) {
                token = new Token(symbolTokens[fourChars], fourChars, lineNumber, column);
                charIndex += 3;
                column += 4;
            } else if (threeChars.length === 3 && symbolTokens[threeChars]) {
                token = new Token(symbolTokens[threeChars], threeChars, lineNumber, column);
                charIndex += 2;
                column += 3;
            } else if (twoChars.length === 2 && symbolTokens[twoChars]) {
                token = new Token(symbolTokens[twoChars], twoChars, lineNumber, column);
                charIndex += 1;
                column += 2;
            } else if (symbolTokens[char]) {
                token = new Token(symbolTokens[char], char, lineNumber, column);
                column++;
            } else if (NUM_FORMAT.test(char)) {
                var numContent = '';
                while (NUM_FORMAT.test(char) || char === '.' || char === ':' || char === '+' || char === '-' || char.toLowerCase() === 't' || char.toLowerCase() === 'z') {
                    numContent += char;
                    char = content.charAt(++charIndex);
                }
                if (numContent.indexOf(':') !== -1 && numContent.indexOf('-') !== -1) {
                    token = new Token(AuraTokenTypes.LITERAL.DATETIME, numContent, lineNumber, column);
                } else if (numContent.indexOf('-') !== -1) {
                    token = new Token(AuraTokenTypes.LITERAL.DATE, numContent, lineNumber, column);
                } else if (numContent.indexOf(':') !== -1) {
                    token = new Token(AuraTokenTypes.LITERAL.TIME, numContent, lineNumber, column);
                } else if (numContent.indexOf('.') !== -1) {
                    token = new Token(AuraTokenTypes.LITERAL.DOUBLE, numContent, lineNumber, column);
                }
                else {
                    token = new Token(AuraTokenTypes.LITERAL.INTEGER, numContent, lineNumber, column);
                }
                charIndex--;
                column += numContent.length;
            } else if (ID_FORMAT.test(char)) {
                var idContent = '';
                while (ID_FORMAT.test(char)) {
                    idContent += char;
                    char = content.charAt(++charIndex);
                }
                charIndex--;
                token = new Token(AuraTokenTypes.IDENTIFIER, idContent, lineNumber, column);
                column += idContent.length;
            } else if (char === "\n") {
                lineNumber++;
                column = 0;
            } else if (char !== "\t" && char !== " " && char.trim().length !== 0) {
                token = new Token(AuraTokenTypes.UNKNOWN, char, lineNumber, column);
                column++;
            } else if (char === "\t") {
                column += tabSize;
            } else {
                column++;
            }
            if (token !== undefined) {
                if (!onText && !onCommentBlock && token.type === AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    token.type = AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_START;
                    onText = true;
                    token.parentToken = tokens.length - 1;
                    quottesIndex.push(tokens.length);
                } else if (onText && token.type === AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    if (twoLastToken && twoLastToken.type === AuraTokenTypes.OPERATOR.ASSIGN.ASSIGN && lastToken && lastToken.type === AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_START) {
                        if (startTagIndex.length > 0) {
                            const index = startTagIndex[startTagIndex.length - 1];
                            const tagToken = tokens[index];
                            if (tagToken.type === AuraTokenTypes.BRACKET.START_TAG_OPEN || tagToken.type === AuraTokenTypes.BRACKET.TAG_EXMARK_OPEN) {
                                tokens.push(new Token(AuraTokenTypes.ENTITY.TAG.ATTRIBUTE_VALUE, '', lastToken.range.end.line, lastToken.range.end.character));
                            }
                        }
                    }
                    token.type = AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_END;
                    onText = false;
                    if (quottesIndex.length > 0) {
                        const index = quottesIndex.pop();
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                            token.parentToken = tokens[index].parentToken;
                        }
                    }
                } else if (!onText && !onCommentBlock && token.type === AuraTokenTypes.COMMENT.START) {
                    onCommentBlock = true;
                    token.parentToken = tokens.length - 1;
                    commentBlockIndex.push(tokens.length);
                } else if (onCommentBlock && token.type === AuraTokenTypes.COMMENT.END) {
                    onCommentBlock = false;
                    if (commentBlockIndex.length > 0) {
                        const index = commentBlockIndex.pop();
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                            token.parentToken = tokens[index].parentToken;
                        }
                    }
                } else if (onText) {
                    if (twoLastToken && twoLastToken.type === AuraTokenTypes.OPERATOR.ASSIGN.ASSIGN && lastToken && lastToken.type === AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_START) {
                        if (startTagIndex.length > 0) {
                            const index = startTagIndex[startTagIndex.length - 1];
                            const tagToken = tokens[index];
                            if (tagToken.type === AuraTokenTypes.BRACKET.START_TAG_OPEN || tagToken.type === AuraTokenTypes.BRACKET.TAG_EXMARK_OPEN) {
                                token.type = AuraTokenTypes.ENTITY.TAG.ATTRIBUTE_VALUE;
                                token.parentToken = lastToken.parentToken;
                            }
                        }
                    } else if (lastToken && lastToken.type === AuraTokenTypes.ENTITY.TAG.ATTRIBUTE_VALUE) {
                        const whitespaces: number = (lastToken.range.start.line !== token.range.start.line) ? 0 : token.range.start.character - lastToken.range.end.character;
                        token = new Token(AuraTokenTypes.ENTITY.TAG.ATTRIBUTE_VALUE, lastToken.text + getWhitespaces(whitespaces) + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        token.parentToken = lastToken.parentToken;
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                        quottesIndex.pop();
                    } else {
                        token.type = AuraTokenTypes.LITERAL.STRING;
                        if (quottesIndex.length > 0) {
                            token.parentToken = quottesIndex[quottesIndex.length - 1];
                        }
                    }
                } else if (onCommentBlock) {
                    token.type = AuraTokenTypes.COMMENT.CONTENT;
                    if (commentBlockIndex.length > 0) {
                        token.parentToken = commentBlockIndex[commentBlockIndex.length - 1];
                    }
                } else if (token.type === AuraTokenTypes.OPERATOR.ASSIGN.ASSIGN && lastToken && lastToken.type === AuraTokenTypes.ENTITY.TAG.ATTRIBUTE) {
                    token.parentToken = tokens.length - 1;
                } else if (token.type === AuraTokenTypes.BRACKET.START_TAG_OPEN || token.type === AuraTokenTypes.BRACKET.END_TAG_OPEN || token.type === AuraTokenTypes.BRACKET.TAG_EXMARK_OPEN || token.type === AuraTokenTypes.BRACKET.TAG_ENTITY_OPEN) {
                    if (startTagIndex.length > 0) {
                        const index = startTagIndex.pop();
                        if (index !== undefined) {
                            tokens[index].type = AuraTokenTypes.BRACKET.INCOMPLETE_TAG_OPEN;
                        }
                    } else {
                        startTagIndex.push(tokens.length);
                    }
                } else if (token.type === AuraTokenTypes.BRACKET.START_TAG_CLOSE || token.type === AuraTokenTypes.BRACKET.TAG_EMPTY_CLOSE || token.type === AuraTokenTypes.BRACKET.TAG_EXMARK_CLOSE) {
                    if (startTagIndex.length > 0) {
                        const index = startTagIndex.pop();
                        if (index !== undefined) {
                            const pairToken = tokens[index];
                            if (token.type === AuraTokenTypes.BRACKET.TAG_EMPTY_CLOSE) {
                                tokens[index].type = AuraTokenTypes.BRACKET.TAG_EMPTY_OPEN;
                            } else if (token.type === AuraTokenTypes.BRACKET.TAG_EXMARK_CLOSE) {
                                tokens[index].type = AuraTokenTypes.BRACKET.TAG_EXMARK_OPEN;
                            } else if (pairToken.type === AuraTokenTypes.BRACKET.TAG_ENTITY_OPEN) {
                                token.type = AuraTokenTypes.BRACKET.TAG_ENTITY_CLOSE;
                            } else if (pairToken.type === AuraTokenTypes.BRACKET.END_TAG_OPEN) {
                                token.type = AuraTokenTypes.BRACKET.END_TAG_CLOSE;
                            } else if (pairToken.type === AuraTokenTypes.BRACKET.START_TAG_OPEN) {
                                token.type = AuraTokenTypes.BRACKET.START_TAG_CLOSE;
                            }
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (token.type === AuraTokenTypes.IDENTIFIER) {
                    if (lastToken) {
                        if (startTagIndex.length > 0) {
                            const index = startTagIndex[startTagIndex.length - 1];
                            if (lastToken.type === AuraTokenTypes.BRACKET.START_TAG_OPEN || lastToken.type === AuraTokenTypes.BRACKET.TAG_EXMARK_OPEN) {
                                token.type = AuraTokenTypes.ENTITY.TAG.NAME;
                                token.parentToken = index;
                            } else if (lastToken.type === AuraTokenTypes.BRACKET.END_TAG_OPEN) {
                                token.type = AuraTokenTypes.ENTITY.TAG.NAME;
                                token.parentToken = index;
                            } else if (lastToken.type === AuraTokenTypes.BRACKET.TAG_ENTITY_OPEN) {
                                token.type = AuraTokenTypes.ENTITY.TAG.NAME;
                                token.parentToken = index;
                            } else if (lastToken.type === AuraTokenTypes.ENTITY.TAG.NAME || (twoLastToken && twoLastToken.type === AuraTokenTypes.ENTITY.TAG.ATTRIBUTE_VALUE)) {
                                token.type = AuraTokenTypes.ENTITY.TAG.ATTRIBUTE;
                                token.parentToken = index;
                            } else if (twoLastToken && twoLastToken.type === AuraTokenTypes.ENTITY.TAG.ATTRIBUTE && lastToken.type === AuraTokenTypes.PUNCTUATION.COLON) {
                                token.type = AuraTokenTypes.ENTITY.TAG.NAME;
                                token.parentToken = index;
                                tokens.pop();
                                tokens.pop();
                                token = new Token(AuraTokenTypes.ENTITY.TAG.ATTRIBUTE, twoLastToken.text + lastToken.text + token.text, twoLastToken.range.start.line, twoLastToken.range.start.character);
                                lastToken = tokens[tokens.length - 1];
                            } else if (lastToken.type === AuraTokenTypes.ENTITY.TAG.NAME && token.type === AuraTokenTypes.PUNCTUATION.COLON) {
                                tokens[tokens.length - 1].type = AuraTokenTypes.ENTITY.NAMESPACE;
                                token.parentToken = index;
                            } else if (twoLastToken && twoLastToken.type === AuraTokenTypes.ENTITY.TAG.NAME && lastToken.type === AuraTokenTypes.PUNCTUATION.COLON) {
                                token.type = AuraTokenTypes.ENTITY.TAG.NAME;
                                token.parentToken = index;
                                tokens.pop();
                                tokens.pop();
                                token = new Token(AuraTokenTypes.ENTITY.TAG.NAME, twoLastToken.text + lastToken.text + token.text, twoLastToken.range.start.line, twoLastToken.range.start.character);
                                lastToken = tokens[tokens.length - 1];
                            } else {
                                token.type = AuraTokenTypes.ENTITY.TAG.CONTENT;
                                token.parentToken = index;
                            }
                        } else {
                            token.type = AuraTokenTypes.ENTITY.TAG.CONTENT;
                            token.parentToken = lastToken.parentToken;
                        }
                    }

                }
                tokens.push(token);
            }
        }
        return tokens;
    }

}

function getWhitespaces(number: number) {
    let ws = '';
    for (let index = 0; index < number; index++) {
        ws += ' ';
    }
    return ws;
}