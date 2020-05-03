/* global hexo */

'use strict';

const stripIndent = require('strip-indent');
const highlight = require('./highlight');

const rBacktick = /^((?:[^\S\r\n]*>){0,3}[^\S\r\n]*)(`{3,}|~{3,}) *(.*) *\n([\s\S]+?)\s*\2(\n+|$)/gm;
const rAllOptions = /([^\s]+)\s+(.+?)\s+(https?:\/\/\S+|\/\S+)\s*(.+)?/;
const rLangCaption = /([^\s]+)\s*(.+)?/;

// +++++++++++
const rMarkOptions = /([+-]?)\{(\d[^\}]*)\}/;
// const rCodeBlock = /(?<=^`{3}\n)\n(?:^(?: {4})+(?! )[\s\S]*?\n)+\n/gm;   //indented code block output, 4^n space indent
//const rCodeBlock = /(?<=^`{3}\n\n)(?:^(?: {4})+[^\n]*\n)+(?=\n)/gm; //indented code block output, 4^n space indent
const rOutputBlock = /(?:^`{3}\n\n(?:\n+^\!\[png\][^\n]+\n+)*)(?:^(?: {4})+[^\n]*\n)+(?=\n)/gm; //overkill?
const rCodeBlock = /(?:^(?: {4})+[^\n]*\n)+/gm; //indented code block, 4 space indent

function backtickCodeBlock(data) {
    const config = this.config.highlight || {};

    // +++++++++++
    // if (!config.enable) return;
    config.enable = true;
    // console.log(data.source)

    data.content = data.content.replace(rOutputBlock, content => {
        let io = data.codeblockplus ? data.codeblockplus.io ? data.codeblockplus.io : false : false;
        console.log('############################################')
        console.log(content);
        console.log('###################')
        content = content.replace(rCodeBlock, block => {
            console.log(block);
            block = `<pre${io ? ' class="output"' : ''}><code>` + stripIndent(block) + '</code></pre>';
            return `<escape>${block}</escape>`;
        });
        console.log('############################################')
        // content = `<pre${io ? ' class="output"' : ''}><code>` + stripIndent(content) + '</code></pre>';
        // return `<escape>${content}</escape>`;
        return content;
    });

    data.content = data.content.replace(rBacktick, ($0, start, $2, _args, content, end) => {
        const args = _args.split('=').shift();

        const options = {
            hljs: config.hljs,
            autoDetect: config.auto_detect,
            gutter: config.line_number,
            tab: config.tab_replace,
            wrap: config.wrap,
            io: data.codeblockplus ? data.codeblockplus.io ? data.codeblockplus.io : false : false
        };

        if (true || options.gutter) {
            config.first_line_number = config.first_line_number || 'always1';
            if (config.first_line_number === 'inline') {

                // setup line number by inline
                _args = _args.replace('=+', '=');
                options.gutter = _args.includes('=');

                // setup fiestLineNumber;
                options.firstLine = options.gutter ? _args.split('=')[1] || 1 : 0;
            }
        }

        // +++++++++++
        var markerSet = {};
        const lineDepth = content.split('\n').length - 1;

        function updateMarkerSet(markerClass, from, isRange, to, isRelative) {
            var startIdx = parseInt(from) - 1;
            var endIdx = parseInt(to);
            endIdx = isRange ? (isRelative ? (startIdx + endIdx - 1) : endIdx) || lineDepth : startIdx;
            for (let i = startIdx; i <= endIdx; i++)
                markerSet[i] = markerClass;
        }
        // +++++++++++

        if (args) {
            // +++++++++++
            const stdArgs = args.replace(rMarkOptions, '');
            const match = rAllOptions.exec(stdArgs) || rLangCaption.exec(stdArgs);

            var markMatch;

            while (markMatch = rMarkOptions.exec(args)) {
                var marker = markMatch[1] || '';
                var markerClass = marker == '+' ? 'addition' : (marker == '-' ? 'deletion' : 'mark');
                var markval = markMatch[2].split(',');
                var parseRange = /(\d+)(\-)?(\d+)?/;
                for (let i in markval) {
                    var parsed = parseRange.exec(markval[i]);
                    updateMarkerSet(markerClass, parsed[1], parsed[2], parsed[3], false);
                }
            }
            // +++++++++++

            if (stdArgs) {

                if (match) {
                    options.lang = match[1];

                    if (match[2]) {
                        options.caption = `<span>${match[2]}</span>`;

                        if (match[3]) {
                            options.caption += `<a href="${match[3]}">${match[4] ? match[4] : 'link'}</a>`;
                        }
                    }
                }

            }
        }

        // +++++++++++
        // catch inline markers
        let rInlineMark = /.*\+{3}(addition|added|add|insertion|insert|deletion|deleted|delete|del|mark)(-)?(\d)?\+{3}.*/g;
        let lineSplit = content.split('\n');
        for (let n = 0; n < lineSplit.length; n++) {
            lineSplit[n].replace(rInlineMark, (match, type, isRange, lineOpt) => {
                let markerClass = '';
                if (type == 'addition' || type == 'add' || type == 'added' || type == 'insertion' || type == 'insert')
                    markerClass = 'addition';
                else if (type == 'deletion' || type == 'delete' || type == 'deleted' || type == 'del')
                    markerClass = 'deletion';
                else
                    markerClass = 'mark';
                lineSplit.splice(n, 1);
                updateMarkerSet(markerClass, n + 1, isRange, lineOpt, true);
                n--;
                return '';
            });
        }
        content = lineSplit.join('\n');

        options.mark = markerSet;
        // +++++++++++

        // PR #3765
        if (start.includes('>')) {
            const depth = start.split('>').length - 1;
            const regexp = new RegExp(`^([^\\S\\r\\n]*>){0,${depth}}([^\\S\\r\\n]|$)`, 'mg');
            const paddingOnEnd = ' '; // complement uncaptured whitespaces at last line
            content = (content + paddingOnEnd).replace(regexp, '').replace(/\n$/, '');
        }

        content = highlight(stripIndent(content), options)
            .replace(/{/g, '&#123;')
            .replace(/}/g, '&#125;');

        return `${start}<escape>${content}</escape>${end}`;
    });
}

module.exports = backtickCodeBlock;