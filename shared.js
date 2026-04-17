(function () {
  "use strict";

  const QA_KEY = "chatbot_qa";
  const HISTORY_KEY = "chatbot_history";
  const PENDING_LOGS_KEY = "chatbot_pending_logs";

  const CATEGORY_LABELS = {
    all: "전체", delivery: "배송", documents: "문서",
    production: "생산", purchase: "구매", other: "기타"
  };

  const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS).filter(c => c !== "all"));

  const QA_API_BASE =
    (window.CHATBOT_CONFIG && window.CHATBOT_CONFIG.qaApiBase) ||
    (window.ADMIN_CONFIG && window.ADMIN_CONFIG.qaApiBase) ||
    "https://scmchatbot-api-e9bdbzbgeae3ecgj.koreasouth-01.azurewebsites.net/api/qa";

  /* ================== Utils ================== */

  function safeParse(v, fb) { try { return JSON.parse(v); } catch { return fb; } }
  function normalizeText(v) { return String(v || "").trim().toLowerCase(); }
  function stripText(v) { return normalizeText(v).replace(/[\s?!.,·…\-_()（）「」『』""''~]/g, ""); }

  function tokenize(text) {
    return stripText(text).match(/[가-힣a-z0-9]+/g) || [];
  }

  function normalizeKeywords(v) {
    if (Array.isArray(v)) return [...new Set(v.map(x => normalizeText(x)).filter(Boolean))];
    return [...new Set(String(v || "").split(/\||,|;|\//).map(x => normalizeText(x)).filter(Boolean))];
  }

  function normalizeCategory(v) {
    const c = normalizeText(v);
    return VALID_CATEGORIES.has(c) ? c : "other";
  }

  function createQAId() {
    return "qa_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  function normalizeItem(item) {
    return {
      __id: item.__id || item.id || createQAId(),
      category: normalizeCategory(item.category),
      question: String(item.question || "").trim(),
      keywords: normalizeKeywords(item.keywords),
      answer: String(item.answer || "").trim(),
      top: !!item.top,
      contactId: item.contactId || ""
    };
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ================== Cache ================== */

  let _qaCache = null;
  let _qaCacheTime = 0;
  const CACHE_TTL = 60000;

  function setQACache(items) {
    _qaCache = items;
    _qaCacheTime = Date.now();
    localStorage.setItem(QA_KEY, JSON.stringify(items));
  }

  function getQAFromCache() {
    if (_qaCache && Date.now() - _qaCacheTime < CACHE_TTL) return _qaCache;
    const stored = safeParse(localStorage.getItem(QA_KEY), []);
    return stored.map(normalizeItem).filter(i => i.question && i.answer);
  }

  async function loadQAFromServer() {
    try {
      const res = await fetch(QA_API_BASE + "/getAll");
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        const items = data.items.map(normalizeItem);
        setQACache(items);
        return items;
      }
    } catch (e) {
      console.warn("QA API 실패, 로컬 사용", e);
    }
    return getQAFromCache();
  }

  /* ================== Matching Engine (NEW) ================== */

  function calculateMatchScore(item, input) {
    const q = normalizeText(input);
    const iq = normalizeText(item.question);
    if (!q) return 0;

    if (q === iq) return 100;
    if (stripText(q) === stripText(iq)) return 95;

    let score = 0;

    // 토큰 겹침
    const qTokens = tokenize(q);
    const iTokens = tokenize(iq);
    const keywords = [...iTokens, ...item.keywords.map(normalizeText)];

    let overlap = 0;
    qTokens.forEach(t => {
      if (keywords.some(k => k.includes(t) || t.includes(k))) overlap++;
    });

    if (overlap) {
      const ratio = overlap / keywords.length;
      score = Math.max(score, ratio * 70);
    }

    // 부분 문장 포함
    if (iq.includes(q)) score = Math.max(score, 85);
    if (q.includes(iq)) score = Math.max(score, 90);

    // 의도 패턴
    const intents = [
      { r: /무엇|뭐|무슨/, i: "what" },
      { r: /어떻게|방법/, i: "how" },
      { r: /가능|되나|될까/, i: "possible" },
      { r: /어디|위치/, i: "where" },
      { r: /언제|기간/, i: "when" },
      { r: /왜|이유/, i: "why" }
    ];

    let qi = null, ii = null;
    intents.forEach(p => {
      if (p.r.test(q)) qi = p.i;
      if (p.r.test(iq)) ii = p.i;
    });

    if (qi && ii && qi !== ii) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  function findBestMatch(list, text) {
    let best = null, bestScore = 0;
    list.forEach(item => {
      const s = calculateMatchScore(item, text);
      if (s > bestScore) { bestScore = s; best = item; }
    });
    return bestScore >= 45 ? best : null;
  }

  /* ================== History ================== */

  function getHistory() {
    return safeParse(localStorage.getItem(HISTORY_KEY), []);
  }

  function saveHistoryItem(item) {
    const h = getHistory();
    h.unshift({ ...item, timestamp: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 500)));
  }

  /* ================== Pending Logs ================== */

  function getPendingLogs() {
    return safeParse(localStorage.getItem(PENDING_LOGS_KEY), []);
  }

  function savePendingLog(d) {
    const p = getPendingLogs();
    p.push(d);
    localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(p.slice(-100)));
  }

  async function retryPendingLogs(url) {
    if (!url) return;
    const p = getPendingLogs();
    const remain = [];
    for (const log of p) {
      try {
        await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(log) });
      } catch { remain.push(log); }
    }
    localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(remain));
  }

  /* ================== Public API (UNCHANGED) ================== */

  window.ChatbotStore = {
    loadFromServer: loadQAFromServer,
    getQA: () => getQAFromCache(),
    getQAByCategory(c) {
      const all = getQAFromCache();
      return !c || c === "all" ? all : all.filter(i => i.category === c);
    },
    getCategories() {
      const cats = [...new Set(getQAFromCache().map(i => i.category))].sort();
      return ["all", ...cats];
    },
    getCategoryLabels: () => ({ ...CATEGORY_LABELS }),
    findAnswer(text, cat) {
      const list = this.getQAByCategory(cat);
      return findBestMatch(list, text) || (cat !== "all" ? findBestMatch(getQAFromCache(), text) : null);
    },
    saveHistory: saveHistoryItem,
    getHistory,
    clearHistory() { localStorage.removeItem(HISTORY_KEY); },
    updateLocalCache(items) { setQACache(items.map(normalizeItem)); },
    searchQA(q) {
      const t = normalizeText(q);
      return getQAFromCache().filter(i =>
        normalizeText(i.question).includes(t) ||
        normalizeText(i.answer).includes(t) ||
        i.keywords.some(k => normalizeText(k).includes(t))
      );
    },
    getStats() {
      const qa = getQAFromCache();
      const h = getHistory();
      const cats = {};
      qa.forEach(i => cats[i.category] = (cats[i.category] || 0) + 1);
      return {
        totalQA: qa.length,
        totalHistory: h.length,
        matchedHistory: h.filter(x => x.matched).length,
        unmatchedHistory: h.filter(x => !x.matched).length,
        categoryCounts: cats,
        topQuestions: qa.filter(i => i.top).length
      };
    },
    getPendingLogs,
    savePendingLog,
    retryPendingLogs
  };

  window.ChatbotUtils = {
    escapeHtml,
    normalizeCategory,
    normalizeKeywords,
    normalizeText,
    createQAId,
    safeParse
  };

})();
