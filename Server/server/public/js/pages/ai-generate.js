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
              '<p>你好！先在上方选择要使用的设计系统风格，然后描述你想要的页面。</p>' +
              '<p style="font-size:12px;color:var(--text-muted);margin-top:8px">选择组件库后，生成的界面将使用该组件库的颜色、字体和组件规范。例如：一个包含统计卡片和折线图的数据看板，侧边栏有导航菜单</p>' +
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

// ===== AI 语义分析引擎 ====
// 基于关键词和语义模板，从用户描述中提取页面主题、模块和内容

// 主题模板库
var AI_THEMES = {
  // 数据看板/仪表盘
  dashboard: {
    keywords: ['看板','dashboard','总览','概览','数据','统计','指标','监控','大屏','分析','报表','汇报'],
    title: function(topic) { return topic + ' 数据看板'; },
    pageTitle: function(topic) { return topic + '总览'; },
    navItems: function(topic) { return ['总览','分析','报表','设置']; },
    stats: function(topic) {
      return [
        { label: topic + '总数', value: '12,846', change: '+12.5%', up: true, icon: '📊' },
        { label: '活跃' + topic, value: '342', change: '+8.2%', up: true, icon: '📈' },
        { label: topic + '增长', value: '¥86,240', change: '+23.1%', up: true, icon: '💰' },
        { label: '转化率', value: '3.24%', change: '-1.2%', up: false, icon: '📉' }
      ];
    },
    tableHeaders: ['项目','负责人','状态','进度'],
    tableRows: function(topic, comps) {
      return [
        { name: comps[0] || topic + '模块A', owner: '张工', status: '进行中', pct: 65, online: true },
        { name: comps[1] || topic + '模块B', owner: '李工', status: '已完成', pct: 100, online: true },
        { name: comps[2] || topic + '模块C', owner: '王工', status: '暂停', pct: 30, online: false },
        { name: topic + '优化', owner: '赵工', status: '进行中', pct: 45, online: true }
      ];
    },
    chartTitle: function(topic) { return topic + '月度趋势'; },
    chartLabel: function(topic) { return topic + '趋势数据'; }
  },
  // 官网/落地页
  landing: {
    keywords: ['官网','首页','landing','落地页','推广','营销','品牌','宣传','介绍'],
    title: function(topic) { return topic + ' - 官方网站'; },
    pageTitle: function(topic) { return '欢迎来到 ' + topic; },
    navItems: function(topic) { return ['首页','产品','关于','联系']; },
    stats: function(topic) {
      return [
        { label: '活跃用户', value: '52,846', change: '+18.5%', up: true, icon: '👤' },
        { label: '页面访问', value: '128K', change: '+32%', up: true, icon: '👁️' },
        { label: '注册转化', value: '8.6%', change: '+5.2%', up: true, icon: '📝' },
        { label: '平均停留', value: '4m32s', change: '+12%', up: true, icon: '⏱️' }
      ];
    },
    tableHeaders: ['产品','价格','状态','评分'],
    tableRows: function(topic, comps) {
      return [
        { name: comps[0] || '基础版', owner: '¥9.9', status: '热销', pct: 100, online: true },
        { name: comps[1] || '专业版', owner: '¥29.9', status: '推荐', pct: 100, online: true },
        { name: comps[2] || '企业版', owner: '¥99.9', status: '定制', pct: 100, online: false },
        { name: '旗舰版', owner: '¥199.9', status: '限量', pct: 100, online: true }
      ];
    },
    chartTitle: function(topic) { return topic + '访问趋势'; },
    chartLabel: function(topic) { return topic + '流量数据'; }
  },
  // 电商/商城
  ecommerce: {
    keywords: ['电商','商城','商品','购物','订单','支付','交易','店铺','零售','购买'],
    title: function(topic) { return topic + '管理平台'; },
    pageTitle: function(topic) { return topic + '运营中心'; },
    navItems: function(topic) { return ['运营','商品','订单','数据']; },
    stats: function(topic) {
      return [
        { label: '今日订单', value: '1,284', change: '+15.3%', up: true, icon: '🛒' },
        { label: '商品数', value: '3,452', change: '+8.7%', up: true, icon: '📦' },
        { label: '营业额', value: '¥68,240', change: '+22.1%', up: true, icon: '💰' },
        { label: '退款率', value: '2.1%', change: '-0.3%', up: false, icon: '↩️' }
      ];
    },
    tableHeaders: ['商品','价格','销量','状态'],
    tableRows: function(topic, comps) {
      return [
        { name: comps[0] || '热门商品A', owner: '¥128', status: '在售', pct: 85, online: true },
        { name: comps[1] || '热门商品B', owner: '¥79', status: '促销', pct: 92, online: true },
        { name: comps[2] || '新品推荐', owner: '¥199', status: '预售', pct: 100, online: false },
        { name: '经典款', owner: '¥59', status: '在售', pct: 78, online: true }
      ];
    },
    chartTitle: function(topic) { return topic + '销售趋势'; },
    chartLabel: function(topic) { return topic + '销售额'; }
  },
  // 后台管理
  admin: {
    keywords: ['后台','管理','admin','系统','控制台','运维','配置','权限','用户管理'],
    title: function(topic) { return topic + '管理系统'; },
    pageTitle: function(topic) { return topic + '控制台'; },
    navItems: function(topic) { return ['控制台','用户','日志','设置']; },
    stats: function(topic) {
      return [
        { label: '注册用户', value: '8,246', change: '+6.5%', up: true, icon: '👥' },
        { label: '在线用户', value: '186', change: '+12%', up: true, icon: '🟢' },
        { label: 'API调用', value: '142万', change: '+45%', up: true, icon: '🔗' },
        { label: '异常率', value: '0.02%', change: '-80%', up: false, icon: '⚠️' }
      ];
    },
    tableHeaders: ['用户','角色','状态','最后登录'],
    tableRows: function(topic, comps) {
      return [
        { name: 'admin', owner: '超级管理员', status: '在线', pct: 100, online: true },
        { name: comps[0] || '运营', owner: '运营专员', status: '在线', pct: 100, online: true },
        { name: comps[1] || '开发', owner: '开发工程师', status: '离线', pct: 100, online: false },
        { name: comps[2] || '测试', owner: '测试工程师', status: '在线', pct: 100, online: true }
      ];
    },
    chartTitle: function(topic) { return topic + '系统负载'; },
    chartLabel: function(topic) { return topic + '运行状态'; }
  },
  // 项目/团队协作
  project: {
    keywords: ['项目','团队','协作','任务','进度','sprint','迭代','需求','开发','研发','产品'],
    title: function(topic) { return topic + '管理看板'; },
    pageTitle: function(topic) { return topic + '看板'; },
    navItems: function(topic) { return ['概览','任务','文档','成员']; },
    stats: function(topic) {
      return [
        { label: '进行中', value: '23', change: '+3', up: true, icon: '🔄' },
        { label: '已完成', value: '156', change: '+12', up: true, icon: '✅' },
        { label: '待评审', value: '8', change: '-2', up: false, icon: '📋' },
        { label: '延期任务', value: '3', change: '-5', up: false, icon: '⚠️' }
      ];
    },
    tableHeaders: ['任务','负责人','优先级','截止'],
    tableRows: function(topic, comps) {
      return [
        { name: comps[0] || '需求评审', owner: '张产品', status: '高', pct: 60, online: true },
        { name: comps[1] || 'UI设计', owner: '李设计', status: '中', pct: 100, online: true },
        { name: comps[2] || '后端开发', owner: '王开发', status: '高', pct: 30, online: false },
        { name: '联调测试', owner: '赵测试', status: '低', pct: 45, online: true }
      ];
    },
    chartTitle: function(topic) { return topic + '燃尽图'; },
    chartLabel: function(topic) { return topic + '进度'; }
  },
  // 教育/学习
  education: {
    keywords: ['教育','学习','课程','学生','教学','培训','课堂','考试','成绩','学校','在线教育'],
    title: function(topic) { return topic + '教学平台'; },
    pageTitle: function(topic) { return topic + '学习中心'; },
    navItems: function(topic) { return ['课程','学习','考试','成绩']; },
    stats: function(topic) {
      return [
        { label: '在学人数', value: '3,246', change: '+18%', up: true, icon: '🎓' },
        { label: '课程数', value: '128', change: '+6', up: true, icon: '📚' },
        { label: '完成率', value: '76%', change: '+8%', up: true, icon: '🏆' },
        { label: '平均分', value: '86.5', change: '+3.2', up: true, icon: '⭐' }
      ];
    },
    tableHeaders: ['课程','讲师','时长','评分'],
    tableRows: function(topic, comps) {
      return [
        { name: comps[0] || '基础入门', owner: '张老师', status: '进行中', pct: 65, online: true },
        { name: comps[1] || '进阶实战', owner: '李老师', status: '已完结', pct: 100, online: true },
        { name: comps[2] || '专题训练', owner: '王老师', status: '筹备中', pct: 100, online: false },
        { name: '考试冲刺', owner: '赵老师', status: '进行中', pct: 45, online: true }
      ];
    },
    chartTitle: function(topic) { return topic + '学习趋势'; },
    chartLabel: function(topic) { return topic + '学习数据'; }
  }
};

