import fs from 'fs';
import glob from 'glob';
import dot from 'dot-object';
import { readVueFiles, readLangFiles, extractI18nItemsFromVueFiles, extractI18nItemsFromLanguageFiles, logMissingKeys, logUnusedKeys, } from './library/index';
export var VueI18NExtractReportTypes;
(function (VueI18NExtractReportTypes) {
    VueI18NExtractReportTypes[VueI18NExtractReportTypes["None"] = 0] = "None";
    VueI18NExtractReportTypes[VueI18NExtractReportTypes["Missing"] = 1] = "Missing";
    VueI18NExtractReportTypes[VueI18NExtractReportTypes["Unused"] = 2] = "Unused";
    VueI18NExtractReportTypes[VueI18NExtractReportTypes["All"] = 3] = "All";
})(VueI18NExtractReportTypes || (VueI18NExtractReportTypes = {}));
;
export default class VueI18NExtract {
    parseVueFiles(vueFilesPath) {
        const filesList = readVueFiles(vueFilesPath);
        return extractI18nItemsFromVueFiles(filesList);
    }
    parseLanguageFiles(languageFilesPath) {
        const filesList = readLangFiles(languageFilesPath);
        return extractI18nItemsFromLanguageFiles(filesList);
    }
    createI18NReport(vueFiles, languageFiles, reportType = VueI18NExtractReportTypes.All) {
        const parsedVueFiles = this.parseVueFiles(vueFiles);
        const parsedLanguageFiles = this.parseLanguageFiles(languageFiles);
        return this.extractI18NReport(parsedVueFiles, parsedLanguageFiles, reportType);
    }
    extractI18NReport(parsedVueFiles, parsedLanguageFiles, reportType = VueI18NExtractReportTypes.All) {
        const missingKeys = [];
        const unusedKeys = [];
        Object.keys(parsedLanguageFiles).forEach((language) => {
            let languageItems = parsedLanguageFiles[language];
            parsedVueFiles.forEach((vueItem) => {
                const usedByVueItem = ({ path }) => path === vueItem.path || path.startsWith(vueItem.path + '.');
                if (!parsedLanguageFiles[language].some(usedByVueItem)) {
                    missingKeys.push(({ ...vueItem, language }));
                }
                languageItems = languageItems.filter((i) => !usedByVueItem(i));
            });
            unusedKeys.push(...languageItems.map((item) => ({ ...item, language })));
        });
        let extracts = {};
        if (reportType & VueI18NExtractReportTypes.Missing) {
            extracts = Object.assign(extracts, { missingKeys });
        }
        if (reportType & VueI18NExtractReportTypes.Unused) {
            extracts = Object.assign(extracts, { unusedKeys });
        }
        return extracts;
    }
    logI18NReport(report) {
        Object.keys(report).forEach(key => {
            if (key === 'missingKeys') {
                logMissingKeys(report.missingKeys);
            }
            else if (key === 'unusedKeys') {
                logUnusedKeys(report.unusedKeys);
            }
        });
    }
    writeMissingToLanguage(resolvedLanguageFiles, i18nReport) {
        var globArray = glob.sync(resolvedLanguageFiles);
        var parsedContent = globArray
            .map(f => fs.readFileSync(f, 'utf8'))
            .map(i => JSON.parse(i));
        i18nReport.missingKeys.forEach(item => {
            parsedContent.forEach(i => dot.str(item.path, '', i));
        });
        let stringifyiedContent = parsedContent
            .map(i => JSON.stringify(i, null, 2));
        stringifyiedContent
            .forEach((i, index) => fs.writeFileSync(globArray[index], i));
    }
    async writeReportToFile(report, writePath) {
        const reportString = JSON.stringify(report);
        return new Promise((resolve, reject) => {
            fs.writeFile(writePath, reportString, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
}
