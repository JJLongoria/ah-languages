const { StrUtils, Validator, Utils } = require('@aurahelper/core').CoreUtils;
const { Token } = require('@aurahelper/core').Types;
const TokenType = require('./tokenTypes');
const System = require('../system/system');
const { PathUtils, FileReader } = require('@aurahelper/core').FileSystem;

const symbolTokens = {
    ">>>=": TokenType.OPERATOR.BITWISE.UNSIGNED_RIGHT_ASSIGN,
    ">>=": TokenType.OPERATOR.BITWISE.SIGNED_RIGTH_ASSIGN,
    "<<=": TokenType.OPERATOR.BITWISE.LEFT_ASSIGN,
    ">>>": TokenType.OPERATOR.BITWISE.UNSIGNED_RIGHT,
    "!==": TokenType.OPERATOR.LOGICAL.INEQUALITY_EXACT,
    "===": TokenType.OPERATOR.LOGICAL.EQUALITY_EXACT,
    ">>": TokenType.OPERATOR.BITWISE.SIGNED_RIGHT,
    "<<": TokenType.OPERATOR.BITWISE.SIGNED_LEFT,
    "^=": TokenType.OPERATOR.BITWISE.EXCLUSIVE_OR_ASSIGN,
    "--": TokenType.OPERATOR.ARITHMETIC.DECREMENT,
    "++": TokenType.OPERATOR.ARITHMETIC.INCREMENT,
    "!=": TokenType.OPERATOR.LOGICAL.INEQUALITY,
    "<>": TokenType.OPERATOR.LOGICAL.INEQUALITY,
    "==": TokenType.OPERATOR.LOGICAL.EQUALITY,
    "||": TokenType.OPERATOR.LOGICAL.OR,
    "|=": TokenType.OPERATOR.LOGICAL.OR_ASSIGN,
    "&&": TokenType.OPERATOR.LOGICAL.AND,
    "&=": TokenType.OPERATOR.LOGICAL.AND_ASSIGN,
    ">=": TokenType.OPERATOR.LOGICAL.GREATER_THAN_EQUALS,
    "<=": TokenType.OPERATOR.LOGICAL.LESS_THAN_EQUALS,
    "=>": TokenType.OPERATOR.ASSIGN.MAP_KEY_VALUE,
    "+=": TokenType.OPERATOR.ARITHMETIC.ADD_ASSIGN,
    "-=": TokenType.OPERATOR.ARITHMETIC.SUBSTRACT_ASSIGN,
    "*=": TokenType.OPERATOR.ARITHMETIC.MULTIPLY_ASSIGN,
    "/=": TokenType.OPERATOR.ARITHMETIC.DIVIDE_ASSIGN,
    "^": TokenType.OPERATOR.BITWISE.EXCLUSIVE_OR,
    "|": TokenType.OPERATOR.BITWISE.OR,
    "&": TokenType.OPERATOR.BITWISE.AND,
    "+": TokenType.OPERATOR.ARITHMETIC.ADD,
    "-": TokenType.OPERATOR.ARITHMETIC.SUBSTRACT,
    "*": TokenType.OPERATOR.ARITHMETIC.MULTIPLY,
    "/": TokenType.OPERATOR.ARITHMETIC.DIVIDE,
    "!": TokenType.OPERATOR.LOGICAL.NOT,
    "<": TokenType.OPERATOR.LOGICAL.LESS_THAN,
    ">": TokenType.OPERATOR.LOGICAL.GREATER_THAN,
    "=": TokenType.OPERATOR.ASSIGN.ASSIGN,
    "/**": TokenType.COMMENT.BLOCK_START,
    "/*": TokenType.COMMENT.BLOCK_START,
    "*/": TokenType.COMMENT.BLOCK_END,
    "//": TokenType.COMMENT.LINE,
    "///": TokenType.COMMENT.LINE_DOC,
    "(": TokenType.OPERATOR.PRIORITY.PARENTHESIS_OPEN,
    ")": TokenType.OPERATOR.PRIORITY.PARENTHESIS_CLOSE,
    "{": TokenType.BRACKET.CURLY_OPEN,
    "}": TokenType.BRACKET.CURLY_CLOSE,
    "[": TokenType.BRACKET.SQUARE_OPEN,
    "]": TokenType.BRACKET.SQUARE_CLOSE,
    ",": TokenType.PUNCTUATION.COMMA,
    ";": TokenType.PUNCTUATION.SEMICOLON,
    ":": TokenType.PUNCTUATION.COLON,
    ".": TokenType.PUNCTUATION.OBJECT_ACCESSOR,
    "?.": TokenType.PUNCTUATION.SAFE_OBJECT_ACCESSOR,
    "\\": TokenType.PUNCTUATION.BACKSLASH,
    "'": TokenType.PUNCTUATION.QUOTTES,
    "@": TokenType.PUNCTUATION.AT,
    "?": TokenType.PUNCTUATION.EXMARK,
}

const primitiveDatatypes = {
    "blob": TokenType.DATATYPE.PRIMITIVE,
    "boolean": TokenType.DATATYPE.PRIMITIVE,
    "byte": TokenType.DATATYPE.PRIMITIVE,
    "date": TokenType.DATATYPE.PRIMITIVE,
    "datetime": TokenType.DATATYPE.PRIMITIVE,
    "decimal": TokenType.DATATYPE.PRIMITIVE,
    "double": TokenType.DATATYPE.PRIMITIVE,
    "id": TokenType.DATATYPE.PRIMITIVE,
    "integer": TokenType.DATATYPE.PRIMITIVE,
    "long": TokenType.DATATYPE.PRIMITIVE,
    "object": TokenType.DATATYPE.PRIMITIVE,
    "string": TokenType.DATATYPE.PRIMITIVE,
    "time": TokenType.DATATYPE.PRIMITIVE,
    "void": TokenType.DATATYPE.PRIMITIVE,
};

const collectionsDatatypes = {
    "list": TokenType.DATATYPE.COLLECTION,
    "set": TokenType.DATATYPE.COLLECTION,
    "map": TokenType.DATATYPE.COLLECTION,
    "array": TokenType.DATATYPE.COLLECTION,
};

const dateLiterals = {
    "yesterday": TokenType.LITERAL.DATE,
    "today": TokenType.LITERAL.DATE,
    "tomorrow": TokenType.LITERAL.DATE,
    "last_week": TokenType.LITERAL.DATE,
    "this_week": TokenType.LITERAL.DATE,
    "next_week": TokenType.LITERAL.DATE,
    "last_month": TokenType.LITERAL.DATE,
    "this_month": TokenType.LITERAL.DATE,
    "next_month": TokenType.LITERAL.DATE,
    "last_90_days": TokenType.LITERAL.DATE,
    "next_90_days": TokenType.LITERAL.DATE,
    "last_n_days": TokenType.LITERAL.DATE_PARAMETRIZED,
    "next_n_days": TokenType.LITERAL.DATE_PARAMETRIZED,
    "next_n_weeks": TokenType.LITERAL.DATE_PARAMETRIZED,
    "last_n_weeks": TokenType.LITERAL.DATE_PARAMETRIZED,
    "next_n_months": TokenType.LITERAL.DATE_PARAMETRIZED,
    "last_n_months": TokenType.LITERAL.DATE_PARAMETRIZED,
    "this_quarter": TokenType.LITERAL.DATE,
    "last_quarter": TokenType.LITERAL.DATE,
    "next_quarter": TokenType.LITERAL.DATE,
    "next_n_quarters": TokenType.LITERAL.DATE_PARAMETRIZED,
    "last_n_quarters": TokenType.LITERAL.DATE_PARAMETRIZED,
    "this_year": TokenType.LITERAL.DATE,
    "last_year": TokenType.LITERAL.DATE,
    "next_n_years": TokenType.LITERAL.DATE_PARAMETRIZED,
    "last_n_years": TokenType.LITERAL.DATE_PARAMETRIZED,
    "this_fiscal_quarter": TokenType.LITERAL.DATE,
    "last_fiscal_quarter": TokenType.LITERAL.DATE,
    "next_fiscal_quarter": TokenType.LITERAL.DATE,
    "next_n_fiscal_quarters": TokenType.LITERAL.DATE_PARAMETRIZED,
    "last_n_fiscal_quarters": TokenType.LITERAL.DATE_PARAMETRIZED,
    "this_fiscal_year": TokenType.LITERAL.DATE,
    "last_fiscal_year": TokenType.LITERAL.DATE,
    "next_fiscal_year": TokenType.LITERAL.DATE,
    "next_n_fiscal_years": TokenType.LITERAL.DATE_PARAMETRIZED,
    "last_n_fiscal_years": TokenType.LITERAL.DATE_PARAMETRIZED,
};

