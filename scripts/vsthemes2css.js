import fs from 'fs';
import path from 'path';
import glob from 'glob';

const token_color = (theme, scope, setting) => {
  const found = theme.tokenColors.find(token => {
    if(typeof scope === "undefined"){
      return typeof token.scope === "undefined";
    } else {
      return token.scope && token.scope.indexOf(scope) !== -1
    }
  });
  return found?.settings[setting];
}

const map = (theme) => {
  const fg = (scope) => token_color(theme, scope, 'foreground');
  const bg = (scope) => token_color(theme, scope, 'background');
  const color = (key) => {
    return theme.colors[key]
  }

  return {
    "syntax": {
      "tag": fg('variable.language'),
      "func": fg('variable.function'),
      "entity": fg('entity.name'),
      "string": fg('string'),
      "regexp": fg('string.regexp'),
      "markup": fg('variable.member'),
      "keyword": fg('keyword'),
      "special": fg('meta.decorator punctuation.decorator'),
      "comment": fg('comment'),
      "constant": fg('constant.language'),
      "operator": fg('keyword.operator'),
    },
    "vcs": {
      "added": fg('markup.inserted'),
      "modified": fg('markup.changed'),
      "removed": fg('markup.deleted')
    },
    // "editor": {
    //   "fg": color('editor.foreground'),
    //   "bg": color('editor.background'),
    //   "line": color('editor.lineHighlightBackground'),
    //   "selection": {
    //     "active": color('selection.background'),
    //     "inactive": color('editor.inactiveSelectionBackground'),
    //   },
    //   "findMatch": {
    //     "active": color('editor.findMatchBackground'),
    //     "inactive": color('editor.findMatchHighlightBackground'),
    //   },
    //   "gutter": {
    //     "active": color('editorLineNumber.activeForeground'),
    //     "normal": color('editorLineNumber.foreground')
    //   },
    //   "indentGuide": {
    //     "active": color('editorIndentGuide.activeBackground'),
    //     "normal": color('editorIndentGuide.background')
    //   }
    // },
    // "ui": {
    //   "fg": color('foreground'),
    //   "bg": bg(undefined),
    //   "line": color('panel.border'),
    //   "selection": {
    //     "active": color('list.activeSelectionBackground'),
    //     "normal": color('list.inactiveSelectionBackground'),
    //   },
    //   "panel": {
    //     "bg": color('listFilterWidget.background'),
    //     "shadow": color('widget.shadow'),
    //   },
    //   "link": {
    //     "active": color('textLink.activeForeground'),
    //     "inactive": color('textLink.foreground'),
    //   }
    // },
    // "common": {
    //   "accent": color('textLink.foreground'),
    //   "error": color('errorForeground')
    // },
    "colors": Object.keys(theme.colors).reduce((prev, cur) => {
      return theme.colors[cur] ? {...prev,
        [cur.replace(/\./g, '-')]: theme.colors[cur]
      } : prev;
    }, {}),
    "scope": theme.tokenColors.reduce((prev, cur) => {
      return {
        ...prev,
        ...cur.scope ? cur.scope.reduce((prev, key)=>{
          return {...prev, [key.replace(/\.|\s/g, '-')]: {
            foreground: cur.settings.foreground,
            background: cur.settings.background,
          }}
        }, {}) : { foreground: cur.settings.foreground, background: cur.settings.background },
      }
    }, {})
  };
};

const toCssVariables = (obj, label= null) => {
  return Object.keys(obj).reduce((prev, key) => {
    if(typeof obj[key] === 'object') {
      return [
        ...prev,
        ...toCssVariables(obj[key], label ? `${label}-${key}` : key)];
    } else {
      let color = obj[key];
      if(typeof color !== 'undefined'){
        return [...prev, `--${label ? `${label}-${key}`: key}: ${color};`]
      } else {
        return prev;
      }
    }
  }, []);
}

let output = '';
const themes = [];

glob.sync(path.resolve('themes/*.json')).forEach(filename => {
  const themeContent = fs.readFileSync(filename).toString('utf8');
  const theme = JSON.parse(themeContent);
  const className = path.basename(filename).split('.').shift();
  const mapped = map(theme);

  const cssContent = `
  .${className} {
${toCssVariables(mapped).map(variable => `    ${variable}`).join("\n")}
  }  
  `;

  themes.push({
    type: theme.type,
    value: className,
    label: className.replace(/(^[a-z]|-[a-z])/g, v => v.toUpperCase().replace('-',' ')) + ` (${theme.type})`
  });

  output += cssContent;
  console.log(cssContent);
})

fs.writeFileSync(path.resolve('src/variables.css'), output);
fs.writeFileSync(path.resolve('src/components/ThemeSettings/themes.ts'),
  `export const themes = ${JSON.stringify(themes, null, 2)};`);
