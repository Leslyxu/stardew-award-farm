/* ============================================================
   星露奖杯农场 · 主程序
   ============================================================ */
(function () {
  "use strict";

  var LS = {
    mine: "hf_mine_v1",
    prof: "hf_profile_v1",
    chk: "hf_checks_v1",
    custom: "hf_custom_v1",
    settings: "hf_settings_v1"
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function load(k, d) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
  }
  function save(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { }
  }
  function today() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function daysTo(str) {
    if (!str) return null;
    var p = String(str).split("-");
    if (p.length !== 3) return null;
    var t = new Date(+p[0], +p[1] - 1, +p[2]);
    return Math.round((t - today()) / 86400000);
  }
  function fmtDate(str) {
    if (!str) return "—";
    var p = String(str).split("-");
    if (p.length !== 3) return str;
    return p[0] + " 年 " + (+p[1]) + " 月 " + (+p[2]) + " 日";
  }

  /* ---------- 数据合并 ---------- */
  var custom = load(LS.custom, []);
  var ALL = [].concat(AWARDS || [], custom);
  var WL = (typeof WHITELIST !== "undefined" ? WHITELIST : []);   // 白名单（可变，供远程刷新覆盖）
  var BS = (typeof BIG_SCHOOLS !== "undefined" ? BIG_SCHOOLS : []); // 名校战绩（可变，供远程刷新覆盖）

  /* ---------- 状态判定 ---------- */
  // 统一状态口径：征集中 / 即将截止 / 已截止 / 待公布（卡片、顶部图例、筛选全部共用这一套）
  function statusOf(a) {
    var d = daysTo(a.deadline);
    if (d == null) return { key: "soon", text: "待公布" };
    if (d < 0) return { key: "done", text: "已截止" };
    if (d <= 30) return { key: "hot", text: "即将截止·剩 " + d + " 天" };
    if (d > 150) return { key: "soon", text: "待公布·约 " + Math.round(d / 30) + " 个月后" };
    return { key: "open", text: "征集中·剩 " + d + " 天" };
  }

  /* 真实阶段（官方出处）：进行中 / 已截稿 / 已结束 / 待发布 */
  var PHASE = {
    "进行中": { c: "#4f9d3a", bg: "#dff0d3" },
    "已截稿": { c: "#c4442e", bg: "#f4d9d2" },
    "已结束": { c: "#8a7c69", bg: "#e7ddcb" },
    "待发布": { c: "#c99a17", bg: "#f6ecc8" }
  };
  function phaseInfo(a) {
    var p = a.phase || (statusOf(a).key === "done" ? "已截稿" : "进行中");
    return { text: p, c: (PHASE[p] || PHASE["进行中"]).c, bg: (PHASE[p] || PHASE["进行中"]).bg };
  }

  /* ---------- 季节 ---------- */
  function season() {
    var m = new Date().getMonth() + 1;
    var b = document.body;
    b.classList.remove("s-spring", "s-summer", "s-autumn", "s-winter");
    if (m >= 3 && m <= 5) b.classList.add("s-spring");
    else if (m >= 6 && m <= 8) b.classList.add("s-summer");
    else if (m >= 9 && m <= 11) b.classList.add("s-autumn");
    else b.classList.add("s-winter");
    return { 3: "春", 4: "春", 5: "春", 6: "夏", 7: "夏", 8: "夏", 9: "秋", 10: "秋", 11: "秋", 12: "冬", 1: "冬", 2: "冬" }[m];
  }

  /* ---------- 时钟 ---------- */
  function schoolYear() {
    var d = new Date();
    var y = d.getFullYear();
    return d.getMonth() + 1 >= 8 ? y + "-" + (y + 1) : (y - 1) + "-" + y;
  }
  var seasonName = season();
  function tick() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    var wk = "日一二三四五六"[d.getDay()];
    $("#clock").innerHTML = "<b>" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + "</b><br><span>" +
      (d.getMonth() + 1) + " 月 " + d.getDate() + " 日 周" + wk + " · " + seasonName + "季 · " + schoolYear() + " 学年</span>";
    $("#dtext") && ($("#dtext").textContent = "");
  }
  setInterval(tick, 1000); tick();

  /* ---------- 音效 ---------- */
  var actx = null;
  function beep(freq, dur, type) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || "square"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.06, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + (dur || 0.08));
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + (dur || 0.08));
    } catch (e) { }
  }

  /* ---------- toast ---------- */
  var toastT = null;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("on"); }, 2000);
  }

  /* ---------- 统计 ---------- */
  function stats() {
    var s = { open: 0, hot: 0, soon: 0, done: 0, "区": 0, "市": 0, "省": 0, "国": 0 };
    ALL.forEach(function (a) {
      var st = statusOf(a).key;
      s[st]++;
      if (s[a.tier] != null) s[a.tier]++;
    });
    return s;
  }

  /* ---------- 渲染卡片 ---------- */
  var state = { tier: "all", aud: "教师", q: "", status: "all", sort: "value", mode: "tch", rec: false, resKind: "论文", resScope: "国内", resCat: null };
  var TIER_CLS = { "区": "b-qu", "市": "b-shi", "省": "b-sheng", "国": "b-guo" };
  var TIER_TXT = { "区": "区级", "市": "市级", "省": "省级", "国": "国家级" };

  function filtered() {
    var list = ALL.slice();
    if (state.aud) list = list.filter(function (a) { return a.aud === state.aud; });
    if (state.tier !== "all") list = list.filter(function (a) { return a.tier === state.tier; });
    if (state.q) {
      var q = state.q.toLowerCase();
      list = list.filter(function (a) {
        return (a.name + a.org + a.subject + (a.short || "")).toLowerCase().indexOf(q) >= 0;
      });
    }
    if (state.status !== "all") {
      list = list.filter(function (a) {
        var k = statusOf(a).key;
        if (state.status === "open") return k === "open" || k === "hot";
        return k === state.status;
      });
    }
    if (state.rec) {
      list = list.filter(function (a) { return shouldJoin(a); });
    }
    list.sort(function (x, y) {
      if (state.sort === "value") return priorityScore(y) - priorityScore(x);
      if (state.sort === "credit") return (y.credit || 0) - (x.credit || 0);
      if (state.sort === "proof") return ((y.schoolProof && y.schoolProof.count) || 0) - ((x.schoolProof && x.schoolProof.count) || 0);
      var dx = daysTo(x.deadline), dy = daysTo(y.deadline);
      if (dx == null) dx = 9999; if (dy == null) dy = 9999;
      if (dx < 0) dx += 10000; if (dy < 0) dy += 10000;
      return dx - dy;
    });
    return list;
  }

  function starHTML(n) {
    var s = "";
    for (var i = 0; i < 5; i++) s += '<i class="st' + (i < n ? " on" : "") + '"></i>';
    return '<span class="stars">' + s + "</span>";
  }

  /* 门槛低：材料全是图片/电子版、不超 3 项、无重写作/表格要求 */
  function isEasy(a) {
    var m = a.materials || [];
    if (!m.length || m.length > 3) return false;
    var hard = /报名表|申请表|申报表|汇总表|视频|设计说明|创作报告|论文|方案|课件|教案|原件|证书|授权书|推荐表|Word|word|公示|佐证|总结|案例|申报书/;
    return m.every(function (x) { return !hard.test(x); });
  }
  /* 建议参加：国家级 / 认可度高 / 低门槛好上手 */
  function shouldJoin(a) {
    if (a.aud === "学生") return (a.rate && a.rate.value >= 4) || isEasy(a);
    return a.tier === "国" || (a.credit || 0) >= 4 || (isEasy(a) && (a.credit || 0) >= 3);
  }
  /* 含金量 / 推荐综合分（越大越靠前） */
  function priorityScore(a) {
    var tw = { "国": 4, "省": 3, "市": 2, "区": 1 }[a.tier] || 0;
    var s = tw * 10;
    if (a.aud === "学生") s += (a.rate ? a.rate.value : 0) * 2;
    else s += (a.credit || 0) * 2;
    if (isEasy(a)) s += 6;
    var k = statusOf(a).key;
    if (k === "done") s -= 20;
    if (k === "soon") s -= 4;
    return s;
  }
  /* 纯函数投稿包文本（详情/邮件复用，不依赖 DOM） */
  function packText(a) {
    var p = load(LS.prof, prof), d = daysTo(a.deadline);
    var L = [];
    L.push("【投稿材料包】" + a.name);
    L.push("========================================");
    L.push("主办单位：" + a.org + "（" + (a.orgType || "") + "）");
    L.push("赛事级别：" + (TIER_TXT[a.tier] || a.tier));
    L.push("学科范围：" + a.subject);
    L.push("截稿：" + fmtDate(a.deadline) + (d != null && d >= 0 ? "（T-" + d + "）" : ""));
    L.push("");
    L.push("申报人：" + (p.name || "＿＿＿") + "　单位：" + (p.school || "＿＿＿"));
    L.push("联系：" + (p.phone || "") + " " + (p.mail || ""));
    L.push("");
    L.push("需提交材料：");
    (a.materials || []).forEach(function (m, i) { L.push("　" + (i + 1) + ". " + m); });
    L.push("");
    L.push("官方入口：" + (a.url || a.portal || "见主办方通知"));
    L.push("");
    L.push("※ 本包由「星露奖杯农场」按该赛事要求生成，请据实润色后提交。");
    return L.join("\n");
  }
  function quickMail(a) {
    var to = resolveRecv(a);
    if (!to) { toast("先在「我的资料」填收件 / 投稿邮箱"); openSettings(); return; }
    var subj = "[赛事报名] " + a.name + " - " + (prof.school || "") + " - " + (prof.name || "");
    window.location.href = mailtoURL(to, subj, packText(a)); beep(880, .08);
  }

  /* 从 subject 拆出多个可投类别，显示为标签 */
  function typesOf(a) {
    return (a.subject || "").split(/[\/、]/).map(function (x) { return x.trim(); })
      .filter(function (x) { return x && x.length <= 6 && !/全学科|学科|组|·|群众|方向|按学段|分\s*\d|含|级别|每三年|每年|中小学组/.test(x); })
      .slice(0, 6);
  }

  function applyMode(a) {
    var t = [].concat(a.prep || [], a.steps || [], a.tips || [], [a.source || ""]).join(" ");
    if (/个人不能直报|不能个人|无法直报|统一报送|统一上传|逐级|由.*推荐|经.*推荐|不接受个人/.test(t)) {
      if (/逐级|校.*区.*市|校→|学校—区—市|校→区→市→省|省教研部门/.test(t)) return { txt: "不能个人直报 · 需逐级推荐", ok: false };
      return { txt: "不能个人直报 · 需单位报送", ok: false };
    }
    if (/官网投稿|官网测评|官网提交|平台上传|自行上传|个人可/.test(t)) return { txt: "可个人直报", ok: true };
    return { txt: "需单位报送（默认）", ok: false };
  }

  function cardHTML(a) {
    var st = statusOf(a);
    var d = daysTo(a.deadline);
    var total = 240;
    var pct = d == null ? 100 : Math.max(0, Math.min(100, Math.round((1 - d / total) * 100)));
    var cls = d == null ? "warn" : (d < 0 ? "danger" : (d <= 30 ? "danger" : (d <= 90 ? "warn" : "")));
    var proof = a.schoolProof || {};
    var proofHTML = proof.count > 0
      ? '<div class="proof"><span class="k">学校认</span> · 本校上学年 <b>' + proof.count + '</b> 人次获奖，最高：' + esc(proof.best || "—") + '<br><span class="mini">' + esc(proof.note || "") + "</span></div>"
      : '<div class="proof none"><span class="k">暂无本校记录</span> · ' + esc(proof.note || "需自行确认学校是否认定") + "</div>";
    var types = typesOf(a);
    var typesHTML = types.length ? '<div style="margin-top:3px">' + types.map(function (t) { return '<span class="type">' + esc(t) + "</span>"; }).join("") + "</div>" : "";
    var bigHTML = (a.bigSchools && a.bigSchools.length)
      ? '<div class="bigschool"><span class="bs-k">🏫 大校也在投</span>' + a.bigSchools.map(function (b) { return '<span class="bs">' + esc(b) + "</span>"; }).join("") + "</div>"
      : "";

    var mineMap = {};
    load(LS.mine, []).forEach(function (m) { mineMap[m.id] = m.status; });
    var mineTag = mineMap[a.id] ? '<span class="badge" style="background:#6d4a2a">' + esc(mineMap[a.id]) + "</span>" : "";
    var offTag = a.official ? '<span class="badge off">官方已发</span>' : '<span class="badge off2">待发布</span>';
    var audTag = a.aud === "学生" ? '<span class="badge" style="background:#8b4fa8">学生·我指导</span>' : "";
    var recTag = shouldJoin(a) ? '<span class="badge" style="background:#c4442e">⭐ 建议参加</span>' : "";
    var easyTag = isEasy(a) ? '<span class="badge" style="background:#4f9d3a">📷 门槛低·发照片即可</span>' : "";
    var am = applyMode(a);
    var applyTag = '<span class="badge" style="background:' + (am.ok ? "#4f9d3a" : "#e07b00") + '">' + esc(am.txt) + "</span>";

    return '<div class="card px" data-id="' + esc(a.id) + '">' +
      '<div class="row1">' +
        '<span class="badge ' + (TIER_CLS[a.tier] || "b-qu") + '">' + (TIER_TXT[a.tier] || a.tier) + "</span>" +
        audTag + applyTag + recTag + easyTag + mineTag + offTag +
        "<h3>" + esc(a.name) + "</h3>" +
      "</div>" +
      '<div class="org">主办：' + esc(a.org) + "</div>" +
      '<div class="meta">' +
        "<span>截稿 <b>" + fmtDate(a.deadline) + "</b></span>" +
        "<span>认可度 <b>" + starHTML(a.credit || 3) + "</b></span>" +
        "<span>方向 " + esc(a.subject.split("·")[0]) + "</span>" +
        (a.aud === "学生" && a.rate
          ? "<span>含金量 <b>" + starHTML(a.rate.value) + "</b></span><span>好参加 <b>" + starHTML(a.rate.ease) + "</b></span>"
          : "") +
      "</div>" +
      '<div class="cd"><span class="phase st-' + st.key + '">' + st.text + "</span>" +
        '<span class="bar"><i class="' + cls + '" style="width:' + pct + '%"></i></span></div>' +
      proofHTML +
      typesHTML +
      bigHTML +
      '<div class="acts">' +
        '<button class="btn gold sm" data-act="detail">详情</button>' +
        (a.aud === "学生"
          ? '<button class="btn green sm" data-act="notice">生成参赛通知</button>'
          : '<button class="btn green sm" data-act="submit">一键投稿</button>') +
        '<button class="btn sm" data-act="track">加入我的赛程</button>' +
      "</div>" +
    "</div>";
  }

  function render() {
    var m = state.mode;
    if (m === "nwl" || m === "gwl") {
      document.querySelector(".layout").style.display = "none";
      $("#wlSection").style.display = "block";
      $("#resSection").style.display = "none";
      $("#toolsSection").style.display = "none";
      renderWLT();
      return;
    }
    if (m === "res") {
      document.querySelector(".layout").style.display = "none";
      $("#wlSection").style.display = "none";
      $("#resSection").style.display = "block";
      $("#toolsSection").style.display = "none";
      renderRes();
      return;
    }
    if (m === "tools") {
      document.querySelector(".layout").style.display = "none";
      $("#wlSection").style.display = "none";
      $("#resSection").style.display = "none";
      $("#toolsSection").style.display = "block";
      renderTools();
      return;
    }
    if (m === "people") {
      document.querySelector(".layout").style.display = "none";
      $("#wlSection").style.display = "none";
      $("#resSection").style.display = "none";
      $("#toolsSection").style.display = "none";
      $("#peopleSection").style.display = "block";
      renderPeople();
      return;
    }
    document.querySelector(".layout").style.display = "";
    $("#wlSection").style.display = "none";
    $("#resSection").style.display = "none";
    $("#toolsSection").style.display = "none";

    var list = filtered();
    if (!list.length) {
      $("#grid").innerHTML = '<div class="px" style="padding:26px;text-align:center;color:#6d4a2a">这块地还没种东西 —— 换个筛选条件试试。</div>';
    } else if (state.tier === "all") {
      /* 按级别分组展示，含金量高的（国家级）放最前 */
      var order = ["国", "省", "市", "区"];
      var html = "";
      order.forEach(function (t) {
        var grp = list.filter(function (a) { return a.tier === t; }).sort(function (x, y) { return priorityScore(y) - priorityScore(x); });
        if (!grp.length) return;
        var recN = grp.filter(shouldJoin).length;
        html += '<div class="group-h">' + (TIER_TXT[t] || t) + ' · ' + grp.length + ' 项' + (recN ? '　⭐建议参加 ' + recN : '') + '</div>';
        html += grp.map(cardHTML).join("");
      });
      $("#grid").innerHTML = html;
    } else {
      $("#grid").innerHTML = list.map(cardHTML).join("");
    }
    var s = stats();
    $("#nOpen").textContent = s.open;
    $("#nHot").textContent = s.hot;
    $("#nSoon").textContent = s.soon;
    $("#nDone").textContent = s.done;
    var audList = ALL.filter(function (a) { return a.aud === state.aud; });
    var tc = { "区": 0, "市": 0, "省": 0, "国": 0 };
    audList.forEach(function (a) { if (tc[a.tier] != null) tc[a.tier]++; });
    $("#cAll").textContent = audList.length;
    $("#cQu").textContent = tc["区"];
    $("#cShi").textContent = tc["市"];
    $("#cSheng").textContent = tc["省"];
    $("#cGuo").textContent = tc["国"];
  }

  /* ---------- 官方白名单 · 表格 ---------- */
  function renderWLT() {
    var q = ($("#wlQ") ? $("#wlQ").value.trim() : "").toLowerCase();
    var onlyArt = $("#wlArt") && $("#wlArt").checked;
    var rows = WL.filter(function (w) {
      if (state.mode === "nwl" && w.level !== "国") return false;
      if (state.mode === "gwl" && w.level !== "省") return false;
      if (onlyArt && !w.art) return false;
      if (q) {
        var hay = (w.name + w.org + w.cat + (w.note || "")).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    var artN = rows.filter(function (w) { return w.art; }).length;
    $("#wlCount").textContent = "共 " + rows.length + " 项　|　美术 / 美育相关 " + artN + " 项";
    if (!rows.length) {
      $("#wlTableWrap").innerHTML = '<div class="px" style="padding:18px;text-align:center;color:#6d4a2a">没有匹配的赛事，换个关键词或取消「只看美术相关」。</div>';
      return;
    }
    var h = '<table class="wltbl"><thead><tr>' +
      '<th class="no">序号</th><th>级别</th><th>类别</th><th>赛事名称</th><th>主办单位</th><th>面向学段</th><th>报名渠道 / 具体要求</th><th>官方</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (w) {
      var lv = w.level === "国" ? '<span class="badge b-guo">国家级</span>' : '<span class="badge b-sheng">省级</span>';
      var artTag = w.art ? ' <span class="artflag">美术重点</span>' : "";
      h += '<tr class="' + (w.art ? "art" : "") + '">' +
        '<td class="no">' + w.no + "</td>" +
        "<td>" + lv + "</td>" +
        '<td class="catc">' + esc(w.cat) + artTag + "</td>" +
        "<td><b>" + esc(w.name) + "</b></td>" +
        '<td class="org">' + esc(w.org) + "</td>" +
        "<td>" + esc(w.scope) + "</td>" +
        '<td class="ch">' + esc(w.channel) + "</td>" +
        '<td><a href="' + esc(w.url) + '" target="_blank" rel="noopener">官方</a></td>' +
        "</tr>";
    });
    h += "</tbody></table>";
    $("#wlTableWrap").innerHTML = h;
  }

  /* ---------- 教研前沿（论文 / 课题 × 国内 / 国际） ---------- */
  function resCard(r) {
    var dl = r.deadline ? '<span class="badge b-hot">截稿 ' + esc(r.deadline) + "</span>" : "";
    var tags = (r.tags || []).map(function (t) { return '<span class="tag sm">' + esc(t) + "</span>"; }).join("");
    return '<div class="card res" data-id="' + esc(r.id) + '">' +
      '<div class="ct"><span class="badge b-' + (r.scope === "国内" ? "sheng" : "guo") + '">' + esc(r.scope) + "</span>" +
      '<span class="badge b-kind">' + esc(r.kind) + "</span>" +
      '<span class="badge b-cat">' + esc(resCat(r)) + "</span>" + dl + "</div>" +
      '<div class="cn">' + esc(r.title) + "</div>" +
      '<div class="mini" style="margin:4px 0"><b>地区：</b>' + esc(r.region || "—") + "</div>" +
      '<div class="sec" style="margin:6px 0"><div class="mini"><b>🔥 为什么 2026 火：</b><br>' + esc(r.hot) + "</div></div>" +
      '<div class="sec" style="margin:6px 0"><div class="mini"><b>📌 去哪发 / 去哪申：</b><br>' + esc(r.where) + "</div></div>" +
      '<div class="tags">' + tags + "</div>" +
      '<div class="ct" style="margin-top:6px"><a class="badge b-link" href="' + esc(r.url) + '" target="_blank" rel="noopener">来源 / 官网 ↗</a>' +
      '<button class="btn sm green" data-act="resmind" data-id="' + esc(r.id) + '" style="margin-left:6px">🧠 思维导图</button>' +
      '<span class="mini" style="margin-left:6px">出处：' + esc(r.source || "") + "</span></div>" +
      "</div>";
  }
  /* 主题归类：用于饼状图 + 卡片标签 */
  function resCat(r) {
    var t = (r.tags || []).join(" ");
    if (/数字美育|AI辅助|协同创作|AI美育|AI素养|AIGC|智能美育|人机协同|人工美学|系统综述/.test(t)) return "数字美育·AI协同";
    if (/非遗|民间美术|文化传承|书法教学|笔墨素养/.test(t)) return "非遗·书法·民间美术";
    if (/馆校合作|场馆美育|浸润行动|美育浸润/.test(t)) return "馆校合作·美育浸润";
    if (/乡土美术|在地资源|在地文化|课程开发|表现性评价|作业设计|素养评价|本土文化|水墨|博物/.test(t)) return "乡土·课程·评价";
    if (/大单元|大观念|课标|儿童美术|视觉观看|审美学习|艺术社团|课程化/.test(t)) return "大单元·儿童·教学";
    if (/美术鉴赏|审美判断|图像识读|视觉素养/.test(t)) return "美术鉴赏·视觉素养";
    if (/跨学科|STEAM|艺术融合|项目式|Maker/.test(t)) return "跨学科·STEAM";
    if (/社会正义|社区艺术|公民教育|文化响应式|去西方中心/.test(t)) return "社会正义·社区艺术";
    if (/文献计量|研究趋势|知识图谱|科学地图|综述/.test(t)) return "研究趋势·文献计量";
    if (/A\/r\/tography|艺术探究|艺术本位|创作性探究/.test(t)) return "艺术探究·A/r/tography";
    if (/情感|体验式|社会情绪|SEL|正念|疗愈|心理健康/.test(t)) return "情感·体验式学习";
    if (/国际会议|国际基金|跨国合作|索引期刊/.test(t)) return "国际发表·基金";
    if (/课题申报|国家级|省级|市级|教育部|教科规划|专业协会/.test(t)) return "课题申报渠道";
    return "其他";
  }
  /* 国际前沿主题饼状图（内联 SVG，可点击筛选） */
  var PIE_COLORS = ["#c4442e", "#4f9d3a", "#e0a52e", "#3a7ca5", "#8a5fb0", "#d2691e", "#5fb0a0", "#b05f8a", "#6a8d3a", "#3a5ca5", "#c45f8a", "#a07c3a"];
  function renderResPie(list) {
    var box = $("#resPie"); if (!box) return;
    if (!list.length) { box.innerHTML = ""; return; }
    var counts = {};
    list.forEach(function (r) { var c = resCat(r); counts[c] = (counts[c] || 0) + 1; });
    var cats = Object.keys(counts);
    if (cats.length <= 1) { box.innerHTML = '<div class="pie-note">当前「' + (state.resScope) + '·' + state.resKind + '」共 1 类方向，无需分布图。</div>'; return; }
    var total = list.length, start = -Math.PI / 2, cx = 100, cy = 100, R = 82, r0 = 44;
    var svg = '<svg width="200" height="200" viewBox="0 0 200 200" class="pie-svg">';
    var legend = "";
    cats.forEach(function (c, i) {
      var val = counts[c], ang = val / total * Math.PI * 2, end = start + ang, large = ang > Math.PI ? 1 : 0;
      var x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
      var x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end);
      var xi = cx + r0 * Math.cos(start), yi = cy + r0 * Math.sin(start);
      var xj = cx + r0 * Math.cos(end), yj = cy + r0 * Math.sin(end);
      var on = state.resCat === c, col = PIE_COLORS[i % PIE_COLORS.length];
      svg += '<path d="M' + x1 + ' ' + y1 + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 +
        ' L' + xj + ' ' + yj + ' A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + xi + ' ' + yi + ' Z" fill="' + col +
        '" stroke="#fff" stroke-width="2" class="pie-slice" data-cat="' + esc(c) + '" style="cursor:pointer;opacity:' + (on ? 1 : (state.resCat ? .45 : .9)) + (on ? ';stroke:#2a1a0c;stroke-width:3' : '') + '"/>';
      start = end;
      legend += '<span class="pie-leg" data-cat="' + esc(c) + '" style="cursor:pointer' + (on ? ';font-weight:bold' : '') + '"><i style="background:' + col + '"></i>' + esc(c) + ' <b>' + val + '</b></span>';
    });
    svg += '<text x="' + cx + '" y="' + (cy - 3) + '" text-anchor="middle" style="font-size:15px;font-weight:bold;fill:#3b2412">' + total + '</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 13) + '" text-anchor="middle" style="font-size:9px;fill:#6d4a2a">条方向</text>';
    svg += '</svg>';
    box.innerHTML = '<div class="pie-wrap"><div class="pie-chart">' + svg + '</div>' +
      '<div class="pie-side"><div class="pie-cap">' + (state.resScope === "国内" ? "🇨🇳 国内" : "🌍 国际") + '·' + state.resKind + ' 主题分布</div>' +
      '<div class="pie-legend">' + legend + '</div>' +
      (state.resCat ? '<button class="btn sm" id="pieReset">✕ 取消「' + esc(state.resCat) + '」筛选</button>'
        : '<div class="pie-tip">点饼图 / 图例可只看某类</div>') + '</div></div>';
    box.querySelectorAll("[data-cat]").forEach(function (el) {
      el.addEventListener("click", function () {
        var c = el.dataset.cat;
        state.resCat = (state.resCat === c) ? null : c;
        renderRes(); beep(760, .05);
      });
    });
    var pr = $("#pieReset"); if (pr) pr.addEventListener("click", function () { state.resCat = null; renderRes(); });
  }
  function renderRes() {
    var list = RES.filter(function (r) {
      return r.kind === state.resKind && r.scope === state.resScope;
    });
    $("#resCount").textContent = (state.resScope === "国内" ? "国内" : "国际") + " · " + state.resKind + " 共 " + list.length + " 条";
    var view = state.resCat ? list.filter(function (r) { return resCat(r) === state.resCat; }) : list;
    $("#resGrid").innerHTML = view.length ? view.map(resCard).join("") :
      '<div class="px" style="padding:26px;text-align:center;color:#6d4a2a">这块地还没种东西 —— 换个方向或地区看看。</div>';
    renderResPie(list);
  }

  /* ---------- 思维导图弹窗（点击快速看完） ---------- */
  function openResMind(id) {
    var r = RES.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    var branches = [
      { k: "🔥 为什么 2026 火", v: r.hot, c: "#c4442e" },
      { k: "📌 去哪发 / 去哪申", v: r.where, c: "#3a7ca5" },
      { k: "🌍 地区", v: r.region || "—", c: "#4f9d3a" },
      { k: "🏷️ 关键词", v: (r.tags || []).join("、"), c: "#e0a52e" },
      { k: "🔗 来源", v: (r.source || "") + (r.url ? " · " + r.url : ""), c: "#8a5fb0" }
    ];
    var W = 680, rh = 56, gap = 14, top = 16;
    var H = top + branches.length * (rh + gap) + 6;
    var rx = 24, rw = 280, bx = 360, bw = 300;
    var rootH = branches.length * (rh + gap) - gap;
    var svg = '<svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" class="mm-svg" preserveAspectRatio="xMidYMid meet">';
    svg += '<rect x="' + rx + '" y="' + top + '" width="' + rw + '" height="' + rootH + '" rx="10" fill="#fff3d6" stroke="#7a5230" stroke-width="3"/>';
    svg += '<text x="' + (rx + rw / 2) + '" y="' + (top + 26) + '" text-anchor="middle" style="font-size:14px;font-weight:bold;fill:#3b2412">🧠 核心主题</text>';
    svg += '<text x="' + (rx + rw / 2) + '" y="' + (top + 48) + '" text-anchor="middle" style="font-size:12px;fill:#5a3a1c">' + esc(r.kind) + " · " + esc(r.scope) + '</text>';
    var ts = r.title.length > 16 ? r.title.slice(0, 16) + "…" : r.title;
    svg += '<text x="' + (rx + rw / 2) + '" y="' + (top + 70) + '" text-anchor="middle" style="font-size:11px;fill:#6d4a2a">' + esc(ts) + '</text>';
    svg += '<text x="' + (rx + rw / 2) + '" y="' + (top + 90) + '" text-anchor="middle" style="font-size:9px;fill:#9a7b50">' + esc(r.region || "") + '</text>';
    svg += '<text x="' + (rx + rw / 2) + '" y="' + (top + rootH - 14) + '" text-anchor="middle" style="font-size:10px;fill:#7a5230">类别：' + esc(resCat(r)) + '</text>';
    branches.forEach(function (br, i) {
      var y = top + i * (rh + gap), my = y + rh / 2;
      svg += '<path d="M' + (rx + rw) + ' ' + my + ' C ' + (rx + rw + 45) + ' ' + my + ' ' + (bx - 45) + ' ' + my + ' ' + bx + ' ' + my + '" stroke="#b8936a" stroke-width="3" fill="none"/>';
      svg += '<circle cx="' + (rx + rw) + '" cy="' + my + '" r="4" fill="#b8936a"/>';
      svg += '<rect x="' + bx + '" y="' + y + '" width="' + bw + '" height="' + rh + '" rx="9" fill="#ffffff" stroke="' + br.c + '" stroke-width="3"/>';
      svg += '<text x="' + (bx + 12) + '" y="' + (y + 21) + '" style="font-size:11px;font-weight:bold;fill:' + br.c + '">' + esc(br.k) + '</text>';
      var vv = br.v || ""; if (vv.length > 32) vv = vv.slice(0, 32) + "…";
      svg += '<text x="' + (bx + 12) + '" y="' + (y + 40) + '" style="font-size:10px;fill:#5a3a1c">' + esc(vv) + '</text>';
    });
    svg += '</svg>';
    var b = $("#mResMindBody");
    b.innerHTML = '<button class="btn sm close" data-close>关闭</button>' +
      '<h2 style="margin:6px 0 2px">🧠 思维导图 · ' + esc(r.title) + '</h2>' +
      '<div class="mini" style="margin-bottom:8px">一眼看完：这张图把「为什么火 / 去哪发 / 地区 / 关键词 / 来源」五条枝干拉出来，下面附全文。</div>' +
      '<div class="mm-chart">' + svg + '</div>' +
      '<div class="mm-full">' +
      (r.deadline ? '<div class="sec"><div class="mini"><b>⏰ 截稿：</b>' + esc(r.deadline) + '</div></div>' : '') +
      '<div class="sec"><div class="mini"><b>🔥 为什么 2026 火：</b><br>' + esc(r.hot) + '</div></div>' +
      '<div class="sec"><div class="mini"><b>📌 去哪发 / 去哪申：</b><br>' + esc(r.where) + '</div></div>' +
      '<div class="sec"><div class="mini"><b>🔗 来源：</b><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.source || r.url) + ' ↗</a></div></div>' +
      '</div>';
    $("#mResMind").classList.add("on"); beep(880, .05);
  }

  /* ---------- GitHub 开源工具箱 ---------- */
  function toolCard(t) {
    return '<div class="card tool" data-id="' + esc(t.id) + '">' +
      '<div class="ct"><span class="badge b-star">★ ' + esc(t.star) + "</span>" +
      '<span class="badge b-lang">' + esc(t.lang) + "</span></div>" +
      '<div class="cn">' + esc(t.name) + "</div>" +
      '<div class="sec" style="margin:6px 0"><div class="mini">' + esc(t.desc) + "</div></div>" +
      '<div class="sec" style="margin:6px 0;background:#fff7e6"><div class="mini"><b>🎨 对你有用：</b>' + esc(t.use) + "</div></div>" +
      '<div class="ct" style="margin-top:6px"><a class="badge b-link" href="' + esc(t.url) + '" target="_blank" rel="noopener">GitHub ↗</a></div>' +
      "</div>";
  }
  function renderTools() {
    $("#toolsCount").textContent = "共 " + TOOLS.length + " 个开源工具";
    $("#toolsGrid").innerHTML = TOOLS.map(toolCard).join("");
  }

  /* ---------- 评审专家 / 关键人物 ---------- */
  function peopleCard(p) {
    var known = p.known ? '<span class="badge" style="background:#c4442e">你点名的</span>' : "";
    var tags = (p.tags || []).map(function (t) { return '<span class="tag sm">' + esc(t) + "</span>"; }).join("");
    return '<div class="card people" data-id="' + esc(p.id) + '">' +
      '<div class="ct"><span class="badge b-kind">' + esc(p.role) + "</span>" + known + "</div>" +
      '<div class="cn">' + esc(p.name) + '　<span class="mini">' + esc(p.title) + "</span></div>" +
      '<div class="mini" style="margin:4px 0"><b>机构：</b>' + esc(p.org || "—") + "</div>" +
      '<div class="sec" style="margin:6px 0"><div class="mini"><b>🔬 研究方向：</b><br>' + esc(p.focus) + "</div></div>" +
      '<div class="sec" style="margin:6px 0"><div class="mini"><b>📰 2025–2026 最新动态：</b><br>' + esc(p.recent) + "</div></div>" +
      '<div class="sec" style="margin:6px 0;background:#fff6e0;border-color:#e7b94e"><div class="mini"><b>🎯 为什么盯他：</b><br>' + esc(p.why) + "</div></div>" +
      '<div class="tags">' + tags + "</div>" +
      (p.url ? '<div class="ct" style="margin-top:6px"><a class="badge b-link" href="' + esc(p.url) + '" target="_blank" rel="noopener">官网 / 主页 ↗</a></div>' : "") +
      "</div>";
  }
  function renderPeople() {
    var knownN = PEOPLE.filter(function (p) { return p.known; }).length;
    $("#peopleCount").textContent = "共 " + PEOPLE.length + " 位 · 你点名 " + knownN + " 位";
    $("#peopleGrid").innerHTML = PEOPLE.map(peopleCard).join("");
  }

  function setMode(mode) {
    state.mode = mode;
    $$("#modeTabs .tab").forEach(function (x) { x.classList.remove("on"); });
    $("#modeTabs .tab[data-mode='" + mode + "']").classList.add("on");
    if (mode === "tch") { state.aud = "教师"; $("#tabs").style.display = ""; }
    else if (mode === "stu") { state.aud = "学生"; $("#tabs").style.display = ""; }
    else { $("#tabs").style.display = "none"; }
    updateRecBtn();
    render(); beep(760, .05);
  }
  function updateRecBtn() {
    var b = $("#btnRec");
    if (!b) return;
    var show = (state.mode === "tch" || state.mode === "stu");
    b.style.display = show ? "" : "none";
    b.classList.toggle("on", state.rec);
    b.textContent = "⭐ 只看「建议参加」";
  }

  /* ---------- 我的资料 / 设置 ---------- */
  function fld(label, id, val) {
    return '<div class="fld"><label>' + label + '</label><input id="' + id + '" value="' + esc(val || "") + '"></div>';
  }
  function loadSet() {
    return load(LS.settings, { name: "", school: "航瑞中学", grade: "", subject: "美术", phone: "", mail: "", sign: "", recvMail: "", submails: "", updateUrl: "" });
  }
  function parseSubmails(txt) {
    var o = {}; (txt || "").split(/\n|；|;|，|,/).forEach(function (l) {
      var i = l.indexOf("="); if (i > 0) { var k = l.slice(0, i).trim(), v = l.slice(i + 1).trim(); if (k && v) o[k] = v; }
    }); return o;
  }
  function resolveRecv(a) {
    var s = loadSet(); var map = parseSubmails(s.submails);
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) { if ((a.name + (a.short || "")).indexOf(keys[i]) >= 0) return map[keys[i]]; }
    return s.recvMail || "";
  }
  function mailtoURL(to, subj, body) {
    return "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body);
  }
  function openSettings() {
    var s = loadSet();
    var h = '<button class="btn sm close" data-close>关闭</button><h2>我的资料 · 常用信息</h2>';
    h += '<div class="mini" style="margin-top:4px">这些信息只存在你这台设备的浏览器里，不会上传。填一次，以后「投稿包 / 通知 / 发邮箱」都自动带出。</div>';
    h += '<div class="sec"><h5>① 基本资料</h5><div class="grid2">' +
      fld("姓名", "sName", s.name) + fld("学校", "sSchool", s.school) +
      fld("所教年级", "sGrade", s.grade) + fld("学科", "sSubject", s.subject) +
      fld("手机", "sPhone", s.phone) + fld("我的邮箱（发件人）", "sMail", s.mail) +
      '</div></div>';
    h += '<div class="sec"><h5>② 一键发邮箱 · 默认收件邮箱</h5><div class="grid2">' + fld("默认收件邮箱", "sRecv", s.recvMail) + '</div>' +
      '<div class="mini" style="margin-top:6px">常用投稿邮箱（每行一个：<b>赛事关键词=邮箱</b>，生成投稿邮件时自动匹配该赛事，例：<br>绘画书法=art@school.edu.cn　希望颂=xx@163.com）</div>' +
      '<textarea id="sSub" style="margin-top:6px" placeholder="绘画书法=art@school.edu.cn\n希望颂=xx@163.com">' + esc(s.submails) + '</textarea></div>';
    h += '<div class="sec"><h5>③ 个人落款 / 签名</h5><textarea id="sSign" placeholder="如：航瑞中学 美术组 刘XX">' + esc(s.sign || "") + '</textarea></div>';
    h += '<div class="sec"><h5>④ 自动更新 · 远程数据地址（可选）</h5>' +
      fld("远程 data.js 地址", "sUpd", s.updateUrl) +
      '<div class="mini" style="margin-top:6px">留空＝离线版，点「刷新」只重排本地数据。填一个网上能访问的 <b>data.js</b> 地址后，点「刷新」会自动拉取新数据（新赛事 / 政策变动）；版本不变则提示「已是最新」。想让我每周帮你刷新两次，就在微信里喊我一声，我重新检索后把新 data.js 发你替换即可。</div></div>';
    h += '<div class="sec"><div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn green" id="sSave">保存资料</button>' +
      '<button class="btn blue" id="sExp">备份全部配置</button>' +
      '<button class="btn" id="sImpBtn">恢复配置</button>' +
      '<input type="file" id="sImp" accept=".json" style="display:none">' +
      '</div><div class="mini" style="margin-top:7px">备份会把「我的资料 + 战绩本 + 勾选进度 + 自建赛事」打成一个 JSON，换电脑或清缓存前导出带走。恢复会覆盖当前本机数据。</div></div>';
    $("#settingsBody").innerHTML = h;
    $("#mSettings").classList.add("on");
    $("#sSave").addEventListener("click", function () {
      var ns = { name: $("#sName").value.trim(), school: $("#sSchool").value.trim(), grade: $("#sGrade").value.trim(), subject: $("#sSubject").value.trim(), phone: $("#sPhone").value.trim(), mail: $("#sMail").value.trim(), recvMail: $("#sRecv").value.trim(), submails: $("#sSub").value, sign: $("#sSign").value.trim(), updateUrl: $("#sUpd").value.trim() };
      save(LS.settings, ns);
      var p = load(LS.prof, {}); p.name = ns.name; p.school = ns.school; p.subject = ns.subject; p.phone = ns.phone; p.mail = ns.mail; save(LS.prof, p);
      toast("资料已保存"); beep(1046, .08); openSettings();
    });
    $("#sExp").addEventListener("click", backupAll);
    $("#sImpBtn").addEventListener("click", function () { $("#sImp").click(); });
    $("#sImp").addEventListener("change", function (e) { restoreAll(e); });
  }
  function backupAll() {
    var data = { prof: load(LS.prof, {}), chk: load(LS.chk, {}), mine: load(LS.mine, []), custom: load(LS.custom, []), settings: loadSet() };
    var b = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    var u = URL.createObjectURL(b), el = document.createElement("a");
    el.href = u; el.download = "星露奖杯农场_配置备份_" + new Date().toISOString().slice(0, 10) + ".json"; el.click(); URL.revokeObjectURL(u);
    beep(880, .08); toast("已导出备份");
  }
  function restoreAll(e) {
    var f = e.target.files[0]; if (!f) return; var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (d.prof) save(LS.prof, d.prof); if (d.chk) save(LS.chk, d.chk);
        if (d.mine) save(LS.mine, d.mine); if (d.custom) save(LS.custom, d.custom); if (d.settings) save(LS.settings, d.settings);
        toast("已恢复，正在刷新"); setTimeout(function () { location.reload(); }, 700);
      } catch (err) { toast("恢复失败：" + err.message); }
    };
    r.readAsText(f, "utf-8");
  }
  function sendPackEmail(a) {
    var s = loadSet(); var to = resolveRecv(a);
    if (!$("#outBox") || $("#outBox").textContent.indexOf("投稿材料包") < 0) buildPack(a);
    if (!to) { toast("先在「我的资料」填收件邮箱或投稿邮箱"); openSettings(); return; }
    var subj = "[赛事报名] " + a.name + " - " + (prof.school || "") + " - " + (prof.name || "");
    var body = ($("#outBox") ? $("#outBox").textContent : "");
    window.location.href = mailtoURL(to, subj, body); beep(880, .08);
  }
  function sendNoticeEmail(N, a) {
    var s = loadSet(); var to = s.recvMail;
    if (!to) { toast("先在「我的资料」填默认收件邮箱"); openSettings(); return; }
    var subj = "[参赛通知] " + a.name + " - " + (s.school || "");
    window.location.href = mailtoURL(to, subj, N.join("\n")); beep(880, .08);
  }

  /* ---------- 侧栏 ---------- */
  function renderSide() {
    var S = typeof SCHOOL_STATS !== "undefined" ? SCHOOL_STATS : null;
    if (S) {
      var h = '<div style="margin-bottom:6px"><b>' + esc(S.school) + "</b> · " + esc(S.year.split("（")[0]) + "</div>";
      h += '<div class="stat-line"><span>个人赛事获奖总数</span><span>' + S.total + " 条</span></div>";
      S.byOrg.slice(0, 4).forEach(function (o) {
        h += '<div class="stat-line"><span>' + esc(o.org.replace("深圳市", "").replace("广东省", "省")) + "</span><span>" + o.n + " 条</span></div>";
      });
      h += '<div style="margin-top:7px;font-size:11px;color:#6d4a2a;border-top:3px dashed #e2c489;padding-top:6px">结论：<b>区教科院 + 区教育局</b>占了 ' +
        Math.round((S.byOrg[0].n + S.byOrg[1].n) / S.total * 100) + "% 的获奖，先把这两家的赛事打满，再谈省市。</div>";
      $("#sideStats").innerHTML = h;

      var top = ALL.filter(function (a) { return (a.schoolProof && a.schoolProof.count) > 0 && (a.tier === "市" || a.tier === "区"); })
        .sort(function (x, y) { return y.schoolProof.count - x.schoolProof.count; }).slice(0, 3);
      $("#sideTop").innerHTML = "<ol style='margin-left:16px'>" + top.map(function (a) {
        return "<li style='margin-bottom:5px'><a href='#' data-jump='" + esc(a.id) + "' style='color:#6b4423;text-decoration:underline'>" + esc(a.short || a.name) + "</a><br><span style='color:#6d4a2a'>本校 " + a.schoolProof.count + " 人次 · " + statusOf(a).text + "</span></li>";
      }).join("") + "</ol>";
    }

    var soon = ALL.map(function (a) { return { a: a, d: daysTo(a.deadline) }; })
      .filter(function (x) { return x.d != null && x.d > 0 && x.d <= 120; })
      .sort(function (x, y) { return x.d - y.d; }).slice(0, 3);
    $("#sideTodo").innerHTML = soon.length ? soon.map(function (x) {
      return '<div style="margin-bottom:6px"><b style="color:' + (x.d <= 30 ? "#c4442e" : "#4f9d3a") + '">T-' + x.d + "</b> " +
        esc(x.a.short || x.a.name) + '<br><span style="color:#6d4a2a">该准备：' + esc((x.a.materials || [])[0] || "查看详情") + "</span></div>";
    }).join("") + '<div style="font-size:11px;color:#6d4a2a;margin-top:4px">建议：先做材料齐全的那条，别同时开三个坑。</div>'
      : '<div class="mini">近期没有临近截稿的赛事，适合攒素材、练命题创作。</div>';
  }

  /* ---------- 详情 ---------- */
  function openDetail(id) {
    var a = ALL.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    var st = statusOf(a);
    var d = daysTo(a.deadline);
    var h = '<button class="btn sm close" data-close>关闭</button>';
    h += "<h2>" + esc(a.name) + "</h2>";
    h += '<div style="margin-top:6px" class="meta">' +
      '<span class="badge ' + (TIER_CLS[a.tier] || "") + '" style="display:inline-block">' + (TIER_TXT[a.tier] || a.tier) + "</span> " +
      "<span>截稿 <b>" + fmtDate(a.deadline) + "</b>　" + esc(a.deadlineNote || "") + "</span></div>";
    h += '<div class="sec"><h5>赛事档案</h5><div class="mini">' +
      "<div><b>主办单位：</b>" + esc(a.org) + "（" + esc(a.orgType || "") + "）</div>" +
      "<div><b>学科范围：</b>" + esc(a.subject) + "</div>" +
      "<div><b>举办周期：</b>" + esc(a.cycle) + "</div>" +
      "<div><b>本轮窗口：</b>" + esc(a.window || "—") + "</div>" +
      "<div><b>当前状态：</b>" + st.text + (d != null && d >= 0 ? "（T-" + d + "）" : "") + "</div>" +
      "</div></div>";
    if (a.schoolProof) {
      h += '<div class="sec"><h5>学校认不认 · 实证</h5><div class="proof" style="border-left-color:#4f9d3a">' +
        "<b>本校上学年 " + (a.schoolProof.count || 0) + " 人次获奖</b><br>最高：" + esc(a.schoolProof.best || "—") +
        "<br><span class='mini'>" + esc(a.schoolProof.note || "") + "</span></div></div>";
    }
    if (a.aud === "学生" && a.rate) {
      var isRec = a.rate.value >= 4 && a.rate.ease >= 4;
      h += '<div class="sec" style="border-left:4px solid ' + (isRec ? "var(--red)" : "var(--wood-dark)") + '"><h5>含金量 & 易参与（广东头部校交叉比对）</h5>' +
        '<div class="mini">这是把深圳/广州/佛山/珠海/中山/惠州/东莞/汕头各校公开喜报比对后给的实战评分，不是拍脑袋。</div>' +
        '<div style="margin:6px 0;display:flex;gap:18px;flex-wrap:wrap">' +
        '<div><b>含金量</b> ' + starHTML(a.rate.value) + ' <span class="mini">' + a.rate.value + "/5</span></div>" +
        '<div><b>好参加</b> ' + starHTML(a.rate.ease) + ' <span class="mini">' + a.rate.ease + "/5</span></div></div>" +
        (isRec ? '<div class="proof" style="border-left-color:var(--red);background:#fff3e0"><b>⭐ 推荐优先冲：</b>含金量高、又比较好参加，普通老师最容易出成果的线。</div>'
                : '<div class="mini">这条偏「冲含金量」或偏「刷量练手」，按需安排。</div>') +
        "</div>";
    }
    h += '<div class="sec" style="border-left:4px solid var(--red)"><h5>① 硬性要求 · 准备什么（照做别错）</h5><ul>' +
      (a.prep || []).map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul></div>";
    h += '<div class="sec"><h5>② 投稿材料清单（' + (a.materials || []).length + ' 项）</h5><ul>' +
      (a.materials || []).map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul></div>";
    h += '<div class="sec" style="border-left:4px solid var(--gold)"><h5>③ 好入选 · 避坑实战（来自真实投稿经验）</h5><ul>' +
      (a.win || []).map(function (m) { return '<li class="tip">' + esc(m) + "</li>"; }).join("") + "</ul></div>";

    if (a.portal) {
      var portalUrl = /^https?:\/\//.test(a.portal) ? a.portal : "";
      h += '<div class="sec"><h5>官方投稿 / 报送入口</h5>' +
        '<div class="mini" style="margin-bottom:6px">' + esc(a.portal) + "</div>" +
        (portalUrl ? '<a class="btn blue" href="' + esc(portalUrl) + '" target="_blank" rel="noopener">🔗 打开官方入口</a>' : '<span class="mini">（需在平台内登录，无公开直链）</span>') +
        "</div>";
    }
    if (a.steps && a.steps.length) {
      h += '<div class="sec"><h5>提交步骤（本站替你梳理）</h5><ol class="steps">' +
        a.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" +
        '<div class="note">⚠ 政府 / 教育平台需你<b>本人账号登录 + 短信验证</b>，我无法替你点最后一步「提交」。但前面所有材料、填表、命名、倒排计划都已备好，你登录后按步骤点几下即可交。</div></div>';
    }
    h += '<div class="sec" style="border-left:4px solid var(--blue)"><h5>📦 一键投稿包预览（已按你的资料生成，点开即所见）</h5>' +
      '<pre class="out" style="white-space:pre-wrap;max-height:200px;overflow:auto;font-size:11px">' + esc(packText(a)) + '</pre>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">' +
      '<button class="btn green sm" id="dtCopy">复制投稿包</button>' +
      '<button class="btn blue sm" id="dtMail">📧 发到投稿邮箱（点一下就打开邮件）</button>' +
      '</div></div>';
    h += '<div class="sec" style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn green" data-act="submit" data-id="' + esc(a.id) + '">打开完整投稿工作台</button>' +
      '<button class="btn gold" data-act="track" data-id="' + esc(a.id) + '">加入我的赛程</button>' +
      (a.url ? '<a class="btn blue" href="' + esc(a.url) + '" target="_blank" rel="noopener">主办方官网</a>' : "") +
      "</div>";
    if (a.source) {
      h += '<div class="src">📎 来源：' + esc(a.source) + (a.official ? "（官方通知已核实）" : "（往年常规，本年以待官方为准）") + "</div>";
    }
    $("#detailBody").innerHTML = h;
    if ($("#dtCopy")) $("#dtCopy").addEventListener("click", function () {
      navigator.clipboard.writeText(packText(a)).then(function () { toast("投稿包已复制"); beep(1046, .08); })
        .catch(function () { toast("复制失败，手动选中"); });
    });
    if ($("#dtMail")) $("#dtMail").addEventListener("click", function () { quickMail(a); });
    $("#mDetail").classList.add("on");
    beep(660, .06);
  }

  /* ---------- 投稿向导 ---------- */
  var prof = load(LS.prof, { name: "", school: "航瑞中学", subject: "美术", phone: "", mail: "", edu: "" });
  var checks = load(LS.chk, {});

  /* 按赛事要求 + 用户资料，生成「作品简介 / 申报书草稿」可复制文本 */
  function genArtworkDraft(a) {
    var t = ($("#wTitle") ? $("#wTitle").value.trim() : "");
    var one = ($("#wOne") ? $("#wOne").value.trim() : "");
    var types = typesOf(a);
    var L = [];
    L.push("【作品简介 / 申报书草稿】");
    L.push("");
    L.push("作品名称：" + (t || "（请填写，例：《……》）"));
    L.push("作者：" + (prof.name || "（你的姓名）") + "　单位：" + (prof.school || "（你的学校）") + "　学科：" + (prof.subject || "美术"));
    L.push("参赛类别：" + (types.join("、") || a.subject || "—"));
    L.push("");
    L.push("一、创作说明（300 字内，请用你自己的话改写下面这句）");
    L.push((one || "（在此说明：创作背景、灵感来源、使用的技法与材料、想表达的主题）") + "。");
    L.push("");
    L.push("二、按「" + a.name + "」要求需提交的材料");
    (a.materials || []).forEach(function (m, i) { L.push("　" + (i + 1) + ". " + m); });
    L.push("");
    L.push("三、备注：本草稿由「星露奖杯农场」按该赛事要求自动生成，请用本人真实创作经历润色后提交，勿照搬模板。");
    return L.join("\n");
  }

  function openSubmit(id) {
    var a = ALL.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    var ck = checks[a.id] || [];
    var missing = !prof.name || !prof.school;
    var h = '<button class="btn sm close" data-close>关闭</button>';
    h += "<h2>投稿工作台 · " + esc(a.short || a.name) + "</h2>";
    h += '<div class="mini" style="margin-top:4px">截稿 ' + fmtDate(a.deadline) + "　" + esc(a.deadlineNote || "") + "</div>";
    if (missing) h += '<div class="note" style="border-color:#c99a17;color:#7a5a10">⚠ 还没填「我的资料」：姓名 / 学校每次都要手填。点 <button class="btn sm" id="goSet">去填一次</button> 之后所有生成自动带出，只输这一次。</div>';

    h += '<div class="sec"><h5>① 申报人信息（只存本机，不上传）</h5><div class="grid2">' +
      '<div class="fld"><label>姓名</label><input id="pName" value="' + esc(prof.name) + '" placeholder="张三"></div>' +
      '<div class="fld"><label>学校</label><input id="pSchool" value="' + esc(prof.school) + '"></div>' +
      '<div class="fld"><label>学科</label><input id="pSubject" value="' + esc(prof.subject) + '"></div>' +
      '<div class="fld"><label>教龄 / 职称</label><input id="pEdu" value="' + esc(prof.edu) + '" placeholder="6 年 / 二级教师"></div>' +
      '<div class="fld"><label>手机</label><input id="pPhone" value="' + esc(prof.phone) + '"></div>' +
      '<div class="fld"><label>邮箱</label><input id="pMail" value="' + esc(prof.mail) + '"></div>' +
      "</div></div>";

    h += '<div class="sec"><h5>② 作品 / 案例信息</h5><div class="grid2">' +
      '<div class="fld" style="grid-column:1/-1"><label>作品标题</label><input id="wTitle" placeholder="例：《一节课看懂八大山人的白眼》美术鉴赏微课"></div>' +
      '<div class="fld" style="grid-column:1/-1"><label>一句话说明（30 字内）</label><input id="wOne" placeholder="例：用 6 分钟带初中生读懂中国画的留白与情绪"></div>' +
      "</div></div>";

    h += '<div class="sec"><h5>③ 材料清单（勾选进度）</h5><div id="ckList">' +
      (a.materials || []).map(function (m, i) {
        return '<label class="chk"><input type="checkbox" data-ci="' + i + '"' + (ck[i] ? " checked" : "") + "><span>" + esc(m) + "</span></label>";
      }).join("") + "</div></div>";

    if (a.portal || (a.steps && a.steps.length)) {
      var pUrl = a.portal && /^https?:\/\//.test(a.portal) ? a.portal : "";
      h += '<div class="sec" style="border-left-color:#3f74b8"><h5>④ 官方投稿入口 & 提交步骤</h5>' +
        (a.portal ? '<div class="mini" style="margin-bottom:6px"><b>入口：</b>' + esc(a.portal) + "</div>" +
          (pUrl ? '<a class="btn blue sm" href="' + esc(pUrl) + '" target="_blank" rel="noopener">🔗 打开官方入口</a>' : '<span class="mini">（需在平台内登录，无公开直链）</span>') + "<br>" : "") +
        (a.steps && a.steps.length ? '<ol class="steps" style="margin-top:6px">' + a.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" : "") +
        '<div class="note">⚠ 政府 / 教育平台需你<b>本人账号登录 + 短信验证</b>，我无法代你点最后一步「提交」。下面生成的投稿包已把前面所有环节备好，你登录后按步骤点几下即可交。</div></div>';
    }

    h += '<div class="sec"><h5>⑤ 智能生成 · 投稿材料</h5>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:7px">' +
      '<button class="btn purple sm" id="btnDraft">🤖 作品简介 / 申报书草稿</button>' +
      '<button class="btn gold sm" id="btnGen">完整投稿包</button>' +
      '<button class="btn green sm" id="btnCopy">复制全文</button>' +
      '<button class="btn blue sm" id="btnDl">下载 .txt</button>' +
      '<button class="btn purple sm" id="btnMail">📧 发到投稿邮箱</button>' +
      '<button class="btn sm" id="btnIcs">加入手机日历</button>' +
      '<button class="btn sm" id="btnPrint">打印</button>' +
      "</div>" +
      '<pre class="out" id="outBox">点「🤖 作品简介 / 申报书草稿」按本赛事要求自动生成可复制的简介；或填好上面信息点「完整投稿包」。</pre></div>';

    $("#submitBody").innerHTML = h;
    $("#mSubmit").classList.add("on");
    $("#mSubmit").dataset.aid = a.id;

    $$("#ckList input").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var arr = []; $$("#ckList input").forEach(function (x) { arr[+x.dataset.ci] = x.checked; });
        checks[a.id] = arr; save(LS.chk, checks); beep(cb.checked ? 880 : 440, .05);
      });
    });
    $("#btnGen").addEventListener("click", function () { buildPack(a); });
    $("#btnDraft").addEventListener("click", function () {
      $("#outBox").textContent = genArtworkDraft(a); beep(1046, .08); toast("已生成作品简介草稿，去复制润色");
    });
    if ($("#goSet")) $("#goSet").addEventListener("click", function () { openSettings(); });
    $("#btnCopy").addEventListener("click", function () {
      var t = $("#outBox").textContent;
      navigator.clipboard.writeText(t).then(function () { toast("已复制，去粘进申报表吧"); beep(1046, .08); })
        .catch(function () { toast("复制失败，手动选中复制"); });
    });
    $("#btnDl").addEventListener("click", function () {
      var t = $("#outBox").textContent;
      var b = new Blob([t], { type: "text/plain;charset=utf-8" });
      var u = URL.createObjectURL(b), el = document.createElement("a");
      el.href = u; el.download = (prof.name || "投稿") + "_" + (a.short || a.name) + "_投稿包.txt";
      el.click(); URL.revokeObjectURL(u); beep(880, .08);
    });
    $("#btnPrint").addEventListener("click", function () { window.print(); });
    $("#btnIcs").addEventListener("click", function () { downloadICS(a); });
    $("#btnMail").addEventListener("click", function () { sendPackEmail(a); });
    beep(700, .07);
  }

  /* ---------- 学生参赛通知 ---------- */
  function openNotice(id) {
    var a = ALL.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    var d = daysTo(a.deadline);
    var pUrl = a.portal && /^https?:\/\//.test(a.portal) ? a.portal : "";

    var N = [];
    N.push("【" + a.name + "】参赛通知");
    N.push("");
    N.push("各位家长、同学：");
    N.push("我校将组织学生参加「" + a.name + "」（主办：" + a.org + "，级别：" + (TIER_TXT[a.tier] || a.tier) + "）。欢迎同学们积极投稿，老师将统一指导、择优报送。");
    N.push("");
    N.push("📌 参赛对象：" + (/白名单|中小/.test(a.orgType + a.org) ? "全国 / 全省中小学生（分小学、初中、高中组）" : "本校在校学生"));
    N.push("📌 作品类别：" + (a.subject.split("·")[0] || "绘画 / 书法 / 摄影"));
    N.push("📌 截稿时间：" + fmtDate(a.deadline) + (d != null && d > 0 ? ("（还剩 " + d + " 天）") : ""));
    N.push("📌 报名 / 提交方式：" + (a.portal || "由学校统一组织报名（详见下方）"));
    N.push("");
    N.push("📎 需要交的材料：");
    (a.materials || []).forEach(function (m, i) { N.push("　" + (i + 1) + ". " + m); });
    N.push("");
    N.push("⚠️ 重要提醒：");
    N.push("　▸ 作品须学生本人原创，禁止代笔，初评会查重；");
    N.push("　▸ 请于截稿前至少 3 天把作品交给指导老师，留出盖章、扫描、上传时间；");
    N.push("　▸ 作品卡上的「创作说明」请写学生自己想说的话。");
    N.push("");
    N.push("指导教师：" + (prof.school || "本校") + "　（联系方式见班级群）");
    N.push("—— 本通知由「星露奖杯农场」一键生成");

    var h = '<button class="btn sm close" data-close>关闭</button>';
    h += "<h2>学生参赛通知 · " + esc(a.short || a.name) + "</h2>";
    h += '<div class="mini" style="margin-top:4px">面向<b>中小学生</b>的赛事：学生创作，你作为<b>指导教师</b>拿指导奖。下面这份可直接发班级群 / 家长群。</div>';
    h += '<div class="sec"><h5>① 可直接发的通知</h5><div class="notice-box" id="noticeText">' + esc(N.join("\n")) + "</div>" +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:7px">' +
      '<button class="btn gold sm" id="btnCopyNotice">复制通知</button>' +
      '<button class="btn blue sm" id="btnDlNotice">下载 .txt</button>' +
      '<button class="btn purple sm" id="btnMailNotice">📧 发通知到邮箱</button>' +
      '<button class="btn sm" id="btnPrintNotice">打印</button>' +
      (pUrl ? '<a class="btn green sm" href="' + esc(pUrl) + '" target="_blank" rel="noopener">🔗 打开报名入口</a>' : "") +
      (a.url ? '<a class="btn blue sm" href="' + esc(a.url) + '" target="_blank" rel="noopener">看主办方官网</a>' : "") +
      "</div></div>";
    h += '<div class="sec" style="border-left-color:#8b4fa8"><h5>② 老师这边要做的（指导 / 报送）</h5><ol class="steps">' +
      (a.steps && a.steps.length ? a.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") :
        "<li>关注学校 / 区教育局转发通知，争取集体报名名额</li><li>收学生原作 + 报名表 + 作品卡，学校汇总盖章</li><li>按官方通道报送，截图留存回执</li>") +
      "</ol>" +
      (a.tips && a.tips.length ? '<div class="mini" style="margin-top:6px"><b>拿奖要点：</b><br>' + a.tips.map(function (t) { return "· " + esc(t); }).join("<br>") + "</div>" : "") +
      "</div>";
    if (a.source) h += '<div class="src">📌 来源：' + esc(a.source) + (a.official ? "（本周期官方通知已检索到）" : "（往年常规，本年官方通知待查）") + "</div>";

    $("#noticeBody").innerHTML = h;
    $("#mNotice").classList.add("on");

    $("#btnCopyNotice").addEventListener("click", function () {
      navigator.clipboard.writeText(N.join("\n")).then(function () { toast("已复制，去粘到班级群"); beep(1046, .08); })
        .catch(function () { toast("复制失败，手动选中复制"); });
    });
    $("#btnDlNotice").addEventListener("click", function () {
      var b = new Blob([N.join("\n")], { type: "text/plain;charset=utf-8" });
      var u = URL.createObjectURL(b), el = document.createElement("a");
      el.href = u; el.download = (a.short || a.name).replace(/[\/\\:*?"<>|]/g, "") + "_学生参赛通知.txt";
      el.click(); URL.revokeObjectURL(u); beep(880, .08);
    });
    $("#btnPrintNotice").addEventListener("click", function () { window.print(); });
    $("#btnMailNotice").addEventListener("click", function () { sendNoticeEmail(N, a); });
    beep(700, .07);
  }

  /* ---------- 评深圳高级教师 · 硬标准 ---------- */
  function openSenior() {
    var h = '<button class="btn sm close" data-close>关闭</button>';
    h += "<h2>深圳市中小学教师高级职称（副高）· 评审硬标准</h2>";
    h += '<div class="mini" style="margin-top:4px">一份通用清单，依据《广东省中小学教师职称评价标准》及深圳市近年评审口径整理，供规划参考；具体以当年深圳市人社局 / 教育局发布的评审通知为准。</div>';

    h += '<div class="sen-sec">一、基础门槛（缺一不可）</div>';
    h += '<ul class="sen-list">' +
      '<li><b>学历资历：</b>本科及以上 + 取得一级（中级）职称满 5 年（博士满 2 年；专科累计 15 年 / 中师 20 年且一级岗满 5 年）</li>' +
      '<li><b>师德：</b>近 5 年师德考核合格及以上、无处分；近 5 年年度考核至少 2 次「优秀」</li>' +
      '<li><b>继续教育：</b>近 5 年累计 450 学时（公需课 180 + 专业课 270），广东省继续教育系统可查核验</li>' +
      '<li><b>教学经历：</b>连续从事教育教学工作满 5 年</li>' +
      '<li><b>支教（硬门槛）：</b>城镇教师须有 1 年以上薄弱学校 / 农村学校任教经历（50 岁以上可免）</li>' +
      '<li><b>班主任：</b>任现职以来班主任 3 年以上（或等同的德育 / 教研管理经历）</li>' +
      '</ul>';

    h += '<div class="sen-sec">二、业绩材料（核心加分，和打比赛直接相关）</div>';
    h += '<ul class="sen-list">' +
      '<li><b>公开课：</b>任现职以来区级及以上公开课 / 示范课 ≥ 3 节（附教案、课件、听课记录、现场照片 / 视频）</li>' +
      '<li><b>教学竞赛获奖：</b>区级二等奖及以上（市级、省级优先）</li>' +
      '<li><b>育人成果：</b>班主任证明 + 指导学生竞赛获奖（指导教师署名）+ 优秀班主任等荣誉</li>' +
      '<li><b>课题研究：</b>主持市级及以上课题 1 项（或核心参与省级）；区级课题可作辅助</li>' +
      '<li><b>论文：</b>独立或第一作者 2 篇（至少 1 篇 CN / 核心期刊）；查重率低于 20%</li>' +
      '<li><b>荣誉表彰：</b>区级以上优秀教师 / 教学能手 / 学科带头人 / 教研先进个人</li>' +
      '</ul>';

    h += '<div class="sen-sec">三、一年时间轴（参考深圳近年节奏）</div>';
    h += '<ul class="sen-list">' +
      '<li><b>5 月中—6 月中：</b>职称系统开放填报，上传电子版材料</li>' +
      '<li><b>6 月下—7 月上：</b>学校初审 → 区级审核 → 评前公示（≥5 个工作日）</li>' +
      '<li><b>7 月中—8 月：</b>评委会复审 + 线上答辩（10 分钟述职 + 5 分钟提问）</li>' +
      '<li><b>9—10 月：</b>评审结果公示 → 下发副高职称证书</li>' +
      '</ul>';

    h += '<div class="sen-sec">四、关键提醒</div>';
    h += '<ul class="sen-list">' +
      '<li>你在本站攒的<b>比赛获奖、指导学生获奖</b>，直接计入「教学业绩」与「育人成果」两大模块——这是性价比最高的业绩积累，建议从一级评完后就按年攒。</li>' +
      '<li>论文务必真实可查，系统联网核验；造假直接取消资格，3 年内不得申报。</li>' +
      '<li>材料按「基础资格 / 教学业绩 / 科研论文 / 荣誉表彰」四类归档，命名：年份 + 类型 + 名称（如「2025-公开课-区级美术优质课」）。</li>' +
      '<li>城镇教师支教 1 年是硬门槛，越早安排越好；50 岁以上可免。</li>' +
      '</ul>';
    h += '<div class="mini" style="margin-top:6px">本面板为通用参考，不含任何个人申报信息；正式申报请以南山区 / 深圳市当年发布的评审工作通知为准。</div>';

    $("#seniorBody").innerHTML = h;
    $("#mSenior").classList.add("on");
    beep(700, .07);
  }

  /* ---------- 学生赛 · 一键生成文案（最近可投，整份导出） ---------- */
  function studentCopyText() {
    var list = ALL.filter(function (a) {
      if (a.aud !== "学生") return false;
      if (a.phase === "已结束") return false;
      var d = daysTo(a.deadline);
      if (a.phase === "待发布" || a.phase === "进行中") return true;
      return d != null && d > 0;
    }).sort(function (x, y) { return (daysTo(x.deadline) == null ? 9999 : daysTo(x.deadline)) - (daysTo(y.deadline) == null ? 9999 : daysTo(y.deadline)); });

    var S = loadSet();
    var sign = (S.sign && S.sign.trim()) || (S.name && S.name.trim()) || "你们的美术老师";
    var L = [];
    L.push("同学们：");
    L.push("");
    L.push("给你们挑了几个最近还能投的美术比赛 👇 都是官方正规赛事，挑感兴趣的课后直接来找我就行，我帮你们统一指导、报送。");
    L.push("");
    L.push("（共 " + list.length + " 项，按截止时间从近到远）");
    L.push("");

    list.forEach(function (a, idx) {
      var d = daysTo(a.deadline);
      var pUrl = a.portal && /^https?:\/\//.test(a.portal) ? a.portal : "";
      L.push("📌 " + (idx + 1) + ". " + a.name + "（" + (TIER_TXT[a.tier] || a.tier) + "）");
      L.push("　🖌 比什么：" + (a.subject || "绘画 / 书法 / 摄影等") + (a.short && a.short !== a.name ? "（" + a.short + "）" : ""));
      L.push("　⏰ 截稿：" + fmtDate(a.deadline) + (d != null && d > 0 ? ("（还剩 " + d + " 天，别拖）") : (d == null ? "（具体时间等官方公布，先准备着）" : "（已经很临近了，想投要抓紧）")));
      L.push("　📮 怎么交：" + (a.portal || "由学校统一组织报名") + "（主办：" + a.org + "）");
      if (pUrl && pUrl !== a.url) L.push("　🔗 投稿入口：" + pUrl);
      else if (a.url) L.push("　🔗 官网：" + a.url);
      if (a.rate && a.rate.value >= 4 && a.rate.ease >= 4) L.push("　💡 老师建议：这项含金量高又好参加，可以优先考虑。");
      else if (a.rate) L.push("　💡 老师建议：含金量 " + a.rate.value + "★ / 好参加 " + a.rate.ease + "★（满分 5），有兴趣就试试。");
      L.push("");
    });

    L.push("⚠️ 几点提醒：");
    L.push("　▸ 作品必须是你自己画的，不能代笔，初评会查重；");
    L.push("　▸ 截稿前至少提前 3 天交给我，好留出盖章、扫描、上传的时间；");
    L.push("　▸ 创作说明写你自己的话，别让家长代写。");
    L.push("");
    L.push("挑好了就告诉我，期待看到你们的作品，加油 🎨");
    L.push("");
    L.push("—— " + sign);
    L.push("（数据 " + DATA_VERSION.split("·")[0].trim() + "）");
    return L.join("\n");
  }

  function openStuCopy() {
    var txt = studentCopyText();
    var h = '<button class="btn sm close" data-close>关闭</button>';
    h += "<h2>🎨 学生赛 · 一键生成文案</h2>";
    h += '<div class="mini" style="margin-top:4px">下面是<b>最近可投</b>的学生官方赛事，已按<b>老师发给学生</b>的通知口吻写好（开头"同学们"、每条"老师提醒"、结尾落款）。点「复制全文」直接发班级群 / 贴公告栏，落款默认用「我的资料」里填的签名。</div>';
    h += '<div class="sec"><h5>① 整份文案（可直接复制 / 下载）</h5>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:7px">' +
      '<button class="btn gold sm" id="btnCopyStu">复制全文</button>' +
      '<button class="btn blue sm" id="btnDlStu">下载 .txt</button>' +
      '<button class="btn purple sm" id="btnMailStu">📧 发到邮箱</button>' +
      '<button class="btn green sm" id="btnPrintStu">打印</button>' +
      "</div>" +
      '<pre class="out" id="stuCopyBox">' + esc(txt) + "</pre></div>";
    h += '<div class="mini">只显示「进行中 / 待发布 / 未截止」的赛事；已结束的不列。想看某条更细的硬性要求，去卡片点「详情」。</div>';
    $("#stuCopyBody").innerHTML = h;
    $("#mStuCopy").classList.add("on");

    $("#btnCopyStu").addEventListener("click", function () {
      var done = function () { toast("已复制，去粘到群里"); beep(1046, .08); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done).catch(function () {
          try { var box = $("#stuCopyBox"); box.focus(); var r = document.createRange(); r.selectNodeContents(box); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand("copy"); s.removeAllRanges(); done(); }
          catch (e) { toast("复制失败，请手动选中文字复制"); }
        });
      } else {
        try { var box = $("#stuCopyBox"); box.focus(); var r = document.createRange(); r.selectNodeContents(box); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand("copy"); s.removeAllRanges(); done(); }
        catch (e) { toast("复制失败，请手动选中文字复制"); }
      }
    });
    $("#btnDlStu").addEventListener("click", function () {
      var b = new Blob([txt], { type: "text/plain;charset=utf-8" });
      var u = URL.createObjectURL(b), el = document.createElement("a");
      el.href = u; el.download = "最近学生可投赛事_文案_" + new Date().toISOString().slice(0, 10) + ".txt";
      el.click(); URL.revokeObjectURL(u); beep(880, .08);
    });
    $("#btnPrintStu").addEventListener("click", function () { window.print(); });
    $("#btnMailStu").addEventListener("click", function () {
      var s = loadSet(); if (!s.recvMail) { toast("先在「我的资料」填默认收件邮箱"); openSettings(); return; }
      var subj = "[学生赛一览] 最近可投官方赛事 · " + (s.school || "");
      window.location.href = mailtoURL(s.recvMail, subj, txt); beep(880, .08);
    });
    beep(700, .07);
  }

  /* ---------- 名校战绩参考（大校视角校正推荐） ---------- */
  var bigCity = "全部";
  function renderBig() {
    var big = BS;
    var cities = ["全部"].concat(Object.keys(big.reduce(function (m, b) { m[b.city] = 1; return m; }, {})).sort());
    var list = bigCity === "全部" ? big : big.filter(function (b) { return b.city === bigCity; });
    var h = '<button class="btn sm close" data-close>关闭</button>';
    h += "<h2>🏫 名校战绩参考 · 广东头部中学在冲什么</h2>";
    h += '<div class="mini" style="margin-top:4px">别只盯咱小学校那点战绩 —— 下面这些广东头部中学（深圳/广州/佛山/珠海/中山/惠州/东莞/汕头）公开喜报里反复出现的赛，才是<b>大校也在冲、学校也认</b>的硬通货。点「看比赛」可跳转该赛事详情。公众号可微信搜索关注。</div>';
    h += '<div class="tabs" id="bigCityTabs" style="margin:8px 0">';
    cities.forEach(function (c) {
      h += '<button class="tab' + (c === bigCity ? " on" : "") + '" data-city="' + esc(c) + '">' + esc(c) + "</button>";
    });
    h += "</div>";
    list.forEach(function (b) {
      h += '<div class="up-block">';
      h += '<div class="up-head"><b>' + esc(b.name) + '</b> <span class="u-tag">' + esc(b.city) + ' · 公众号「' + esc(b.wechat) + '」</span></div>';
      h += '<div class="mini">' + esc(b.tag || "") + "</div>";
      h += '<div class="up-mat">';
      (b.won || []).forEach(function (w) {
        var a = ALL.filter(function (x) { return x.id === w.id; })[0];
        h += '<div style="display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;padding:2px 0">' +
          '<span class="mini" style="flex:1;min-width:200px">' + esc(w.t) + "</span>" +
          (a ? '<button class="btn green sm" data-act="detail" data-id="' + esc(a.id) + '">看比赛</button>' : "") +
          "</div>";
      });
      h += "</div></div>";
    });
    var rec = ALL.filter(function (a) { return a.aud === "学生" && a.rate && a.rate.value >= 4 && a.rate.ease >= 4; });
    h += '<div class="up-block" style="background:#fff3e0;border-color:#e0a85e"><div class="up-head"><b>💡 跨城结论：哪些「含金量高又比较好参加」</b></div>';
    h += '<div class="mini">把广东各校公开喜报交叉比对，规律很清楚 —— <b>国/省白名单赛是「含金量高」的标杆，各市自家书画/书法专项赛是「好参加」的主力</b>。两头都占的推荐线：</div>';
    h += '<div class="up-mat">';
    rec.forEach(function (a) {
      h += '<div style="display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;padding:2px 0">' +
        '<span class="mini" style="flex:1;min-width:200px"><b>' + esc(a.name) + '</b> · 含金量' + a.rate.value + '★ · 好参加' + a.rate.ease + '★（' + (TIER_TXT[a.tier] || a.tier) + '）</span>' +
        '<button class="btn green sm" data-act="detail" data-id="' + esc(a.id) + '">看比赛</button></div>';
    });
    h += "</div>";
    h += '<div class="mini" style="margin-top:4px">普通老师最容易出成果的打法：<b>国/省白名单（希望颂、全国中小学生绘画书法）冲「含金量」+ 本市书画/书法专项赛（羊城美育节/美润鹏城/规范汉字书写/各地书画评选）刷「好参加」的量</b>。三年一届的省艺术展演（含金量顶格但极难）留给尖子。</div>';
    h += "</div>";
    $("#bigBody").innerHTML = h;
  }
  function openBig() {
    bigCity = "全部";
    renderBig();
    $("#mBig").classList.add("on");
    beep(700, .07);
  }

  /* ---------- 日历提醒 ---------- */
  function icsD(d) {
    var p = function (n) { return n < 10 ? "0" + n : "" + n; };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }
  function downloadICS(a) {
    var p = String(a.deadline || "").split("-");
    if (p.length !== 3) { toast("这条还没有确切截止日"); return; }
    var ddl = new Date(+p[0], +p[1] - 1, +p[2]);
    var remind = new Date(ddl.getTime() - 14 * 86400000);
    if (remind.getTime() < Date.now()) remind = new Date(Date.now() + 86400000);
    var end = new Date(remind.getTime() + 86400000);
    var desc = "截稿：" + fmtDate(a.deadline) + "\\n主办：" + a.org + "\\n级别：" + (TIER_TXT[a.tier] || a.tier) +
      "\\n材料：" + (a.materials || []).map(function (m, i) { return (i + 1) + "." + m; }).join("；");
    var ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Stardew Award Farm//CN", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + a.id + "@stardew-award",
      "DTSTAMP:" + icsD(new Date()) + "T000000Z",
      "DTSTART;VALUE=DATE:" + icsD(remind),
      "DTEND;VALUE=DATE:" + icsD(end),
      "SUMMARY:【T-14 备战】" + a.name,
      "DESCRIPTION:" + desc,
      "BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", "DESCRIPTION:还有 7 天截稿", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    var b = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var u = URL.createObjectURL(b), el = document.createElement("a");
    el.href = u; el.download = (a.short || a.name).replace(/[\/\\:*?"<>|]/g, "") + "_截止提醒.ics";
    el.click(); URL.revokeObjectURL(u);
    toast("已生成日历文件，手机上点开即可导入"); beep(980, .09);
  }

  function buildPack(a) {
    prof = {
      name: $("#pName").value.trim(), school: $("#pSchool").value.trim(),
      subject: $("#pSubject").value.trim(), edu: $("#pEdu").value.trim(),
      phone: $("#pPhone").value.trim(), mail: $("#pMail").value.trim()
    };
    save(LS.prof, prof);
    var title = $("#wTitle").value.trim() || "（待填作品标题）";
    var oneRaw = $("#wOne").value.trim();
    var one = oneRaw || "（待填一句话说明）";
    var ck = []; $$("#ckList input").forEach(function (x) { ck[+x.dataset.ci] = x.checked; });
    checks[a.id] = ck; save(LS.chk, checks);
    var d = daysTo(a.deadline);
    var done = ck.filter(Boolean).length, tot = (a.materials || []).length;

    var L = [];
    L.push("【投稿材料包】" + a.name);
    L.push("生成时间：" + new Date().toLocaleString("zh-CN"));
    L.push("========================================");
    L.push("");
    L.push("一、赛事信息");
    L.push("　主办单位：" + a.org);
    L.push("　赛事级别：" + (TIER_TXT[a.tier] || a.tier) + "（" + (a.orgType || "") + "）");
    L.push("　学科范围：" + a.subject);
    L.push("　截稿日期：" + fmtDate(a.deadline));
    L.push("　日期说明：" + (a.deadlineNote || "以官方通知为准"));
    L.push("　剩余天数：" + (d == null ? "以通知为准" : (d >= 0 ? "T-" + d + " 天" : "已过期，准备下一轮")));
    L.push("　举办周期：" + a.cycle);
    L.push("　官方入口：" + (a.url || "见主办方通知"));
    L.push("");
    L.push("二、申报人");
    L.push("　姓名：" + (prof.name || "＿＿＿"));
    L.push("　单位：" + (prof.school || "＿＿＿"));
    L.push("　学科：" + (prof.subject || "＿＿＿") + "　　教龄/职称：" + (prof.edu || "＿＿＿"));
    L.push("　联系：" + (prof.phone || "＿＿＿") + "　" + (prof.mail || "＿＿＿"));
    L.push("");
    L.push("三、作品信息");
    L.push("　标题：" + title);
    L.push("　一句话：" + one);
    L.push("");
    L.push("　作品说明（可直接改写后填表，约 400 字）：");
    L.push("　本作品面向" + (prof.subject || "美术") + "学科教学，选题来自课堂真实问题：学生对「" + (oneRaw ? oneRaw.replace(/^例：/, "") : "本课核心知识点") + "」普遍存在理解障碍。");
    L.push("　设计上采用「单点深挖」思路，只解决一个核心问题，用三段式推进：先以真实情境唤起经验，再以对比材料制造认知冲突，最后以任务单推动学生输出可评价的学习成果。");
    L.push("　创新点有三：一是把学科概念转成学生能看见的视觉证据；二是评价前置，任务单即评分表；三是留有可迁移的变式，其他教师可直接改用。");
    L.push("　实施效果以班级前后测与作业样本为证（附后），学生在该知识点上的达成率由＿＿% 提升至＿＿%。");
    L.push("　后续计划：编入校本课程资源包，在科组内做一次公开课推广。");
    L.push("");
    L.push("四、材料清单（已完成 " + done + "/" + tot + "）");
    (a.materials || []).forEach(function (m, i) {
      L.push("　" + (ck[i] ? "[√]" : "[ ]") + " " + (i + 1) + ". " + m);
    });
    L.push("");
    L.push("五、文件命名规范（评审最烦乱命名）");
    L.push("　" + (prof.school || "学校") + "_" + (prof.name || "姓名") + "_" + (a.short || a.name).replace(/[\/\\:*?"<>|]/g, "") + "_作品名.扩展名");
    L.push("　例：" + (prof.school || "航瑞中学") + "_" + (prof.name || "张三") + "_" + (a.short || "赛事").replace(/[\/\\:*?"<>|]/g, "") + "_八大山人鉴赏.mp4");
    L.push("");
    L.push("六、倒排计划");
    L.push("　T-21：定题，写完教学设计初稿");
    L.push("　T-14：录课/拍摄完成，剪出第一版");
    L.push("　T-7 ：请科组长和教研员各看一遍，改第二版");
    L.push("　T-3 ：材料齐套，打印盖章（学校公章要走流程，别卡最后一天）");
    L.push("　T-1 ：上传/报送，截图留存回执");
    L.push("　T+0 ：在本站「我的赛程」里标记为「已投稿」");
    L.push("");
    L.push("七、评委视角提醒");
    (a.tips || []).forEach(function (t, i) { L.push("　" + (i + 1) + ". " + t); });
    L.push("");
    L.push("八、官方投稿入口与提交步骤");
    L.push("　官方入口：" + (a.portal || "见主办方通知"));
    if (a.steps && a.steps.length) {
      a.steps.forEach(function (s, i) { L.push("　步骤 " + (i + 1) + "：" + s); });
    }
    L.push("　⚠ 政府 / 教育平台需本人账号登录 + 短信验证，本工具无法代点最后一步「提交」；");
    L.push("　　 但以上材料、填表、命名、倒排计划均已备好，登录后按步骤点几下即可交。");
    L.push("");
    L.push("----------------------------------------");
    L.push("数据来源：" + (a.source || "主办方通知"));
    L.push(a.official ? "（本周期官方通知已检索到真实出处）" : "（往年常规举办，本年官方通知以主办方最新发布为准）");

    $("#outBox").textContent = L.join("\n");
    beep(1200, .06);
  }

  /* ---------- 我的赛程 ---------- */
  function openMine() {
    var mine = load(LS.mine, []);
    var h = '<button class="btn sm close" data-close>关闭</button><h2>我的战绩本</h2>';
    h += '<div class="mini" style="margin-top:4px">记录只存在这台设备的浏览器里，换电脑不会同步。</div>';
    if (!mine.length) {
      h += '<div class="sec"><div class="mini">还没种下第一颗种子。去卡片上点「加入我的赛程」。</div></div>';
    } else {
      var counts = { "备战中": 0, "已投稿": 0, "已获奖": 0, "未获奖": 0 };
      mine.forEach(function (m) { if (counts[m.status] != null) counts[m.status]++; });
      h += '<div class="sec"><h5>总览</h5><div class="meta">' +
        "<span>备战中 <b>" + counts["备战中"] + "</b></span><span>已投稿 <b>" + counts["已投稿"] + "</b></span>" +
        "<span>已获奖 <b style='color:#4f9d3a'>" + counts["已获奖"] + "</b></span><span>未获奖 <b>" + counts["未获奖"] + "</b></span></div></div>";
      h += '<div class="sec"><h5>明细</h5>';
      mine.forEach(function (m, i) {
        var a = ALL.filter(function (x) { return x.id === m.id; })[0] || { name: m.id, deadline: "" };
        h += '<div style="border-bottom:3px dashed #e2c489;padding:6px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
          '<div style="flex:1;min-width:180px"><b>' + esc(a.name) + "</b><br><span class='mini'>" + fmtDate(a.deadline) + " · 加入于 " + esc(m.ts || "") + "</span></div>" +
          '<select data-mst="' + i + '" style="width:110px">' +
          ["备战中", "已投稿", "已获奖", "未获奖"].map(function (s) {
            return '<option' + (m.status === s ? " selected" : "") + ">" + s + "</option>";
          }).join("") + "</select>" +
          '<button class="btn red sm" data-mdel="' + i + '">删</button>' +
          "</div>";
      });
      h += "</div>";
      h += '<div class="sec"><button class="btn blue" id="btnExportMine">导出我的战绩（CSV）</button></div>';
    }
    $("#mineBody").innerHTML = h;
    $("#mMine").classList.add("on");

    $$("[data-mst]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var arr = load(LS.mine, []); arr[+sel.dataset.mst].status = sel.value;
        save(LS.mine, arr); toast("已更新为「" + sel.value + "」"); beep(880, .06); openMine();
      });
    });
    $$("[data-mdel]").forEach(function (b) {
      b.addEventListener("click", function () {
        var arr = load(LS.mine, []); arr.splice(+b.dataset.mdel, 1); save(LS.mine, arr); openMine(); beep(300, .1);
      });
    });
    var ex = $("#btnExportMine");
    if (ex) ex.addEventListener("click", function () {
      var arr = load(LS.mine, []);
      var lines = ["赛事,级别,主办,截稿,状态,加入时间"];
      arr.forEach(function (m) {
        var a = ALL.filter(function (x) { return x.id === m.id; })[0] || {};
        lines.push([a.name || m.id, a.tier || "", a.org || "", a.deadline || "", m.status, m.ts || ""].join(","));
      });
      var b = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      var u = URL.createObjectURL(b), el = document.createElement("a");
      el.href = u; el.download = "我的赛程.csv"; el.click(); URL.revokeObjectURL(u);
      beep(880, .08);
    });
  }

  function track(id) {
    var arr = load(LS.mine, []);
    if (arr.some(function (x) { return x.id === id; })) { toast("已经在赛程里了"); return; }
    arr.push({ id: id, status: "备战中", ts: new Date().toLocaleDateString("zh-CN") });
    save(LS.mine, arr);
    toast("已加入我的赛程"); beep(1046, .08); render();
  }

  /* ---------- 数据管理 ---------- */
  function openData() {
    var h = '<button class="btn sm close" data-close>关闭</button><h2>数据管理 · 让站子一直新下去</h2>';
    h += '<div class="sec"><h5>当前数据</h5><div class="mini">版本 <b>' + esc(DATA_VERSION) + "</b>　共 <b>" + ALL.length + "</b> 条赛事（其中自建 " + custom.length + " 条）</div></div>";

    h += '<div class="sec"><h5>① 导入 / 导出 JSON</h5><div class="mini" style="margin-bottom:6px">别人发你一份新数据，直接导进来就能覆盖更新；导出后可备份或发给同事。</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center">' +
      '<input type="file" id="fileImp" accept=".json" style="width:auto;flex:1;min-width:180px">' +
      '<button class="btn blue sm" id="btnExpAll">导出全部</button></div></div>';

    h += '<div class="sec"><h5>② 手工新增一条（不用改代码）</h5><div class="grid2">' +
      '<div class="fld"><label>赛事名称</label><input id="cName" placeholder="2027 年 XX 杯美术教师…"></div>' +
      '<div class="fld"><label>级别</label><select id="cTier"><option value="区">区级</option><option value="市">市级</option><option value="省">省级</option><option value="国">国家级</option></select></div>' +
      '<div class="fld"><label>主办单位</label><input id="cOrg" placeholder="深圳市宝安区教育局"></div>' +
      '<div class="fld"><label>截稿日期</label><input id="cDdl" placeholder="2027-03-31"></div>' +
      '<div class="fld" style="grid-column:1/-1"><label>学科 / 说明</label><input id="cSub" placeholder="美术 · 课堂教学案例"></div>' +
      "</div>" +
      '<div style="margin-top:7px"><button class="btn green sm" id="btnAdd">保存这条</button> ' +
      '<button class="btn red sm" id="btnClearCustom">清空我自建的</button></div></div>';

    h += '<div class="sec"><h5>③ 怎么让数据保持最新</h5><ul class="mini">' +
      "<li>每月月初刷一遍 5 个官网：深圳市教育局、广东省教育厅、深圳市总工会、宝安区教育局、教育部白名单平台。</li>" +
      "<li>看到新通知，点上面「② 手工新增」，30 秒录进去，网站立刻多一条。</li>" +
      "<li>把 <b>data.js</b> 用记事本打开改 deadline，刷新就生效，比找我还快。</li>" +
      "<li>日期写错不要紧，页面会自己算倒计时；过期赛事会自动灰掉归到「已截止」。</li></ul></div>";

    $("#dataBody").innerHTML = h;
    $("#mData").classList.add("on");

    $("#btnExpAll").addEventListener("click", function () {
      var b = new Blob([JSON.stringify(ALL, null, 2)], { type: "application/json;charset=utf-8" });
      var u = URL.createObjectURL(b), el = document.createElement("a");
      el.href = u; el.download = "赛事数据_" + new Date().toISOString().slice(0, 10) + ".json";
      el.click(); URL.revokeObjectURL(u); beep(880, .08); toast("已导出");
    });

    $("#fileImp").addEventListener("change", function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var arr = JSON.parse(r.result);
          if (!Array.isArray(arr)) throw new Error("顶层要是数组");
          save(LS.custom, arr);
          toast("已导入 " + arr.length + " 条，正在刷新");
          setTimeout(function () { location.reload(); }, 700);
        } catch (err) { toast("导入失败：" + err.message); }
      };
      r.readAsText(f, "utf-8");
    });

    $("#btnAdd").addEventListener("click", function () {
      var name = $("#cName").value.trim(), org = $("#cOrg").value.trim(), ddl = $("#cDdl").value.trim();
      if (!name) { toast("至少写个赛事名"); return; }
      var c = load(LS.custom, []);
      c.push({
        id: "c" + Date.now(), name: name, short: name.slice(0, 14), tier: $("#cTier").value,
        org: org || "（待补）", orgType: "自建条目", subject: $("#cSub").value.trim() || "待补",
        cycle: "自建", window: "", deadline: ddl || "", deadlineNote: "自建条目，请自行核对官方通知",
        credit: 3, schoolProof: { count: 0, best: "—", note: "自建条目，学校是否认定需自行确认" },
        materials: ["报名表（盖章）", "作品 / 案例本体", "教学设计或创作说明", "原创承诺书"],
        tips: ["自建条目：请补充官方通知链接与截止日期，避免记错。"],
        url: ""
      });
      save(LS.custom, c);
      toast("已保存，正在刷新"); setTimeout(function () { location.reload(); }, 600);
    });

    $("#btnClearCustom").addEventListener("click", function () {
      if (confirm("清空你自己新增的赛事？内置数据不受影响。")) {
        save(LS.custom, []); location.reload();
      }
    });
  }

  /* ---------- 我要传什么 · 材料总表 ---------- */
  function openUpload() {
    var chk = load(LS.chk, {});
    var active = ALL.filter(function (a) {
      if (a.phase === "进行中") return true;
      if (a.phase === "待发布") {
        var d = daysTo(a.deadline);
        return d != null && d > 0 && d <= 240;
      }
      return false;
    }).sort(function (x, y) { return (daysTo(x.deadline) || 9999) - (daysTo(y.deadline) || 9999); });

    var totalItems = 0, doneItems = 0;
    active.forEach(function (a) {
      (a.materials || []).forEach(function (m, i) {
        totalItems++;
        if (chk[a.id] && chk[a.id][i]) doneItems++;
      });
    });

    var h = '<button class="btn sm close" data-close>关闭</button>';
    h += "<h2>我要传什么 · 材料总表</h2>";
    h += '<div style="background:#fff3d2;border:3px solid var(--wood-dark);padding:8px 10px;margin-bottom:10px;font-size:12px;line-height:1.7">下面是你在<b>征集期 / 近期开放</b>要报的赛事，以及每场<b>必须传的材料</b>。勾掉已准备好的，剩下的就是你的待办。'
      + '（政府 / 工会平台最后一步需你本人登录 + 短信验证 + 上传真实作品，本工具无法代点，但前面这些都备好了。）</div>';
    h += '<div class="sec"><div class="meta">'
      + '<span>相关赛事 <b>' + active.length + '</b> 场</span>'
      + '<span>需传材料 <b>' + totalItems + '</b> 项</span>'
      + '<span>已备好 <b style="color:#4f9d3a">' + doneItems + '</b> 项</span>'
      + '<span>待办 <b style="color:#c4442e">' + (totalItems - doneItems) + '</b> 项</span>'
      + '</div></div>';

    if (!active.length) {
      h += '<div class="sec"><div class="mini">近期没有要传的，适合攒素材、练命题创作。</div></div>';
    } else {
      active.forEach(function (a) {
        var d = daysTo(a.deadline);
        var isUnion = /工会/.test(a.orgType || "") || /工会/.test(a.org || "");
        h += '<div class="up-block">';
        h += '<div class="up-head"><span class="badge ' + (TIER_CLS[a.tier] || "") + '">' + (TIER_TXT[a.tier] || a.tier) + "</span> "
          + "<b>" + esc(a.name) + "</b> "
          + (isUnion ? '<span class="u-tag">工会</span>' : "")
          + '<span class="up-ddl">截稿 ' + fmtDate(a.deadline) + (d != null && d > 0 ? (" · T-" + d) : "") + "</span></div>";
        h += '<div class="mini">' + esc(a.deadlineNote || "") + "</div>";
        h += '<div class="up-mat">';
        (a.materials || []).forEach(function (m, i) {
          var on = chk[a.id] && chk[a.id][i];
          h += '<label class="chk"><input type="checkbox" data-uid="' + esc(a.id) + '" data-ui="' + i + '"' + (on ? " checked" : "") + "><span>" + esc(m) + "</span></label>";
        });
        h += "</div>";
        h += '<div class="up-foot">'
          + '<button class="btn green sm" data-act="' + (a.aud === "学生" ? "notice" : "submit") + '" data-id="' + esc(a.id) + '">' + (a.aud === "学生" ? "生成学生通知" : "生成该赛事投稿包") + '</button> '
          + (a.url ? '<a class="btn blue sm" href="' + esc(a.url) + '" target="_blank" rel="noopener">看官方通知</a>' : "")
          + (a.portal && /^https?:/.test(a.portal) ? ' <a class="btn gold sm" href="' + esc(a.portal) + '" target="_blank" rel="noopener">打开投稿入口</a>' : "")
          + "</div>";
        h += "</div>";
      });
    }

    /* 工会系统赛事 · 下届预告（即使 2026 届已截稿也列出，方便提前备） */
    var unionAll = ALL.filter(function (a) {
      return (/工会/.test(a.orgType || "") || /工会/.test(a.org || ""));
    });
    var unionPend = unionAll.filter(function (a) {
      return !active.some(function (x) { return x.id === a.id; });
    });
    if (unionPend.length) {
      h += '<div class="sec"><h5>📌 工会系统赛事 · 下届预告（2026 届多已截稿，现在可提前备作品）</h5>';
      unionPend.forEach(function (a) {
        h += '<div class="up-block">'
          + '<div class="up-head"><span class="badge ' + (TIER_CLS[a.tier] || "") + '">' + (TIER_TXT[a.tier] || a.tier) + "</span> "
          + "<b>" + esc(a.name) + "</b>"
          + '<span class="u-tag">工会</span>'
          + '<span class="up-ddl">2026 届状态：' + esc(a.phase) + "</span></div>"
          + '<div class="mini">' + esc(a.deadlineNote || "") + "</div>"
          + '<div class="up-mat"><div class="mini"><b>现在就能提前备：</b>' + esc((a.materials || []).slice(0, 2).join("；")) + "</div></div>"
          + '<div class="up-foot">'
          + (a.url ? '<a class="btn blue sm" href="' + esc(a.url) + '" target="_blank" rel="noopener">看官方通知</a>' : "")
          + (a.portal && /^https?:/.test(a.portal) ? ' <a class="btn gold sm" href="' + esc(a.portal) + '" target="_blank" rel="noopener">打开投稿入口</a>' : "")
          + "</div></div>";
      });
      h += "</div>";
    }

    $("#uploadBody").innerHTML = h;
    $("#mUpload").classList.add("on");

    $$("#uploadBody [data-uid]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var c = load(LS.chk, {});
        c[cb.dataset.uid] = c[cb.dataset.uid] || [];
        c[cb.dataset.uid][+cb.dataset.ui] = cb.checked;
        save(LS.chk, c);
        openUpload();
      });
    });
    $$("#uploadBody [data-act=submit]").forEach(function (b) {
      b.addEventListener("click", function () { $("#mUpload").classList.remove("on"); openSubmit(b.dataset.id); });
    });
  }

  /* ---------- 事件绑定 ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    var closeBtn = t.closest("[data-close]");
    if (closeBtn) { closeBtn.closest(".mask").classList.remove("on"); beep(400, .05); return; }

    var mt = t.closest("#modeTabs .tab");
    if (mt) { setMode(mt.dataset.mode); return; }

    var tab = t.closest("#tabs .tab");
    if (tab) {
      $$("#tabs .tab").forEach(function (x) { x.classList.remove("on"); });
      tab.classList.add("on");
      state.tier = tab.dataset.tier;
      updateRecBtn();
      render(); beep(760, .05); return;
    }

    var rk = t.closest("#resKindTabs .tab");
    if (rk) {
      $$("#resKindTabs .tab").forEach(function (x) { x.classList.remove("on"); });
      rk.classList.add("on");
      state.resKind = rk.dataset.kind;
      renderRes(); beep(760, .05); return;
    }
    var rs = t.closest("#resScopeTabs .tab");
    if (rs) {
      $$("#resScopeTabs .tab").forEach(function (x) { x.classList.remove("on"); });
      rs.classList.add("on");
      state.resScope = rs.dataset.scope;
      renderRes(); beep(760, .05); return;
    }

    var jump = t.closest("[data-jump]");
    if (jump) { e.preventDefault(); openDetail(jump.dataset.jump); return; }

    var act = t.closest("[data-act]");
    if (act) {
      var card = act.closest("[data-id]");
      var id = act.dataset.id || (card && card.dataset.id);
      if (act.dataset.act === "detail") openDetail(id);
      if (act.dataset.act === "resmind") openResMind(id);
      if (act.dataset.act === "submit") { $("#mDetail").classList.remove("on"); openSubmit(id); }
      if (act.dataset.act === "notice") { $("#mDetail").classList.remove("on"); openNotice(id); }
      if (act.dataset.act === "track") track(id);
      return;
    }

    if (t.classList.contains("mask")) { t.classList.remove("on"); return; }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") $$(".mask.on").forEach(function (m) { m.classList.remove("on"); });
  });

  ["q", "fStatus", "fSort"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(id === "q" ? "input" : "change", function () {
      if (id === "q") state.q = el.value.trim();
      if (id === "fStatus") state.status = el.value;
      if (id === "fSort") state.sort = el.value;
      render();
    });
  });

  ["wlQ"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", function () { renderWLT(); });
  });
  if ($("#wlArt")) $("#wlArt").addEventListener("change", function () { renderWLT(); });
  if ($("#wlReset")) $("#wlReset").addEventListener("click", function () {
    $("#wlQ").value = ""; $("#wlArt").checked = false; renderWLT(); toast("已重置"); beep(500, .06);
  });
  if ($("#wlMoe")) $("#wlMoe").addEventListener("click", function () { window.open("https://www.moe.gov.cn/", "_blank"); });
  if ($("#wlGd")) $("#wlGd").addEventListener("click", function () { window.open("https://edu.gd.gov.cn/ztzlnew/xxl/tzgg/content/post_4856962.html", "_blank"); });

  $("#btnReset").addEventListener("click", function () {
    state = { tier: "all", aud: state.aud, q: "", status: "all", sort: "deadline", rec: false };
    $$("#tabs .tab").forEach(function (x) { x.classList.remove("on"); });
    $("#tabs .tab[data-tier='all']").classList.add("on");
    $("#q").value = ""; $("#fStatus").value = "all"; $("#fSort").value = "deadline";
    updateRecBtn();
    render(); toast("已重置筛选"); beep(500, .06);
  });

  $("#btnRec").addEventListener("click", function () {
    state.rec = !state.rec;
    updateRecBtn();
    render();
    toast(state.rec ? "只看「推荐·好参加」" : "已显示全部"); beep(760, .05);
  });

  $("#btnRefresh").addEventListener("click", function () {
    var self = this;
    self.textContent = "刷新中…";
    var S = loadSet();
    if (!S.updateUrl) {
      setTimeout(function () {
        render(); renderSide();
        $("#lastRefresh").textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
        $("#verTag").textContent = "数据 " + DATA_VERSION.split("·")[0].trim();
        self.textContent = "刷新";
        toast("已刷新（本地）· 想自动更新请在「我的资料」填远程地址");
        beep(1046, .07); setTimeout(function () { beep(1318, .07); }, 80);
      }, 260);
      return;
    }
    fetch(S.updateUrl, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(function (txt) {
        var got = new Function(txt + "\n;return {AWARDS:typeof AWARDS!=='undefined'?AWARDS:null,WHITELIST:typeof WHITELIST!=='undefined'?WHITELIST:null,BIG_SCHOOLS:typeof BIG_SCHOOLS!=='undefined'?BIG_SCHOOLS:null,RES:typeof RES!=='undefined'?RES:null,TOOLS:typeof TOOLS!=='undefined'?TOOLS:null,PEOPLE:typeof PEOPLE!=='undefined'?PEOPLE:null,DATA_VERSION:typeof DATA_VERSION!=='undefined'?DATA_VERSION:null};")();
        if (!got.DATA_VERSION) throw new Error("远程文件不含数据");
        if (got.DATA_VERSION === DATA_VERSION) {
          toast("已是最新（" + got.DATA_VERSION.split("·")[0].trim() + "）");
          self.textContent = "刷新"; return;
        }
        if (got.AWARDS) { ALL = [].concat(got.AWARDS, custom); }
        if (got.WHITELIST) { WL = got.WHITELIST; }
        if (got.BIG_SCHOOLS) { BS = got.BIG_SCHOOLS; }
        if (got.RES) { RES = got.RES; }
        if (got.TOOLS) { TOOLS = got.TOOLS; }
        if (got.PEOPLE) { PEOPLE = got.PEOPLE; }
        render(); renderSide();
        $("#lastRefresh").textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
        $("#verTag").textContent = "数据 " + got.DATA_VERSION.split("·")[0].trim();
        self.textContent = "刷新";
        toast("已更新到新版本：" + got.DATA_VERSION.split("·")[0].trim());
        beep(1046, .07); setTimeout(function () { beep(1318, .07); }, 80);
      })
      .catch(function (e) {
        self.textContent = "刷新";
        toast("拉取失败：" + e.message + "（仍用本地数据）");
      });
  });

  $("#btnMine").addEventListener("click", openMine);
  $("#btnData").addEventListener("click", openData);
  $("#btnUpload").addEventListener("click", openUpload);
  $("#btnSenior").addEventListener("click", openSenior);
  $("#btnSettings").addEventListener("click", openSettings);
  $("#btnStuCopy").addEventListener("click", openStuCopy);
  $("#btnBig").addEventListener("click", openBig);

  /* 名校战绩面板里的「看比赛」按钮 / 城市筛选 → 打开详情或重渲染 */
  document.addEventListener("click", function (e) {
    var bc = e.target.closest("#bigCityTabs .tab[data-city]");
    if (bc) {
      bigCity = bc.dataset.city;
      renderBig();
      beep(700, .05);
      return;
    }
    var b = e.target.closest("#bigBody [data-act='detail']");
    if (b) { $("#mBig").classList.remove("on"); openDetail(b.dataset.id); }
  });

  /* ---------- 启动 ---------- */
  updateRecBtn();
  render(); renderSide();
  $("#lastRefresh").textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  $("#verTag").textContent = "数据 " + DATA_VERSION.split("·")[0].trim();

  // 支持链接直达：index.html#s=赛事id 直接打开投稿台
  (function deepLink() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!h) return;
    if (h.indexOf("d=") === 0) openDetail(h.slice(2));
    else if (h.indexOf("s=") === 0) openSubmit(h.slice(2));
  })();
})();