const reservedKeywords = {
    "abstract": TokenType.KEYWORD.MODIFIER.DEFINITION,
    "after": TokenType.DATABASE.TRIGGER_EXEC,
    "any": TokenType.KEYWORD.FOR_FUTURE,
    "activate": TokenType.KEYWORD.FOR_FUTURE,
    "as": TokenType.KEYWORD.OTHER,
    "asc": TokenType.QUERY.ORDER,
    "autonomous": TokenType.KEYWORD.FOR_FUTURE,
    "begin": TokenType.KEYWORD.FOR_FUTURE,
    "before": TokenType.DATABASE.TRIGGER_EXEC,
    "bigdecimal": TokenType.KEYWORD.FOR_FUTURE,
    "break": TokenType.KEYWORD.FLOW_CONTROL.BREAK,
    "bulk": TokenType.KEYWORD.OTHER,
    "case": TokenType.KEYWORD.FOR_FUTURE,
    "cast": TokenType.KEYWORD.FOR_FUTURE,
    "catch": TokenType.KEYWORD.FLOW_CONTROL.CATCH,
    "char": TokenType.KEYWORD.FOR_FUTURE,
    "class": TokenType.KEYWORD.DECLARATION.CLASS,
    "collect": TokenType.KEYWORD.FOR_FUTURE,
    "commit": TokenType.KEYWORD.OTHER,
    "const": TokenType.KEYWORD.FOR_FUTURE,
    "continue": TokenType.KEYWORD.FLOW_CONTROL.CONTINUE,
    "default": TokenType.KEYWORD.FOR_FUTURE,
    "delete": TokenType.DATABASE.DML,
    "desc": TokenType.QUERY.ORDER,
    "do": TokenType.KEYWORD.FLOW_CONTROL.DO,
    "else": TokenType.KEYWORD.FLOW_CONTROL.ELSE,
    "enum": TokenType.KEYWORD.DECLARATION.ENUM,
    "exit": TokenType.KEYWORD.FOR_FUTURE,
    "export": TokenType.KEYWORD.FOR_FUTURE,
    "extends": TokenType.KEYWORD.DECLARATION.EXTENDS,
    "false": TokenType.LITERAL.BOOLEAN,
    "final": TokenType.KEYWORD.MODIFIER.FINAL,
    "finally": TokenType.KEYWORD.FLOW_CONTROL.FINALLY,
    "float": TokenType.KEYWORD.FOR_FUTURE,
    "for": TokenType.KEYWORD.FLOW_CONTROL.FOR,
    "global": TokenType.KEYWORD.MODIFIER.ACCESS,
    "goto": TokenType.KEYWORD.FOR_FUTURE,
    "group": TokenType.KEYWORD.FOR_FUTURE,
    "hint": TokenType.KEYWORD.FOR_FUTURE,
    "if": TokenType.KEYWORD.FLOW_CONTROL.IF,
    "implements": TokenType.KEYWORD.DECLARATION.IMPLEMENTS,
    "import": TokenType.KEYWORD.FOR_FUTURE,
    "inner": TokenType.KEYWORD.FOR_FUTURE,
    "insert": TokenType.DATABASE.DML,
    "instanceof": TokenType.OPERATOR.LOGICAL.INSTANCE_OF,
    "interface": TokenType.KEYWORD.DECLARATION.INTERFACE,
    "into": TokenType.KEYWORD.FOR_FUTURE,
    "join": TokenType.KEYWORD.FOR_FUTURE,
    "loop": TokenType.KEYWORD.FOR_FUTURE,
    "merge": TokenType.DATABASE.DML,
    "new": TokenType.KEYWORD.OBJECT.NEW,
    "null": TokenType.LITERAL.NULL,
    "number": TokenType.KEYWORD.OTHER,
    "of": TokenType.KEYWORD.FOR_FUTURE,
    "on": TokenType.KEYWORD.OTHER,
    "outer": TokenType.KEYWORD.FOR_FUTURE,
    "override": TokenType.KEYWORD.MODIFIER.OVERRIDE,
    "package": TokenType.KEYWORD.OTHER,
    "parallel": TokenType.KEYWORD.FOR_FUTURE,
    "pragma": TokenType.KEYWORD.FOR_FUTURE,
    "private": TokenType.KEYWORD.MODIFIER.ACCESS,
    "protected": TokenType.KEYWORD.MODIFIER.ACCESS,
    "public": TokenType.KEYWORD.MODIFIER.ACCESS,
    "retrieve": TokenType.KEYWORD.FOR_FUTURE,
    "return": TokenType.KEYWORD.FLOW_CONTROL.RETURN,
    "returning": TokenType.KEYWORD.FOR_FUTURE,
    "search": TokenType.KEYWORD.FOR_FUTURE,
    "select": TokenType.QUERY.CLAUSE.SELECT,
    "short": TokenType.KEYWORD.FOR_FUTURE,
    "sort": TokenType.KEYWORD.OTHER,
    "stat": TokenType.KEYWORD.FOR_FUTURE,
    "static": TokenType.KEYWORD.MODIFIER.STATIC,
    "super": TokenType.KEYWORD.OBJECT.SUPER,
    "switch": TokenType.KEYWORD.FLOW_CONTROL.SWITCH,
    "synchronized": TokenType.KEYWORD.FOR_FUTURE,
    "testmethod": TokenType.KEYWORD.MODIFIER.TEST_METHOD,
    "this": TokenType.KEYWORD.OBJECT.THIS,
    "throw": TokenType.KEYWORD.FLOW_CONTROL.THROW,
    "transaction": TokenType.KEYWORD.FOR_FUTURE,
    "trigger": TokenType.KEYWORD.DECLARATION.TRIGGER,
    "true": TokenType.LITERAL.BOOLEAN,
    "try": TokenType.KEYWORD.FLOW_CONTROL.TRY,
    "type": TokenType.KEYWORD.FOR_FUTURE,
    "transient": TokenType.KEYWORD.MODIFIER.TRANSIENT,
    "undelete": TokenType.DATABASE.DML,
    "update": TokenType.DATABASE.DML,
    "upsert": TokenType.DATABASE.DML,
    "virtual": TokenType.KEYWORD.MODIFIER.DEFINITION,
    "webservice": TokenType.KEYWORD.MODIFIER.WEB_SERVICE,
    "while": TokenType.KEYWORD.FLOW_CONTROL.WHILE,
    "when": TokenType.KEYWORD.FLOW_CONTROL.SWITCH_CASE,
};

const soqlFunctions = {
    "avg": TokenType.QUERY.FUNCTION,
    "calendar_month": TokenType.QUERY.FUNCTION,
    "calendar_quarter": TokenType.QUERY.FUNCTION,
    "calendar_year": TokenType.QUERY.FUNCTION,
    "convertcurrency": TokenType.QUERY.FUNCTION,
    "converttimezone": TokenType.QUERY.FUNCTION,
    "count": TokenType.QUERY.FUNCTION,
    "day_in_month": TokenType.QUERY.FUNCTION,
    "day_in_week": TokenType.QUERY.FUNCTION,
    "day_in_year": TokenType.QUERY.FUNCTION,
    "day_only": TokenType.QUERY.FUNCTION,
    "data category": TokenType.QUERY.FUNCTION,
    "tolabel": TokenType.QUERY.FUNCTION,
    "includes": TokenType.QUERY.FUNCTION,
    "excludes": TokenType.QUERY.FUNCTION,
    "fiscal_month": TokenType.QUERY.FUNCTION,
    "fiscal_quarter": TokenType.QUERY.FUNCTION,
    "fiscal_year": TokenType.QUERY.FUNCTION,
    "format": TokenType.QUERY.FUNCTION,
    "grouping": TokenType.QUERY.FUNCTION,
    "group by cube": TokenType.QUERY.FUNCTION,
    "group by rollup": TokenType.QUERY.FUNCTION,
    "hour_in_day": TokenType.QUERY.FUNCTION,
    "max": TokenType.QUERY.FUNCTION,
    "min": TokenType.QUERY.FUNCTION,
    "sum": TokenType.QUERY.FUNCTION,
    "week_in_month": TokenType.QUERY.FUNCTION,
    "week_in_year": TokenType.QUERY.FUNCTION,
};

