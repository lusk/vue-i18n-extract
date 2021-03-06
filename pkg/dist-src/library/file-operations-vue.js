export function extractI18nItemsFromVueFiles(sourceFiles) {
    return sourceFiles.reduce((accumulator, file) => {
        const methodMatches = extractMethodMatches(file);
        const componentMatches = extractComponentMatches(file);
        const directiveMatches = extractDirectiveMatches(file);
        return [
            ...accumulator,
            ...methodMatches,
            ...componentMatches,
            ...directiveMatches,
        ];
    }, []);
}
/**
 * Extracts translation keys from methods such as `$t` and `$tc`.
 *
 * - **regexp pattern**: (?:[$ .]tc?)\(
 *
 *   **description**: Matches the sequence t( or tc(, optionally with either “$”, “.” or “ ” in front of it.
 *
 * - **regexp pattern**: (["'`])
 *
 *   **description**: 1. capturing group. Matches either “"”, “'”, or “`”.
 *
 * - **regexp pattern**: ((?:[^\\]|\\.)*?)
 *
 *   **description**: 2. capturing group. Matches anything except a backslash
 *   *or* matches any backslash followed by any character (e.g. “\"”, “\`”, “\t”, etc.)
 *
 * - **regexp pattern**: \1
 *
 *   **description**: matches whatever was matched by capturing group 1 (e.g. the starting string character)
 *
 * @param file a file object
 * @returns a list of translation keys found in `file`.
 */
function extractMethodMatches(file) {
    const methodRegExp = /(?:[$ .]tc?)\(\s*?(["'`])((?:[^\\]|\\.)*?)\1/g;
    return [...getMatches(file, methodRegExp, 2)];
}
function extractComponentMatches(file) {
    const componentRegExp = /(?:<i18n|<I18N)(?:.|\n)*?(?:[^:]path=("|'))(.*?)\1/g;
    return [...getMatches(file, componentRegExp, 2)];
}
function extractDirectiveMatches(file) {
    const directiveRegExp = /v-t="'(.*?)'"/g;
    return [...getMatches(file, directiveRegExp)];
}
function* getMatches(file, regExp, captureGroup = 1) {
    while (true) {
        const match = regExp.exec(file.content);
        if (match === null) {
            break;
        }
        const line = (file.content.substring(0, match.index).match(/\n/g) || []).length + 1;
        yield {
            path: match[captureGroup],
            line,
            file: file.fileName,
        };
    }
}
