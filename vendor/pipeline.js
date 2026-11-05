/* v48 交互：一条流水线，动作少、每次点击都有反馈。
   账号 / 资料 / 进度全部只存本机浏览器，不上传、不写进公开仓库。 */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var C = window.HF_CONTENT || {};
  var CKEY = 'hf_cfg_v1', TKEY = 'hf_target_v1', PKEY = 'hf_progress_v1';
  var CHK_S = 'hf_chk_score_v1', CHK_U = 'hf_chk_spec_v1', CHK_M = 'hf_chk_mat_v1';
  var NKEY = 'hf_notice_v1', CNKI = 'hf_cnki_v1', MINE = 'hf_mine_v1';
  var LIB = 'https://lib.shutong121.com', OFF = 'https://www.cnki.net';

  function esc(v) {
    return String(v === undefined || v === null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function ls(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function toast(msg) {
    var d = document.createElement('div'); d.className = 'toast'; d.textContent = msg;
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2100);
  }
  function copy(t, tip) {
    var ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    if (!ok && navigator.clipboard) {
      try { var pr = navigator.clipboard.writeText(t); if (pr && pr.catch) pr.catch(function () {}); ok = true; } catch (e) {}
    }
    document.body.removeChild(ta);
    toast(ok ? (tip || '已复制') : '复制失败，请长按选中文本');
    return ok;
  }
  /* 声音与震动 */
  var actx = null;
  function beep(freq, dur) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') { var pr = actx.resume(); if (pr && pr.catch) pr.catch(function () {}); }
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(.045, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + (dur || .03));
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + (dur || .03));
    } catch (e) {}
  }

  /* 本机资料 */
  function cfg() {
    var d = C.cfgDefault || {};
    var o = ls(CKEY, {});
    var r = {}; Object.keys(d).forEach(function (k) { r[k] = o[k] || d[k]; });
    return r;
  }
  function target() {
    var id = ls(TKEY, C.defaultTarget);
    var t = (C.targets || []).filter(function (x) { return x.id === id; })[0];
    return t || (C.targets || [])[0] || {};
  }
  function fill(t) {
    var c = cfg(), tg = target();
    var m = {
      tname: tg.name || '', deadline: tg.deadline || '', inner: c.inner || '',
      school: c.school || '', teacher: c.teacher || '', place: c.place || '',
      contact: c.contact || '', grade: c.grade || ''
    };
    return String(t || '').replace(/\{\{([a-zA-Z]+)\}\}/g, function (_, k) {
      return m[k] !== undefined ? m[k] : '{{' + k + '}}';
    });
  }
  function mark(k) { var p = ls(PKEY, {}); if (!p[k]) { p[k] = Date.now(); save(PKEY, p); } }
  function progress() { return ls(PKEY, {}); }

  /* ---------- 首页：已选目标卡片 ---------- */
  function renderTarget() {
    var el = $('#targetCard'); if (!el) return;
    var tg = target(), c = cfg();
    var why = ['省级白名单（2025–2028），学校认、公益免费',
               '材料只要 ' + (tg.materials || []).length + ' 样，是学生赛道里最轻的',
               '可批量带学生，教师同时拿指导奖；书画类有公开评分表可逐条对照'];
    el.innerHTML =
      '<div class="tc-tag">系统已替你选定 · 现在唯一值得动手且还来得及的目标</div>' +
      '<h2>' + esc(tg.name) + '</h2>' +
      '<div class="tc-meta"><b>' + esc(tg.tier) + '级</b> · 官方截止 ' + esc(tg.deadline) +
      ' · 还剩 <b>' + (tg.left || 0) + ' 天</b> · 材料 ' + (tg.materials || []).length + ' 样</div>' +
      '<ul class="tc-why">' + why.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      '<div class="tc-acts"><button class="act primary" data-act="go" data-to="score">开始第 1 步 →</button>' +
      '<button class="act" data-act="switch">换一个目标（共 ' + (C.targets || []).length + ' 项）</button></div>' +
      '<div id="targetAlts" class="tc-alts" hidden></div>';
  }
  function toggleAlts() {
    var box = $('#targetAlts'); if (!box) return;
    var cur = target().id;
    box.innerHTML = (C.targets || []).map(function (x) {
      return '<button class="alt' + (x.id === cur ? ' on' : '') + '" data-target="' + esc(x.id) + '">' +
        '<b>' + esc(x.name) + '</b><span>' + esc(x.tier) + '级 · 截止 ' + esc(x.deadline) +
        ' · 剩 ' + x.left + ' 天 · ' + ({ achv: '美育成果报送', teach: '教师报送', self: '个人投稿', workshop: '工作坊' }[x.way] || '') +
        '</span></button>';
    }).join('');
    box.hidden = !box.hidden;
  }

  /* ---------- 勾选清单（评分 / 规格 / 材料） ---------- */
  function checkGroup(host, key, items, step) {
    var el = $(host); if (!el) return;
    var done = ls(key, {});
    el.innerHTML = '<div class="chk-list">' + items.map(function (t, i) {
      return '<label class="chk' + (done[i] ? ' done' : '') + '"><input type="checkbox" data-chk="' +
        esc(key) + '" data-i="' + i + '"' + (done[i] ? ' checked' : '') + '><span>' + esc(t) + '</span></label>';
    }).join('') + '</div><div class="chk-foot">' + Object.keys(done).filter(function (k) { return done[k]; }).length +
      ' / ' + items.length + ' 项已核对 · 勾选状态存在本机</div>';
    if (step) mark(step);
  }
  function renderChecks() {
    if ($('#scoreCheck')) checkGroup('#scoreCheck', CHK_S, C.scoreCheck || [], 'score');
    if ($('#specCheck')) checkGroup('#specCheck', CHK_U, C.spec || [], null);
    var ml = $('#matList');
    if (ml) {
      var done = ls(CHK_M, {}), mats = target().materials || [];
      ml.innerHTML = '<div class="chk-list">' + mats.map(function (t, i) {
        return '<label class="chk' + (done[i] ? ' done' : '') + '"><input type="checkbox" data-chk="' +
          CHK_M + '" data-i="' + i + '"' + (done[i] ? ' checked' : '') + '><span>' + esc(t) + '</span></label>';
      }).join('') + '</div>' +
        '<div class="act-row"><button class="act" data-act="copy-mat">复制材料清单</button>' +
        '<button class="act" data-act="cfg">填一次本机资料</button></div>' +
        '<div class="chk-foot">平台：' + esc(target().portal || '') + '</div>';
    }
  }

  /* ---------- 模板网格 ---------- */
  function renderTpl() {
    var el = $('#tplGrid'); if (!el) return;
    var T = C.tpl || {};
    el.innerHTML = Object.keys(T).map(function (k) {
      var t = T[k];
      return '<div class="tpl"><div class="tpl-h"><b>' + esc(t.title) + '</b>' +
        '<span>' + esc(t.hint) + '</span></div>' +
        '<button class="act" data-copy-tpl="' + esc(k) + '">复制这份模板</button></div>';
    }).join('');
  }

  /* ---------- 通知 ---------- */
  function noticeKey() {
    var k = ls(NKEY, null);
    if (k && (C.notices || {})[k]) return k;
    var way = target().way;
    return way === 'teach' ? 'teach' : (way === 'achv' ? 'achv' : 'prep');
  }
  function renderNotice() {
    var el = $('#noticeHost'); if (!el) return;
    var N = C.notices || {}, k = noticeKey(), n = N[k] || {};
    var text = fill(n.text || '');
    el.innerHTML =
      '<div class="notice-card"><div class="nc-head"><div><div class="tc-tag">现在要发的这份</div>' +
      '<h2>' + esc(n.title || '') + '</h2></div></div>' +
      '<div class="act-row">' +
      '<button class="act primary" data-act="notice-copy">复制全文</button>' +
      '<button class="act" data-act="notice-wx">发到微信</button>' +
      '<button class="act" data-act="notice-mail">发到邮箱</button>' +
      '<button class="act ghost" data-act="cfg">填一次本机资料</button></div>' +
      '<pre class="notice" id="noticeText"></pre></div>' +
      '<details class="hf"><summary>换一份通知（共 ' + Object.keys(N).length + ' 份）</summary><div class="fbody nc-alts">' +
      Object.keys(N).map(function (kk) {
        return '<button class="alt' + (kk === k ? ' on' : '') + '" data-notice="' + esc(kk) + '">' +
          '<b>' + esc(N[kk].title) + '</b></button>';
      }).join('') + '</div></details>';
    $('#noticeText').textContent = text;
  }
  function noticeText() { var n = (C.notices || {})[noticeKey()] || {}; return fill(n.text || ''); }
  function sendMail() {
    var t = noticeText(), n = (C.notices || {})[noticeKey()] || {};
    var subj = '【美术组通知】' + (n.title || '参赛通知');
    copy(t, '全文已复制；邮件将带完整正文打开，若被截断请直接粘贴');
    mark('notice');
    setTimeout(function () {
      window.location.href = 'mailto:?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(t);
    }, 260);
  }
  function sendWX() {
    var t = noticeText();
    var ok = copy(t, '全文已复制到剪贴板，请在微信里粘贴发送');
    mark('notice');
    if (ok) { try { window.location.href = 'weixin://'; } catch (e) {} }
  }

  /* ---------- 进度 ---------- */
  function renderProgress() {
    var el = $('#progressHost'); if (!el) return;
    mark('progress');
    var p = progress();
    var steps = [
      ['score', '看清评分表', 'score.md'], ['draft', '拿作品框架', 'draft.md'],
      ['submit', '备料与投稿', 'submit.md'], ['notice', '发学生通知', 'notice.md'],
      ['progress', '看进度', 'progress.md']
    ];
    var n = steps.filter(function (s) { return p[s[0]]; }).length;
    el.innerHTML = '<div class="pg-top"><b>' + n + ' / ' + steps.length + ' 步已完成</b>' +
      '<span>自动记录在本机，不用你点</span></div>' +
      '<div class="pg-bar"><i style="width:' + Math.round(n / steps.length * 100) + '%"></i></div>' +
      '<div class="pg-list">' + steps.map(function (s, i) {
        return '<a class="pg' + (p[s[0]] ? ' done' : '') + '" href="#/' + s[2].replace('.md', '') + '">' +
          '<b>' + (i + 1) + '</b><span>' + esc(s[1]) + '</span>' +
          '<em>' + (p[s[0]] ? '已完成' : '未开始') + '</em></a>';
      }).join('') + '</div>';
  }

  /* ---------- 设置：本机资料 ---------- */
  function openCfg() {
    var c = cfg();
    var f = [['school', '学校名称'], ['teacher', '收件 / 指导教师'], ['place', '收件地点'],
             ['inner', '校内收件截止（建议值，按科组通知改）'], ['contact', '学生咨询方式']];
    $('#cfgSheet').innerHTML =
      '<div class="sheet-head"><div><h2>填一次本机资料</h2>' +
      '<div class="m">只存这台设备，所有模板与通知自动带出；不上传、不进公开仓库</div></div>' +
      '<button class="x" data-close="cfgMask">×</button></div>' +
      '<div class="note">通知与填报内容里的 {{占位}} 全部来自这里。默认值是通用写法，请按学校实际改一次。</div>' +
      f.map(function (x) {
        return '<label class="field"><span>' + esc(x[1]) + '</span><input data-cfg="' + x[0] +
          '" value="' + esc(c[x[0]]) + '" autocomplete="off"></label>';
      }).join('') +
      '<div class="sheet-acts"><button id="cfgSave">保存到本机</button>' +
      '<button class="ghost" id="cfgReset">恢复默认</button></div>';
    $('#cfgMask').classList.add('on');
    $('#cfgSave').addEventListener('click', function () {
      var o = {}; $$('[data-cfg]').forEach(function (i) { o[i.getAttribute('data-cfg')] = i.value.trim(); });
      save(CKEY, o); $('#cfgMask').classList.remove('on'); toast('已保存到本机');
      render();
    });
    $('#cfgReset').addEventListener('click', function () {
      save(CKEY, {}); $('#cfgMask').classList.remove('on'); toast('已恢复默认'); render();
    });
  }

  /* ---------- 知网：本机存储 + 一键填充 ---------- */
  function cnkiGet() { var c = ls(CNKI, {}); return { u: c.u || '', p: c.p || '' }; }
  function refreshBtn() {
    var c = cnkiGet(), b = $('#btnCNKI');
    if (b) b.textContent = (c.u || c.p) ? '知网 · 已存本机 ✓' : '知网一键填充';
  }
  function bookmark(u, p) {
    return 'javascript:(function(){var u=' + JSON.stringify(u) + ',p=' + JSON.stringify(p) + ';' +
      "var ins=document.querySelectorAll('input'),uHit=null,pHit=null;" +
      "for(var i=0;i<ins.length;i++){var e=ins[i],t=(e.type||'').toLowerCase()," +
      "n=(e.name||'')+(e.id||'')+(e.placeholder||'');" +
      "if(t==='password'){if(!pHit)pHit=e;}" +
      "else if(t!=='hidden'&&t!=='checkbox'&&t!=='radio'&&t!=='submit'&&t!=='button'){" +
      "if(!uHit&&/user|name|account|login|card|id|账号|用户|证号|手机|email/i.test(n))uHit=e;}}" +
      "if(!uHit){for(var j=0;j<ins.length;j++){var f=ins[j],q=(f.type||'').toLowerCase();" +
      "if(q!=='password'&&q!=='hidden'&&q!=='checkbox'&&q!=='radio'&&q!=='submit'&&q!=='button'){uHit=f;break;}}}" +
      "function set(el,v){if(!el)return;el.focus();el.value=v;" +
      "el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}" +
      "set(uHit,u);set(pHit,p);" +
      "if(!uHit&&!pHit)alert('未找到登录输入框，请手动粘贴（凭据已存在本机）');" + '})()';
  }
  function openCNKI() {
    var c = cnkiGet();
    var h = '<div class="sheet-head"><div><h2>知网账号 · 本机一键填充</h2>' +
      '<div class="m">账号密码只存在这台设备的浏览器里，不上传、不写进网站文件</div></div>' +
      '<button class="x" data-close="cnkiMask">×</button></div>' +
      '<div class="note">公开仓库不能写死账号密码，所以做成本机存储：填一次，以后点「知网一键填充」即把账号密码放进剪贴板并打开知网；' +
      '要真正自动填进登录框，把生成的<b>书签</b>拖到书签栏，在知网登录页点一下即可。换设备或清缓存需重填。</div>' +
      '<label class="field"><span>账号 / 借书证号 / 手机号</span><input id="cnkiU" value="' + esc(c.u) + '" autocomplete="off"></label>' +
      '<label class="field"><span>密码</span><input id="cnkiP" type="password" value="' + esc(c.p) + '" autocomplete="off"></label>' +
      '<div class="sheet-acts"><button id="cnkiSave">保存到本机</button>' +
      '<button class="ghost" id="cnkiFill">一键复制并打开知网</button>' +
      '<button class="ghost" id="cnkiBM">生成一键填充书签</button></div>' +
      '<div id="cnkiBMBox"></div>' +
      '<div class="sheet-acts" style="border:0">' +
      '<a class="ghost" href="' + LIB + '" target="_blank" rel="noopener">深圳图书馆知网入口 ↗</a>' +
      '<a class="ghost" href="' + OFF + '" target="_blank" rel="noopener">中国知网官网 ↗</a>' +
      '<button class="ghost" id="cnkiDel">清除本机记录</button></div>';
    $('#cnkiSheet').innerHTML = h; $('#cnkiMask').classList.add('on');
    $('#cnkiSave').addEventListener('click', function () {
      save(CNKI, { u: $('#cnkiU').value.trim(), p: $('#cnkiP').value });
      refreshBtn(); toast('已保存到本机浏览器');
    });
    $('#cnkiFill').addEventListener('click', cnkiFill);
    $('#cnkiBM').addEventListener('click', function () {
      var c2 = cnkiGet();
      if (!c2.u && !c2.p) { toast('请先填写并保存到本机'); return; }
      var code = bookmark(c2.u, c2.p);
      $('#cnkiBMBox').innerHTML = '<div class="note" style="margin:12px 0 0">把下面链接<b>拖到书签栏</b>，' +
        '在知网登录页点一下即自动填好。若不能拖动，新建书签把代码整段粘进「网址」栏。</div>' +
        '<div class="bm">' + esc(code) + '</div>' +
        '<div class="sheet-acts" style="border:0"><button class="ghost" id="bmCopy">复制书签代码</button></div>';
      $('#bmCopy').addEventListener('click', function () { copy(code, '书签代码已复制'); });
    });
    $('#cnkiDel').addEventListener('click', function () {
      try { localStorage.removeItem(CNKI); } catch (e) {}
      $('#cnkiU').value = ''; $('#cnkiP').value = ''; refreshBtn(); toast('已清除本机记录');
    });
  }
  function cnkiFill() {
    var c = cnkiGet();
    if (!c.u && !c.p) { openCNKI(); toast('请先填写并保存到本机'); return; }
    copy('账号：' + c.u + '\n密码：' + c.p, '账号密码已复制，去知网粘贴登录');
    window.open(LIB, '_blank', 'noopener');
  }

  /* ---------- 站内查找 ---------- */
  function renderResults(q) {
    q = (q || '').trim().toLowerCase();
    var list = (window.HF_INDEX || []).filter(function (x) {
      return !q || (x.t + ' ' + x.k + ' ' + x.c).toLowerCase().indexOf(q) >= 0;
    }).slice(0, q ? 14 : 8);
    var box = $('#qResults');
    if (!list.length) { box.innerHTML = '<div class="q-empty">没有找到，换个词试试</div>'; return; }
    box.innerHTML = list.map(function (x) {
      return '<button class="q-item" data-go="' + esc(x.u) + '"><b>' + esc(x.t) + '</b><span>' + esc(x.c) + '</span></button>';
    }).join('');
  }

  /* ---------- 次要长表折叠：每步一屏看完，不靠一直下滑 ---------- */
  var FOLD_RULES = {
    score: [['另外两份官方表', '照着做的 8 条检查', '展开：另外两份官方表 / 教师类评分 / 批量提分做法（3 份官方原文）']],
    draft: [['教师报送类作品的骨架', '下一步', '展开：教师报送类作品的骨架与硬性规格']],
    submit: [['会直接取消资格的红线', '下一步', '展开：9 条取消资格红线与官方依据']]
  };
  function foldSection(sec, from, to, label) {
    var kids = Array.prototype.slice.call(sec.children);
    var a = -1, b = -1;
    kids.forEach(function (x, i) {
      if (x.tagName === 'H2' && a < 0 && x.textContent.indexOf(from) >= 0) a = i;
      else if (x.tagName === 'H2' && a >= 0 && b < 0 && i > a &&
               (to === '__END__' || x.textContent.indexOf(to) >= 0)) b = i;
    });
    if (a < 0) return;
    if (b < 0) b = kids.length;
    var det = document.createElement('details'); det.className = 'hf hf-fold';
    var sum = document.createElement('summary'); sum.textContent = label; det.appendChild(sum);
    var body = document.createElement('div'); body.className = 'fbody'; det.appendChild(body);
    sec.insertBefore(det, kids[a]);
    kids.slice(a, b).forEach(function (n) {
      if (n.tagName === 'H2') {
        var h = document.createElement('h3'); h.innerHTML = n.innerHTML; body.appendChild(h);
      } else body.appendChild(n);
    });
  }
  function foldLong() {
    var sec = document.querySelector('.markdown-section'); if (!sec) return;
    var hash = (location.hash || '').replace(/^#\//, '').split('?')[0] || 'home';
    if (sec.dataset.hfFold === hash) return;
    sec.dataset.hfFold = hash;
    (FOLD_RULES[hash] || []).forEach(function (r) { foldSection(sec, r[0], r[1], r[2]); });
  }

  /* ---------- 统一渲染 ---------- */
  function render() {
    renderTarget(); renderChecks(); renderTpl(); renderNotice(); renderProgress(); refreshBtn();
    foldLong();
  }
  window.HF = { render: render, fill: fill, cfg: cfg, target: target, copy: copy, mark: mark };

  /* ---------- 事件 ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;

    /* 声音震动（输入框除外） */
    if (!t.closest('input,textarea,select')) {
      try { if (navigator.vibrate) navigator.vibrate(8); } catch (err) {}
      beep(660, .03);
    }

    var chk = t.closest('[data-chk]');
    if (chk && chk.tagName === 'INPUT') {
      var key = chk.getAttribute('data-chk'), i = chk.getAttribute('data-i');
      var o = ls(key, {}); o[i] = chk.checked; save(key, o);
      chk.parentNode.classList.toggle('done', chk.checked);
      if (key === CHK_S) mark('score');
      if (key === CHK_U || key === CHK_M) mark('submit');
      var foot = chk.closest('#scoreCheck,#specCheck,#matList');
      if (foot && foot.querySelector('.chk-foot')) {
        var d = Object.keys(o).filter(function (k) { return o[k]; }).length;
        var n = foot.querySelectorAll('input[type=checkbox]').length;
        foot.querySelector('.chk-foot').textContent = d + ' / ' + n + ' 项已核对 · 勾选状态存在本机';
      }
      return;
    }
    var alt = t.closest('[data-target]');
    if (alt) {
      save(TKEY, alt.getAttribute('data-target'));
      toast('目标已切换，材料与填报内容同步更新');
      render(); return;
    }
    var nk = t.closest('[data-notice]');
    if (nk) { save(NKEY, nk.getAttribute('data-notice')); renderNotice(); return; }

    var tpl = t.closest('[data-copy-tpl]');
    if (tpl) {
      var k = tpl.getAttribute('data-copy-tpl'), T = (C.tpl || {})[k] || {};
      copy(fill(T.text || ''), '「' + (T.title || '模板') + '」已复制，粘到文档里填');
      mark('draft'); return;
    }
    var go = t.closest('[data-go]');
    if (go) { location.hash = go.getAttribute('data-go'); var sm = $('#searchMask'); if (sm) sm.classList.remove('on'); return; }

    var close = t.closest('[data-close]');
    if (close) { var m = $('#' + close.getAttribute('data-close')); if (m) m.classList.remove('on'); return; }

    var act = t.closest('[data-act]');
    if (act) {
      var a = act.getAttribute('data-act');
      if (a === 'go') { location.hash = '#/' + act.getAttribute('data-to'); }
      else if (a === 'switch') { toggleAlts(); }
      else if (a === 'cfg') { openCfg(); }
      else if (a === 'copy-fill') { var F = (C.tpl || {}).fill || {}; copy(fill(F.text || ''), '投稿填报内容已复制，粘进官方表单'); mark('submit'); }
      else if (a === 'copy-mat') { copy('【' + target().name + '】材料清单\n' + (target().materials || []).map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n'), '材料清单已复制'); mark('submit'); }
      else if (a === 'open-portal') { copy(fill(((C.tpl || {}).fill || {}).text || ''), '填报内容已复制'); window.open(target().url || OFF, '_blank', 'noopener'); mark('submit'); toast('官方通道已打开，内容在剪贴板，最后提交请本人确认'); }
      else if (a === 'notice-copy') { copy(noticeText(), '通知全文已复制，去班级群粘贴'); mark('notice'); }
      else if (a === 'notice-wx') { sendWX(); }
      else if (a === 'notice-mail') { sendMail(); }
      return;
    }
  }, true);

  /* 工具条 */
  function bind(id, fn) { var b = $(id); if (b) b.addEventListener('click', fn); }
  bind('#hfSideBtn', function () { document.body.classList.toggle('hf-side'); });
  bind('#btnCNKI', function () { var c = cnkiGet(); if (c.u || c.p) cnkiFill(); else openCNKI(); });
  bind('#btnSearch', function () {
    $('#searchMask').classList.add('on'); $('#qInput').value = ''; renderResults('');
    setTimeout(function () { $('#qInput').focus(); }, 60);
  });
  bind('#qInput', function () {});
  var qi = $('#qInput'); if (qi) qi.addEventListener('input', function () { renderResults(this.value); });
  ['cnkiMask', 'searchMask', 'cfgMask'].forEach(function (id) {
    var m = $('#' + id); if (m) m.addEventListener('click', function (e) { if (e.target === this) this.classList.remove('on'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') ['cnkiMask', 'searchMask', 'cfgMask'].forEach(function (id) {
      var m = $('#' + id); if (m) m.classList.remove('on');
    });
  });
  window.addEventListener('hashchange', function () {
    document.body.classList.remove('hf-side');
    setTimeout(render, 60);
  });
  render();
})();