const queryClauses = {
    "using scope": TokenType.QUERY.CLAUSE.USING_SCOPE,
    "order by": TokenType.QUERY.CLAUSE.ORDER_BY,
    "where": TokenType.QUERY.CLAUSE.WHERE,
    "when": TokenType.QUERY.CLAUSE.WHEN,
    "typeof": TokenType.QUERY.CLAUSE.TYPE_OF,
    "then": TokenType.QUERY.CLAUSE.THEN,
    "nulls": TokenType.QUERY.CLAUSE.NULLS,
    "from": TokenType.QUERY.CLAUSE.FROM,
    "end": TokenType.QUERY.CLAUSE.END,
    "else": TokenType.QUERY.CLAUSE.ELSE,
    "group by": TokenType.QUERY.CLAUSE.GROUP_BY,
    "having": TokenType.QUERY.CLAUSE.HAVING,
    "with": TokenType.QUERY.CLAUSE.WITH,
    "limit": TokenType.QUERY.CLAUSE.LIMIT,
    "offset": TokenType.QUERY.CLAUSE.OFFSET,
    "for": TokenType.QUERY.CLAUSE.FOR,
};

const soqlOperators = {
    "above": TokenType.QUERY.OPERATOR,
    "above_or_below": TokenType.QUERY.OPERATOR,
    "and": TokenType.QUERY.OPERATOR,
    "at": TokenType.QUERY.OPERATOR,
    "reference": TokenType.QUERY.OPERATOR,
    "update": TokenType.QUERY.OPERATOR,
    "view": TokenType.QUERY.OPERATOR,
    "in": TokenType.QUERY.OPERATOR,
    "like": TokenType.QUERY.OPERATOR,
    "not in": TokenType.QUERY.OPERATOR,
    "not": TokenType.QUERY.OPERATOR,
    "or": TokenType.QUERY.OPERATOR,
    "update tracking": TokenType.QUERY.OPERATOR,
    "update viewstat": TokenType.QUERY.OPERATOR,
    "data category": TokenType.QUERY.OPERATOR,
    "snippet": TokenType.QUERY.OPERATOR,
    "network": TokenType.QUERY.OPERATOR,
    "metadata": TokenType.QUERY.OPERATOR,
    "using listview": TokenType.QUERY.OPERATOR,
    "division": TokenType.QUERY.OPERATOR,
    "highlight": TokenType.QUERY.OPERATOR,
    "spell_correction": TokenType.QUERY.OPERATOR,
    "returning": TokenType.QUERY.OPERATOR
};

const annotations = {
    "auraenabled": TokenType.ANNOTATION.NAME,
    "deprecated": TokenType.ANNOTATION.NAME,
    "future": TokenType.ANNOTATION.NAME,
    "invocablemethod": TokenType.ANNOTATION.NAME,
    "invocablevariable": TokenType.ANNOTATION.NAME,
    "istest": TokenType.ANNOTATION.NAME,
    "namespaceaccesible": TokenType.ANNOTATION.NAME,
    "readonly": TokenType.ANNOTATION.NAME,
    "remoteaction": TokenType.ANNOTATION.NAME,
    "supresswarnings": TokenType.ANNOTATION.NAME,
    "testsetup": TokenType.ANNOTATION.NAME,
    "testvisible": TokenType.ANNOTATION.NAME,
    "restresource": TokenType.ANNOTATION.NAME,
    "httpdelete": TokenType.ANNOTATION.NAME,
    "httpget": TokenType.ANNOTATION.NAME,
    "httppatch": TokenType.ANNOTATION.NAME,
    "httppost": TokenType.ANNOTATION.NAME,
    "httpPut": TokenType.ANNOTATION.NAME,
}

let nsSummary;

/**
 * Class to Tokenize any apex node to extract all tokens
 */
class ApexTokenizer {

