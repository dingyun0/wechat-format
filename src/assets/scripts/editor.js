var app = new Vue({
  el: '#app',
  data: function () {
    return {
      title: 'WeChat Format',
      aboutOutput: '',
      output: '',
      source: '',
      editorThemes: [
        { label: 'base16-light', value: 'base16-light' },
        { label: 'duotone-light', value: 'duotone-light' },
        { label: 'monokai', value: 'monokai' }
      ],
      currentEditorTheme: 'base16-light',
      editor: null,
      builtinFonts: [
        { label: '衬线', value: "Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, 'PingFang SC', Cambria, Cochin, Georgia, Times, 'Times New Roman', serif"},
        { label: '无衬线', value: "Roboto, Oxygen, Ubuntu, Cantarell, PingFangSC-light, PingFangTC-light, 'Open Sans', 'Helvetica Neue', sans-serif"}
      ],
      currentFont: "Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, 'PingFang SC', Cambria, Cochin, Georgia, Times, 'Times New Roman', serif",
      currentSize: '16px',
      sizeOption: [
        { label: '16px', value: '16px', desc: '默认' },
        { label: '17px', value: '17px', desc: '正常' },
        { label: '18px', value: '18px', desc: '稍大' }
      ],
      currentTheme: 'default',
      themeOption: [
        { label: 'default', value: 'default', author: 'Lyric'},
        { label: 'lupeng', value: 'lupeng', author: '鲁鹏'}
      ],
      styleThemes: {
        default: defaultTheme,
        lupeng: lupengTheme
      },
      aboutDialogVisible: false,
      footerImage: '',
      showFooterImage: false,
      uploadedImages: {},
      currentCardIndex: 1
    }
  },
  computed: {
    cardCount() {
      // 通过分割 === 来计算卡片数量
      const content = this.editor ? this.editor.getValue() : this.source;
      return content.split('===').filter(section => section.trim()).length - 1; // -1 是因为第一部分是主标题
    }
  },
  mounted () {
    var self = this
    this.editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
      lineNumbers: false,
      lineWrapping: true,
      styleActiveLine: true,
      theme: this.currentEditorTheme,
      mode: 'text/x-markdown',
    });
    this.editor.on("change", function(cm, change) {
      self.refresh()
    })
    // this.currentFont = this.builtinFonts[0],
    this.wxRenderer = new WxRenderer({
      theme: this.styleThemes.default,
      fonts: this.currentFont,
      size: this.currentSize,
      uploadedImages: this.uploadedImages
    })
    axios({
      method: 'get',
      url: './assets/default-content.md',
    }).then(function (resp) {
      self.editor.setValue(resp.data)
    })
  },
  methods: {
    renderWeChat: function (source) {
      var output = '';
      // 如果有底图，添加带背景的容器
      if (this.showFooterImage && this.footerImage) {
        output += `<div class="content-with-bg" style="background-image: url('${this.footerImage}');">`;
      }
      
      // 将内容分割成主标题和卡片部分
      const [mainTitle, ...cards] = source.split('===').filter(section => section.trim());
      
      // 添加主标题部分
      output += '<div class="main-title-section">';
      output += marked(mainTitle.trim(), { renderer: this.wxRenderer.getRenderer() });
      output += '</div>';
      
      // 添加卡片容器
      output += '<div class="cards-container">';
      
      // 处理每个卡片
      cards.forEach(card => {
        output += '<div class="content-card">';
        output += marked(card.trim(), { renderer: this.wxRenderer.getRenderer() });
        output += '</div>';
      });
      
      output += '</div>'; // 关闭卡片容器
      
      if (this.showFooterImage && this.footerImage) {
        output += '</div>';
      }
      return output;
    },
    editorThemeChanged: function (editorTheme) {
      this.editor.setOption('theme', editorTheme)
    },
    fontChanged: function (fonts) {
      this.wxRenderer.setOptions({
        fonts: fonts,
        uploadedImages: this.uploadedImages
      })
      this.refresh()
    },
    sizeChanged: function(size){
      this.wxRenderer.setOptions({
        size: size,
        uploadedImages: this.uploadedImages
      })
      this.refresh()
    },
    themeChanged: function(themeName){
      var themeObject = this.styleThemes[themeName];
      this.wxRenderer.setOptions({
        theme: themeObject,
        uploadedImages: this.uploadedImages
      })
      this.refresh()
    },
    refresh: function () {
      this.output = this.renderWeChat(this.editor.getValue())
    },
    copy: function () {
      var clipboardDiv = document.getElementById('output')
      clipboardDiv.focus();
      window.getSelection().removeAllRanges();  
      var range = document.createRange(); 
      range.setStartBefore(clipboardDiv.firstChild);
      range.setEndAfter(clipboardDiv.lastChild);
      window.getSelection().addRange(range);  

      try {
        if (document.execCommand('copy')) {
          this.$message({
            message: '已复制到剪贴板', type: 'success'
          })
        } else {
          this.$message({
            message: '未能复制到剪贴板，请全选后右键复制', type: 'warning'
          })
        }
      } catch (err) {
        this.$message({
          message: '未能复制到剪贴板，请全选后右键复制', type: 'warning'
        })
      }
    },
    handleFooterImageUpload(file) {
      const isImage = file.type.startsWith('image/');
      const isLt2M = file.size / 1024 / 1024 < 5;

      if (!isImage) {
        this.$message.error('只能上传图片文件!');
        return false;
      }
      if (!isLt2M) {
        this.$message.error('图片大小不能超过 2MB!');
        return false;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.footerImage = reader.result;
        this.showFooterImage = true;
        this.refresh();
      };
      return false;
    },
    removeFooterImage() {
      this.footerImage = '';
      this.showFooterImage = false;
      this.refresh();
    },
    handleImageUpload(file, type) {
      const isImage = file.type.startsWith('image/');
      const isLt5M = file.size / 1024 / 1024 < 5;

      if (!isImage) {
        this.$message.error('只能上传图片文件!');
        return false;
      }
      if (!isLt5M) {
        this.$message.error('图片大小不能超过 5MB!');
        return false;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const imageUrl = reader.result;
        // 确保当前选中的卡片索引不超过实际卡片数量
        const cardIndex = Math.min(this.currentCardIndex || 1, this.cardCount);
        
        // 根据类型和卡片索引设置不同的占位符
        let placeholder;
        if (type === 'QR') {
          placeholder = `[图片QR${cardIndex}]`;
        } else {
          placeholder = `[图片${type}_${cardIndex}]`;
        }
        this.uploadedImages[placeholder] = imageUrl;
        this.refresh();
      };
      return false;
    }
  },
  watch: {
    cardCount: {
      handler(newCount) {
        // 如果当前选中的卡片索引超过了实际卡片数量，则自动调整为最后一张卡片
        if (this.currentCardIndex > newCount) {
          this.currentCardIndex = Math.max(newCount, 1);
        }
      },
      immediate: true
    }
  }
})