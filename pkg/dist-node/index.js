'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var yargs = _interopDefault(require('yargs'));
var fs = _interopDefault(require('fs'));
var glob = _interopDefault(require('glob'));
var dot = _interopDefault(require('dot-object'));
var Table = _interopDefault(require('cli-table3'));
var isValidGlob = _interopDefault(require('is-valid-glob'));
var yaml = _interopDefault(require('js-yaml'));

function logMissingKeys(keys) {
  const maxDigits = (keys.length - 1).toString().length;
  const table = new Table({
    style: {
      head: ['green'],
      border: ['white'],
      compact: true
    },
    head: ['#', 'Language', 'File', 'Line', 'Missing i18n Entry', 'Default'],
    colWidths: [maxDigits + 2, 12, 40, 8, 30, 30]
  });
  keys.forEach((key, i) => {
    const file_trunc = key.file.length > 40 ? `…${key.file.slice(key.file.length - 36, key.file.length)}` : key.file;
    table.push([i, key.language, file_trunc, key.line, key.path, key.default]);
  }); // tslint:disable-next-line

  console.log(table.toString());
}
function logUnusedKeys(keys) {
  const table = new Table({
    style: {
      head: ['yellow'],
      border: ['white'],
      compact: true
    },
    head: ['#', 'Language', 'File', 'Line', 'Unused i18n Entry'],
    colWidths: [4, 12, 40]
  });
  keys.forEach((key, i) => {
    table.push([i, key.language, key.file, key.line, key.path]);
  }); // tslint:disable-next-line

  console.log(table.toString());
}

require = require('esm')(module);
function readVueFiles(src) {
  if (!isValidGlob(src)) {
    throw new Error('vueFiles isn\'\t a valid glob pattern.');
  }

  const targetFiles = glob.sync(src);

  if (targetFiles.length === 0) {
    throw new Error('vueFiles glob has no files.');
  }

  return targetFiles.map(f => {
    const fileName = f.replace(process.cwd(), '');
    return {
      fileName,
      path: f,
      content: fs.readFileSync(f, 'utf8')
    };
  });
}
function readLangFiles(src) {
  if (!isValidGlob(src)) {
    throw new Error('languageFiles isn\'\t a valid glob pattern.');
  }

  const targetFiles = glob.sync(src);

  if (targetFiles.length === 0) {
    throw new Error('languageFiles glob has no files.');
  }

  return targetFiles.map(f => {
    const langPath = path.resolve(process.cwd(), f);
    let langModule;
    const extension = langPath.substring(langPath.lastIndexOf('.')).toLowerCase();

    if (extension === '.yaml' || extension === '.yml') {
      langModule = yaml.safeLoad(fs.readFileSync(langPath, 'utf8'));
    } else {
      langModule = require(langPath);
    }

    const {
      default: defaultImport
    } = langModule;
    const langObj = defaultImport ? defaultImport : langModule;
    const fileName = f.replace(process.cwd(), '');
    return {
      fileName,
      path: f,
      content: langObj
    };
  });
}

