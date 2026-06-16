// pages/library.js - 组件库（设计系统）页面

// ===== localStorage 持久化 =====
var LS_KEY = 'framo_design_systems';

function loadDesignSystems() {
  try {
    var raw = localStorage.getItem(LS_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { /* ignore */ }
  // 首次加载：返回默认 Mock 数据并保存（每个 DS 携带完整的图标/字体/组件/字号数据）
  var defaultDS = [
    enrichWithDetailData({ id:'1', name:'企业后台设计系统', description:'包含按钮、表单、表格等基础组件', componentCount:48, colorCount:12, createdAt:'2024-01-15', colors:['#5B5EF4','#22C55E','#F59E0B','#EF4444','#8B5CF6'] }, 1),
    { id:'2', name:'移动端组件库', description:'适用于移动端 App 的组件设计', componentCount:32, colorCount:8, createdAt:'2024-02-20', colors:['#3B82F6','#10B981','#F59E0B','#EC4899'], source:null,
      icons: generateIconSet('mobile', 28), fonts: generateFontSet('mobile', 3), components: generateComponentSet('mobile', 14), sizes: generateSizeSet('mobile', 9) },
    { id:'3', name:'营销页面组件', description:'落地页、活动页常用组件', componentCount:24, colorCount:6, createdAt:'2024-03-10', colors:['#8B5CF6','#06B6D4','#F97316','#14B8A6'], source:null,
      icons: generateIconSet('marketing', 22), fonts: generateFontSet('marketing', 3), components: generateComponentSet('marketing', 12), sizes: generateSizeSet('marketing', 7) }
  ];
  saveDesignSystems(defaultDS);
  return defaultDS;
}

// 为企业后台设计系统生成完整数据（使用默认 mock 数据）
function enrichWithDetailData(ds, seed) {
  ds.source = null;
  ds.icons = generateIconSet('enterprise', 32);
  ds.fonts = generateFontSet('enterprise', 4);
  ds.components = generateComponentSet('enterprise', 16);
  ds.sizes = generateSizeSet('enterprise', 9);
  return ds;
}

function saveDesignSystems(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}

var designSystems = loadDesignSystems();

// 解析阶段配置
var parseStages = [
  { label: '读取文件结构...', progress: 10 },
  { label: '解析图层信息...', progress: 25 },
  { label: '提取颜色变量...', progress: 45 },
  { label: '识别字体规范...', progress: 60 },
  { label: '提取图标资源...', progress: 75 },
  { label: '解析组件结构...', progress: 85 },
  { label: '生成组件库...', progress: 95 },
  { label: '完成', progress: 100 }
];

var SUPPORTED_FORMATS = ['.sketch', '.psd', '.rp'];

// ===== 主渲染函数 =====
function renderLibraryPage() {
  var mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  // 更新 header 右侧按钮为"新建组件库"
  updateHeaderForLibrary();

  mainContent.innerHTML = renderLibraryHTML();
}

function updateHeaderForLibrary() {
  var headerRight = document.querySelector('.header-right');
  if (!headerRight) return;

  // 检查是否已经有新建组件库按钮，避免重复添加
  if (headerRight.querySelector('.library-new-btn')) return;

  // 隐藏原有的下载插件等按钮，显示新建组件库
  var existingBtns = headerRight.querySelectorAll(':scope > *');
  existingBtns.forEach(function(btn) { btn.style.display = 'none'; });

  var newBtn = document.createElement('button');
  newBtn.className = 'btn btn-primary library-new-btn';
  newBtn.innerHTML = '<svg class="icon-color icon-sm"><use href="/libs/iconpark/icons.svg#ico-plus"/></svg> 新建组件库';
  newBtn.onclick = function() { showNewLibraryModal(); };
  headerRight.appendChild(newBtn);
}

function restoreHeaderDefault() {
  var headerRight = document.querySelector('.header-right');
  if (!headerRight) return;

  var libBtn = headerRight.querySelector('.library-new-btn');
  if (libBtn) libBtn.remove();

  // 恢复原有按钮
  var existingBtns = headerRight.querySelectorAll(':scope > *');
  existingBtns.forEach(function(btn) { btn.style.display = ''; });
}

function renderLibraryHTML() {
  var cardsHTML = designSystems.map(function(ds) {
    return '<div class="ds-card" data-id="' + ds.id + '">' +
      '<div class="ds-colors">' + ds.colors.map(function(c) {
        return '<span class="color-dot" style="background:' + c + '"></span>';
      }).join('') + '</div>' +
      '<h3 class="ds-name">' + escapeHTML(ds.name) + '</h3>' +
      '<p class="ds-desc">' + escapeHTML(ds.description) + '</p>' +
      (ds.source ? '<p class="ds-source">来源: ' + escapeHTML(ds.source) + '</p>' : '') +
      '<div class="ds-meta">' +
        '<span>' + ds.componentCount + ' 组件</span>' +
        '<span>' + ds.colorCount + ' 色值</span>' +
      '</div>' +
    '</div>';
  }).join('');

  return '<div class="library">' +
    '<div class="library-header">' +
      '<div>' +
        '<h2>组件库</h2>' +
        '<p class="library-desc">管理你的设计系统和组件资产</p>' +
      '</div>' +
    '</div>' +
    '<div class="design-systems-grid">' + (cardsHTML || '<div class="empty-state"><p>暂无组件库</p></div>') + '</div>' +
  '</div>';
}

// ===== 新建组件库弹窗 =====
function showNewLibraryModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'new-library-modal';

  overlay.innerHTML =
    '<div class="modal" style="width:560px" onclick="event.stopPropagation()">' +
      '<div class="modal-header">' +
        '<div><div style="font-size:15px;font-weight:600">新建组件库</div></div>' +
        '<button class="modal-close-btn" onclick="document.getElementById(\'new-library-modal\').remove()">' +
          '<svg class="iconpark iconpark-lg"><use href="/libs/iconpark/sprite.svg#close"/></svg>' +
        '</button>' +
      '</div>' +

      // Step 1: Upload
      '<div id="lib-step-upload" style="padding:0 24px 20px">' +
        '<div id="lib-upload-zone" class="upload-zone" ondragover="handleLibDragOver(event)" ondragleave="handleLibDragLeave(event)" ondrop="handleLibDrop(event)" onclick="document.getElementById(\'lib-file-input\').click()">' +
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
          '<p class="upload-hint">拖拽或点击上传设计文件</p>' +
          '<p class="upload-formats">支持 Sketch (.sketch)、Photoshop (.psd)、Axure (.rp) 格式</p>' +
        '</div>' +
        '<input type="file" id="lib-file-input" accept=".sketch,.psd,.rp" style="display:none" onchange="handleLibFileSelect(event)" />' +
        '<div id="lib-name-group" class="form-row" style="margin-top:16px;display:none">' +
          '<label>组件库名称</label>' +
          '<input type="text" id="lib-name-input" placeholder="输入组件库名称" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;outline:none;box-sizing:border-box" />' +
        '</div>' +
        '<div class="modal-actions" style="margin-top:16px">' +
          '<button class="btn btn-ghost" onclick="document.getElementById(\'new-library-modal\').remove()">取消</button>' +
          '<button class="btn btn-primary" id="lib-start-parse-btn" disabled onclick="startLibraryParse()">开始解析</button>' +
        '</div>' +
      '</div>' +

      // Step 2: Parsing (hidden initially)
      '<div id="lib-step-parsing" style="padding:0 24px 20px;display:none">' +
        '<div class="parse-progress-section">' +
          '<div class="parse-file-name" id="lib-parse-filename"></div>' +
          '<div class="parse-progress-bar"><div class="parse-progress-fill" id="lib-progress-fill" style="width:0%"></div></div>' +
          '<div class="parse-stages" id="lib-parse-stages"></div>' +
        '</div>' +
      '</div>' +

      // Step 3: Done / Result (hidden initially)
      '<div id="lib-step-done" style="padding:0 24px 20px;display:none">' +
        '<div class="parse-success">' +
          '<div class="parse-success-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg></div>' +
          '<h4>解析完成</h4>' +
          '<p style="font-size:13px;color:var(--text-muted)">已从设计文件中提取以下资源：</p>' +
        '</div>' +
        '<div class="parse-result-stats" id="lib-parse-stats"></div>' +
        '<div class="parse-result-colors" id="lib-parse-colors" style="display:none"></div>' +
        '<div class="modal-actions" style="margin-top:16px">' +
          '<button class="btn btn-ghost" onclick="document.getElementById(\'new-library-modal\').remove()">取消</button>' +
          '<button class="btn btn-primary" id="lib-confirm-create-btn" onclick="confirmCreateLibrary()">确认创建</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });

  // 初始化解析阶段 UI
  initParseStagesUI();
}

// 解析阶段 UI 初始化
function initParseStagesUI() {
  var container = document.getElementById('lib-parse-stages');
  if (!container) return;
  container.innerHTML = parseStages.map(function(s, i) {
    return '<div class="parse-stage-item" id="lib-ps-' + i + '">' +
      '<span class="parse-stage-dot"><span class="dot"></span></span>' +
      '<span class="parse-stage-label">' + s.label + '</span>' +
    '</div>';
  }).join('');
}

// ===== 文件上传处理 =====
window.libSelectedFile = null;

window.handleLibDragOver = function(e) {
  e.preventDefault();
  var zone = document.getElementById('lib-upload-zone');
  if (zone) zone.classList.add('drag-over');
};

window.handleLibDragLeave = function(e) {
  e.preventDefault();
  var zone = document.getElementById('lib-upload-zone');
  if (zone) zone.classList.remove('drag-over');
};

window.handleLibDrop = function(e) {
  e.preventDefault();
  var zone = document.getElementById('lib-upload-zone');
  if (zone) zone.classList.remove('drag-over');
  var file = e.dataTransfer.files[0];
  if (file) selectLibFile(file);
};

window.handleLibFileSelect = function(e) {
  var file = e.target.files[0];
  if (file) selectLibFile(file);
};

function selectLibFile(file) {
  // 验证格式
  var ext = '.' + file.name.split('.').pop().toLowerCase();
  if (SUPPORTED_FORMATS.indexOf(ext) === -1) {
    showToast('不支持的文件格式，请上传 .sketch/.psd/.rp 文件', 'error');
    return;
  }

  window.libSelectedFile = file;

  // 更新 UI 显示已选文件
  var zone = document.getElementById('lib-upload-zone');
  var nameGroup = document.getElementById('lib-name-group');
  var startBtn = document.getElementById('lib-start-parse-btn');

  if (zone) {
    zone.className = 'upload-zone has-file';
    zone.innerHTML = '<div class="upload-file-info">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13,2 13,9 20,9"/></svg>' +
      '<div class="upload-file-detail">' +
        '<span class="upload-file-name">' + escapeHTML(file.name) + '</span>' +
        '<span class="upload-file-size">' + formatFileSize(file.size) + '</span>' +
      '</div>' +
      '<button class="upload-remove" onclick="event.stopPropagation();clearLibSelectedFile()">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>' +
    '</div>';
  }

  // 显示名称输入框
  if (nameGroup) {
    nameGroup.style.display = '';
    var nameInput = document.getElementById('lib-name-input');
    if (nameInput) nameInput.value = file.name.replace(/\.(sketch|psd|rp)$/i, '');
  }

  // 启用开始解析按钮
  if (startBtn) startBtn.disabled = false;
}

window.clearLibSelectedFile = function() {
  window.libSelectedFile = null;

  var zone = document.getElementById('lib-upload-zone');
  var nameGroup = document.getElementById('lib-name-group');
  var startBtn = document.getElementById('lib-start-parse-btn');

  if (zone) {
    zone.className = 'upload-zone';
    zone.innerHTML =
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
      '<p class="upload-hint">拖拽或点击上传设计文件</p>' +
      '<p class="upload-formats">支持 Sketch (.sketch)、Photoshop (.psd)、Axure (.rp) 格式</p>';
    zone.ondragover = handleLibDragOver;
    zone.ondragleave = handleLibDragLeave;
    zone.ondrop = handleLibDrop;
    zone.onclick = function() { document.getElementById('lib-file-input').click(); };
  }
  if (nameGroup) nameGroup.style.display = 'none';
  if (startBtn) startBtn.disabled = true;

  // 重置文件 input
  var fileInput = document.getElementById('lib-file-input');
  if (fileInput) fileInput.value = '';
};

// ===== 基于种子生成差异化数据 =====
// 全量图标池
var FULL_ICON_POOL = [
  { name: 'home', label: '首页', type: 'line' }, { name: 'search', label: '搜索', type: 'line' },
  { name: 'settings', label: '设置', type: 'solid' }, { name: 'user', label: '用户', type: 'line' },
  { name: 'heart', label: '收藏', type: 'solid' }, { name: 'bell', label: '通知', type: 'line' },
  { name: 'mail', label: '邮件', type: 'line' }, { name: 'calendar', label: '日历', type: 'line' },
  { name: 'upload', label: '上传', type: 'line' }, { name: 'download', label: '下载', type: 'line' },
  { name: 'edit', label: '编辑', type: 'solid' }, { name: 'delete', label: '删除', type: 'line' },
  { name: 'share', label: '分享', type: 'line' }, { name: 'lock', label: '锁定', type: 'solid' },
  { name: 'unlock', label: '解锁', type: 'line' }, { name: 'eye', label: '查看', type: 'line' },
  { name: 'eye-off', label: '隐藏', type: 'line' }, { name: 'plus', label: '添加', type: 'solid' },
  { name: 'minus', label: '减少', type: 'solid' }, { name: 'check', label: '确认', type: 'solid' },
  { name: 'close', label: '关闭', type: 'solid' }, { name: 'arrow-up', label: '上箭头', type: 'line' },
  { name: 'arrow-down', label: '下箭头', type: 'line' }, { name: 'arrow-left', label: '左箭头', type: 'line' },
  { name: 'arrow-right', label: '右箭头', type: 'line' }, { name: 'refresh', label: '刷新', type: 'line' },
  { name: 'copy', label: '复制', type: 'line' }, { name: 'paste', label: '粘贴', type: 'line' },
  { name: 'link', label: '链接', type: 'line' }, { name: 'image', label: '图片', type: 'line' },
  { name: 'video', label: '视频', type: 'solid' }, { name: 'folder', label: '文件夹', type: 'line' },
  { name: 'star', label: '星标', type: 'solid' }, { name: 'filter', label: '筛选', type: 'line' },
  { name: 'sort', label: '排序', type: 'line' }, { name: 'grid', label: '网格', type: 'line' },
  { name: 'list', label: '列表', type: 'line' }, { name: 'camera', label: '相机', type: 'line' },
  { name: 'mic', label: '麦克风', type: 'line' }, { name: 'location', label: '位置', type: 'line' },
  { name: 'map', label: '地图', type: 'line' }, { name: 'tag', label: '标签', type: 'line' },
  { name: 'bookmark', label: '书签', type: 'solid' }, { name: 'flag', label: '旗帜', type: 'line' },
  { name: 'zap', label: '闪电', type: 'solid' }, { name: 'gift', label: '礼物', type: 'line' }
];

function generateIconSet(seed, count) {
  var hash = seedHash(seed);
  // 根据哈希从全量池中选取不同的子集
  var pool = FULL_ICON_POOL.slice();
  // Fisher-Yates shuffle based on hash
  for (var i = pool.length - 1; i > 0; i--) {
    var j = (hash + i * 17) % (i + 1);
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool.slice(0, count || 32);
}

var FONT_TEMPLATES = [
  { bases: [['PingFang SC','sans-serif',['Regular (400)','Medium (500)','Semibold (600)'],'原型协作平台','系统字体'],
             ['Inter','sans-serif',['Regular (400)','Medium (500)','Bold (700)'],'ProtoPlatform Design','西文字体'],
             ['Noto Sans SC','sans-serif',['Regular (400)','Medium (500)'],'高质量设计系统','中文字体'],
             ['Roboto Mono','monospace',['Regular (400)','Medium (500)'],'const value = 42;','等宽字体'],
             ['DIN Alternate','sans-serif',['Bold (700)','Medium (500)'],'1234567890','数字字体'],
             ['Source Han Serif','serif',['Regular (400)','Semibold (600)'],'衬线字体展示','中文衬线']] }
];

function generateFontSet(seed, count) {
  var hash = seedHash(seed);
  var templates = FONT_TEMPLATES[0].bases;
  var result = [];
  for (var i = 0; i < (count || 4); i++) {
    var t = templates[(hash + i * 31) % templates.length];
    result.push({ name: t[0], family: t[1], weights: t[2].slice(), sample: t[3], category: t[4] });
  }
  return result;
}

var COMPONENT_TEMPLATES = [
  { name:'主按钮', category:'按钮', type:'primary', props:'Primary Button', css:'.btn-primary{background:COLOR;color:#fff}' },
  { name:'次要按钮', category:'按钮', type:'ghost', props:'Secondary Button', css:'.btn-ghost{border:1px solid #E8AEF}' },
  { name:'危险按钮', category:'按钮', type:'danger', props:'Danger Button', css:'.btn-danger{background:#FF6B6B}' },
  { name:'小按钮', category:'按钮', type:'sm', props:'Small Button', css:'.btn-sm{padding:4px 10px;font-size:12px}' },
  { name:'图标按钮', category:'按钮', type:'icon-btn', props:'⚙', css:'.icon-btn{width:32px;height:32px;border-radius:8px}' },
  { name:'输入框', category:'表单', type:'input', props:'Placeholder text', css:'.input{border:1px solid #E8AEF}' },
  { name:'下拉选择', category:'表单', type:'select', props:'请选择', css:'select{appearance:none}' },
  { name:'多行文本', category:'表单', type:'textarea', props:'请输入描述...', css:'textarea{resize:vertical}' },
  { name:'复选框', category:'表单', type:'checkbox', props:'☑ 选项文本', css:'input[type=checkbox]{}' },
  { name:'开关', category:'表单', type:'toggle', props:'○ / ●', css:'.toggle{width:40px;height:24px}' },
  { name:'卡片', category:'容器', type:'card', props:'Card Container', css:'.card{border-radius:12px}' },
  { name:'弹窗', category:'容器', type:'modal', props:'Modal Dialog', css:'.modal{max-width:480px}' },
  { name:'抽屉', category:'容器', type:'drawer', props:'Drawer Panel', css:'.drawer{width:320px}' },
  { name:'标签', category:'展示', type:'badge', props:'New', css:'.badge{font-size:10px;padding:2px 6px}' },
  { name:'头像', category:'展示', type:'avatar', props:'U', css:'.avatar{border-radius:50%}' },
  { name:'导航项', category:'导航', type:'nav-item', props:'菜单项', css:'.nav-item{padding:10px 12px}' },
  { name:'面包屑', category:'导航', type:'breadcrumb', props:'首页 > 项目 > 详情', css:'.breadcrumb{gap:8px}' },
  { name:'分页', category:'导航', type:'pagination', props:'« 1 2 3 ... »', css:'.pagination{gap:4px}' },
  { name:'提示框', category:'反馈', type:'tooltip', props:'提示信息', css:'.tooltip{position:absolute}' },
  { name:'加载中', category:'反馈', type:'spinner', props:'⏳ Loading...', css:'@keyframes spin{to{rotate:360deg}}' },
  { name:'空状态', category:'反馈', type:'empty', props:'暂无数据', css:'.empty{text-align:center}' },
  { name:'进度条', category:'反馈', type:'progress-bar', props:'███████░░', css:'.progress{height:6px;border-radius:3px}' },
  { name:'表格', category:'数据', type:'table', props:'| 表头 | 数据 |', css:'.table{width:100%}' },
  { name:'标签页', category:'导航', type:'tabs', props:'Tab1 | Tab2', css:'.tabs{border-bottom:1px solid #eee}' },
  { name:'步骤条', category:'导航', type:'steps', props:'① → ② → ③', css:'.steps{display:flex}' },
  { name:'时间线', category:'展示', type:'timeline', props:'— 今天 —', css:'.timeline{border-left:2px solid #eee}' },
  { name:'统计卡片', category:'展示', type:'stat-card', props:'1,234 访问', css:'.stat-card{padding:20px}' },
  { name:'头像组', category:'展示', type:'avatar-group', props:'👤👤👤+3', css:'.avatar-group{display:flex}' },
  { name:'评分', category:'反馈', type:'rating', props:'★★★★☆', css:'.rating{color:#F59E0B}' }
];

function generateComponentSet(seed, count) {
  var hash = seedHash(seed);
  var pool = COMPONENT_TEMPLATES.slice();
  for (var i = pool.length - 1; i > 0; i--) {
    var j = (hash + i * 23) % (i + 1);
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool.slice(0, count || 16).map(function(c) { return { name:c.name, category:c.category, type:c.type, props:c.props, css:c.css }; });
}

var SIZE_TEMPLATES = [
  { name:'标题 1', tag:'h1', size:'32px', lineHeight:'40px', weight:'600', usage:'页面主标题' },
  { name:'标题 2', tag:'h2', size:'24px', lineHeight:'32px', weight:'600', usage:'区块标题' },
  { name:'标题 3', tag:'h3', size:'18px', lineHeight:'26px', weight:'600', usage:'卡片标题' },
  { name:'标题 4', tag:'h4', size:'16px', lineHeight:'24px', weight:'600', usage:'段落标题' },
  { name:'正文大', tag:'p-lg', size:'15px', lineHeight:'22px', weight:'400', usage:'大段正文' },
  { name:'正文', tag:'p', size:'14px', lineHeight:'20px', weight:'400', usage:'常规正文' },
  { name:'正文小', tag:'p-sm', size:'13px', lineHeight:'18px', weight:'400', usage:'辅助文本' },
  { name:'说明文字', tag:'caption', size:'12px', lineHeight:'16px', weight:'400', usage:'说明/标注' },
  { name:'微小文字', tag:'tiny', size:'10px', lineHeight:'14px', weight:'400', usage:'角标/水印' },
  { name:'超大标题', tag:'display', size:'48px', lineHeight:'56px', weight:'700', usage:'落地页主标题' }
];

function generateSizeSet(seed, count) {
  var hash = seedHash(seed);
  var pool = SIZE_TEMPLATES.slice();
  // Use a deterministic selection
  var result = [];
  for (var i = 0; i < (count || 9); i++) {
    result.push(SIZE_TEMPLATES[(hash + i * 7) % SIZE_TEMPLATES.length]);
  }
  return result;
}

// 简单字符串哈希（确定性）
function seedHash(str) {
  var h = 0;
  for (var i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h = h & h; // Convert to 32bit integer
  }
  return Math.abs(h);
}

// ===== 开始模拟解析（返回完整数据）=====
window.libParseResult = null;

window.startLibraryParse = function() {
  if (!window.libSelectedFile) return;

  // 切换到解析步骤
  var stepUpload = document.getElementById('lib-step-upload');
  var stepParsing = document.getElementById('lib-step-parsing');
  if (stepUpload) stepUpload.style.display = 'none';
  if (stepParsing) stepParsing.style.display = '';

  // 显示文件名
  var filenameEl = document.getElementById('lib-parse-filename');
  if (filenameEl && window.libSelectedFile) {
    filenameEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13,2 13,9 20,9"/></svg> ' +
      '<span>' + escapeHTML(window.libSelectedFile.name) + '</span>';
  }

  // 模拟逐步解析
  parseStages.forEach(function(stage, i) {
    setTimeout(function() {
      updateParseStage(i);

      if (i === parseStages.length - 1) {
        // 解析完成
        setTimeout(function() {
          window.libParseResult = simulateParseResult(window.libSelectedFile.name);
          showParseDoneResult(window.libParseResult);
        }, 500);
      }
    }, (i + 1) * 800);
  });
};

function updateParseStage(stageIndex) {
  // 更新进度条
  var fill = document.getElementById('lib-progress-fill');
  if (fill) fill.style.width = parseStages[stageIndex].progress + '%';

  // 更新每个阶段的状态
  for (var i = 0; i < parseStages.length; i++) {
    var el = document.getElementById('lib-ps-' + i);
    if (!el) continue;

    var dot = el.querySelector('.parse-stage-dot');

    if (i < stageIndex) {
      el.className = 'parse-stage-item done';
      dot.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>';
    } else if (i === stageIndex) {
      el.className = 'parse-stage-item active';
      dot.innerHTML = '<span class="parse-spinner"></span>';
    } else {
      el.className = 'parse-stage-item';
      dot.innerHTML = '<span class="dot"></span>';
    }
  }
}

function simulateParseResult(fileName) {
  var baseName = fileName.replace(/\.(sketch|psd|rp)$/i, '') || '未命名组件库';
  // 用文件名作为种子，确保同一文件每次解析结果一致
  var seed = baseName;
  var colorPalettes = [
    ['#5B5EF4', '#22C55E', '#F59E0B', '#EF4444'],
    ['#3B82F6', '#10B981', '#F97316', '#EC4899'],
    ['#8B5CF6', '#06B6D4', '#14B8A6', '#F43F5E'],
    ['#0EA5E9', '#84CC16', '#F97316', '#EC4899'],
    ['#6366F1', '#14B8A6', '#F59E0B', '#EF4444']
  ];
  var paletteIdx = seedHash(seed) % colorPalettes.length;

  return {
    name: baseName,
    icons: generateIconSet(seed, 20 + (seedHash(seed) % 20)),
    fonts: generateFontSet(seed, 2 + (seedHash(seed + 'f') % 3)),
    components: generateComponentSet(seed, 12 + (seedHash(seed + 'c') % 14)),
    sizes: generateSizeSet(seed, 6 + (seedHash(seed + 's') % 5)),
    colors: colorPalettes[paletteIdx]
  };
}

function showParseDoneResult(result) {
  var stepParsing = document.getElementById('lib-step-parsing');
  var stepDone = document.getElementById('lib-step-done');
  if (stepParsing) stepParsing.style.display = 'none';
  if (stepDone) stepDone.style.display = '';

  // 填充统计数字（result.icons/fonts/components/sizes 现在是数组）
  var statsEl = document.getElementById('lib-parse-stats');
  if (statsEl) {
    statsEl.innerHTML =
      '<div class="parse-stat"><span class="parse-stat-value">' + result.icons.length + '</span><span class="parse-stat-label">图标</span></div>' +
      '<div class="parse-stat"><span class="parse-stat-value">' + result.fonts.length + '</span><span class="parse-stat-label">字体</span></div>' +
      '<div class="parse-stat"><span class="parse-stat-value">' + result.components.length + '</span><span class="parse-stat-label">组件</span></div>' +
      '<div class="parse-stat"><span class="parse-stat-value">' + result.sizes.length + '</span><span class="parse-stat-label">字号</span></div>';
  }

  // 填充色板
  var colorsEl = document.getElementById('lib-parse-colors');
  if (colorsEl) {
    colorsEl.style.display = '';
    colorsEl.innerHTML = '<span class="parse-result-label">提取色板：</span>' +
      '<div class="parse-color-dots">' + result.colors.map(function(c) {
        return '<span class="parse-color-dot" style="background:' + c + '" title="' + c + '"></span>';
      }).join('') + '</div>';
  }
}

// ===== 确认创建 =====
window.confirmCreateLibrary = function() {
  if (!window.libParseResult) return;

  var nameInput = document.getElementById('lib-name-input');
  var libraryName = (nameInput ? nameInput.value : '') || window.libParseResult.name;

  var newDS = {
    id: String(Date.now()),
    name: libraryName,
    description: '从 ' + (window.libSelectedFile ? window.libSelectedFile.name : '设计文件') + ' 解析生成的组件库，包含 ' + window.libParseResult.icons.length + ' 图标、' + window.libParseResult.fonts.length + ' 字体、' + window.libParseResult.components.length + ' 组件',
    componentCount: window.libParseResult.components.length,
    colorCount: window.libParseResult.colors.length,
    createdAt: new Date().toISOString().split('T')[0],
    colors: window.libParseResult.colors.slice(),
    source: window.libSelectedFile ? window.libSelectedFile.name : null,
    // 存储完整的解析数据，详情页使用这些数据渲染
    icons: window.libParseResult.icons.slice(),
    fonts: window.libParseResult.fonts.slice(),
    components: window.libParseResult.components.slice(),
    sizes: window.libParseResult.sizes.slice()
  };

  // 添加到列表头部
  designSystems.unshift(newDS);

  // 持久化到 localStorage
  saveDesignSystems(designSystems);

  // 关闭弹窗
  var modal = document.getElementById('new-library-modal');
  if (modal) modal.remove();

  // 重新渲染页面
  renderLibraryPage();

  showToast('组件库「' + libraryName + '」创建成功', 'success');
};

// ===== 工具函数 =====
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  var units = ['B', 'KB', 'MB', 'GB'];
  var k = 1024;
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}

// ===== 导出全局函数 =====
window.renderLibraryPage = renderLibraryPage;
window.showNewLibraryModal = showNewLibraryModal;

// ===== 设计系统详情页 - 4个Tab =====

var currentDSTab = 'icons'; // icons | fonts | components | sizes
var currentDS = null;       // 当前正在查看的设计系统对象
var dsIconSearch = '';
var dsIconFilter = 'all'; // all | line | solid

// SVG 图标映射（覆盖全量池中所有图标名）
var iconSVGMap = {
  home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
  search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  settings: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
  user: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  heart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  bell: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  mail: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  calendar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  upload: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  download: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  edit: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  delete: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  share: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
  lock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
  unlock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>',
  eye: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  'eye-off': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  minus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>',
  close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  'arrow-up': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></svg>',
  'arrow-down': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></svg>',
  'arrow-left': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>',
  'arrow-right': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>',
  refresh: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>',
  copy: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  paste: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
  link: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
  image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>',
  video: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23,7 16,12 23,17 23,7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
  folder: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
  star: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>',
  filter: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></svg>',
  sort: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="21" y2="12"/><line x1="11" y1="18" x2="21" y2="18"/></svg>',
  grid: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  list: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  camera: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  mic: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
  location: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  map: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  tag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  bookmark: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  flag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-3V3s-1 1-4 1-5-2-8-2-4 1-4 3z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  zap: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/></svg>',
  gift: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5" rx="2"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>'
};

// 默认字体数据（fallback）
var DEFAULT_FONTS = [
  { name: 'PingFang SC', family: 'sans-serif', weights: ['Regular (400)', 'Medium (500)', 'Semibold (600)'], sample: '原型协作平台', category: '系统字体' },
  { name: 'Inter', family: 'sans-serif', weights: ['Regular (400)', 'Medium (500)', 'Bold (700)'], sample: 'ProtoPlatform Design', category: '西文字体' },
  { name: 'Noto Sans SC', family: 'sans-serif', weights: ['Regular (400)', 'Medium (500)'], sample: '高质量设计系统', category: '中文字体' },
  { name: 'Roboto Mono', family: 'monospace', weights: ['Regular (400)', 'Medium (500)'], sample: 'const value = 42;', category: '等宽字体' }
];

// 默认组件数据（fallback）
var DEFAULT_COMPONENTS = [
  { name:'主按钮', category:'按钮', type:'primary', props:'Primary Button', css:'.btn-primary{background:#5B5EF4;color:#fff}' },
  { name:'次要按钮', category:'按钮', type:'ghost', props:'Secondary Button', css:'.btn-ghost{border:1px solid #E8AEF}' },
  { name:'危险按钮', category:'按钮', type:'danger', props:'Danger Button', css:'.btn-danger{background:#FF6B6B}' },
  { name:'小按钮', category:'按钮', type:'sm', props:'Small Button', css:'.btn-sm{padding:4px 10px;font-size:12px}' },
  { name:'输入框', category:'表单', type:'input', props:'Placeholder text', css:'.input{border:1px solid #E8AEF}' },
  { name:'下拉选择', category:'表单', type:'select', props:'请选择', css:'select{appearance:none}' },
  { name:'多行文本', category:'表单', type:'textarea', props:'请输入描述...', css:'textarea{resize:vertical}' },
  { name:'复选框', category:'表单', type:'checkbox', props:'☑ 选项文本', css:'input[type=checkbox]{}' },
  { name:'卡片', category:'容器', type:'card', props:'Card Container', css:'.card{border-radius:12px}' },
  { name:'弹窗', category:'容器', type:'modal', props:'Modal Dialog', css:'.modal{max-width:480px}' },
  { name:'标签', category:'展示', type:'badge', props:'New', css:'.badge{font-size:10px;padding:2px 6px}' },
  { name:'头像', category:'展示', type:'avatar', props:'U', css:'.avatar{border-radius:50%}' },
  { name:'导航项', category:'导航', type:'nav-item', props:'菜单项', css:'.nav-item{padding:10px 12px}' },
  { name:'面包屑', category:'导航', type:'breadcrumb', props:'首页 > 项目 > 详情', css:'.breadcrumb{gap:8px}' },
  { name:'提示框', category:'反馈', type:'tooltip', props:'提示信息', css:'.tooltip{position:absolute}' },
  { name:'加载中', category:'反馈', type:'spinner', props:'⏳ Loading...', css:'@keyframes spin{to{rotate:360deg}}' }
];

// 默认字号数据（fallback）
var DEFAULT_SIZES = [
  { name:'标题 1', tag:'h1', size:'32px', lineHeight:'40px', weight:'600', usage:'页面主标题' },
  { name:'标题 2', tag:'h2', size:'24px', lineHeight:'32px', weight:'600', usage:'区块标题' },
  { name:'标题 3', tag:'h3', size:'18px', lineHeight:'26px', weight:'600', usage:'卡片标题' },
  { name:'标题 4', tag:'h4', size:'16px', lineHeight:'24px', weight:'600', usage:'段落标题' },
  { name:'正文大', tag:'p-lg', size:'15px', lineHeight:'22px', weight:'400', usage:'大段正文' },
  { name:'正文', tag:'p', size:'14px', lineHeight:'20px', weight:'400', usage:'常规正文' },
  { name:'正文小', tag:'p-sm', size:'13px', lineHeight:'18px', weight:'400', usage:'辅助文本' },
  { name:'说明文字', tag:'caption', size:'12px', lineHeight:'16px', weight:'400', usage:'说明/标注' },
  { name:'微小文字', tag:'tiny', size:'10px', lineHeight:'14px', weight:'400', usage:'角标/水印' }
];

// 获取当前DS的数据，fallback 到默认值
function getDSIcons()   { return (currentDS && currentDS.icons && currentDS.icons.length > 0) ? currentDS.icons : FULL_ICON_POOL; }
function getDSFonts()   { return (currentDS && currentDS.fonts && currentDS.fonts.length > 0) ? currentDS.fonts : DEFAULT_FONTS; }
function getDSComponents() { return (currentDS && currentDS.components && currentDS.components.length > 0) ? currentDS.components : DEFAULT_COMPONENTS; }
function getDSSizes()  { return (currentDS && currentDS.sizes && currentDS.sizes.length > 0) ? currentDS.sizes : DEFAULT_SIZES; }

// 查找设计系统
function findDesignSystemById(id) {
  for (var i = 0; i < designSystems.length; i++) {
    if (designSystems[i].id === id) return designSystems[i];
  }
  return null;
}

// Tab 图标 SVG
function getTabIconSVG(key) {
  var icons = {
    icons: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    fonts: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4,7 4,4 20,4 20,7"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></svg>',
    components: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="20" height="8" rx="1"/></svg>',
    sizes: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="20" y2="4"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="20" x2="18" y2="20"/></svg>'
  };
  return icons[key] || '';
}

// 渲染设计系统详情页
function renderDesignSystemDetail(dsId) {
  var mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  var ds = findDesignSystemById(dsId);
  currentDS = ds;  // ★ 关键：记录当前查看的 DS，后续渲染函数从中取数据
  currentDSTab = 'icons';
  dsIconSearch = '';
  dsIconFilter = 'all';

  // 隐藏 header 右侧新建按钮
  var headerRight = document.querySelector('.header-right');
  if (headerRight) {
    var btns = headerRight.querySelectorAll(':scope > *');
    btns.forEach(function(btn) { btn.style.display = 'none'; });
  }

  mainContent.innerHTML = renderDetailHTML(ds);
  bindDetailEvents();
}

function renderDetailHTML(ds) {
  var dsName = ds ? ds.name : '未知';
  var dsDesc = ds ? '组件库 ID: ' + ds.id + ' — 完整的设计系统定义，包含图标、字体、组件和字号规范' : '';

  // 使用当前 DS 的图标数据（fallback 到默认池）
  var dsIcons = getDSIcons();
  var filteredIcons = dsIcons.filter(function(icon) {
    var matchSearch = !dsIconSearch ||
      icon.name.toLowerCase().indexOf(dsIconSearch.toLowerCase()) !== -1 ||
      icon.label.indexOf(dsIconSearch) !== -1;
    var matchFilter = dsIconFilter === 'all' || icon.type === dsIconFilter;
    return matchSearch && matchFilter;
  });

  // 构建 tab 按钮
  var tabs = [
    { key: 'icons', label: '图标' },
    { key: 'fonts', label: '字体' },
    { key: 'components', label: '组件' },
    { key: 'sizes', label: '字号' }
  ];

  var tabsHTML = tabs.map(function(tab) {
    return '<button class="ds-tab' + (currentDSTab === tab.key ? ' active' : '') + '" data-dstab="' + tab.key + '">' +
      getTabIconSVG(tab.key) + '<span>' + tab.label + '</span></button>';
  }).join('');

  // 根据当前 tab 构建内容
  var contentHTML = '';
  if (currentDSTab === 'icons') {
    contentHTML = renderIconsTab(filteredIcons);
  } else if (currentDSTab === 'fonts') {
    contentHTML = renderFontsTab();
  } else if (currentDSTab === 'components') {
    contentHTML = renderComponentsTab();
  } else if (currentDSTab === 'sizes') {
    contentHTML = renderSizesTab();
  }

  return '<div class="ds-detail">' +
    // Header
    '<div class="ds-header">' +
      '<div class="ds-header-left">' +
        '<button class="btn btn-ghost ds-back-btn">← 返回</button> ' +
        '<div>' +
          '<h2>' + escapeHTML(dsName) + '</h2>' +
          '<p class="text-muted">' + dsDesc + '</p>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Tabs
    '<div class="ds-tabs">' + tabsHTML + '</div>' +

    // Content
    '<div class="ds-content" id="ds-content-area">' + contentHTML + '</div>' +
  '</div>';
}

function renderIconsTab(icons) {
  var cardsHTML = icons.map(function(icon) {
    var svg = iconSVGMap[icon.name] || '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
    return '<div class="icon-card">' +
      '<div class="icon-preview">' + svg + '</div>' +
      '<div class="icon-info">' +
        '<span class="icon-name">' + icon.name + '</span>' +
        '<span class="icon-label">' + icon.label + '</span>' +
      '</div>' +
    '</div>';
  }).join('');

  return '<section class="ds-section">' +
    '<div class="ds-section-header">' +
      '<h3>图标库</h3>' +
      '<span class="ds-count">' + icons.length + ' 个图标</span>' +
      '<div class="ds-search">' +
        '<input type="text" class="input ds-search-input" id="ds-icon-search" placeholder="搜索图标..." value="' + escapeHTML(dsIconSearch) + '" />' +
      '</div>' +
    '</div>' +
    '<div class="ds-tags">' +
      '<button class="ds-tag' + (dsIconFilter === 'all' ? ' active' : '') + '" data-filter="all">全部</button>' +
      '<button class="ds-tag' + (dsIconFilter === 'line' ? ' active' : '') + '" data-filter="line">线性</button>' +
      '<button class="ds-tag' + (dsIconFilter === 'solid' ? ' active' : '') + '" data-filter="solid">面性</button>' +
    '</div>' +
    '<div class="icons-grid">' + (cardsHTML || '<div class="empty-state" style="grid-column:1/-1"><p>未找到匹配的图标</p></div>') + '</div>' +
  '</section>';
}

function renderFontsTab() {
  var fonts = getDSFonts();  // ★ 从当前 DS 取字体数据
  var listHTML = fonts.map(function(font) {
    var weightTags = font.weights.map(function(w) {
      return '<span class="font-weight-tag">' + w + '</span>';
    }).join('');
    return '<div class="font-card">' +
      '<div class="font-header">' +
        '<h4>' + font.name + '</h4>' +
        '<span class="font-category">' + font.category + '</span>' +
      '</div>' +
      '<div class="font-sample" style="font-family:' + font.family + '">' + font.sample + '</div>' +
      '<div class="font-meta"><span class="meta-label">字重：</span>' + weightTags + '</div>' +
      '<div class="font-meta"><span class="meta-label">CSS：</span><code class="font-code">font-family: \'' + font.name + '\', ' + font.family + '</code></div>' +
    '</div>';
  }).join('');

  return '<section class="ds-section">' +
    '<div class="ds-section-header"><h3>字体规范</h3><span class="ds-count">' + fonts.length + ' 款字体</span></div>' +
    '<div class="fonts-list">' + listHTML + '</div>' +
  '</section>';
}

function renderComponentsTab() {
  var components = getDSComponents();  // ★ 从当前 DS 取组件数据
  function getPreviewStyle(type) {
    var styles = {
      primary:   'background:#5B5EF4;color:#fff;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:500;display:inline-block;',
      ghost:     'border:1px solid #E8EAEF;color:#666;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:500;display:inline-block;',
      danger:    'background:#FF6B6B;color:#fff;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:500;display:inline-block;',
      sm:        'background:#5B5EF4;color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:500;display:inline-block;',
      input:     'border:1px solid #E8EAEF;color:#999;padding:8px 12px;border-radius:6px;font-size:13px;width:100%;box-sizing:border-box;',
      select:    'border:1px solid #E8EAEF;color:#999;padding:8px 12px;border-radius:6px;font-size:13px;width:100%;box-sizing:border-box;background:#fff;',
      textarea:  'border:1px solid #E8EAEF;color:#999;padding:8px 12px;border-radius:6px;font-size:13px;width:100%;min-height:48px;box-sizing:border-box;',
      checkbox:  '',
      card:      'background:#fff;border:1px solid #E8EAEF;border-radius:8px;padding:12px;font-size:13px;color:#333;box-shadow:0 1px 4px rgba(0,0,0,.08);width:100%;box-sizing:border-box;',
      modal:     'background:#fff;border:1px solid #E8EAEF;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;color:#333;box-shadow:0 4px 16px rgba(0,0,0,.12);width:100%;box-sizing:border-box;text-align:center;',
      badge:     'background:#5B5EF4;color:#fff;font-size:10px;padding:2px 8px;border-radius:8px;font-weight:600;display:inline-block;',
      avatar:    'width:32px;height:32px;background:linear-gradient(135deg,#F59E0B,#EF4444);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:12px;',
      'nav-item':'padding:8px 12px;background:#f5f7fa;border-radius:6px;font-size:13px;color:#333;width:100%;box-sizing:border-box;display:block;',
      breadcrumb:'font-size:12px;color:#999;gap:4px;display:flex;',
      tooltip:  'background:#333;color:#fff;font-size:11px;padding:4px 8px;border-radius:4px;display:inline-block;',
      spinner:  'width:20px;height:20px;border:2px solid #E8EAEF;border-top-color:#5B5EF4;border-radius:50%;display:inline-block;',
      'icon-btn':'width:32px;height:32px;border:1px solid #E8EAEF;border-radius:8px;display:flex;align-items:center;justify-content:center;',
      toggle:   'width:40px;height:24px;border-radius:12px;background:#ccc;position:relative;',
      drawer:   'background:#fff;border:1px solid #E8EAEF;border-radius:8px;padding:16px;width:280px;box-sizing:border-box;',
      empty:    'text-align:center;padding:32px;color:#999;',
      'progress-bar':'height:6px;border-radius:3px;background:#E8EAEF;position:relative;overflow:hidden;',
      table:    'width:100%;border-collapse:collapse;border:1px solid #E8EAEF;',
      tabs:     'display:flex;gap:0;border-bottom:2px solid #E8EAEF;',
      steps:    'display:flex;gap:16px;',
      timeline: 'border-left:2px solid #E8EAEF;padding-left:16px;',
      'stat-card':'background:linear-gradient(135deg,#5B5EF4,#8B5CF6);color:#fff;padding:20px;border-radius:8px;',
      'avatar-group':'display:flex;',
      rating:   'letter-spacing:2px;'
    };
    return styles[type] || '';
  }

  var gridHTML = components.map(function(comp) {
    var previewStyle = getPreviewStyle(comp.type);
    var previewTag = comp.type === 'checkbox'
      ? '<label style="display:flex;align-items:center;gap:8px;font-size:13px;"><input type="checkbox" checked style="accent-color:#5B5EF4"/> 选项文本</label>'
      : comp.type === 'avatar'
        ? '<div style="' + previewStyle + '">U</div>'
        : comp.type === 'spinner'
          ? '<div style="' + previewStyle + '"></div>'
          : comp.type === 'toggle'
            ? '<div style="' + previewStyle + '"><span style="width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:.2s"></span></div>'
            : comp.type === 'progress-bar'
              ? '<div style="' + previewStyle + '"><div style="width:70%;height:100%;background:#5B5EF4;border-radius:3px"></div></div>'
              : comp.type === 'rating'
                ? '<span style="' + previewStyle + '">★★★★☆</span>'
                : '<span style="' + previewStyle + '">' + comp.props + '</span>';

    return '<div class="component-card">' +
      '<div class="comp-header"><h4>' + comp.name + '</h4><span class="comp-category">' + comp.category + '</span></div>' +
      '<div class="comp-preview">' + previewTag + '</div>' +
      '<div class="comp-css"><code>' + escapeHTML(comp.css) + '</code></div>' +
    '</div>';
  }).join('');

  return '<section class="ds-section">' +
    '<div class="ds-section-header"><h3>组件</h3><span class="ds-count">' + components.length + ' 个组件</span></div>' +
    '<div class="components-grid">' + gridHTML + '</div>' +
  '</section>';
}

function renderSizesTab() {
  var sizes = getDSSizes();  // ★ 从当前 DS 取字号数据
  var rowsHTML = sizes.map(function(fs) {
    return '<tr>' +
      '<td><div class="size-preview" style="font-size:' + fs.size + ';line-height:' + fs.lineHeight + ';font-weight:' + fs.weight + '">' + fs.name + '</div></td>' +
      '<td><code>' + fs.tag + '</code></td>' +
      '<td>' + fs.size + '</td>' +
      '<td>' + fs.lineHeight + '</td>' +
      '<td>' + fs.weight + '</td>' +
      '<td><span class="size-usage">' + fs.usage + '</span></td>' +
    '</tr>';
  }).join('');

  return '<section class="ds-section">' +
    '<div class="ds-section-header"><h3>字号规范</h3><span class="ds-count">' + sizes.length + ' 个字号</span></div>' +
    '<div class="sizes-table-wrapper"><table class="sizes-table">' +
      '<thead><tr><th style="width:30%">预览</th><th>标签</th><th>字号</th><th>行高</th><th>字重</th><th>用途</th></tr></thead>' +
      '<tbody>' + rowsHTML + '</tbody>' +
    '</table></div></section>';
}

// 绑定详情页事件
function bindDetailEvents() {
  // 返回按钮
  var backBtn = document.querySelector('.ds-back-btn');
  if (backBtn) backBtn.onclick = function(e) { e.preventDefault(); currentDS = null; navigateTo('library'); };

  // Tab 切换
  document.querySelectorAll('.ds-tab').forEach(function(tab) {
    tab.onclick = function() {
      currentDSTab = this.getAttribute('data-dstab');
      var contentEl = document.getElementById('ds-content-area');
      if (contentEl) {
        if (currentDSTab === 'icons') {
          var icons = getDSIcons();
          var filtered = icons.filter(function(ic) {
            var ms = !dsIconSearch || ic.name.toLowerCase().indexOf(dsIconSearch.toLowerCase()) !== -1 || ic.label.indexOf(dsIconSearch) !== -1;
            var mf = dsIconFilter === 'all' || ic.type === dsIconFilter;
            return ms && mf;
          });
          contentEl.innerHTML = renderIconsTab(filtered);
        } else if (currentDSTab === 'fonts') {
          contentEl.innerHTML = renderFontsTab();
        } else if (currentDSTab === 'components') {
          contentEl.innerHTML = renderComponentsTab();
        } else if (currentDSTab === 'sizes') {
          contentEl.innerHTML = renderSizesTab();
        }
        // 更新 tab 状态
        document.querySelectorAll('.ds-tab').forEach(function(t) {
          t.classList.toggle('active', t.getAttribute('data-dstab') === currentDSTab);
        });
        bindDetailEvents();
      }
    };
  });

  // 图标搜索
  var searchInput = document.getElementById('ds-icon-search');
  if (searchInput) {
    searchInput.oninput = function() {
      dsIconSearch = this.value;
      refreshIconsTab();
    };
  }

  // 分类筛选
  document.querySelectorAll('.ds-tag[data-filter]').forEach(function(tag) {
    tag.onclick = function() {
      dsIconFilter = this.getAttribute('data-filter');
      document.querySelectorAll('.ds-tag[data-filter]').forEach(function(t) {
        t.classList.toggle('active', t.getAttribute('data-filter') === dsIconFilter);
      });
      refreshIconsTab();
    };
  });
}

function refreshIconsTab() {
  var icons = getDSIcons();  // ★ 用当前 DS 的图标
  var filtered = icons.filter(function(ic) {
    var ms = !dsIconSearch || ic.name.toLowerCase().indexOf(dsIconSearch.toLowerCase()) !== -1 || ic.label.indexOf(dsIconSearch) !== -1;
    var mf = dsIconFilter === 'all' || ic.type === dsIconFilter;
    return ms && mf;
  });
  var contentEl = document.getElementById('ds-content-area');
  if (contentEl) {
    contentEl.innerHTML = renderIconsTab(filtered);
    bindDetailEvents();
  }
}

// 让 DS 卡片可点击跳转
window.renderLibraryPage = (function(origRender) {
  return function() {
    origRender.call(this);

    // 绑定卡片点击事件
    setTimeout(function() {
      document.querySelectorAll('.ds-card[data-id]').forEach(function(card) {
        card.style.cursor = 'pointer';
        card.onclick = function() {
          var id = this.getAttribute('data-id');
          navigateTo('library-detail', { id: id });
        };
      });
    }, 0);
  };
})(renderLibraryPage);

// 导出详情渲染函数
window.renderDesignSystemDetail = renderDesignSystemDetail;
window.findDesignSystemById = findDesignSystemById;
window.designSystems = designSystems; // 供 AI 生成页面读取设计系统列表
