'use strict';

const hljs = require('highlight.js');
const alias = require('hexo-util/highlight_alias.json');
const { escapeHTML } = require('hexo-util');

function highlightUtil(str, options = {}) {
  if (typeof str !== 'string') throw new TypeError('str must be a string!');

  const useHljs = Object.prototype.hasOwnProperty.call(options, 'hljs') ? options.hljs : false;
  const {
    gutter = true,
    firstLine = 1,
    caption,
    mark = {},  // XXX changed
    io = false,  // XXX changed
    tab
  } = options;
  let { wrap = true } = options;

  hljs.configure({ classPrefix: useHljs ? 'hljs-' : '' });

  const data = highlight(str, options);
  const lang = options.lang || data.language || '';
  const classNames = (useHljs ? 'hljs' : 'highlight') + (lang ? ` ${lang}` : '');

  if (gutter && !wrap) wrap = true; // arbitrate conflict ("gutter:true" takes priority over "wrap:false")

  const before = useHljs ? `<pre><code class="${classNames}">` : '<pre>';
  const after = useHljs ? '</code></pre>' : '</pre>';

  if (!wrap) return `<pre><code class="${classNames}">${data.value}</code></pre>`;

  const lines = data.value.split('\n');
  let numbers = '';
  let content = '';

  let lineLast = lines.length - 1;
  let linePadding = `${gutter ? '<td class="gutter"></td>' : ''}<td class="empty"></td><td class="code"></td></tr>`;
  let linePaddingStart = `<tr class="line padding${0 in mark ? ` ${mark[0]}` : ''}">` + linePadding;
  let linePaddingEnd = `<tr class="line padding${lineLast in mark ? ` ${mark[lineLast]}` : ''}">` + linePadding;

  content += linePaddingStart;

  let markerSymbols = {
    addition: '+',
    deletion: '-',
    mark: ''
  }


  for (let i = 0, len = lines.length; i < len; i++) {
    let line = lines[i];
    if (tab) line = replaceTabs(line, tab);
    // numbers += `<span class="line">${Number(firstLine) + i}</span><br>`;
    // var lineAttrib = (i == 0 ? ' first' : (i == lines.length - 1 ? ' last' : ''));
    let isLineMarked = i in mark;
    let lineMarkSymbol = isLineMarked ? `${markerSymbols[mark[i]]}` : '';
    let lineMarkClass = isLineMarked ? ` ${mark[i]}` : '';
    content += `<tr class="line${lineMarkClass}">`;
    if (options.gutter)
      content += `<td class="gutter" data-line-number="${Number(firstLine) + i}"></td>`;
    content += `<td class="${lineMarkSymbol == '' ? 'empty' : 'marker-symbol'}"`;
    content += ` data-marker="${lineMarkSymbol}"></td>`;
    // content += `<td class="marker-symbol${lineMarkSymbol == '' ? ' empty' : ''}" data-marker="${lineMarkSymbol}"></td>`;
    content += `<td class="code">`;
    content += before;
    // content += formatLine(line, Number(firstLine) + i, mark, options);
    content += line;
    content += after;
    content += '</td>';
    content += '</tr>';
  }

  content += linePaddingEnd;

  let result = '';

  // if (io)
  // result += '<div class="iowrapper"><div class="codeblockio input"></div>';

  result += `<figure class="highlight${data.language ? ` ${data.language}` : ''}${io ? ' input' : ''}">`;

  if (caption) {
    result += `<figcaption>${caption}</figcaption>`;
  }

  result += '<table>';
  result += content;
  result += '</table></figure>';

  // if (io)
  // result += '</div>';

  // result += '<table><tr>';

  // if (gutter) {
  //   result += `<td class="gutter"><pre>${numbers}</pre></td>`;
  // }

  // result += `<td class="code">${before}${content}${after}</td>`;
  // result += '</tr></table></figure>';

  return result;
}

function formatLine(line, lineno, marked, options) {
  // const useHljs = options.hljs || false;
  // let res = useHljs ? '' : '<span class="line';
  // if (marked.includes(lineno)) {
  //   // Handle marked lines.
  //   res += useHljs ? `<mark>${line}</mark>` : ` marked">${line}</span>`;
  // } else {
  //   res += useHljs ? line : `">${line}</span>`;
  // }

  // res += '<br>';
  let res = '<td>' + line + '</td>';
  return res;
}

function encodePlainString(str) {
  return escapeHTML(str);
}

function replaceTabs(str, tab) {
  return str.replace(/^\t+/, match => {
    let result = '';

    for (let i = 0, len = match.length; i < len; i++) {
      result += tab;
    }

    return result;
  });
}

function highlight(str, options) {
  let { lang } = options;
  const { autoDetect = false } = options;

  if (!lang && autoDetect) {
    const result = hljs.highlightAuto(str);
    if (result.relevance > 0 && result.language) lang = result.language;
  }

  if (!lang) {
    lang = 'plain';
  }

  const result = {
    value: encodePlainString(str),
    language: lang.toLowerCase()
  };

  if (result.language === 'plain') {
    return result;
  }

  if (!alias.aliases[result.language]) {
    result.language = 'plain';
    return result;
  }

  if (options.hljs) return hljs.highlight(lang, str);

  return tryHighlight(str, result.language) || result;
}

function tryHighlight(str, lang) {
  try {
    const matching = str.match(/(\r?\n)/);
    const separator = matching ? matching[1] : '';
    const lines = matching ? str.split(separator) : [str];
    let result = hljs.highlight(lang, lines.shift());
    let html = result.value;
    while (lines.length > 0) {
      result = hljs.highlight(lang, lines.shift(), false, result.top);
      html += separator + result.value;
    }

    result.value = html;
    return result;
  } catch (err) {

  }
}

module.exports = highlightUtil;
