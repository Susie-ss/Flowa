// pages/library.js - 组件库（设计系统）页面

// ===== Mock 数据 =====
var mockDesignSystems = [
  {
    id: '1',
    name: '企业后台设计系统',
    description: '包含按钮、表单、表格等基础组件',
    componentCount: 48,
    colorCount: 12,
    createdAt: '2024-01-15',
    colors: ['#5B5EF4', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6']
  },
  {
    id: '2',
    name: '移动端组件库',
    description: '适用于移动端 App 的组件设计',
    componentCount: 32,
    colorCount: 8,
    createdAt: '2024-02-20',
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EC4899']
  },
  {
    id: '3',
    name: '营销页面组件',
    description: '落地页、活动页常用组件',
    componentCount: 24,
    colorCount: 6,
    createdAt: '2024-03-10',
    colors: ['#8B5CF6', '#06B6D4', '#F97316', '#14B8A6']
  }
];

var designSystems = mockDesignSystems.slice();

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

// ===== 开始模拟解析 =====
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
  var baseName = fileName.replace(/\.(sketch|psd|rp)$/i, '');
  var hash = baseName.split('').reduce(function(acc, c) { return acc + c.charCodeAt(0); }, 0);
  var colorPalettes = [
    ['#5B5EF4', '#22C55E', '#F59E0B', '#EF4444'],
    ['#3B82F6', '#10B981', '#F97316', '#EC4899'],
    ['#8B5CF6', '#06B6D4', '#14B8A6', '#F43F5E']
  ];

  return {
    name: baseName || '未命名组件库',
    icons: 20 + (hash % 20),
    fonts: 2 + (hash % 4),
    components: 12 + (hash % 20),
    sizes: 6 + (hash % 5),
    colors: colorPalettes[hash % colorPalettes.length]
  };
}

function showParseDoneResult(result) {
  var stepParsing = document.getElementById('lib-step-parsing');
  var stepDone = document.getElementById('lib-step-done');
  if (stepParsing) stepParsing.style.display = 'none';
  if (stepDone) stepDone.style.display = '';

  // 填充统计数字
  var statsEl = document.getElementById('lib-parse-stats');
  if (statsEl) {
    statsEl.innerHTML =
      '<div class="parse-stat"><span class="parse-stat-value">' + result.icons + '</span><span class="parse-stat-label">图标</span></div>' +
      '<div class="parse-stat"><span class="parse-stat-value">' + result.fonts + '</span><span class="parse-stat-label">字体</span></div>' +
      '<div class="parse-stat"><span class="parse-stat-value">' + result.components + '</span><span class="parse-stat-label">组件</span></div>' +
      '<div class="parse-stat"><span class="parse-stat-value">' + result.sizes + '</span><span class="parse-stat-label">字号</span></div>';
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
    description: '从 ' + (window.libSelectedFile ? window.libSelectedFile.name : '设计文件') + ' 解析生成的组件库，包含 ' + window.libParseResult.icons + ' 图标、' + window.libParseResult.fonts + ' 字体、' + window.libParseResult.components + ' 组件',
    componentCount: window.libParseResult.components,
    colorCount: window.libParseResult.colors.length,
    createdAt: new Date().toISOString().split('T')[0],
    colors: window.libParseResult.colors.slice(),
    source: window.libSelectedFile ? window.libSelectedFile.name : null
  };

  // 添加到列表头部
  designSystems.unshift(newDS);

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