// AI 语义分析：从用户描述中提取主题和关键词
function analyzePrompt(prompt) {
  var result = {
    theme: 'dashboard',
    topic: '',
    sections: [],
    hasNav: false,
    hasChart: false,
    hasTable: false,
    hasForm: false,
    hasCard: false
  };

  // 提取主题话题（核心名词）
  var sentence = prompt.replace(/[，。！？、：；""''（）\(\)\[\]]/g, ' ').trim();
  var words = sentence.split(/\s+/).filter(function(w) { return w.length > 0; });

  // 找到最长/最核心的名词作为主题
  var skipWords = ['一个','这个','那个','一些','什么','怎么','如何','帮我','给我','我要','我想','请','生成','制作','创建','设计','画','做'];
  var topicWords = words.filter(function(w) {
    return w.length >= 2 && skipWords.indexOf(w) < 0 && w !== '的' && w !== '了' && w !== '和' && w !== '与' && w !== '有';
  });
  // 取第二个词作为核心主题（第一个词通常是动词）
  result.topic = topicWords[1] || topicWords[0] || '';

  // 匹配主题模板
  var maxScore = 0;
  for (var t in AI_THEMES) {
    var score = 0;
    AI_THEMES[t].keywords.forEach(function(kw) {
      if (prompt.indexOf(kw) >= 0) score += 2;
      // 也检查拼音近义词
      if (kw.length >= 2 && prompt.indexOf(kw.slice(0, 2)) >= 0) score += 1;
    });
    if (score > maxScore) { maxScore = score; result.theme = t; }
  }

  // 部分匹配也要考虑
  if (maxScore === 0) {
    // 没有匹配到任何主题时，从内容推断
    if (topicWords.length > 0) result.theme = 'dashboard';
  }

  // 检测模块
  var p = prompt;
  result.hasNav = /导航|侧边栏|菜单|sidebar|nav/i.test(p);
  result.hasChart = /图表|折线|趋势|统计|图|chart|graph/i.test(p);
  result.hasTable = /表格|表|数据|列表|table|grid/i.test(p);
  result.hasForm = /表单|输入|登录|注册|form/i.test(p);
  result.hasCard = /卡片|看板|卡片|card/i.test(p);

  // 智能推断：看板类应该包含卡片和图表
  if (result.theme === 'dashboard' && !result.hasCard && !result.hasChart && !result.hasTable) {
    result.hasNav = true;
    result.hasCard = true;
    result.hasChart = true;
    result.hasTable = true;
  }
  // 官网类应该有导航和卡片
  if (result.theme === 'landing' && !result.hasNav) result.hasNav = true;

  // 电商类默认有表格和图表
  if (result.theme === 'ecommerce' && !result.hasTable) result.hasTable = true;
  if (result.theme === 'ecommerce' && !result.hasChart) result.hasChart = true;

  // 后台管理默认有表格
  if (result.theme === 'admin' && !result.hasTable) result.hasTable = true;

  return result;
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

  // ═══ 从设计系统提取真实数据 ═══
  var primaryColor = ds && ds.colors && ds.colors.length > 0 ? ds.colors[0] : '#5B5EF4';
  var secondaryColor = ds && ds.colors && ds.colors.length > 1 ? ds.colors[1] : '#22C55E';
  var accentColor = ds && ds.colors && ds.colors.length > 2 ? ds.colors[2] : '#F59E0B';
  var colors = ds && ds.colors && ds.colors.length > 3 ? ds.colors : [primaryColor, secondaryColor, accentColor, '#EF4444'];

  // 从 DS 获取真实字体
  var dsFonts = (ds && ds.fonts) || [];
  var fontFamily = dsFonts.length > 0 ? "'" + dsFonts[0].name + "', " + (dsFonts[0].family || 'sans-serif') : 'system-ui, -apple-system, sans-serif';

  // 从 DS 获取组件名
  var dsComponents = (ds && ds.components) || [];
  var compNames = dsComponents.slice(0, 4).map(function(c) { return c.name; });
  while (compNames.length < 4) {
    var defaultComps = ['主按钮', '次要按钮', '输入框', '卡片'];
    compNames.push(defaultComps[compNames.length]);
  }

  // ═══ AI 语义分析 ═══
  var analysis = analyzePrompt(prompt);
  var theme = AI_THEMES[analysis.theme];
  var topic = analysis.topic || prompt.slice(0, Math.min(10, prompt.length));
  var navTitles = theme.navItems(topic);
  var statData = theme.stats(topic);
  var tableData = theme.tableRows(topic, compNames);

  // ===== 开始生成 HTML =====
  var sidebarWidth = 220;
  var html = '<!DOCTYPE html><html><head><style>';
  html += '*{margin:0;padding:0;box-sizing:border-box}';
  html += 'body{background:#f5f5f7;min-height:100vh;font-family:' + fontFamily + '}';
  html += '.app{display:flex;min-height:100vh}';

  if (analysis.hasNav) {
    html += '.sidebar{width:' + sidebarWidth + 'px;background:' + primaryColor + ';color:#fff;padding:20px 0;display:flex;flex-direction:column}';
    html += '.sidebar-logo{padding:0 16px 24px;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px}';
    html += '.sidebar-item{display:flex;align-items:center;gap:10px;padding:10px 16px;color:rgba(255,255,255,.7);font-size:13px;cursor:pointer;transition:all .15s}';
    html += '.sidebar-item:hover,.sidebar-item.active{background:rgba(255,255,255,.1);color:#fff}';
    html += '.sidebar-item.active{background:rgba(255,255,255,.15)}';
    html += '.sidebar-spacer{flex:1}';
    html += '.sidebar-bottom{padding:12px 16px;border-top:1px solid rgba(255,255,255,.1);font-size:12px;color:rgba(255,255,255,.5)}';
  }

  html += '.main{flex:1;padding:24px 32px;overflow-y:auto}';
  html += '.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}';
  html += '.page-header h2{font-size:20px;font-weight:600;color:#1a1a2e}';
  html += '.page-header-actions{display:flex;gap:8px}';
  html += '.btn{padding:8px 16px;border-radius:6px;border:none;font-size:13px;cursor:pointer;font-weight:500}';
  html += '.btn-primary{background:' + primaryColor + ';color:#fff}';
  html += '.btn-secondary{background:#e8e8ed;color:#555}';

  if (analysis.hasCard) {
    html += '.stats-row{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}';
    html += '.stat-card{flex:1;min-width:180px;background:#fff;border-radius:12px;padding:20px}';
    html += '.stat-card:hover{box-shadow:0 2px 12px rgba(0,0,0,.08)}';
    html += '.stat-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:18px}';
    html += '.stat-label{font-size:12px;color:#8e8ea0;margin-bottom:4px}';
    html += '.stat-value{font-size:22px;font-weight:700;color:#1a1a2e}';
    html += '.stat-change{font-size:11px;margin-top:6px}';
    html += '.change-up{color:' + secondaryColor + '}';
    html += '.change-down{color:#EF4444}';
    html += '.two-col{display:grid;grid-template-columns:1.6fr 1fr;gap:20px;margin-bottom:24px}';
  } else {
    html += '.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}';
  }

  html += '.section{background:#fff;border-radius:12px;padding:20px}';
  html += '.section h3{font-size:14px;font-weight:600;color:#1a1a2e;margin-bottom:16px}';
  html += 'table{width:100%;border-collapse:collapse;font-size:12px}';
  html += 'th{padding:10px 12px;text-align:left;border-bottom:2px solid #f0f0f0;color:#8e8ea0;font-weight:500;font-size:11px;text-transform:uppercase}';
  html += 'td{padding:10px 12px;border-bottom:1px solid #f5f5f7;color:#555}';
  html += '.tag{padding:2px 8px;border-radius:4px;font-size:11px;background:' + primaryColor + '10;color:' + primaryColor + '}';
  html += '.chart-box{height:200px;background:linear-gradient(135deg,' + primaryColor + '08,' + secondaryColor + '04);border-radius:8px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}';

  // 表单样式
  if (analysis.hasForm) {
    html += '.form-wrap{background:#fff;border-radius:12px;padding:24px;max-width:480px}';
    html += '.form-group{margin-bottom:16px}';
    html += '.form-group label{display:block;font-size:12px;color:#555;margin-bottom:4px;font-weight:500}';
    html += 'input[type=text],input[type=email],input[type=password]{width:100%;padding:10px 12px;border:1px solid #e0e0e5;border-radius:6px;font-size:13px;outline:none;box-sizing:border-box}';
    html += 'input:focus{border-color:' + primaryColor + '}';
    html += '.form-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}';
  }

  html += '</style></head><body><div class="app">';

  // 侧边栏
  if (analysis.hasNav) {
    html += '<div class="sidebar">';
    html += '<div class="sidebar-logo"><span style="width:24px;height:24px;border-radius:6px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:14px">◆</span>' + (ds ? ds.name : 'Flowa') + '</div>';
    var navs = ['📊','📁','👥','⚙️'];
    navTitles.forEach(function(n, i) {
      html += '<div class="sidebar-item' + (i === 0 ? ' active' : '') + '"><span>' + (navs[i] || '•') + '</span><span>' + n + '</span></div>';
    });
    html += '<div class="sidebar-spacer"></div>';
    html += '<div class="sidebar-bottom">' + (ds ? ds.name : 'Flowa') + ' · ' + analysis.theme + '</div>';
    html += '</div>';
  }

  html += '<div class="main" id="ai-gen-preview-main">';

  // 页面标题
  html += '<div class="page-header"><h2>' + theme.pageTitle(topic) + '</h2>';
  html += '<div class="page-header-actions">';
  html += '<button class="btn btn-secondary">' + (compNames[1] || '返回') + '</button>';
  html += '<button class="btn btn-primary">' + (compNames[0] || '新建') + '</button>';
  html += '</div></div>';

  // 统计卡片
  if (analysis.hasCard) {
    html += '<div class="stats-row">';
    statData.forEach(function(s, i) {
      var c = colors[i % colors.length];
      html += '<div class="stat-card">';
      html += '<div class="stat-icon" style="background:' + c + '15;color:' + c + '">' + s.icon + '</div>';
      html += '<div class="stat-label">' + s.label + '</div>';
      html += '<div class="stat-value">' + s.value + '</div>';
      html += '<div class="stat-change ' + (s.up ? 'change-up' : 'change-down') + '">' + s.change + '</div>';
      html += '</div>';
    });
    html += '</div>';
  }

  // 两栏布局：图表 + 表格
  html += '<div class="two-col">';

  // 图表
  if (analysis.hasChart) {
    html += '<div class="section">';
    html += '<h3>' + theme.chartTitle(topic) + '</h3>';
    html += '<div class="chart-box">';
    html += '<svg viewBox="0 0 300 150" style="width:90%;height:90%">';
    html += '<path d="M0,120 Q37.5,90 75,100 T150,70 T225,50 T300,30" fill="none" stroke="' + primaryColor + '" stroke-width="2.5"/>';
    html += '<path d="M0,120 Q37.5,105 75,110 T150,90 T225,75 T300,60" fill="none" stroke="' + secondaryColor + '" stroke-width="2" stroke-dasharray="4,4" opacity=".6"/>';
    html += '</svg>';
    html += '<span style="position:absolute;bottom:12px;color:#8e8ea0;font-size:11px">' + theme.chartLabel(topic) + '</span>';
    html += '</div></div>';
  }

  // 表格
  if (analysis.hasTable) {
    html += '<div class="section">';
    html += '<h3>' + topic + '列表</h3>';
    html += '<table><thead><tr>';
    theme.tableHeaders.forEach(function(h) { html += '<th>' + h + '</th>'; });
    html += '</tr></thead><tbody>';
    tableData.forEach(function(r) {
      html += '<tr><td><strong>' + r.name + '</strong></td><td>' + r.owner + '</td>';
      html += '<td><span class="stat-dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + (r.online ? secondaryColor : '#ddd') + ';margin-right:4px"></span>' + r.status + '</td>';
      html += '<td>' + (r.pct < 100 ? '<span class="tag">' + r.pct + '%</span>' : '<span style="color:' + secondaryColor + '">✓ 完成</span>') + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  html += '</div>'; // end two-col

  // 表单
  if (analysis.hasForm) {
    html += '<div class="form-wrap">';
    html += '<h3 style="font-size:14px;font-weight:600;color:#1a1a2e;margin-bottom:16px">' + (compNames[0] || '新建') + '</h3>';
    html += '<div class="form-group"><label>' + (dsFonts.length > 0 ? dsFonts[0].name : '名称') + '</label><input type="text" placeholder="请输入" value="' + topic + '"></div>';
    html += '<div class="form-group"><label>邮箱</label><input type="email" value="hello@' + (ds ? ds.name.replace(/[\s]/g,'').toLowerCase() : 'flowa') + '.com"></div>';
    html += '<div class="form-group"><label>密码</label><input type="password" value="••••••••"></div>';
    html += '<div class="form-actions"><button class="btn btn-secondary">' + (compNames[1] || '取消') + '</button><button class="btn btn-primary">' + (compNames[0] || '提交') + '</button></div>';
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
