// pages/ai-generate.js - AI 原型生成页面（全页布局）
// 左侧：对话区域 + 风格选择；右侧：实时原型预览

var aiGenMessages = [];
var aiGenPreviewHTML = '';

// ===== 主渲染入口 =====
function renderAIGeneratePage() {
  var mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  // 恢复 header（无特殊按钮需隐藏）
  if (typeof restoreHeaderDefault === 'function') restoreHeaderDefault();

  mainContent.innerHTML =
    '<div class="ai-gen-page">' +
      // ===== 左侧：对话区域 =====
      '<div class="ai-gen-left">' +
        '<div class="ai-gen-header">' +
          '<h3>AI 生成原型</h3>' +
          '<div class="ai-gen-ds-selector">' +
            '<label>设计系统风格</label>' +
            '<select id="ai-gen-ds-select">' +
              '<option value="">不使用</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="ai-gen-messages" id="ai-gen-messages">' +
          '<div class="ai-gen-msg ai-gen-msg-bot">' +
            '<div class="ai-gen-msg-avatar"><svg viewBox="0 0 24 24" fill="#5B5EF4" width="16" height="16"><path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z"/><circle cx="18" cy="18" r="3"/><path d="M18 16v4M16 18h4"/></svg></div>' +
            '<div class="ai-gen-msg-content">' +
              '<p>你好！描述你想要的页面，我会自动生成原型界面。</p>' +
              '<p style="font-size:12px;color:var(--text-muted);margin-top:8px">例如：一个包含统计卡片和折线图的数据看板，侧边栏有导航菜单</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="ai-gen-input-area">' +
          '<textarea id="ai-gen-input" rows="2" placeholder="描述你想要生成的页面..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();aiGenSendMessage()}"></textarea>' +
          '<button class="btn btn-primary ai-gen-send-btn" onclick="aiGenSendMessage()">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      // ===== 右侧：实时原型预览 =====
      '<div class="ai-gen-right">' +
        '<div class="ai-gen-preview-header">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 2v4M16 2v4"/></svg>' +
          '<span>实时预览</span>' +
          '<button class="ai-gen-refresh-btn" onclick="aiGenRefreshPreview()" title="刷新预览">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-3-6.6"/><path d="M21 3v6h-6"/></svg>' +
          '</button>' +
        '</div>' +
        '<iframe id="ai-gen-preview" class="ai-gen-preview-frame" sandbox="allow-scripts allow-same-origin"></iframe>' +
      '</div>' +
    '</div>';

  // 填充设计系统下拉
  populateDSSelect();

  // 恢复之前的预览内容
  if (aiGenPreviewHTML) {
    updatePreview(aiGenPreviewHTML);
  }

  // 恢复历史消息
  restoreMessages();
}

// ===== 设计系统下拉列表 =====
function populateDSSelect() {
  var sel = document.getElementById('ai-gen-ds-select');
  if (!sel) return;

  // 保留第一个"不使用"选项
  sel.innerHTML = '<option value="">不使用</option>';

  var dsList = window.designSystems || [];
  dsList.forEach(function(ds) {
    var opt = document.createElement('option');
    opt.value = ds.id;
    opt.textContent = ds.name + (ds.source ? ' - ' + ds.source : '');
    sel.appendChild(opt);
  });
}

// ===== 消息管理 =====
function addMessage(type, text, extraHTML) {
  aiGenMessages.push({ type: type, text: text, extra: extraHTML || '' });
  renderMessages();
}

function renderMessages() {
  var container = document.getElementById('ai-gen-messages');
  if (!container) return;

  container.innerHTML = aiGenMessages.map(function(msg) {
    if (msg.type === 'user') {
      return '<div class="ai-gen-msg ai-gen-msg-user">' +
        '<div class="ai-gen-msg-content">' +
          '<p>' + escapeHTML(msg.text) + '</p>' +
        '</div>' +
      '</div>';
    }
    // bot message
    var extraBlock = msg.extra ? '<div class="ai-gen-msg-extra">' + msg.extra + '</div>' : '';
    return '<div class="ai-gen-msg ai-gen-msg-bot">' +
      '<div class="ai-gen-msg-avatar"><svg viewBox="0 0 24 24" fill="#5B5EF4" width="16" height="16"><path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z"/><circle cx="18" cy="18" r="3"/><path d="M18 16v4M16 18h4"/></svg></div>' +
      '<div class="ai-gen-msg-content">' +
        '<p>' + escapeHTML(msg.text) + '</p>' +
        extraBlock +
      '</div>' +
    '</div>';
  }).join('');

  // 滚动到底部
  container.scrollTop = container.scrollHeight;
}