function extractI18nItemsFromVueFiles(sourceFiles) {
  return sourceFiles.reduce((accumulator, file) => {
    const methodMatches = extractMethodMatches(file);
    const componentMatches = extractComponentMatches(file);
    const directiveMatches = extractDirectiveMatches(file);
    return [...accumulator, ...methodMatches, ...componentMatches, ...directiveMatches];
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
  const methodRegExp = /[$ .]tc?\(\s*[\\"'`]+(.*?)[\\"'`]+,*\s*[\\"'`]*(.*?)\s*[\\"'`]*\s*?\)*/g;
  return [...getDefaultMatches(file, methodRegExp, [1,2])];
}

function extractComponentMatches(file) {
  const componentRegExp = /(?:<i18n|<I18N)(?:.|\n)*?(?:[^:]path=("|'))(.*?)\1/g;
  return [...getMatches(file, componentRegExp, 2)];
}

function extractDirectiveMatches(file) {
  const directiveRegExp = /v-t="'(.*?)'"/g;
  return [...getMatches(file, directiveRegExp)];
}

function* getDefaultMatches(file, regExp, captureGroup) {
  while (true) {
    const match = regExp.exec(file.content);

    if (match === null) {
      break;
    }

    const line = (file.content.substring(0, match.index).match(/\n/g) || []).length + 1;
    yield {
      path: match[captureGroup[0]],
      line,
      file: file.fileName,
      default: match[captureGroup[1]]
    };
  }
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
      file: file.fileName
    };
  }
}

function extractI18nItemsFromLanguageFiles(languageFiles) {
  return languageFiles.reduce((accumulator, file) => {
    const sansFileName = file.fileName.substring(0, file.fileName.lastIndexOf('/'));
    const language = file.fileName.substring(sansFileName.lastIndexOf('/') + 1, sansFileName.length);
    const flattenedObject = dot.dot(file.content);
    const i18nInFile = Object.keys(flattenedObject).map((key, index) => {
      return {
        line: index,
        path: key,
        file: file.fileName,
        lang: language
      };
    });
    accumulator[language] = i18nInFile;
    return accumulator;
  }, {});
}

var VueI18NExtractReportTypes;

(function (VueI18NExtractReportTypes) {
  VueI18NExtractReportTypes[VueI18NExtractReportTypes["None"] = 0] = "None";
  VueI18NExtractReportTypes[VueI18NExtractReportTypes["Missing"] = 1] = "Missing";
  VueI18NExtractReportTypes[VueI18NExtractReportTypes["Unused"] = 2] = "Unused";
  VueI18NExtractReportTypes[VueI18NExtractReportTypes["All"] = 3] = "All";
})(VueI18NExtractReportTypes || (VueI18NExtractReportTypes = {}));
class VueI18NExtract {
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
    Object.keys(parsedLanguageFiles).forEach(language => {
      let languageItems = parsedLanguageFiles[language];
      parsedVueFiles.forEach(vueItem => {
        const usedByVueItem = ({
          path
        }) => path === vueItem.path || path.startsWith(vueItem.path + '.');

        if (!parsedLanguageFiles[language].some(usedByVueItem)) {
          missingKeys.push({ ...vueItem,
            language
          });
        }

        languageItems = languageItems.filter(i => !usedByVueItem(i));
      });
      unusedKeys.push(...languageItems.map(item => ({ ...item,
        language
      })));
    });
    let extracts = {};

    if (reportType & VueI18NExtractReportTypes.Missing) {
      extracts = Object.assign(extracts, {
        missingKeys
      });
    }

    if (reportType & VueI18NExtractReportTypes.Unused) {
      extracts = Object.assign(extracts, {
        unusedKeys
      });
    }

    return extracts;
  }

  logI18NReport(report) {
    Object.keys(report).forEach(key => {
      if (key === 'missingKeys') {
        logMissingKeys(report.missingKeys);
      } else if (key === 'unusedKeys') {
        logUnusedKeys(report.unusedKeys);
      }
    });
  }

  writeMissingToLanguage(resolvedLanguageFiles, i18nReport) {
    var globArray = glob.sync(resolvedLanguageFiles);
    const filesContents = globArray.map(f => {
      const sansFileName = f.substring(0, f.lastIndexOf('/'));
      const language = f.substring(sansFileName.lastIndexOf('/') + 1, sansFileName.length);

      return {
        language: language,
        content: JSON.parse(fs.readFileSync(f, 'utf8'))
      }
    })

    i18nReport.missingKeys.forEach(item => {
      const defaultString = item.language === 'en' ? item.default : ''
      dot.str(item.path, defaultString , filesContents.find(file => file.language === item.language)['content'])
    });

    const parsedContent = filesContents.map(value => value.content)

    let stringifyiedContent = parsedContent.map(i => JSON.stringify(i, null, 2));
    stringifyiedContent.forEach((i, index) => fs.writeFileSync(globArray[index], i));
  }

  async writeReportToFile(report, writePath) {
    const reportString = JSON.stringify(report);
    return new Promise((resolve, reject) => {
      fs.writeFile(writePath, reportString, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

}

const api = new VueI18NExtract();
const vueFilesOptions = {
  // tslint:disable-next-line:max-line-length
  describe: 'The Vue.js file(s) you want to extract i18n strings from. It can be a path to a folder or to a file. It accepts glob patterns. (ex. *, ?, (pattern|pattern|pattern)',
  demand: true,
  alias: 'v'
};
const languageFilesOptions = {
  // tslint:disable-next-line:max-line-length
  describe: 'The language file(s) you want to compare your Vue.js file(s) to. It can be a path to a folder or to a file. It accepts glob patterns (ex. *, ?, (pattern|pattern|pattern) ',
  demand: true,
  alias: 'l'
};
const outputOptions = {
  // tslint:disable-next-line:max-line-length
  describe: 'Use if you want to create a json file out of your report. (ex. -o output.json)',
  demand: false,
  alias: 'o'
};
const addOptions = {
  // tslint:disable-next-line:max-line-length
  describe: 'Use if you want to add missing keys into your json language files. (ex. -a true)',
  demand: false,
  alias: 'a'
};
const argv = yargs.command('report', '- Create a report from a glob of your Vue.js source files and your language files.', {
  vueFiles: vueFilesOptions,
  languageFiles: languageFilesOptions,
  output: outputOptions,
  add: addOptions
}).help().demandCommand(1, '').showHelpOnFail(true);
async function run() {
  const command = argv.argv;

  switch (command._[0]) {
    case 'report':
      report(command);
      break;
  }
}

async function report(command) {
  const {
    vueFiles,
    languageFiles,
    output,
    add
  } = command;
  const resolvedVueFiles = path.resolve(process.cwd(), vueFiles);
  const resolvedLanguageFiles = path.resolve(process.cwd(), languageFiles);
  const i18nReport = api.createI18NReport(resolvedVueFiles, resolvedLanguageFiles);
  api.logI18NReport(i18nReport);

  if (output) {
    await api.writeReportToFile(i18nReport, path.resolve(process.cwd(), output)); // tslint:disable-next-line

    console.log(`The report has been has been saved to ${output}`);
  }

  if (add && i18nReport.missingKeys.length > 0) {
    api.writeMissingToLanguage(resolvedLanguageFiles, i18nReport); // tslint:disable-next-line

    console.log('The missing keys has been has been saved to your languages files');
  }
}

exports.default = api;
exports.run = run;
