(function () {
  "use strict";

  var QA_KEY = "chatbot_qa";
  var HISTORY_KEY = "chatbot_history";
  var PENDING_LOGS_KEY = "chatbot_pending_logs";

  var CATEGORY_LABELS = {
    all: "전체",
    delivery: "배송",
    documents: "서류",
    production: "생산",
    purchase: "구매",
    other: "기타"
  };

  var VALID_CATEGORIES_LIST = Object.keys(CATEGORY_LABELS).filter(function (c) {
    return c !== "all";
  });
  var VALID_CATEGORIES = {};
  VALID_CATEGORIES_LIST.forEach(function (c) {
    VALID_CATEGORIES[c] = true;
  });

  /* ── 한글 조사 필터링 ── */
  var STOP_WORDS = [
    "은", "는", "이", "가", "을", "를", "의", "에", "에서",
    "로", "으로", "와", "과", "도", "만", "까지", "부터",
    "에게", "한테", "께", "처럼", "보다", "라고", "하고"
  ];
  var STOP_WORDS_SET = {};
  STOP_WORDS.forEach(function (w) {
    STOP_WORDS_SET[w] = true;
  });

  function getQAApiBase() {
    return (
      (window.CHATBOT_CONFIG && window.CHATBOT_CONFIG.qaApiBase) ||
      (window.ADMIN_CONFIG && window.ADMIN_CONFIG.qaApiBase) ||
      "https://scmchatbot-api-e9bdbzbgeae3ecgj.koreasouth-01.azurewebsites.net/api/qa"
    );
  }

  /* ================== Utils ================== */

 function safeParse(v, fb) {
  try {
    var result = JSON.parse(v);
    // null이나 undefined면 fallback 반환
    if (result === null || result === undefined) return fb;
    return result;
  } catch (e) {
    return fb;
  }
}


  function normalizeText(v) {
    return String(v || "").trim().toLowerCase();
  }

  function stripText(v) {
    return normalizeText(v).replace(/[\s?!.,·…\-_()（）「」『』""''~]/g, "");
  }

  function tokenize(text) {
    var raw = stripText(text).match(/[가-힣a-z0-9]+/g) || [];
    return raw.filter(function (t) {
      return t.length >= 2 || !STOP_WORDS_SET[t];
    });
  }

  function normalizeKeywords(v) {
    var arr;
    if (Array.isArray(v)) {
      arr = v.map(function (x) { return normalizeText(x); }).filter(Boolean);
    } else {
      arr = String(v || "")
        .split(/[|,;\/]/)
        .map(function (x) { return normalizeText(x); })
        .filter(Boolean);
    }
    var seen = {};
    return arr.filter(function (item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function normalizeCategory(v) {
    var c = normalizeText(v);
    return VALID_CATEGORIES[c] ? c : "other";
  }

  function normalizeCategoryDisplay(v) {
    var c = normalizeCategory(v);
    return CATEGORY_LABELS[c] || c;
  }

  function normalizeBoolean(v) {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      var s = v.trim().toLowerCase();
      return s === "true" || s === "1" || s === "o" || s === "yes" || s === "y";
    }
    return !!v;
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
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    options = options || {};
    timeoutMs = timeoutMs || 10000;
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, timeoutMs);
    return fetch(url, Object.assign({}, options, { signal: controller.signal }))
      .finally(function () {
        clearTimeout(timer);
      });
  }

  /* ================== Cache ================== */

  var _qaCache = null;
  var _qaCacheTime = 0;
  var CACHE_TTL = 60000;

  function setQACache(items) {
    _qaCache = items;
    _qaCacheTime = Date.now();
    try {
      localStorage.setItem(QA_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("localStorage 저장 실패:", e);
    }
  }

  function getQAFromCache() {
    if (_qaCache && Date.now() - _qaCacheTime < CACHE_TTL) return _qaCache;
    var stored = safeParse(localStorage.getItem(QA_KEY), []);
    var items = stored.map(normalizeItem).filter(function (i) {
      return i.question && i.answer;
    });
    _qaCache = items;
    _qaCacheTime = Date.now();
    return items;
  }

  async function loadQAFromServer() {
    try {
      var res = await fetchWithTimeout(getQAApiBase() + "/getAll", { method: "GET" }, 10000);
      var data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        var items = data.items.map(normalizeItem);
        setQACache(items);
        return items;
      }
    } catch (e) {
      console.warn("QA API 실패, 로컬 사용:", e);
    }
    return getQAFromCache();
  }

  /* ================== Matching Engine ================== */

  function calculateMatchScore(item, input) {
    var q = normalizeText(input);
    var iq = normalizeText(item.question);
    if (!q) return 0;

    // 완전 일치
    if (q === iq) return 100;
    if (stripText(q) === stripText(iq)) return 95;

    var score = 0;

    // 부분 문장 포함
    if (iq.includes(q)) score = Math.max(score, 85);
    if (q.includes(iq)) score = Math.max(score, 90);

    // 토큰 겹침
    var qTokens = tokenize(q);
    var iTokens = tokenize(iq);
    var keywords = iTokens.concat(
      item.keywords.map(function (k) { return normalizeText(k); })
    );

    if (qTokens.length > 0 && keywords.length > 0) {
      var overlap = 0;
      qTokens.forEach(function (t) {
        if (
          keywords.some(function (k) {
            return k.includes(t) || t.includes(k);
          })
        ) {
          overlap++;
        }
      });

      if (overlap > 0) {
        // qTokens 기준 비율로 계산 (사용자 입력 대비 얼마나 매칭되었는지)
        var ratio = overlap / qTokens.length;
        score = Math.max(score, ratio * 70);
      }
    }

    // 의도 패턴 불일치 감점
    var intents = [
      { r: /무엇|뭐|무슨/, i: "what" },
      { r: /어떻게|방법/, i: "how" },
      { r: /가능|되나|될까/, i: "possible" },
      { r: /어디|위치/, i: "where" },
      { r: /언제|기간/, i: "when" },
      { r: /왜|이유/, i: "why" }
    ];

    var qi = null, ii = null;
    intents.forEach(function (p) {
      if (p.r.test(q)) qi = p.i;
      if (p.r.test(iq)) ii = p.i;
    });

    if (qi && ii && qi !== ii) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  function findBestMatch(list, text) {
    var best = null;
    var bestScore = 0;
    list.forEach(function (item) {
      var s = calculateMatchScore(item, text);
      if (s > bestScore) {
        bestScore = s;
        best = item;
      }
    });
    return bestScore >= 45 ? best : null;
  }

  /* ================== History ================== */

  function getHistory() {
    return safeParse(localStorage.getItem(HISTORY_KEY), []);
  }

  function saveHistoryItem(item) {
    var h = getHistory();
    h.unshift(Object.assign({}, item, { timestamp: Date.now() }));
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 500)));
    } catch (e) {
      console.warn("히스토리 저장 실패:", e);
    }
  }

  /* ================== Pending Logs ================== */

  function getPendingLogs() {
    return safeParse(localStorage.getItem(PENDING_LOGS_KEY), []);
  }

  function savePendingLog(d) {
    var p = getPendingLogs();
    p.push(d);
    try {
      localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(p.slice(-100)));
    } catch (e) {
      console.warn("pending log 저장 실패:", e);
    }
  }

  async function retryPendingLogs(url) {
    if (!url) return;
    var p = getPendingLogs();
    if (p.length === 0) return;
    var remain = [];
    for (var i = 0; i < p.length; i++) {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p[i])
        });
      } catch (e) {
        remain.push(p[i]);
      }
    }
    try {
      localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(remain));
    } catch (e) {
      console.warn("pending log 업데이트 실패:", e);
    }
  }

  /* ================== Public API ================== */

  window.ChatbotStore = {
    loadFromServer: loadQAFromServer,

    getQA: function () {
      return getQAFromCache();
    },

    getQAByCategory: function (c) {
      var all = getQAFromCache();
      if (!c || c === "all") return all;
      return all.filter(function (i) {
        return i.category === c;
      });
    },

    getCategories: function () {
      var seen = {};
      var cats = [];
      getQAFromCache().forEach(function (i) {
        if (!seen[i.category]) {
          seen[i.category] = true;
          cats.push(i.category);
        }
      });
      cats.sort();
      return ["all"].concat(cats);
    },

    getCategoryLabels: function () {
      return Object.assign({}, CATEGORY_LABELS);
    },

    findAnswer: function (text, cat) {
      var list = this.getQAByCategory(cat);
      var result = findBestMatch(list, text);
      if (result) return result;
      if (cat !== "all") return findBestMatch(getQAFromCache(), text);
      return null;
    },

    saveHistory: saveHistoryItem,
    getHistory: getHistory,

    clearHistory: function () {
      try {
        localStorage.removeItem(HISTORY_KEY);
      } catch (e) {
        console.warn("히스토리 삭제 실패:", e);
      }
    },

    updateLocalCache: function (items) {
      setQACache(items.map(normalizeItem));
    },

    searchQA: function (q) {
      var t = normalizeText(q);
      return getQAFromCache().filter(function (i) {
        return (
          normalizeText(i.question).includes(t) ||
          normalizeText(i.answer).includes(t) ||
          i.keywords.some(function (k) {
            return normalizeText(k).includes(t);
          })
        );
      });
    },

    getStats: function () {
      var qa = getQAFromCache();
      var h = getHistory();
      var cats = {};
      qa.forEach(function (i) {
        cats[i.category] = (cats[i.category] || 0) + 1;
      });
      return {
        totalQA: qa.length,
        totalHistory: h.length,
        matchedHistory: h.filter(function (x) { return x.matched; }).length,
        unmatchedHistory: h.filter(function (x) { return !x.matched; }).length,
        categoryCounts: cats,
        topQuestions: qa.filter(function (i) { return i.top; }).length
      };
    },

    getPendingLogs: getPendingLogs,
    savePendingLog: savePendingLog,
    retryPendingLogs: retryPendingLogs
  };

  window.ChatbotUtils = {
    escapeHtml: escapeHtml,
    normalizeCategory: normalizeCategory,
    normalizeCategoryDisplay: normalizeCategoryDisplay,
    normalizeKeywords: normalizeKeywords,
    normalizeBoolean: normalizeBoolean,
    normalizeText: normalizeText,
    createQAId: createQAId,
    safeParse: safeParse,
    fetchWithTimeout: fetchWithTimeout
  };
})();
