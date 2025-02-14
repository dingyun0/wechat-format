var WxRenderer = function (opts) {
  this.opts = opts
  var ENV_USE_REFERENCES = true
  var ENV_STETCH_IMAGE = true

  var footnotes = []
  var footnoteindex = 0
  var styleMapping = null

  var FONT_FAMILY_MONO = "Operator Mono, Consolas, Monaco, Menlo, monospace"

  var COPY = function (base, extend) { return Object.assign({}, base, extend)}

  this.buildTheme = function (themeTpl) {
    var mapping = {}
    var base = COPY(themeTpl.BASE, {
      'font-family': this.opts.fonts,
      'font-size': this.opts.size
    })
    var base_block = COPY(base, {
      'margin': '20px 10px'
    })
    for (var ele in themeTpl.inline) {
      if (themeTpl.inline.hasOwnProperty(ele)) {
        var style = themeTpl.inline[ele]
        if (ele === 'codespan') {
          style['font-family'] = FONT_FAMILY_MONO
        }
        mapping[ele] = COPY(base, style)
      }
    }
    for (var ele in themeTpl.block) {
      if (themeTpl.block.hasOwnProperty(ele)) {
        var style = themeTpl.block[ele]
        if (ele === 'code') {
          style['font-family'] = FONT_FAMILY_MONO
        }
        mapping[ele] = COPY(base_block, style)
      }
    }
    return mapping
  }

  var S = function (tokenName) {
    var arr = []
    var dict = styleMapping[tokenName]
    for (const key in dict) {
      arr.push(key + ':' + dict[key])
    }
    return 'style="' + arr.join(';') + '"'
  }

  var addFootnote = function (title, link) {
    footnoteindex += 1
    footnotes.push([footnoteindex, title, link])
    return footnoteindex
  }

  this.buildFootnotes = function () {
    var footnoteArray = footnotes.map(function (x) {
      if (x[1] === x[2]) {
        return '<code style="font-size: 90%; opacity: 0.6;">[' + x[0] + ']</code>: <i>'  + x[1] +'</i><br/>'
      }
      return '<code style="font-size: 90%; opacity: 0.6;">[' + x[0] + ']</code> ' + x[1] + ': <i>'  + x[2] +'</i><br/>'
    })
    return '<h3 ' + S('h3') + '>References</h3><p ' + S('footnotes') + '>'  + footnoteArray.join('\n') + '</p>'
  }

  this.setOptions = function (newOpts) {
    this.opts = COPY(this.opts, newOpts)
  }

  this.hasFootnotes = function () {
    return footnotes.length !== 0
  }

  this.getRenderer = function () {
    footnotes = []
    footnoteindex = 0
  
    styleMapping = this.buildTheme(this.opts.theme)
    var renderer = new marked.Renderer()
    FuriganaMD.register(renderer);
  
    renderer.heading = function (text, level) {
      if (level < 3) {
        return '<h2 ' + S('h2') + '>' + text + '</h2>'
      } else {
        return '<h3 ' + S('h3') + '>' + text + '</h3>'
      }
    }
    renderer.paragraph = function (text) {
      if (text.startsWith('[') && text.includes(']')) {
        const lines = text.split('\n').filter(line => line.trim());
        
        // 处理图片占位符
        if (lines.length === 2 && lines.every(line => line.match(/^\[图片[12]_\d+\]$/))) {
          const images = lines.map(line => {
            const placeholder = line;
            const imageUrl = this.opts.uploadedImages && this.opts.uploadedImages[placeholder] || '';
            return `<img class="content-image" src="${imageUrl}" alt="内容图片"/>`;
          });
          return `<div class="content-images">${images.join('')}</div>`;
        }
        
        // 处理卡片底部信息
        if (lines.length >= 5 && lines.every(line => line.includes('['))) {
          const leftText = lines[0].match(/\[(.*?)\]/)[1];
          const rightTexts = lines.slice(1, 4).map(line => line.match(/\[(.*?)\]/)[1]);
          const qrcodeText = lines[4];
          
          const qrcodeUrl = this.opts.uploadedImages && this.opts.uploadedImages[qrcodeText] || '';
          
          return `
            <div class="card-footer">
              <div class="footer-left">${leftText}</div>
              <div class="footer-right">
                <div class="footer-text">
                  ${rightTexts.map(text => `<span>${text}</span>`).join('')}
                </div>
                <img class="footer-qrcode" src="${qrcodeUrl}" alt="二维码" />
              </div>
            </div>
          `;
        }
        
        // 处理全局底部文案 - 直接返回原始文本
        if (lines.length === 4 && lines.every(line => line.match(/^\[.*\]$/))) {
          return text;  // 直接返回原始文本，不进行 HTML 转换
        }
      }
      
      text = text.replace(/\n/g, '<br>');
      return '<p ' + S('p') + '>' + text + '</p>';
    }.bind(this);
    renderer.blockquote = function (text) {
      return '<blockquote ' + S('blockquote') + '>' + text + '</blockquote>'
    }
    renderer.code = function (text, infostring) {
      text = text.replace(/</g, "&lt;")
      text = text.replace(/>/g, "&gt;")
  
      var lines = text.split('\n')
      var codeLines = []
      var numbers = []
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        codeLines.push('<code><span class="code-snippet_outer">' + (line || '<br>') + '</span></code>')
        numbers.push('<li></li>')
      }
      var lang = infostring || ''
      return '<section class="code-snippet__fix code-snippet__js">'
        + '<ul class="code-snippet__line-index code-snippet__js">' + numbers.join('')+'</ul>'
        + '<pre class="code-snippet__js" data-lang="'+lang+'">' 
          + codeLines.join('')
        + '</pre></section>'
    }
    renderer.codespan = function (text, infostring) {
      return '<code ' + S('codespan') + '>' + text + '</code>'
    }
    renderer.listitem = function (text) {
      return '<span ' + S('listitem') + '><span style="margin-right: 10px;"><%s/></span>' + text + '</span>';
    }
    renderer.list = function (text, ordered, start) {
      var segments = text.split('<%s/>');
      if (!ordered) {
        text = segments.join('•');
        return '<p ' + S('ul') + '>' + text + '</p>';
      }
      text = segments[0];
      for (var i = 1; i < segments.length; i++) {
        text = text + i + '.' + segments[i];
      }
      return '<p ' + S('ol') + '>' + text + '</p>';
    }
    renderer.image = function (href, title, text) {
      // 处理引用式图片语法 ![图片1][图片1]
      const placeholder = `[${text}]`;
      if (this.opts.uploadedImages && this.opts.uploadedImages[placeholder]) {
        href = this.opts.uploadedImages[placeholder];
      }
      return '<img ' + S(ENV_STETCH_IMAGE ? 'image' : 'image_org') + ' src="' + href + '" title="'+title+'" alt="'+text+'"/>'
    }.bind(this);
    renderer.link = function (href, title, text) {
      if (href.indexOf('https://mp.weixin.qq.com') === 0) {
        return '<a href="' + href +'" title="' + (title || text) + '" ' + S('wx_link') +'>' + text + '</a>'; 
      }else if( href === text){
        return text;
      } else {
        if (ENV_USE_REFERENCES) {
          var ref = addFootnote(title || text, href)
          return '<span ' + S('link') + '>' + text + '<sup>['+ref+']</sup></span>'; 
        } else {
          return '<a href="' + href +'" title="' + (title || text) + '" ' + S('link') + '>' + text + '</a>'; 
        }
      }
    }
    renderer.strong = renderer.em = function (text) {
      return '<strong ' + S('strong') + '>' + text + '</strong>'; 
    }
    renderer.table = function (header, body) {
      return '<table ' + S('table') + '><thead ' + S('thead') + '>' + header + '</thead><tbody>' + body + '</tbody></table>'; 
    }
    renderer.tablecell = function (text, flags) {
      return '<td ' + S('td') + '>' + text + '</td>'; 
    }
    renderer.hr = function(){
      return '<hr style="border-style: solid;border-width: 1px 0 0;border-color: rgba(0,0,0,0.1);-webkit-transform-origin: 0 0;-webkit-transform: scale(1, 0.5);transform-origin: 0 0;transform: scale(1, 0.5);">';
    }
    return renderer
  }
}