function restoreMessages() {
  if (aiGenMessages.length > 0) renderMessages();
}

// ===== 发送消息 & 生成 =====
function aiGenSendMessage() {
  var input = document.getElementById('ai-gen-input');
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;

  // 清空并禁用输入
  input.value = '';
  input.disabled = true;

  // 添加用户消息
  addMessage('user', text);

  // 添加"思考中..."消息
  var thinkingIdx = aiGenMessages.length;
  aiGenMessages.push({ type: 'bot', text: '正在生成中...', extra: '' });
  renderMessages();

  // 获取选中风格
  var dsSelect = document.getElementById('ai-gen-ds-select');
  var dsId = dsSelect ? dsSelect.value : '';
  var dsName = '';
  if (dsId) {
    var dsList = window.designSystems || [];
    for (var i = 0; i < dsList.length; i++) {
      if (dsList[i].id === dsId) { dsName = dsList[i].name; break; }
    }
  }

  // 模拟生成延迟
  setTimeout(function() {
    // 替换"正在生成中..."为实际结果
    aiGenMessages[thinkingIdx] = generateAIResponse(text, dsId, dsName);
    input.disabled = false;
    input.focus();
    renderMessages();
  }, 800 + Math.random() * 700);
}

// ===== AI 响应生成（含预览） =====
function generateAIResponse(prompt, dsId, dsName) {
  var styleLabel = dsName ? '（风格: ' + dsName + '）' : '（无风格参考）';

  // 生成预览 HTML
  var previewHTML = generatePreviewHTML(prompt, dsId);
  updatePreview(previewHTML);

  // 统计生成的页面/组件数
  var sections = [];
  if (prompt.indexOf('表格') >= 0 || prompt.indexOf('数据') >= 0 || prompt.indexOf('看板') >= 0) sections.push('数据表格');
  if (prompt.indexOf('图表') >= 0 || prompt.indexOf('折线') >= 0 || prompt.indexOf('饼图') >= 0) sections.push('图表');
  if (prompt.indexOf('表单') >= 0 || prompt.indexOf('输入') >= 0 || prompt.indexOf('登录') >= 0) sections.push('表单');
  if (prompt.indexOf('导航') >= 0 || prompt.indexOf('侧边栏') >= 0 || prompt.indexOf('菜单') >= 0) sections.push('侧边导航');
  if (prompt.indexOf('卡片') >= 0 || prompt.indexOf('统计') >= 0) sections.push('统计卡片');
  if (prompt.indexOf('列表') >= 0) sections.push('数据列表');
  if (prompt.indexOf('按钮') >= 0) sections.push('按钮组');
  if (sections.length === 0) sections = ['页面布局', '组件模块'];

  // 额外信息（预览缩略图按钮 + 页面列表）
  var extraHTML =
    '<div class="ai-gen-preview-pages">' +
      '<span class="ai-gen-page-badge" onclick="scrollPreviewTo(\'page-header\')">页面标题</span>' +
      sections.map(function(s) {
        return '<span class="ai-gen-page-badge" onclick="scrollPreviewTo(\'' + s + '\')">' + s + '</span>';
      }).join('') +
    '</div>' +
    '<div style="margin-top:8px;font-size:12px;color:var(--text-muted)">' +
      '包含 ' + sections.length + ' 个模块 · 可在右侧预览区查看' +
    '</div>';

  return {
    type: 'bot',
    text: '已根据你的描述生成了原型界面' + styleLabel + '，右侧为预览效果。你可以继续补充描述来调整内容。',
    extra: extraHTML
  };
}

