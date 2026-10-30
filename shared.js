(function (window) {
  "use strict";

  /* SCM FAQ BOT - shared.js / Phase 1 */
  var KEYS = {
    qa: "scmFaqQaCacheV2",
    history: "scmFaqHistoryV2",
    pending: "scmFaqPendingLogsV2",
    session: "scmFaqSessionIdV1"
  };

  var CATEGORY_ORDER = ["all", "product", "logistics", "origin", "production", "cost", "system"];
  var CATEGORY_LABELS = {
    all: "전체", product: "제품 주문/도입", logistics: "배송/통관",
    origin: "원산지/FTA", production: "생산/공급계획", cost: "비용/결재", system: "시스템/조회"
  };
  var CATEGORY_ALIASES = {
    all: "all", "전체": "all",
    product: "product", purchase: "product", order: "product", "제품": "product", "주문": "product", "발주": "product", "구매": "product",
    logistics: "logistics", delivery: "logistics", customs: "logistics", "배송": "logistics", "통관": "logistics", "물류": "logistics", "운송": "logistics",
    origin: "origin", fta: "origin", documents: "origin", "원산지": "origin", "서류": "origin", "증명서": "origin",
    production: "production", supply: "production", mrp: "production", "생산": "production", "공급계획": "production",
    cost: "cost", expense: "cost", approval: "cost", "비용": "cost", "결재": "cost", "품의": "cost",
    system: "system", lookup: "system", sap: "system", "시스템": "system", "조회": "system", other: "system", "기타": "system"
  };

  var STOP_WORDS = ["은","는","이","가","을","를","의","에","에서","로","으로","와","과","도","만","까지","부터","좀","좀요","해주세요","부탁","합니다","입니다","있나요","있을까요","알려주세요","말해주세요","필요해","필요합니다","싶습니다","싶어요","뭐","머","무엇","어떻게","관련","문의"];
  var STOP_SET = {};
  STOP_WORDS.forEach(function (v) { STOP_SET[v] = true; });

  var SYNONYM_GROUPS = [
    ["발주","po","purchase order","발주서","구매오더"],
    ["변경","수정","정정","바꾸기","바꿔","고치기"],
    ["취소","삭제","캔슬","cancel"],
    ["납기","납기일","입고일","도착일","리드타임","lead time","leadtime"],
    ["업체","거래처","vendor","supplier","공급사"],
    ["재고","stock","재고량","재고수량"],
    ["배송","운송","delivery","출하","shipping","shipment"],
    ["구매","purchase","procurement"],
    ["가격","금액","비용","단가","price","cost"],
    ["담당자","담당","연락처"],
    ["서류","문서","document","documents"],
    ["증명서","인증서","certificate","성적서"],
    ["원산지","coo","certificate of origin"],
    ["제품","상품","모델","product","자재","material"],
    ["통관","customs","수입신고","세관"],
    ["조회","확인","검색","찾기"]
  ];
  var SYNONYM_MAP = {};
  SYNONYM_GROUPS.forEach(function (g) {
    var canonical = String(g[0]).toLowerCase();
    g.forEach(function (v) { SYNONYM_MAP[String(v).trim().toLowerCase()] = canonical; });
  });

  var INTENTS = [
    { id: "file_request", p: [/엑셀/,/파일/,/다운로드/,/양식/,/템플릿/] },
    { id: "cost_inquiry", p: [/비용/,/요금/,/가격/,/얼마/,/관세/,/운임/,/단가/] },
    { id: "customs", p: [/통관/,/관세/,/세관/,/수입신고/,/hs\s*코드/i,/hscode/i] },
    { id: "lead_time", p: [/납기/,/리드타임/,/소요기간/,/배송기간/] },
    { id: "stock_check", p: [/재고/,/재고량/,/재고수량/] },
    { id: "product_info", p: [/제품/,/자재/,/종류/,/모델/,/사양/,/스펙/] },
    { id: "certificate", p: [/원산지/,/증명서/,/인증서/,/성적서/,/fta/i,/coo/i] },
    { id: "delivery_track", p: [/배송/,/추적/,/운송/,/도착/,/선적/,/출하/] },
    { id: "org_info", p: [/업무분장/,/조직/,/담당자/,/연락처/] },
    { id: "process", p: [/절차/,/프로세스/,/방법/,/진행방법/] },
    { id: "system_lookup", p: [/sap/i,/조회/,/tcode/i,/트랜잭션/,/테이블/] }
  ];

  var DIRECT_THRESHOLD = 68;
  var SUGGEST_THRESHOLD = 34;
  var MIN_GAP = 9;
  var CACHE_TTL = 60000;
  var qaCache = null;
  var qaCacheTime = 0;

  function config() { return window.CHATBOT_CONFIG || window.ADMIN_CONFIG || {}; }
  function safeParse(v, fallback) { try { var x = JSON.parse(v); return x == null ? fallback : x; } catch (e) { return fallback; } }
  function storageGet(k, fallback) { try { return safeParse(window.localStorage.getItem(k), fallback); } catch (e) { return fallback; } }
  function storageSet(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { console.warn("localStorage 저장 실패:", e); return false; } }
  function normalizeText(v) { return String(v == null ? "" : v).trim().toLowerCase().replace(/\s+/g, " "); }
  function stripText(v) { return normalizeText(v).replace(/[\s?!.,·…\-_()（）「」『』\[\]{}"“”'‘’~:;|/\\]/g, ""); }
  function cleanTokens(v) { return normalizeText(v).replace(/[?!.,·…\-_()（）「」『』\[\]{}"“”'‘’~:;|/\\]/g, " "); }
  function normalizeToken(v) { v = normalizeText(v); return SYNONYM_MAP[v] || v; }
  function tokenize(v) {
    var seen = {};
    return (cleanTokens(v).match(/[가-힣a-z0-9]+/g) || []).map(normalizeToken).filter(function (x) {
      if (x.length < 2 || STOP_SET[x] || seen[x]) return false; seen[x] = true; return true;
    });
  }
  function normalizeKeywords(v) {
    var arr = Array.isArray(v) ? v : String(v || "").split(/[|,;\/\n]/), seen = {};
    return arr.map(normalizeText).filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; });
  }
  function normalizeCategory(v) {
    var x = normalizeText(v).replace(/[📦🚚🌍🏭💰💻]/g, "").trim();
    if (!x) return "system";
    if (CATEGORY_ALIASES[x]) return CATEGORY_ALIASES[x];
    if (/제품|주문|도입|발주|구매/.test(x)) return "product";
    if (/배송|통관|물류|운송|선적|출하/.test(x)) return "logistics";
    if (/원산지|fta|증명서|인증서/.test(x)) return "origin";
    if (/생산|공급|mrp/.test(x)) return "production";
    if (/비용|결재|품의|단가|가격/.test(x)) return "cost";
    if (/시스템|조회|sap|report|테이블/.test(x)) return "system";
    return x === "all" ? "all" : "system";
  }
  function normalizeBoolean(v) { if (typeof v === "boolean") return v; if (typeof v === "number") return v !== 0; return ["true","1","o","yes","y","on","예","사용","노출"].indexOf(normalizeText(v)) >= 0; }
  function createId(prefix) { return (prefix || "id") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10); }
  function escapeHtml(v) { return String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }

  function normalizeItem(item) {
    item = item || {};
    return { __id: item.__id || item.id || createId("qa"), category: normalizeCategory(item.category), question: String(item.question || "").trim(), keywords: normalizeKeywords(item.keywords), aliases: normalizeKeywords(item.aliases), answer: String(item.answer || "").trim(), top: normalizeBoolean(item.top), contactId: String(item.contactId || "") };
  }
  function normalizeList(items) { return Array.isArray(items) ? items.map(normalizeItem).filter(function (x) { return x.question && x.answer; }) : []; }

  function fetchWithTimeout(url, options, ms) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null, timer = null, opts = Object.assign({}, options || {});
    if (controller) { opts.signal = controller.signal; timer = window.setTimeout(function () { controller.abort(); }, Number(ms || 15000)); }
    return window.fetch(url, opts).finally(function () { if (timer) window.clearTimeout(timer); });
  }
  function apiRoot() {
    var c = config();
    if (c.apiBase) return String(c.apiBase).replace(/\/$/, "");
    var qa = String(c.qaApiBase || "https://scmchatbot-api-e9bdbzbgeae3ecgj.koreasouth-01.azurewebsites.net/api/qa").replace(/\/$/, "");
    return qa.replace(/\/qa$/, "");
  }
  function endpoint(key, path) { var c = config(); return c[key] ? String(c[key]).replace(/\/$/, "") : apiRoot() + path; }
  function sessionId() {
    var id = ""; try { id = window.sessionStorage.getItem(KEYS.session) || ""; } catch (e) {}
    if (!id) { id = createId("session"); try { window.sessionStorage.setItem(KEYS.session, id); } catch (e) {} }
    return id;
  }
  async function readResponse(res) {
    var data = null; try { data = await res.json(); } catch (e) {}
    if (!res.ok) { var err = new Error((data && (data.message || data.error)) || ("HTTP " + res.status)); err.status = res.status; err.code = data && data.code; err.data = data; throw err; }
    return data || { success: true };
  }

  function getPendingLogs() { var x = storageGet(KEYS.pending, []); return Array.isArray(x) ? x : []; }
  function savePendingLog(entry) { var q = getPendingLogs(); q.push(Object.assign({ id: createId("pending"), createdAt: new Date().toISOString(), attempts: 0 }, entry || {})); storageSet(KEYS.pending, q.slice(-200)); }
  async function postJson(url, payload, type) {
    try {
      var res = await fetchWithTimeout(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload || {}) }, config().requestTimeoutMs || 15000);
      return await readResponse(res);
    } catch (e) {
      if ([400,403,404,409].indexOf(e.status) < 0) savePendingLog({ type: type || "api", url: url, method: "POST", payload: payload || {} });
      throw e;
    }
  }
  async function retryPendingLogs(defaultUrl) {
    var q = getPendingLogs(), remain = [], sent = 0;
    for (var i = 0; i < q.length; i++) {
      var x = q[i] || {}, url = String(x.url || defaultUrl || "");
      if (!url) { remain.push(x); continue; }
      try {
        var res = await fetchWithTimeout(url, { method: x.method || "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(x.payload !== undefined ? x.payload : x) }, config().requestTimeoutMs || 15000);
        if (!res.ok) throw new Error("HTTP " + res.status); sent++;
      } catch (e) { x.attempts = Number(x.attempts || 0) + 1; x.lastAttemptAt = new Date().toISOString(); remain.push(x); }
    }
    storageSet(KEYS.pending, remain.slice(-200)); return { sent: sent, remaining: remain.length };
  }

  function intents(text) { var v = normalizeText(text), out = []; INTENTS.forEach(function (x) { if (x.p.some(function (p) { return p.test(v); })) out.push(x.id); }); return out; }
  function intersect(a, b) { var m = {}; b.forEach(function (x) { m[x] = true; }); return a.reduce(function (n, x) { return n + (m[x] ? 1 : 0); }, 0); }
  function similarity(a, b) {
    var A = tokenize(a), B = tokenize(b); if (!A.length || !B.length) return 0;
    function match(x, y) { return x === y || (x.length >= 2 && y.length >= 2 && (x.indexOf(y) >= 0 || y.indexOf(x) >= 0)); }
    var ma = A.filter(function (x) { return B.some(function (y) { return match(x,y); }); }).length;
    var mb = B.filter(function (y) { return A.some(function (x) { return match(x,y); }); }).length;
    var p = ma / A.length, r = mb / B.length; return p && r ? 2 * p * r / (p + r) : 0;
  }
  function phraseHit(input, phrase) { var a = stripText(input), b = stripText(phrase); if (!b) return false; if (a.indexOf(b) >= 0) return true; var P = tokenize(phrase), I = tokenize(input); return P.length > 0 && intersect(P,I) === P.length; }
  function scoreItem(item, input, selectedCategory) {
    var u = normalizeText(input), q = normalizeText(item.question); if (!u || !q) return 0;
    var su = stripText(u), sq = stripText(q); if (su === sq) return 100;
    var score = similarity(u,q) * 62;
    if (su.length >= 4 && sq.indexOf(su) >= 0) score = Math.max(score, 62 + Math.min(22, su.length / sq.length * 22));
    if (sq.length >= 4 && su.indexOf(sq) >= 0) score = Math.max(score, 60 + Math.min(20, sq.length / su.length * 20));
    score += Math.min(20, (item.keywords || []).filter(function (k) { return phraseHit(u,k); }).length * 7);
    var aliasScore = 0;
    (item.aliases || []).forEach(function (a) { var sa = stripText(a); if (!sa) return; if (sa === su) aliasScore = Math.max(aliasScore,98); else aliasScore = Math.max(aliasScore, similarity(u,a)*90); if (sa.length >= 4 && (sa.indexOf(su)>=0 || su.indexOf(sa)>=0)) aliasScore = Math.max(aliasScore,80); });
    score = Math.max(score, aliasScore);
    var ui = intents(u), fi = intents([q,(item.keywords||[]).join(" "),(item.aliases||[]).join(" "),item.answer].join(" "));
    if (ui.length) { var n = intersect(ui,fi); if (n) score += Math.min(10,n*5); else if (fi.length) score -= 8; }
    if (selectedCategory && selectedCategory !== "all") score += item.category === normalizeCategory(selectedCategory) ? 5 : -4;
    return Math.max(0,Math.min(100,Math.round(score)));
  }
  function rankMatches(list,text,category) {
    var r = list.map(function (item) { return { item:item, score:scoreItem(item,text,category) }; }).sort(function (a,b) { if (b.score !== a.score) return b.score-a.score; if (!!b.item.top !== !!a.item.top) return b.item.top ? 1 : -1; return String(a.item.question).localeCompare(String(b.item.question),"ko"); });
    if (config().debugMatching && window.console && console.table) console.table(r.slice(0,5).map(function (x) { return { score:x.score, category:x.item.category, question:x.item.question }; }));
    return r;
  }
  function matchResult(list,text,category) {
    if (!String(text || "").trim()) return { status:"none", item:null, score:0, candidates:[] };
    var r = rankMatches(list,text,category||"all"); if (!r.length) return { status:"none", item:null, score:0, candidates:[] };
    var first=r[0], gap=first.score-(r[1]?r[1].score:0);
    if (first.score >= DIRECT_THRESHOLD && (gap >= MIN_GAP || first.score >= 90)) return { status:"matched", item:first.item, score:first.score, candidates:r.slice(0,3) };
    if (first.score >= SUGGEST_THRESHOLD) return { status:"suggest", item:null, score:first.score, candidates:r.filter(function(x){return x.score>=SUGGEST_THRESHOLD;}).slice(0,3) };
    return { status:"none", item:null, score:first.score, candidates:r.slice(0,3) };
  }

  function setCache(items) { qaCache=normalizeList(items); qaCacheTime=Date.now(); storageSet(KEYS.qa,qaCache); return qaCache.slice(); }
  function getCache() { if (qaCache && Date.now()-qaCacheTime<CACHE_TTL) return qaCache.slice(); qaCache=normalizeList(storageGet(KEYS.qa,[])); qaCacheTime=Date.now(); return qaCache.slice(); }
  async function loadFromServer() {
    try { var res=await fetchWithTimeout(String(config().qaApiBase || apiRoot()+"/qa").replace(/\/$/,"")+"/getAll",{method:"GET",headers:{Accept:"application/json"}},config().requestTimeoutMs||15000); var data=await readResponse(res); return setCache(Array.isArray(data)?data:data.items); }
    catch(e){ console.warn("QA API 실패, 로컬 캐시 사용:",e); return getCache(); }
  }

  function getHistory(){var x=storageGet(KEYS.history,[]);return Array.isArray(x)?x:[];}
  function saveHistory(item){var h=getHistory(),x=Object.assign({},item||{});if(!x.timestamp)x.timestamp=Date.now();h.unshift(x);storageSet(KEYS.history,h.slice(0,500));}

  async function logQuestion(data) {
    data=data||{}; var candidates=Array.isArray(data.candidates)?data.candidates:[];
    var payload={ sessionId:data.sessionId||sessionId(), question:String(data.question||"").trim(), answer:String(data.answer||""), matched:data.matched!==undefined?!!data.matched:data.matchStatus==="matched", category:normalizeCategory(data.category||"system"), timestamp:data.timestamp||new Date().toISOString(), source:data.source||"user", page:data.page||(window.location?window.location.href:""), userAgent:data.userAgent||(window.navigator?window.navigator.userAgent:""), matchStatus:data.matchStatus||(data.matched?"matched":"none"), matchedFaqId:data.matchedFaqId||"", matchScore:Number(data.matchScore||0), answerSource:data.answerSource||(data.matched?"direct_match":"none"), candidateFaqIds:Array.isArray(data.candidateFaqIds)?data.candidateFaqIds:candidates.map(function(x){return x&&x.item?x.item.__id:"";}).filter(Boolean).slice(0,5) };
    if(!payload.question)throw new Error("질문이 필요합니다."); return postJson(endpoint("logApiUrl","/logQuestion"),payload,"question_log");
  }
  async function saveFeedback(data) {
    data=data||{}; var payload={logId:String(data.logId||""),faqId:String(data.faqId||""),category:normalizeCategory(data.category||"system"),question:String(data.question||""),rating:String(data.rating||"").toLowerCase(),reasonCode:String(data.reasonCode||"").toLowerCase(),reasonText:String(data.reasonText||"").slice(0,300)};
    if(!payload.logId||!payload.faqId)throw new Error("logId와 faqId가 필요합니다."); if(payload.rating!=="up"&&payload.rating!=="down")throw new Error("rating은 up 또는 down이어야 합니다."); return postJson(endpoint("feedbackApiUrl","/feedback/save"),payload,"feedback");
  }
  async function saveUnresolved(data) {
    data=data||{}; var c=Array.isArray(data.candidates)?data.candidates:[],first=c[0]; var payload={logId:String(data.logId||""),question:String(data.question||"").trim(),category:normalizeCategory(data.category||"system"),topScore:Number(data.topScore!==undefined?data.topScore:(data.score||0)),topCandidateFaqId:String(data.topCandidateFaqId||(first&&first.item?first.item.__id:""))};
    if(!payload.question)throw new Error("미해결 질문이 필요합니다."); return postJson(endpoint("unresolvedApiUrl","/unresolved/save"),payload,"unresolved");
  }

  window.ChatbotStore = {
    loadFromServer:loadFromServer, getQA:getCache,
    getQAByCategory:function(c){var all=getCache(),n=c==="all"?"all":normalizeCategory(c);return n==="all"?all:all.filter(function(x){return x.category===n;});},
    getCategories:function(){return CATEGORY_ORDER.slice();}, getCategoryLabels:function(){return Object.assign({},CATEGORY_LABELS);},
    findAnswer:function(text,c){var r=matchResult(getCache(),text,c||"all");return r.status==="matched"?r.item:null;},
    findAnswerSmart:function(text,c){return matchResult(getCache(),text,c||"all");},
    logQuestion:logQuestion, saveFeedback:saveFeedback, saveUnresolved:saveUnresolved, getSessionId:sessionId,
    saveHistory:saveHistory, getHistory:getHistory, clearHistory:function(){storageSet(KEYS.history,[]);}, updateLocalCache:setCache,
    searchQA:function(q){var t=normalizeText(q);if(!t)return getCache();return getCache().filter(function(x){return normalizeText([x.question,x.answer,(x.keywords||[]).join(" "),(x.aliases||[]).join(" ")].join(" ")).indexOf(t)>=0;});},
    getStats:function(){var qa=getCache(),h=getHistory(),cats={};qa.forEach(function(x){cats[x.category]=(cats[x.category]||0)+1;});return{totalQA:qa.length,totalHistory:h.length,matchedHistory:h.filter(function(x){return!!x.matched;}).length,unmatchedHistory:h.filter(function(x){return!x.matched;}).length,categoryCounts:cats,topQuestions:qa.filter(function(x){return!!x.top;}).length};},
    getPendingLogs:getPendingLogs, savePendingLog:savePendingLog, retryPendingLogs:retryPendingLogs
  };

  window.ChatbotUtils = {
    escapeHtml:escapeHtml, normalizeCategory:normalizeCategory,
    normalizeCategoryDisplay:function(v){var c=normalizeCategory(v);return CATEGORY_LABELS[c]||String(v||"미분류");},
    normalizeKeywords:normalizeKeywords, normalizeBoolean:normalizeBoolean, normalizeText:normalizeText,
    normalizeQuestionKey:stripText, createQAId:function(){return createId("qa");}, safeParse:safeParse, fetchWithTimeout:fetchWithTimeout
  };
})(window);