    /**
     * Method to tokenize an Apex file
     * @param {String} filePathOrContent File path or file content to tokenize
     * @param {Object} [systemData] Object with the system data to identify tokens with more precission 
     * @param {Number} [tabSize] Integer number with the tab size for the file 
     * @returns {Array<Token>} Returns an array with all file tokens
     */
    static tokenize(filePathOrContent, systemData, tabSize) {
        if (!tabSize)
            tabSize = 4;
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
        const sObjects = systemData ? systemData.sObjects : [];
        const userClasses = systemData ? systemData.userClasses : [];
        const namespacesSummary = systemData ? systemData.namespaceSummary : undefined;
        if (!namespacesSummary)
            nsSummary = System.getAllNamespacesSummary();
        else
            nsSummary = namespacesSummary;
        const systemNamespace = nsSummary['system'];
        const NUM_FORMAT = /[0-9]/;
        const ID_FORMAT = /([a-zA-Z0-9À-ÿ]|_|–)/;
        content = StrUtils.replace(content, '\r\n', '\n');
        const tokens = [];
        let lineNumber = 0;
        let column = 0;
        let onCommentBlock = false;
        let onCommentLine = false;
        let onText = false;
        let onQuery = false;
        let onAnnotation = false;
        let sqBracketIndent = 0;
        let aBracketsIndex = [];
        const parentIndex = [];
        const bracketIndex = [];
        let auxBracketIndex = [];
        const classDeclarationIndex = [];
        const classDeclarationNames = [];
        const enumDeclarationIndex = [];
        const sqBracketIndex = [];
        const quottesIndex = [];
        const commentBlockIndex = [];
        for (let charIndex = 0, len = content.length; charIndex < len; charIndex++) {
            const fourChars = content.substring(charIndex, charIndex + 4);
            const threeChars = content.substring(charIndex, charIndex + 3);
            const twoChars = content.substring(charIndex, charIndex + 2);
            let char = content.charAt(charIndex);
            let token;
            let lastToken = (tokens.length > 0) ? tokens[tokens.length - 1] : undefined;
            const twoLastToken = (tokens.length > 1) ? tokens[tokens.length - 2] : undefined;
            if (fourChars.length === 4 && symbolTokens[fourChars] && aBracketsIndex.length === 0) {
                token = new Token(symbolTokens[fourChars], fourChars, lineNumber, column);
                charIndex += 3;
                column += 4;
            } else if (threeChars.length === 3 && symbolTokens[threeChars] && aBracketsIndex.length === 0) {
                token = new Token(symbolTokens[threeChars], threeChars, lineNumber, column);
                charIndex += 2;
                column += 3;
            } else if (twoChars.length === 2 && symbolTokens[twoChars]) {
                if (isLogicalOperator(symbolTokens[twoChars])) {
                    aBracketsIndex = [];
                }
                if (aBracketsIndex.length === 0) {
                    token = new Token(symbolTokens[twoChars], twoChars, lineNumber, column);
                    charIndex += 1;
                    column += 2;
                } else if (symbolTokens[char]) {
                    token = new Token(symbolTokens[char], char, lineNumber, column);
                    column++;
                }
            } else if (symbolTokens[char]) {
                token = new Token(symbolTokens[char], char, lineNumber, column);
                if (mustResetABracketIndex(token))
                    aBracketsIndex = [];
                column++;
            } else if (NUM_FORMAT.test(char)) {
                var numContent = '';
                while (NUM_FORMAT.test(char) || char === '.' || char === ':' || char === '+' || char === '-' || char.toLowerCase() === 't' || char.toLowerCase() === 'z') {
                    numContent += char;
                    char = content.charAt(++charIndex);
                }
                if (numContent.indexOf(':') !== -1 && numContent.indexOf('-') !== -1)
                    token = new Token(TokenType.LITERAL.DATETIME, numContent, lineNumber, column);
                else if (numContent.indexOf('-') !== -1)
                    token = new Token(TokenType.LITERAL.DATE, numContent, lineNumber, column);
                else if (numContent.indexOf(':') !== -1)
                    token = new Token(TokenType.LITERAL.TIME, numContent, lineNumber, column);
                else if (numContent.indexOf('.') !== -1) {
                    token = new Token(TokenType.LITERAL.DOUBLE, numContent, lineNumber, column);
                }
                else {
                    token = new Token(TokenType.LITERAL.INTEGER, numContent, lineNumber, column);
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
                token = new Token(TokenType.IDENTIFIER, idContent, lineNumber, column);
                column += idContent.length;
            } else if (char === "\n") {
                if (onCommentLine)
                    onCommentLine = false;
                lineNumber++;
                column = 0;
            } else if (char !== "\t" && char !== " " && char.trim().length != 0) {
                token = new Token(TokenType.UNKNOWN, char, lineNumber, column);
                column++;
            } else if (char === "\t") {
                column += tabSize;
            } else {
                column++;
            }

            if (token !== undefined) {
                if (!onText && !onCommentBlock && !onCommentLine && token.type === TokenType.PUNCTUATION.QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    if (onAnnotation) {
                        token.type = TokenType.ANNOTATION.CONTENT;
                    } else {
                        token.type = TokenType.PUNCTUATION.QUOTTES_START;
                        quottesIndex.push(tokens.length);
                    }
                    onText = true;
                    token.parentToken = tokens.length - 1;
                } else if (onText && token.type === TokenType.PUNCTUATION.QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    if (onAnnotation) {
                        token.type = TokenType.ANNOTATION.CONTENT;
                        const whitespaces = (lastToken.range.start.line !== token.range.start.line) ? 0 : token.range.start.character - lastToken.range.end.character;
                        token = new Token(TokenType.ANNOTATION.CONTENT, lastToken.text + StrUtils.getWhitespaces(whitespaces) + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else {
                        token.type = TokenType.PUNCTUATION.QUOTTES_END;
                        if (quottesIndex.length > 0) {
                            const index = quottesIndex.pop();
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                            token.parentToken = tokens[index].parentToken;
                        }
                    }
                    onText = false;
                } else if (!onAnnotation && !onText && !onCommentBlock && !onCommentLine && token.type === TokenType.COMMENT.BLOCK_START) {
                    onCommentBlock = true;
                    token.parentToken = tokens.length - 1;
                    commentBlockIndex.push(tokens.length);
                } else if (onCommentBlock && token.type === TokenType.COMMENT.BLOCK_END) {
                    onCommentBlock = false;
                    if (commentBlockIndex.length > 0) {
                        const index = commentBlockIndex.pop();
                        token.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                        token.parentToken = tokens[index].parentToken;
                    }
                } else if (!onAnnotation && !onText && !onCommentBlock && !onCommentLine && (token.type === TokenType.COMMENT.LINE || token.type === TokenType.COMMENT.LINE_DOC)) {
                    token.parentToken = tokens.length - 1;
                    onCommentLine = true;
                } else if (onText) {
                    if (onAnnotation) {
                        token.type = TokenType.ANNOTATION.CONTENT;
                        const whitespaces = (lastToken.range.start.line !== token.range.start.line) ? 0 : token.range.start.character - lastToken.range.end.character;
                        token = new Token(TokenType.ANNOTATION.CONTENT, lastToken.text + StrUtils.getWhitespaces(whitespaces) + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else {
                        token.type = TokenType.LITERAL.STRING;
                        if (quottesIndex.length > 0) {
                            token.parentToken = quottesIndex[quottesIndex.length - 1];
                        }
                    }
                } else if (onCommentBlock || onCommentLine) {
                    if (onCommentBlock && token.text === '/' && lastToken && lastToken.text === '/**') {
                        tokens[tokens.length - 1].text = '/*';
                        token.text = '*/';
                        token.type = TokenType.COMMENT.BLOCK_END;
                        onCommentBlock = false;
                    } else {
                        token.type = TokenType.COMMENT.CONTENT;
                        if (commentBlockIndex.length > 0) {
                            token.parentToken = commentBlockIndex[commentBlockIndex.length - 1];
                        }
                    }
                } else if (lastToken && (isOperator(lastToken) || isBracket(lastToken)) && token.type === TokenType.OPERATOR.ARITHMETIC.ADD) {
                    token.type = TokenType.OPERATOR.ARITHMETIC.POSITIVE;
                } else if (lastToken && (isOperator(lastToken) || isBracket(lastToken)) && token.type === TokenType.OPERATOR.ARITHMETIC.SUBSTRACT) {
                    token.type = TokenType.OPERATOR.ARITHMETIC.NEGATIVE;
                } else if (onAnnotation && token.type !== TokenType.OPERATOR.PRIORITY.PARENTHESIS_CLOSE) {
                    token.type = TokenType.ANNOTATION.CONTENT;
                } else if (token.type === TokenType.OPERATOR.LOGICAL.LESS_THAN) {
                    aBracketsIndex.push(tokens.length);
                } else if (token.type === TokenType.OPERATOR.LOGICAL.GREATER_THAN) {
                    if (aBracketsIndex.length > 0) {
                        let index = aBracketsIndex.pop();
                        if (tokens[index] && tokens[index].type === TokenType.OPERATOR.LOGICAL.LESS_THAN) {
                            tokens[index].type = TokenType.BRACKET.PARAMETRIZED_TYPE_OPEN;
                            if (tokens[index + 1] && tokens[index + 1].type === TokenType.ENTITY.VARIABLE) {
                                tokens[index + 1].type = TokenType.DATATYPE.CUSTOM_CLASS;
                            }
                            if (tokens[tokens.length - 1] && tokens[tokens.length - 1].type === TokenType.ENTITY.VARIABLE) {
                                tokens[tokens.length - 1].type = TokenType.DATATYPE.CUSTOM_CLASS;
                            }
                            token.type = TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE;
                        }
                        token.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                    }
                } else if (token.type === TokenType.BRACKET.CURLY_OPEN && lastToken) {
                    if ((lastToken.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === TokenType.BRACKET.SQUARE_CLOSE) && bracketIndex.length > 0 && classDeclarationIndex.length === 0) {
                        token.type = TokenType.BRACKET.INIT_VALUES_OPEN;
                    } else if (lastToken.type === TokenType.KEYWORD.MODIFIER.STATIC) {
                        tokens[tokens.length - 1].type = TokenType.KEYWORD.DECLARATION.STATIC_CONSTRUCTOR;
                    } else if (lastToken.textToLower === 'get') {
                        tokens[tokens.length - 1].type = TokenType.KEYWORD.DECLARATION.PROPERTY_GETTER;
                    } else if (lastToken.textToLower === 'set') {
                        tokens[tokens.length - 1].type = TokenType.KEYWORD.DECLARATION.PROPERTY_SETTER;
                    } else if (lastToken.type === TokenType.DECLARATION.ENTITY.VARIABLE) {
                        tokens[tokens.length - 1].type = TokenType.DECLARATION.ENTITY.PROPERTY;
                    } else if (lastToken.type === TokenType.BRACKET.CURLY_OPEN || lastToken.type === TokenType.BRACKET.CURLY_CLOSE || lastToken.type === TokenType.PUNCTUATION.SEMICOLON) {
                        token.type = TokenType.BRACKET.INITIALIZER_OPEN;
                    } else if (lastToken.type === TokenType.COMMENT.CONTENT || lastToken.type === TokenType.COMMENT.LINE || lastToken.type === TokenType.COMMENT.LINE_DOC || lastToken.type === TokenType.COMMENT.BLOCK_END) {
                        let auxToken = lastToken;
                        let finish = false;
                        while (!finish) {
                            if (auxToken.parentToken !== undefined && auxToken.parentToken !== -1) {
                                auxToken = tokens[auxToken.parentToken];
                            } else {
                                finish = true;
                            }
                            if (auxToken.type === TokenType.BRACKET.CURLY_OPEN || auxToken.type === TokenType.BRACKET.CURLY_CLOSE || auxToken.type === TokenType.PUNCTUATION.SEMICOLON) {
                                finish = true;
                                token.type = TokenType.BRACKET.INITIALIZER_OPEN;
                            } else if (auxToken.type !== TokenType.COMMENT.CONTENT && auxToken.type !== TokenType.COMMENT.LINE && auxToken.type !== TokenType.COMMENT.LINE_DOC && auxToken.type !== TokenType.COMMENT.BLOCK_END) {
                                finish = true;
                            }
                        }
                    }
                    if (lastToken.parentToken !== undefined)
                        token.parentToken = lastToken.parentToken;
                    else
                        token.parentToken = tokens.length - 1;
                    if (lastToken.type === TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.ELSE || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.TRY || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.FINALLY || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.DO) {
                        if (lastToken.type === TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE && lastToken.parentToken !== undefined)
                            token.parentToken = lastToken.parentToken;
                        else
                            token.parentToken = tokens.length - 1
                    }
                    if (classDeclarationIndex.length > 0)
                        token.parentToken = classDeclarationIndex.pop();
                    bracketIndex.push(tokens.length);
                } else if (token.type === TokenType.BRACKET.CURLY_CLOSE) {
                    if (bracketIndex.length > 0) {
                        let index = bracketIndex.pop();
                        if (tokens[index] && tokens[index].type === TokenType.BRACKET.INIT_VALUES_OPEN) {
                            token.type = TokenType.BRACKET.INIT_VALUES_CLOSE;
                        } else if (tokens[index] && tokens[index].type === TokenType.BRACKET.INITIALIZER_OPEN) {
                            token.type = TokenType.BRACKET.INITIALIZER_CLOSE;
                        }
                        if (tokens[index].parentToken)
                            token.parentToken = tokens[index].parentToken;
                        else
                            token.parentToken = index;
                        token.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                    }
                    if (enumDeclarationIndex.length > 0)
                        enumDeclarationIndex.pop();
                } else if (token.type === TokenType.OPERATOR.ASSIGN.ASSIGN && onQuery) {
                    token.type = TokenType.OPERATOR.LOGICAL.EQUALITY;
                } else if (token.type === TokenType.BRACKET.SQUARE_OPEN) {
                    sqBracketIndex.push(tokens.length);
                    sqBracketIndent++;
                } else if (token.type === TokenType.BRACKET.SQUARE_CLOSE) {
                    sqBracketIndent--;
                    if (sqBracketIndent === 0) {
                        if (onQuery) {
                            onQuery = false;
                            token.type = TokenType.BRACKET.QUERY_END;
                        } else if (twoLastToken && lastToken && twoLastToken.type === TokenType.ENTITY.VARIABLE && lastToken.type === TokenType.BRACKET.SQUARE_OPEN) {
                            tokens[tokens.length - 2].type = TokenType.DATATYPE.CUSTOM_CLASS;
                        }
                    }
                    if (sqBracketIndex.length > 0) {
                        let index = sqBracketIndex.pop();
                        token.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                    }
                } else if (token.type === TokenType.PUNCTUATION.SEMICOLON) {
                    if (lastToken && lastToken.textToLower === 'get') {
                        tokens[tokens.length - 1].type = TokenType.KEYWORD.DECLARATION.PROPERTY_GETTER;
                    } else if (lastToken && lastToken.textToLower === 'set') {
                        tokens[tokens.length - 1].type = TokenType.KEYWORD.DECLARATION.PROPERTY_SETTER;
                    }
                } else if (isObjectAccessor(token)) {
                    if (lastToken && lastToken.type === TokenType.KEYWORD.DECLARATION.TRIGGER)
                        tokens[tokens.length - 1].type = TokenType.DATATYPE.SUPPORT_CLASS;
                    if (lastToken && lastToken.type === TokenType.KEYWORD.DECLARATION.CLASS)
                        tokens[tokens.length - 1].type = TokenType.DATATYPE.SUPPORT_CLASS;
                } else if (token.type === TokenType.IDENTIFIER) {
                    if (token.textToLower != 'constructor' && reservedKeywords[token.textToLower] && reservedKeywords[token.textToLower] !== TokenType.KEYWORD.FOR_FUTURE) {
                        if (!onQuery || (onQuery && lastToken.type !== TokenType.QUERY.VALUE_BIND)) {
                            token.type = reservedKeywords[token.textToLower];
                            if (lastToken && isDatatypeToken(lastToken) && token.type !== TokenType.KEYWORD.DECLARATION.IMPLEMENTS) {
                                token.type = TokenType.DECLARATION.ENTITY.VARIABLE
                            }
                        }
                        if(lastToken && isObjectAccessor(lastToken) && token.type === TokenType.KEYWORD.DECLARATION.CLASS){
                            token.type = TokenType.DATATYPE.SUPPORT_CLASS;
                        }
                        if (token.type === TokenType.KEYWORD.FLOW_CONTROL.IF && lastToken && lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.ELSE) {
                            token = new Token(TokenType.KEYWORD.FLOW_CONTROL.ELSE_IF, lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                            tokens.pop();
                            lastToken = tokens[tokens.length - 1];
                        }
                    } 
                    if (!onQuery && !onAnnotation && lastToken && lastToken.type === TokenType.PUNCTUATION.AT && annotations[token.textToLower]) {
                        token = new Token(TokenType.ANNOTATION.ENTITY, lastToken.text + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (!onQuery && (token.type === TokenType.QUERY.CLAUSE.SELECT || token.type === TokenType.QUERY.CLAUSE.FIND) && lastToken.type === TokenType.BRACKET.SQUARE_OPEN && sqBracketIndent === 1) {
                        onQuery = true;
                        tokens[tokens.length - 1].type = TokenType.BRACKET.QUERY_START;
                    } else if (onQuery && token.type === TokenType.QUERY.CLAUSE.SELECT && lastToken && lastToken.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_OPEN) {
                        tokens[tokens.length - 1].type = TokenType.BRACKET.INNER_QUERY_START;
                    } else if (onQuery && token.textToLower != 'constructor' && soqlFunctions[token.textToLower] && lastToken && lastToken.type !== TokenType.QUERY.VALUE_BIND && !isObjectAccessor(lastToken)) {
                        token.type = soqlFunctions[token.textToLower];
                    } else if (onQuery && token.textToLower != 'constructor' && soqlOperators[token.textToLower] && lastToken && lastToken.type !== TokenType.QUERY.VALUE_BIND && !isObjectAccessor(lastToken)) {
                        token.type = soqlOperators[token.textToLower];
                    } else if (onQuery && token.textToLower != 'constructor' && queryClauses[token.textToLower] && lastToken && lastToken.type !== TokenType.QUERY.VALUE_BIND && !isObjectAccessor(lastToken)) {
                        token.type = queryClauses[token.textToLower];
                    } else if (onQuery && token.textToLower === 'scope' && lastToken && lastToken.textToLower === 'using') {
                        token = new Token(queryClauses['using scope'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'by' && lastToken && lastToken.textToLower === 'order') {
                        token = new Token(queryClauses['order by'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'by' && lastToken && lastToken.textToLower === 'group') {
                        token = new Token(queryClauses['group by'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'cube' && lastToken && lastToken.type === TokenType.QUERY.CLAUSE.GROUP_BY) {
                        token = new Token(soqlFunctions['group by cube'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'rollup' && lastToken && lastToken.type === TokenType.QUERY.CLAUSE.GROUP_BY) {
                        token = new Token(soqlFunctions['group by rollup'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'category' && lastToken && lastToken.textToLower === 'data') {
                        token = new Token(soqlFunctions['data category'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'update' && lastToken && lastToken.textToLower === 'tracking') {
                        token = new Token(soqlFunctions['update tracking'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'update' && lastToken && lastToken.textToLower === 'tracking') {
                        token = new Token(soqlFunctions['update viewstat'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'listview' && lastToken && lastToken.textToLower === 'using') {
                        token = new Token(soqlFunctions['using listview'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (token.textToLower === 'sharing' && lastToken && (lastToken.textToLower === 'with' || lastToken.textToLower === 'without' || lastToken.textToLower === 'inherited')) {
                        token = new Token(TokenType.KEYWORD.MODIFIER.SHARING, lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (lastToken && lastToken.type === TokenType.LITERAL.DATE_PARAMETRIZED_START_PARAM) {
                        token.type = TokenType.LITERAL.DATE_PARAMETRIZED_PARAM_VARIABLE;
                    } else if (token.textToLower != 'constructor' && primitiveDatatypes[token.textToLower]) {
                        if (!onQuery) {
                            token.type = primitiveDatatypes[token.textToLower];
                            if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === TokenType.BRACKET.SQUARE_CLOSE || lastToken.type === TokenType.ENTITY.ENUM_VALUE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE))
                                token.type = TokenType.DECLARATION.ENTITY.VARIABLE;
                            else if (lastToken && isObjectAccessor(lastToken))
                                token.type = TokenType.ENTITY.CLASS_MEMBER;
                        }
                        else
                            token.type = TokenType.ENTITY.SOBJECT_PROJECTION_FIELD;
                    } else if (token.textToLower != 'constructor' && collectionsDatatypes[token.textToLower]) {
                        token.type = collectionsDatatypes[token.textToLower];
                        if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === TokenType.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE))
                            token.type = TokenType.DECLARATION.ENTITY.VARIABLE;
                    } else if (token.textToLower != 'constructor' && dateLiterals[token.textToLower] && onQuery && lastToken && lastToken.text !== ':') {
                        token.type = dateLiterals[token.textToLower];
                    } else if (sObjects && sObjects.includes(token.textToLower) && (token.textToLower != 'constructor' && token.textToLower !== 'name')) {
                        token.type = TokenType.DATATYPE.SOBJECT;
                        if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === TokenType.ENTITY.VARIABLE || lastToken.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === TokenType.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE)) {
                            tokens[tokens.length - 1].type = TokenType.DATATYPE.CUSTOM_CLASS;
                            token.type = TokenType.DECLARATION.ENTITY.VARIABLE;
                        }
                        if (onQuery && lastToken && lastToken.type === TokenType.QUERY.CLAUSE.SELECT)
                            token.type = TokenType.ENTITY.SOBJECT_PROJECTION_FIELD;
                        else if (onQuery && twoLastToken && twoLastToken.type === TokenType.ENTITY.SOBJECT_PROJECTION_FIELD)
                            token.type = TokenType.ENTITY.SOBJECT_PROJECTION_FIELD;
                    } else if (lastToken && lastToken.type === TokenType.KEYWORD.DECLARATION.CLASS) {
                        token.type = TokenType.DECLARATION.ENTITY.CLASS;
                        classDeclarationIndex.push(tokens.length);
                        classDeclarationNames.push(token.textToLower);
                    } else if (lastToken && lastToken.type === TokenType.KEYWORD.DECLARATION.ENUM) {
                        token.type = TokenType.DECLARATION.ENTITY.ENUM;
                        classDeclarationIndex.push(tokens.length);
                        enumDeclarationIndex.push(tokens.length);
                    } else if (lastToken && lastToken.type === TokenType.KEYWORD.DECLARATION.INTERFACE) {
                        token.type = TokenType.DECLARATION.ENTITY.INTERFACE;
                        classDeclarationIndex.push(tokens.length);
                        classDeclarationNames.push(token.textToLower);
                    } else if (userClasses && userClasses.includes(token.textToLower)) {
                        token.type = TokenType.DATATYPE.CUSTOM_CLASS;
                        if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === TokenType.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE))
                            token.type = TokenType.DECLARATION.ENTITY.VARIABLE;
                    } else if (token.textToLower === 'system') {
                        token.type = TokenType.DATATYPE.SUPPORT_CLASS;
                        if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === TokenType.DATATYPE.SUPPORT_CLASS) {
                            tokens[tokens.length - 2].type = TokenType.DATATYPE.SUPPORT_NAMESPACE;
                        }
                        if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === TokenType.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE))
                            token.type = TokenType.DECLARATION.ENTITY.VARIABLE;
                    } else if (token.textToLower != 'constructor' && systemNamespace && systemNamespace[token.textToLower] && (lastToken && lastToken.type !== TokenType.KEYWORD.MODIFIER.ACCESS)) {
                        token.type = TokenType.DATATYPE.SUPPORT_CLASS;
                        if (token.textToLower === 'trigger')
                            token.type = TokenType.KEYWORD.DECLARATION.TRIGGER;
                        if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === TokenType.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE))
                            token.type = TokenType.DECLARATION.ENTITY.VARIABLE;
                    } else if (token.textToLower != 'constructor' && nsSummary[token.textToLower] && token.textToLower !== 'system') {
                        token.type = TokenType.DATATYPE.SUPPORT_NAMESPACE;
                        if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === TokenType.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE))
                            token.type = TokenType.DECLARATION.ENTITY.VARIABLE;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && nsSummary[twoLastToken.textToLower] && nsSummary[twoLastToken.textToLower][token.textToLower] && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE)) {
                        token.type = TokenType.DATATYPE.SUPPORT_CLASS;
                        tokens[tokens.length - 2].type = TokenType.DATATYPE.SUPPORT_NAMESPACE;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === TokenType.DATATYPE.SUPPORT_CLASS && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE)) {
                        token.type = TokenType.ENTITY.SUPPORT_CLASS_MEMBER;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === TokenType.DATATYPE.SOBJECT && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE)) {
                        token.type = TokenType.ENTITY.SOBJECT_FIELD;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === TokenType.ENTITY.SOBJECT_FIELD && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE)) {
                        token.type = TokenType.ENTITY.SOBJECT_FIELD;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === TokenType.ENTITY.SOBJECT_PROJECTION_FIELD && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE)) {
                        token.type = TokenType.ENTITY.SOBJECT_PROJECTION_FIELD;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === TokenType.DATATYPE.CUSTOM_CLASS && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE)) {
                        token.type = TokenType.ENTITY.CLASS_MEMBER;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === TokenType.ENTITY.CLASS_MEMBER && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE)) {
                        token.type = TokenType.ENTITY.CLASS_MEMBER;
                    } else if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === TokenType.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE)) {
                        token.type = TokenType.DECLARATION.ENTITY.VARIABLE;
                    } else if (onQuery && isQueryField(token, lastToken, twoLastToken) && token.textToLower != 'constructor' && !reservedKeywords[token.textToLower]) {
                        if (lastToken && lastToken.type === TokenType.ENTITY.SOBJECT_PROJECTION_FIELD)
                            token.type = TokenType.ENTITY.ALIAS_FIELD;
                        else
                            token.type = TokenType.ENTITY.SOBJECT_PROJECTION_FIELD
                    } else if (token.type === TokenType.DATABASE.TRIGGER_EXEC && lastToken && lastToken.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_OPEN) {
                        tokens[tokens.length - 1].type = TokenType.BRACKET.TRIGGER_GUARD_OPEN;
                    } else if (token.textToLower == 'constructor' || !reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE) {
                        if (lastToken && lastToken.type === TokenType.QUERY.CLAUSE.USING_SCOPE)
                            token.type = TokenType.QUERY.SCOPE_VALUE;
                        else if (lastToken && lastToken.type === TokenType.QUERY.CLAUSE.NULLS)
                            token.type = TokenType.QUERY.NULLS_VALUE;
                        else {
                            if (lastToken && lastToken.type === TokenType.ENTITY.CLASS_MEMBER)
                                tokens[tokens.length - 1].type = TokenType.DATATYPE.CUSTOM_CLASS;
                            if (lastToken && isObjectAccessor(lastToken) && twoLastToken && isDatatypeToken(twoLastToken)) {
                                token.type = TokenType.ENTITY.CLASS_MEMBER;
                            } else if (token.type !== TokenType.KEYWORD.FLOW_CONTROL.ELSE_IF) {
                                if (!lastToken || (lastToken.type !== TokenType.BRACKET.PARAMETRIZED_TYPE_OPEN && lastToken.type !== TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE)) {
                                    if (lastToken && isObjectAccessor(lastToken)) {
                                        token.type = TokenType.ENTITY.VARIABLE;
                                    } else if (lastToken && (lastToken.type === TokenType.KEYWORD.DECLARATION.IMPLEMENTS || lastToken.type === TokenType.KEYWORD.DECLARATION.EXTENDS)) {
                                        token.type = TokenType.DATATYPE.CUSTOM_CLASS;
                                    } else {
                                        token.type = TokenType.ENTITY.VARIABLE;
                                    }
                                } else
                                    token.type = TokenType.DATATYPE.CUSTOM_CLASS;
                                if (enumDeclarationIndex.length > 0) {
                                    token.type = TokenType.ENTITY.ENUM_VALUE;
                                } else if (lastToken && (lastToken.type === TokenType.ENTITY.VARIABLE || lastToken.type === TokenType.ENTITY.ENUM_VALUE)) {
                                    token.type = TokenType.DECLARATION.ENTITY.VARIABLE;
                                    tokens[tokens.length - 1].type = TokenType.DATATYPE.CUSTOM_CLASS;
                                }
                            }
                        }
                    } else {
                        if (lastToken && isObjectAccessor(lastToken) && (!lastToken || !reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === TokenType.KEYWORD.FOR_FUTURE)) {
                            token.type = TokenType.ENTITY.VARIABLE;
                        }
                    }
                } else if (lastToken && lastToken.type === TokenType.LITERAL.INTEGER && token.textToLower === 'l') {
                    tokens[tokens.length - 1].type = TokenType.LITERAL.LONG;
                    token.type = TokenType.LITERAL.LONG_INDICATOR;
                } else if (lastToken && lastToken.type === TokenType.LITERAL.DOUBLE && token.textToLower === 'd') {
                    tokens[tokens.length - 1].type = TokenType.LITERAL.DOUBLE;
                    token.type = TokenType.LITERAL.DOUBLE_INDICATOR;
                } else {
                    if (token.type !== TokenType.PUNCTUATION.COMMA && !isDatatypeToken(token)) {
                        if (aBracketsIndex.length > 0)
                            aBracketsIndex = [];
                    }
                    if (lastToken && lastToken.type === TokenType.LITERAL.DATE_PARAMETRIZED && token.type === TokenType.PUNCTUATION.COLON) {
                        token.type = TokenType.LITERAL.DATE_PARAMETRIZED_START_PARAM;
                    } else if (onQuery && token.type === TokenType.PUNCTUATION.COLON) {
                        token.type = TokenType.QUERY.VALUE_BIND;
                    } else if (token.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_OPEN) {
                        if (lastToken && lastToken.type === TokenType.ANNOTATION.ENTITY) {
                            token.type = TokenType.BRACKET.ANNOTATION_PARAM_OPEN;
                            onAnnotation = true;
                        } else if (lastToken && lastToken.type === TokenType.ENTITY.SUPPORT_CLASS_MEMBER) {
                            tokens[tokens.length - 1].type = TokenType.ENTITY.SUPPORT_CLASS_FUNCTION;
                            token.type = TokenType.BRACKET.PARENTHESIS_PARAM_OPEN;
                        } else if (lastToken && lastToken.type === TokenType.DECLARATION.ENTITY.VARIABLE) {
                            tokens[tokens.length - 1].type = TokenType.DECLARATION.ENTITY.FUNCTION;
                            token.type = TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                        } else if (lastToken && lastToken.type === TokenType.DATATYPE.CUSTOM_CLASS) {
                            if (classDeclarationNames.includes(lastToken.textToLower) && twoLastToken && twoLastToken.type !== TokenType.KEYWORD.OBJECT.NEW) {
                                tokens[tokens.length - 1].type = TokenType.DECLARATION.ENTITY.CONSTRUCTOR;
                                token.type = TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                            } else {
                                tokens[tokens.length - 1].type = TokenType.ENTITY.FUNCTION;
                                token.type = TokenType.BRACKET.PARENTHESIS_PARAM_OPEN;
                            }
                        } else if (lastToken && lastToken.type === TokenType.ENTITY.CLASS_MEMBER) {
                            tokens[tokens.length - 1].type = TokenType.ENTITY.CLASS_FUNCTION;
                            token.type = TokenType.BRACKET.PARENTHESIS_PARAM_OPEN;
                        } else if (lastToken && lastToken.type === TokenType.ENTITY.VARIABLE) {
                            if (classDeclarationNames.includes(lastToken.textToLower) && twoLastToken && twoLastToken.type !== TokenType.KEYWORD.OBJECT.NEW) {
                                tokens[tokens.length - 1].type = TokenType.DECLARATION.ENTITY.CONSTRUCTOR;
                                token.type = TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                            } else {
                                tokens[tokens.length - 1].type = TokenType.ENTITY.FUNCTION;
                                token.type = TokenType.BRACKET.PARENTHESIS_PARAM_OPEN;
                            }
                        } else if (lastToken && lastToken.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE) {
                            if (classDeclarationNames.includes(lastToken.textToLower) && twoLastToken && twoLastToken.type !== TokenType.KEYWORD.OBJECT.NEW) {
                                tokens[tokens.length - 1].type = TokenType.DECLARATION.ENTITY.CONSTRUCTOR;
                                token.type = TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                            } else {
                                token.type = TokenType.BRACKET.PARENTHESIS_PARAM_OPEN;
                            }
                        } else if (lastToken && (lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.IF || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.ELSE_IF || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.CATCH || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.WHILE || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.FOR)) {
                            token.type = TokenType.BRACKET.PARENTHESIS_GUARD_OPEN;
                        }
                        token.parentToken = tokens.length - 1;
                        parentIndex.push(tokens.length);
                    } else if (token.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_CLOSE) {
                        if (parentIndex.length > 0) {
                            let index = parentIndex.pop();
                            if (tokens[index]) {
                                if (tokens[index].type === TokenType.BRACKET.PARENTHESIS_PARAM_OPEN) {
                                    token.type = TokenType.BRACKET.PARENTHESIS_PARAM_CLOSE;
                                } else if (tokens[index].type === TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN) {
                                    token.type = TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE;
                                } else if (tokens[index].type === TokenType.BRACKET.ANNOTATION_PARAM_OPEN) {
                                    onAnnotation = false;
                                    token.type = TokenType.BRACKET.ANNOTATION_PARAM_CLOSE;
                                } else if (tokens[index].type === TokenType.BRACKET.PARENTHESIS_GUARD_OPEN) {
                                    token.type = TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE;
                                } else if (tokens[index].type === TokenType.BRACKET.TRIGGER_GUARD_OPEN) {
                                    token.type = TokenType.BRACKET.TRIGGER_GUARD_CLOSE;
                                } else if (tokens[index].type === TokenType.BRACKET.INNER_QUERY_START) {
                                    token.type = TokenType.BRACKET.INNER_QUERY_END;
                                }
                                token.parentToken = tokens[index].parentToken;
                                token.pairToken = index;
                                tokens[index].pairToken = tokens.length;
                            }
                            if (twoLastToken && twoLastToken.text === '(' && lastToken && isDatatypeToken(lastToken)) {
                                tokens[index].type = TokenType.BRACKET.CASTING_OPEN;
                                token.type = TokenType.BRACKET.CASTING_CLOSE;
                                token.pairToken = index;
                                tokens[index].pairToken = tokens.length;
                            }
                        }
                    }
                }
                if (lastToken && (lastToken.type === TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.ELSE)) {
                    if (token.type !== TokenType.BRACKET.CURLY_OPEN && token.type !== TokenType.PUNCTUATION.SEMICOLON) {
                        let newToken = new Token(TokenType.BRACKET.CURLY_OPEN, '{', lastToken.range.start.line, lastToken.range.start.character + 1);
                        newToken.isAux = true;
                        newToken.parentToken = (lastToken.parentToken) ? lastToken.parentToken : tokens.length - 1;
                        auxBracketIndex.push(tokens.length);
                        tokens.push(newToken);
                    }
                } else if (token.type === TokenType.BRACKET.CURLY_CLOSE && !token.isAux && auxBracketIndex.length > 0) {
                    for (const index of auxBracketIndex) {
                        let tokenAux = tokens[index];
                        let newToken = new Token(TokenType.BRACKET.CURLY_CLOSE, '}', 0, 0);
                        newToken.parentToken = (tokenAux.parentToken) ? tokenAux.parentToken : token.parentToken;
                        newToken.isAux = true;
                        newToken.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                        tokens.push(newToken);
                    }
                    auxBracketIndex = [];
                }
                tokens.push(token);
                if ((token.type === TokenType.PUNCTUATION.SEMICOLON) && auxBracketIndex.length > 0) {
                    let index = auxBracketIndex.pop();
                    let tokenAux = tokens[index];
                    let newToken = new Token(TokenType.BRACKET.CURLY_CLOSE, '}', token.range.start.line + 1, token.range.start.character - 4);
                    newToken.isAux = true;
                    newToken.parentToken = tokenAux.parentToken;
                    newToken.pairToken = index;
                    tokens[index].pairToken = tokens.length;
                    tokens.push(newToken);
                    let tokentmp = tokens[index - 1];
                    if (tokentmp.type === TokenType.KEYWORD.FLOW_CONTROL.ELSE && auxBracketIndex.length > 0) {
                        index = auxBracketIndex.pop();
                        tokenAux = tokens[index];
                        newToken = new Token(TokenType.BRACKET.CURLY_CLOSE, '}', 0, 0);
                        newToken.isAux = true;
                        newToken.parentToken = tokenAux.parentToken;
                        newToken.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                        tokens.push(newToken);
                    }
                }
            }
        }
        return tokens;
    }
}
module.exports = ApexTokenizer;

function isOperator(token) {
    switch (token.type) {
        case TokenType.OPERATOR.ARITHMETIC.ADD:
        case TokenType.OPERATOR.ARITHMETIC.ADD_ASSIGN:
        case TokenType.OPERATOR.ARITHMETIC.DIVIDE:
        case TokenType.OPERATOR.ARITHMETIC.DIVIDE_ASSIGN:
        case TokenType.OPERATOR.ARITHMETIC.MULTIPLY:
        case TokenType.OPERATOR.ARITHMETIC.MULTIPLY_ASSIGN:
        case TokenType.OPERATOR.ARITHMETIC.SUBSTRACT:
        case TokenType.OPERATOR.ARITHMETIC.SUBSTRACT_ASSIGN:
        case TokenType.OPERATOR.ASSIGN.ASSIGN:
        case TokenType.OPERATOR.ASSIGN.MAP_KEY_VALUE:
        case TokenType.OPERATOR.BITWISE.AND:
        case TokenType.OPERATOR.BITWISE.EXCLUSIVE_OR:
        case TokenType.OPERATOR.BITWISE.EXCLUSIVE_OR_ASSIGN:
        case TokenType.OPERATOR.BITWISE.LEFT_ASSIGN:
        case TokenType.OPERATOR.BITWISE.OR:
        case TokenType.OPERATOR.BITWISE.SIGNED_LEFT:
        case TokenType.OPERATOR.BITWISE.SIGNED_RIGHT:
        case TokenType.OPERATOR.BITWISE.SIGNED_RIGTH_ASSIGN:
        case TokenType.OPERATOR.BITWISE.UNSIGNED_RIGHT:
        case TokenType.OPERATOR.BITWISE.UNSIGNED_RIGHT_ASSIGN:
        case TokenType.OPERATOR.LOGICAL.AND:
        case TokenType.OPERATOR.LOGICAL.AND_ASSIGN:
        case TokenType.OPERATOR.LOGICAL.EQUALITY:
        case TokenType.OPERATOR.LOGICAL.EQUALITY_EXACT:
        case TokenType.OPERATOR.LOGICAL.GREATER_THAN:
        case TokenType.OPERATOR.LOGICAL.GREATER_THAN_EQUALS:
        case TokenType.OPERATOR.LOGICAL.INEQUALITY:
        case TokenType.OPERATOR.LOGICAL.INEQUALITY_EXACT:
        case TokenType.OPERATOR.LOGICAL.LESS_THAN:
        case TokenType.OPERATOR.LOGICAL.LESS_THAN_EQUALS:
        case TokenType.OPERATOR.LOGICAL.OR:
        case TokenType.OPERATOR.LOGICAL.OR_ASSIGN:
        case TokenType.PUNCTUATION.EXMARK:
        case TokenType.PUNCTUATION.COLON:
            return true;
        default:
            return false;
    }
}

function isBracket(token) {
    switch (token.type) {
        case TokenType.BRACKET.ANNOTATION_PARAM_CLOSE:
        case TokenType.BRACKET.ANNOTATION_PARAM_OPEN:
        case TokenType.BRACKET.CURLY_CLOSE:
        case TokenType.BRACKET.CURLY_OPEN:
        case TokenType.BRACKET.INITIALIZER_OPEN:
        case TokenType.BRACKET.INITIALIZER_CLOSE:
        case TokenType.BRACKET.INIT_VALUES_CLOSE:
        case TokenType.BRACKET.INIT_VALUES_OPEN:
        case TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE:
        case TokenType.BRACKET.PARAMETRIZED_TYPE_OPEN:
        case TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE:
        case TokenType.BRACKET.PARENTHESIS_GUARD_OPEN:
        case TokenType.BRACKET.PARENTHESIS_PARAM_OPEN:
        case TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE:
        case TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN:
        case TokenType.BRACKET.CASTING_OPEN:
        case TokenType.BRACKET.CASTING_CLOSE:
        case TokenType.BRACKET.TRIGGER_GUARD_CLOSE:
        case TokenType.BRACKET.TRIGGER_GUARD_OPEN:
            return true;
        default:
            return false;
    }
}

function isLogicalOperator(symbol) {
    return symbol === TokenType.OPERATOR.LOGICAL.INEQUALITY || symbol === TokenType.OPERATOR.LOGICAL.EQUALITY || symbol === TokenType.OPERATOR.LOGICAL.OR || symbol === TokenType.OPERATOR.LOGICAL.OR_ASSIGN || symbol === TokenType.OPERATOR.LOGICAL.AND || symbol === TokenType.OPERATOR.LOGICAL.AND_ASSIGN;
}

function isDatatypeToken(token) {
    return token.type === TokenType.DATATYPE.SUPPORT_CLASS || token.type === TokenType.DATATYPE.SUPPORT_NAMESPACE || token.type === TokenType.DATATYPE.CUSTOM_CLASS || token.type === TokenType.DATATYPE.PRIMITIVE || token.type === TokenType.DATATYPE.COLLECTION || token.type === TokenType.DATATYPE.SOBJECT || token.type === TokenType.ENTITY.CLASS_MEMBER || token.type === TokenType.ENTITY.SUPPORT_CLASS_MEMBER;
}

function isObjectAccessor(token) {
    return token.type === TokenType.PUNCTUATION.OBJECT_ACCESSOR || token.type === TokenType.PUNCTUATION.SAFE_OBJECT_ACCESSOR;
}

function isQueryField(token, lastToken, twoLastToken) {
    let isQueryField = true;
    if (lastToken && lastToken.type === TokenType.QUERY.VALUE_BIND) {
        isQueryField = false;
    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type !== TokenType.ENTITY.SOBJECT_FIELD) {
        isQueryField = false;
    } else if (lastToken && lastToken.type === TokenType.QUERY.CLAUSE.USING_SCOPE) {
        isQueryField = false;
    }
    return isQueryField;
}

function mustResetABracketIndex(token) {
    switch (token.type) {
        case TokenType.PUNCTUATION.SEMICOLON:
        case TokenType.BRACKET.CURLY_OPEN:
        case TokenType.BRACKET.CURLY_CLOSE:
        case TokenType.BRACKET.INITIALIZER_OPEN:
        case TokenType.BRACKET.INITIALIZER_CLOSE:
        case TokenType.BRACKET.ANNOTATION_PARAM_OPEN:
        case TokenType.BRACKET.ANNOTATION_PARAM_CLOSE:
        case TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN:
        case TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE:
        case TokenType.BRACKET.PARENTHESIS_GUARD_OPEN:
        case TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE:
        case TokenType.BRACKET.PARENTHESIS_PARAM_OPEN:
        case TokenType.BRACKET.PARENTHESIS_PARAM_CLOSE:
        case TokenType.BRACKET.QUERY_START:
        case TokenType.BRACKET.QUERY_END:
        case TokenType.BRACKET.INNER_QUERY_START:
        case TokenType.BRACKET.INNER_QUERY_END:
            return true;
    }
    return false;
}