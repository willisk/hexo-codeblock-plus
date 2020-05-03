/* global hexo */

'use strict';

console.log('CALLED');

const stripIndent = require('strip-indent');
const { highlight } = require('hexo-util');

const rBacktick = /^((?:[^\S\r\n]*>){0,3}[^\S\r\n]*)(`{3,}|~{3,}) *(.*) *\n([\s\S]+?)\s*\2(\n+|$)/gm;
const rAllOptions = /([^\s]+)\s+(.+?)\s+(https?:\/\/\S+|\/\S+)\s*(.+)?/;
const rLangCaption = /([^\s]+)\s*(.+)?/;

// +++++++++++
const rMarkOptions = /([+-]?)\{(\d[^\}]*)\}/g;

function backtickCodeBlock(data) {
    const config = this.config.highlight || {};

    // +++++++++++
    // if (!config.enable) return;
    config.enable = true;

    data.content = data.content.replace(rBacktick, ($0, start, $2, _args, content, end) => {
        const args = _args.split('=').shift();

        const options = {
            hljs: config.hljs,
            autoDetect: config.auto_detect,
            gutter: config.line_number,
            tab: config.tab_replace,
            wrap: config.wrap
        };

        if (options.gutter) {
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

        function updateMarkerSet(marker, from, isRange, to, isRelative) {
            var startIdx = parseInt(from);
            var endIdx = parseInt(to);
            endIdx = isRange ? (isRelative ? (from - 1 + endIdx) : endIdx) || lineDepth : startIdx;
            for (let i = startIdx; i <= endIdx; i++)
                markerSet[i] = marker;
        }
        // +++++++++++

        if (args) {
            // +++++++++++
            const stdArgs = args.replace(rMarkOptions, '');
            const match = rAllOptions.exec(stdArgs) || rLangCaption.exec(stdArgs);

            var markMatch;

            while (markMatch = rMarkOptions.exec(args)) {
                var marker = markMatch[1] || '';
                var markval = markMatch[2].split(',');
                var parseRange = /(\d+)(\-)?(\d+)?/;
                for (let i in markval) {
                    var parsed = parseRange.exec(markval[i]);
                    updateMarkerSet(marker, parsed[1], parsed[2], parsed[3], false);
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
        let rInlineMark = /.*\+{3}(addition|add|insertion|insert|deletion|delete|del|mark)(-)?(\d)?\+{3}.*/g;
        let lineSplit = content.split('\n');
        for (let n = 0; n < lineSplit.length; n++) {
            lineSplit[n].replace(rInlineMark, (match, type, isRange, lineOpt) => {
                let marker = '';
                if (type == 'addition' || type == 'add' || type == 'insertion' || type == 'insert')
                    marker = '+';
                else if (type == 'deletion' || type == 'delete' || type == 'del')
                    marker = '-';
                lineSplit.splice(n, 1);
                updateMarkerSet(marker, n + 1, isRange, lineOpt, true);
                n--;
                return '';
            });
        }
        content = lineSplit.join('\n');
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

        // +++++++++++
        var rLine = /<span class="line">(.*?)(?=<\/span><br>)/g;
        var lineNr = 0;
        // var contentCode = content.split('<td class="code">');
        // contentCode[1] = contentCode[1].replace(rLine, function (match, inner) {
        content = content.replace(rLine, function (match, inner) {
            lineNr++;
            if (lineNr in markerSet)
                if (markerSet[lineNr] == '+')
                    return '<span class="line addition">' + inner + '</span>';
                else if (markerSet[lineNr] == '-')
                    return '<span class="line deletion">' + inner + '</span>';
                else
                    return '<span class="line"><mark>' + inner + '</mark></span>';
            return match;
        });
        // content = contentCode.join('<td class="code">');
        // +++++++++++

        return `${start}<escape>${content}</escape>${end}`;
    });
}



hexo.extend.filter.register('before_post_render', backtickCodeBlock, 100);

