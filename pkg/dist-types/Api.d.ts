/// <reference types="node" />
import { I18NItem, I18NLanguage, I18NReport } from './library/models';
export declare enum VueI18NExtractReportTypes {
    None = 0,
    Missing = 1,
    Unused = 2,
    All = 3
}
export default class VueI18NExtract {
    parseVueFiles(vueFilesPath: string): I18NItem[];
    parseLanguageFiles(languageFilesPath: string): I18NLanguage;
    createI18NReport(vueFiles: string, languageFiles: string, reportType?: VueI18NExtractReportTypes): I18NReport;
    extractI18NReport(parsedVueFiles: I18NItem[], parsedLanguageFiles: I18NLanguage, reportType?: VueI18NExtractReportTypes): I18NReport;
    logI18NReport(report: I18NReport): void;
    writeMissingToLanguage(resolvedLanguageFiles: string, i18nReport: I18NReport): void;
    writeReportToFile(report: I18NReport, writePath: string): Promise<NodeJS.ErrnoException | void>;
}