// ===== 生成预览 HTML =====
function generatePreviewHTML(prompt, dsId) {
  var ds = null;
  if (dsId) {
    var dsList = window.designSystems || [];
    for (var i = 0; i < dsList.length; i++) {
      if (dsList[i].id === dsId) { ds = dsList[i]; break; }
    }
  }

  var primaryColor = ds && ds.colors && ds.colors.length > 0 ? ds.colors[0] : '#5B5EF4';
  var secondaryColor = ds && ds.colors && ds.colors.length > 1 ? ds.colors[1] : '#22C55E';
  var accentColor = ds && ds.colors && ds.colors.length > 2 ? ds.colors[2] : '#F59E0B';

  var fontFamily = 'system-ui, -apple-system, sans-serif';
  var sidebarWidth = 220;

  var hasNav = prompt.indexOf('导航') >= 0 || prompt.indexOf('侧边栏') >= 0 || prompt.indexOf('菜单') >= 0;
  var hasChart = prompt.indexOf('图表') >= 0 || prompt.indexOf('折线') >= 0 || prompt.indexOf('趋势') >= 0 || prompt.indexOf('统计') >= 0;
  var hasTable = prompt.indexOf('表格') >= 0 || prompt.indexOf('数据') >= 0;
  var hasForm = prompt.indexOf('表单') >= 0 || prompt.indexOf('输入') >= 0 || prompt.indexOf('登录') >= 0;
  var hasCard = prompt.indexOf('卡片') >= 0 || prompt.indexOf('看板') >= 0;
  var hasList = prompt.indexOf('列表') >= 0;

  // 没有明确特征时给默认布局
  if (!hasNav && !hasChart && !hasTable && !hasForm && !hasCard && !hasList) {
    hasNav = true;
    hasChart = true;
    hasCard = true;
  }

  var html = '<!DOCTYPE html><html><head><style>';
  html += '*{margin:0;padding:0;box-sizing:border-box;font-family:' + fontFamily + '}';
  html += 'body{background:#f5f5f7;min-height:100vh}';
  html += '.app{display:flex;min-height:100vh}';

  // 侧边栏
  if (hasNav) {
    html += '.sidebar{width:' + sidebarWidth + 'px;background:' + primaryColor + ';color:#fff;padding:20px 0;display:flex;flex-direction:column}';
    html += '.sidebar-logo{padding:0 16px 24px;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px}';
    html += '.sidebar-item{display:flex;align-items:center;gap:10px;padding:10px 16px;color:rgba(255,255,255,.7);font-size:13px;cursor:pointer;transition:all .15s;border-left:3px solid transparent}';
    html += '.sidebar-item:hover,.sidebar-item.active{background:rgba(255,255,255,.1);color:#fff;border-left-color:#fff}';
    html += '.sidebar-item.active{background:rgba(255,255,255,.15)}';
    html += '.sidebar-spacer{flex:1}';
    html += '.sidebar-bottom{padding:12px 16px;border-top:1px solid rgba(255,255,255,.1);font-size:12px;color:rgba(255,255,255,.5)}';
  }

  // 主内容区
  html += '.main{flex:1;padding:24px;overflow-y:auto}';

  // 页面头部
  html += '.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}';
  html += '.page-header h2{font-size:20px;font-weight:600;color:#1a1a2e}';
  html += '.page-header-actions{display:flex;gap:8px}';
  html += '.btn{padding:8px 16px;border-radius:6px;border:none;font-size:13px;cursor:pointer;font-weight:500}';
  html += '.btn-primary{background:' + primaryColor + ';color:#fff}';
  html += '.btn-secondary{background:#e8e8ed;color:#555}';

  // 统计卡片
  if (hasCard) {
    html += '.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}';
    html += '.stat-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.06)}';
    html += '.stat-card-label{font-size:12px;color:#8e8ea0;margin-bottom:4px}';
    html += '.stat-card-value{font-size:24px;font-weight:700;color:#1a1a2e}';
    html += '.stat-card-change{font-size:11px;margin-top:4px}';
    html += '.stat-card-change.up{color:' + secondaryColor + '}';
    html += '.stat-card-change.down{color:#EF4444}';
    html += '.stat-card-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:16px}';
  }

  // 图表区域
  if (hasChart) {
    html += '.chart-section{background:#fff;border-radius:12px;padding:20px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}';
    html += '.chart-section h3{font-size:14px;font-weight:600;color:#1a1a2e;margin-bottom:16px}';
    html += '.chart-placeholder{height:200px;background:linear-gradient(135deg,' + primaryColor + '15,' + secondaryColor + '10);border-radius:8px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}';
    html += '.chart-line{position:absolute;bottom:30px;left:10%;width:80%;height:60%}';
    html += '.chart-line svg{width:100%;height:100%}';
  }

  // 表格
  if (hasTable) {
    html += '.table-section{background:#fff;border-radius:12px;padding:20px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}';
    html += '.table-section h3{font-size:14px;font-weight:600;color:#1a1a2e;margin-bottom:16px}';
    html += 'table{width:100%;border-collapse:collapse;font-size:12px}';
    html += 'th{padding:10px 12px;text-align:left;border-bottom:2px solid #f0f0f0;color:#8e8ea0;font-weight:500}';
    html += 'td{padding:10px 12px;border-bottom:1px solid #f5f5f7;color:#555}';
    html += 'td.status{display:flex;align-items:center;gap:4px}';
    html += '.status-dot{width:6px;height:6px;border-radius:50%;display:inline-block}';
    html += '.status-dot.online{background:' + secondaryColor + '}';
    html += '.status-dot.offline{background:#ddd}';
    html += '.tag{padding:2px 8px;border-radius:4px;font-size:11px;background:' + primaryColor + '10;color:' + primaryColor + '}';
  }

  // 表单
  if (hasForm) {
    html += '.form-section{background:#fff;border-radius:12px;padding:24px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,.06);max-width:480px}';
    html += '.form-section h3{font-size:14px;font-weight:600;color:#1a1a2e;margin-bottom:16px}';
    html += '.form-group{margin-bottom:16px}';
    html += 'label{display:block;font-size:12px;color:#555;margin-bottom:4px;font-weight:500}';
    html += 'input[type=text],input[type=email]{width:100%;padding:10px 12px;border:1px solid #e0e0e5;border-radius:6px;font-size:13px;outline:none}';
    html += 'input:focus{border-color:' + primaryColor + '}';
    html += '.form-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}';
  }

  // 列表
  if (hasList) {
    html += '.list-section{background:#fff;border-radius:12px;padding:20px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}';
    html += '.list-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f5f5f7}';
    html += '.list-item:last-child{border-bottom:none}';
    html += '.list-avatar{width:32px;height:32px;border-radius:8px;background:' + primaryColor + '15;display:flex;align-items:center;justify-content:center;color:' + primaryColor + ';font-size:14px;font-weight:600}';
    html += '.list-info{flex:1}';
    html += '.list-title{font-size:13px;font-weight:500;color:#1a1a2e}';
    html += '.list-desc{font-size:11px;color:#8e8ea0;margin-top:2px}';
  }

  html += '</style></head><body>';

  // ===== HTML body =====
  html += '<div class="app">';

  // 侧边栏
  if (hasNav) {
    var navItems = [
      { label: '概览', icon: '📊', active: true },
      { label: '项目', icon: '📁' },
      { label: '成员', icon: '👥' },
      { label: '设置', icon: '⚙️' }
    ];
    html += '<div class="sidebar">';
    html += '<div class="sidebar-logo"><span style="width:24px;height:24px;border-radius:6px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:14px">◆</span> ProtoApp</div>';
    navItems.forEach(function(item) {
      html += '<div class="sidebar-item' + (item.active ? ' active' : '') + '"><span>' + item.icon + '</span><span>' + item.label + '</span></div>';
    });
    html += '<div class="sidebar-spacer"></div>';
    html += '<div class="sidebar-bottom">admin@example.com</div>';
    html += '</div>';
  }

  html += '<div class="main" id="ai-gen-preview-main">';

  // 页面头部
  html += '<div class="page-header" id="page-header">';
  html += '<h2>概览</h2>';
  html += '<div class="page-header-actions">';
  html += '<button class="btn btn-secondary">导出</button>';
  html += '<button class="btn btn-primary">新建</button>';
  html += '</div></div>';

  // 统计卡片
  if (hasCard) {
    var stats = [
      { label: '总用户', value: '12,846', change: '+12.5%', up: true, icon: '👤' },
      { label: '活跃项目', value: '342', change: '+8.2%', up: true, icon: '📁' },
      { label: '营收', value: '¥86,240', change: '+23.1%', up: true, icon: '💰' },
      { label: '转化率', value: '3.24%', change: '-1.2%', up: false, icon: '📈' }
    ];
    html += '<div class="stats">';
    stats.forEach(function(s) {
      html += '<div class="stat-card">';
      html += '<div class="stat-card-icon" style="background:' + primaryColor + '15;color:' + primaryColor + '">' + s.icon + '</div>';
      html += '<div class="stat-card-label">' + s.label + '</div>';
      html += '<div class="stat-card-value">' + s.value + '</div>';
      html += '<div class="stat-card-change ' + (s.up ? 'up' : 'down') + '">' + s.change + '</div>';
      html += '</div>';
    });
    html += '</div>';
  }

  // 图表
  if (hasChart) {
    html += '<div class="chart-section" id="图表">';
    html += '<h3>月度趋势</h3>';
    html += '<div class="chart-placeholder">';
    html += '<div class="chart-line"><svg viewBox="0 0 300 150"><path d="M0,120 Q37.5,90 75,100 T150,70 T225,50 T300,30" fill="none" stroke="' + primaryColor + '" stroke-width="2.5"/><path d="M0,120 Q37.5,105 75,110 T150,90 T225,75 T300,60" fill="none" stroke="' + secondaryColor + '" stroke-width="2" stroke-dasharray="4,4" opacity=".6"/></svg></div>';
    html += '<span style="color:#8e8ea0;font-size:12px">📈 趋势数据可视化</span>';
    html += '</div></div>';
  }

  // 表格
  if (hasTable) {
    html += '<div class="table-section" id="数据表格">';
    html += '<h3>项目列表</h3>';
    html += '<table><thead><tr><th>名称</th><th>负责人</th><th>状态</th><th>进度</th></tr></thead><tbody>';
    var rows = [
      { name: '官网改版', owner: '张三', status: '进行中', progress: 65, online: true },
      { name: '后台管理系统', owner: '李四', status: '已完成', progress: 100, online: true },
      { name: '移动端优化', owner: '王五', status: '暂停', progress: 30, online: false },
      { name: '数据分析平台', owner: '赵六', status: '进行中', progress: 45, online: true }
    ];
    rows.forEach(function(r) {
      html += '<tr><td>' + r.name + '</td><td>' + r.owner + '</td><td class="status"><span class="status-dot ' + (r.online ? 'online' : 'offline') + '"></span>' + r.status + '</td><td><span class="tag">' + r.progress + '%</span></td></tr>';
    });
    html += '</tbody></table></div>';
  }

  // 表单
  if (hasForm) {
    html += '<div class="form-section" id="表单">';
    html += '<h3>新建项目</h3>';
    html += '<div class="form-group"><label>项目名称</label><input type="text" placeholder="请输入项目名称" value="AI 原型生成"></div>';
    html += '<div class="form-group"><label>邮箱</label><input type="email" placeholder="请输入邮箱" value="team@example.com"></div>';
    html += '<div class="form-actions"><button class="btn btn-secondary">取消</button><button class="btn btn-primary">提交</button></div>';
    html += '</div>';
  }

  // 列表
  if (hasList) {
    html += '<div class="list-section">';
    html += '<div class="list-item"><div class="list-avatar">A</div><div class="list-info"><div class="list-title">项目 Alpha</div><div class="list-desc">最后更新 2 小时前</div></div><span class="tag">进行中</span></div>';
    html += '<div class="list-item"><div class="list-avatar">B</div><div class="list-info"><div class="list-title">项目 Beta</div><div class="list-desc">最后更新 1 天前</div></div><span class="tag">已完成</span></div>';
    html += '<div class="list-item"><div class="list-avatar">C</div><div class="list-info"><div class="list-title">项目 Gamma</div><div class="list-desc">最后更新 3 天前</div></div><span class="tag">暂停</span></div>';
    html += '</div>';
  }

  html += '</div></div></body></html>';
  return html;
}

// ===== 预览 iframe 更新 =====
function updatePreview(html) {
  aiGenPreviewHTML = html;
  var iframe = document.getElementById('ai-gen-preview');
  if (!iframe) return;
  try {
    var doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  } catch(e) {
    // fallback for cross-origin
    iframe.srcdoc = html;
  }
}

function aiGenRefreshPreview() {
  if (aiGenPreviewHTML) updatePreview(aiGenPreviewHTML);
}

// 滚动预览到特定区域
function scrollPreviewTo(id) {
  var iframe = document.getElementById('ai-gen-preview');
  if (!iframe) return;
  try {
    var doc = iframe.contentDocument || iframe.contentWindow.document;
    var el = doc.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch(e) {}
}

// ===== 导出 =====
window.renderAIGeneratePage = renderAIGeneratePage;
window.aiGenSendMessage = aiGenSendMessage;
window.aiGenRefreshPreview = aiGenRefreshPreview;
window.scrollPreviewTo = scrollPreviewTo;
