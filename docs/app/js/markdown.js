/* UNOEditor — dependency-free Markdown renderer */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function safeUrl(u) {
    u = String(u || '').trim();
    if (u === 'uno://grid') return global.__UNO_GRID_URI__ || '';
    if (/^(javascript|vbscript|file):/i.test(u)) return '#';
    if (/^data:/i.test(u) && !/^data:image\/(png|jpe?g|gif|webp|svg\+xml)/i.test(u)) return '#';
    return u;
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/<[^>]*>/g, '')
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '') || 'sec';
  }

  var usedSlugs = {};

  function inline(src) {
    var stash = [];
    var s = String(src);

    // inline code first: shielded from all other rules
    s = s.replace(/`([^`\n]+)`/g, function (m, code) {
      return '\u0001' + (stash.push('<code>' + esc(code) + '</code>') - 1) + '\u0001';
    });

    s = esc(s);

    // images
    s = s.replace(/!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g,
      function (m, alt, url, title) {
        return '<img src="' + esc(safeUrl(url.replace(/&amp;/g, '&'))) + '" alt="' + alt + '"' +
          (title ? ' title="' + title + '"' : '') + ' loading="lazy">';
      });

    // links
    s = s.replace(/\[([^\]]+)\]\(\s*([^\s)]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g,
      function (m, text, url, title) {
        return '<a href="' + esc(safeUrl(url.replace(/&amp;/g, '&'))) + '"' +
          (title ? ' title="' + title + '"' : '') + ' target="_blank" rel="noopener">' + text + '</a>';
      });

    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>');

    s = s.replace(/\u0001(\d+)\u0001/g, function (m, i) { return stash[+i]; });
    s = s.replace(/ {2,}\n/g, '\u0002').replace(/\u0002/g, '<br>');
    return s;
  }

  // Regex lookbehind /(?<!\\)\|/ is a SyntaxError on older WebKit (WKWebView,
  // Safari < 16.4): the whole script fails to parse, leaving UnoMD undefined and
  // the preview/export blank. Scan characters instead — no lookbehind, same result.
  function splitCells(line) {
    var t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    var cells = [], buf = '', esc = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t.charAt(i);
      if (esc) { buf += (ch === '|' ? '|' : '\\' + ch); esc = false; }
      else if (ch === '\\') { esc = true; }
      else if (ch === '|') { cells.push(buf.trim()); buf = ''; }
      else { buf += ch; }
    }
    if (esc) buf += '\\';
    cells.push(buf.trim());
    return cells;
  }

  function isTableSep(line) {
    return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line) && line.indexOf('|') > -1;
  }

  function renderTable(rows) {
    var head = splitCells(rows[0]);
    var aligns = splitCells(rows[1]).map(function (c) {
      if (/^:-+:$/.test(c)) return 'center';
      if (/-+:$/.test(c)) return 'right';
      if (/^:-+/.test(c)) return 'left';
      return '';
    });
    var h = '<table><thead><tr>' + head.map(function (c, i) {
      return '<th' + (aligns[i] ? ' style="text-align:' + aligns[i] + '"' : '') + '>' + inline(c) + '</th>';
    }).join('') + '</tr></thead>';
    var body = rows.slice(2).map(function (r) {
      return '<tr>' + splitCells(r).map(function (c, i) {
        return '<td' + (aligns[i] ? ' style="text-align:' + aligns[i] + '"' : '') + '>' + inline(c) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return h + '<tbody>' + body + '</tbody></table>';
  }

  function renderLists(children) {
    return children.map(function (list) {
      var tag = list.type;
      var inner = list.items.map(function (it) {
        var box = it.checked === null ? '' :
          '<span class="task-box">' + (it.checked ? '✓' : '') + '</span> ';
        return '<li' + (it.checked !== null ? ' class="task-item"' : '') + '>' + box +
          inline(it.content) + renderLists(it.children) + '</li>';
      }).join('');
      return '<' + tag + '>' + inner + '</' + tag + '>';
    }).join('');
  }

  function buildLists(raw) {
    var root = { children: [] };
    var stack = [{ indent: -1, children: root.children }];
    raw.forEach(function (it) {
      while (stack.length > 1 && it.indent <= stack[stack.length - 1].indent) stack.pop();
      var frame = stack[stack.length - 1];
      var last = frame.children[frame.children.length - 1];
      if (!last || last.type !== it.type || last._indent !== it.indent) {
        last = { type: it.type, _indent: it.indent, items: [] };
        frame.children.push(last);
      }
      var node = { content: it.content, checked: it.checked, children: [] };
      last.items.push(node);
      stack.push({ indent: it.indent, children: node.children });
    });
    return renderLists(root.children);
  }

  function isBlockStart(line) {
    return /^#{1,6}\s/.test(line) || /^```/.test(line) || /^\s{0,3}>/.test(line) ||
      /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line) ||
      /^\s*([-*+]|\d+\.)\s+/.test(line) ||
      (line.indexOf('|') > -1 && isTableSep(line));
  }

  function parse(md, nested) {
    if (!nested) usedSlugs = {};
    var lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
    var out = [], i = 0;

    while (i < lines.length) {
      var line = lines[i];
      if (!line.trim()) { i++; continue; }

      // fenced code
      var fence = /^\s*```\s*([\w+-]*)\s*$/.exec(line);
      if (fence) {
        var buf = [], lang = fence[1] || '';
        i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push('<pre><span class="code-lang">' + esc(lang || 'text') + '</span><code>' +
          esc(buf.join('\n')) + '</code></pre>');
        continue;
      }

      // horizontal rule
      if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      // heading
      var h = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (h) {
        var lvl = h[1].length, text = inline(h[2]);
        var id = slug(h[2]);
        if (usedSlugs[id]) { usedSlugs[id]++; id += '-' + usedSlugs[id]; } else usedSlugs[id] = 1;
        out.push('<h' + lvl + ' id="' + id + '">' + text + '</h' + lvl + '>');
        i++; continue;
      }

      // blockquote
      if (/^\s{0,3}>/.test(line)) {
        var q = [];
        while (i < lines.length && (/^\s{0,3}>/.test(lines[i]) || (q.length && lines[i].trim()))) {
          q.push(lines[i].replace(/^\s{0,3}>\s?/, '')); i++;
        }
        out.push('<blockquote>' + parse(q.join('\n'), true) + '</blockquote>');
        continue;
      }

      // table
      if (line.indexOf('|') > -1 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        var rows = [line, lines[i + 1]];
        i += 2;
        while (i < lines.length && lines[i].trim() && lines[i].indexOf('|') > -1) { rows.push(lines[i]); i++; }
        out.push(renderTable(rows)); continue;
      }

      // list
      if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
        var raw = [];
        while (i < lines.length) {
          var lm = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(lines[i]);
          if (!lm) {
            if (lines[i].trim() && raw.length && /^\s{2,}/.test(lines[i])) {
              raw[raw.length - 1].content += ' ' + lines[i].trim(); i++; continue;
            }
            break;
          }
          var content = lm[3], checked = null;
          var task = /^\[([ xX])\]\s*(.*)$/.exec(content);
          if (task) { checked = /[xX]/.test(task[1]); content = task[2]; }
          raw.push({
            indent: lm[1].replace(/\t/g, '  ').length,
            type: /^\d/.test(lm[2]) ? 'ol' : 'ul',
            content: content, checked: checked
          });
          i++;
        }
        out.push(buildLists(raw)); continue;
      }

      // paragraph: CJK soft breaks become <br>, latin soft breaks become a space
      var para = [line]; i++;
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { para.push(lines[i]); i++; }
      var ptext = para.join('\n')
        .replace(/ {2,}\n/g, '\u0002')
        .replace(/([^\x00-\x7f])\n(?=[^\x00-\x7f])/g, '$1\u0002')
        .replace(/\n/g, ' ');
      out.push('<p>' + inline(ptext) + '</p>');
    }
    return out.join('\n');
  }

  function plain(md) {
    return String(md || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_~`|\[\]()!-]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  global.UnoMD = { render: parse, inline: inline, escape: esc, plain: plain };
})(window);
