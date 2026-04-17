(function () {
  const QA_KEY           = "chatbot_qa";
  const HISTORY_KEY      = "chatbot_history";
  const PENDING_LOGS_KEY = "chatbot_pending_logs";

  const CATEGORY_LABELS = {
    all: "전체", delivery: "배송", documents: "문서",
    production: "생산", purchase: "구매", other: "기타"
  };

  const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS).filter(function (c) { return c !== "all"; }));

  // ── 서버 QA API 설정 ─────────────────────────────────────────
  const QA_API_BASE = (window.CHATBOT_CONFIG && window.CHATBOT_CONFIG.qaApiBase) ||
                      (window.ADMIN_CONFIG && window.ADMIN_CONFIG.qaApiBase) ||
                      "https://scmchatbot-api-e9bdbzbgeae3ecgj.koreasouth-01.azurewebsites.net/api/qa";

  // ── 유틸 함수 ────────────────────────────────────────────────
  function safeParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed === null ? fallback : parsed;
    } catch { return fallback; }
  }

  function createQAId() {
    return "qa_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  function normalizeKeywords(value) {
    if (Array.isArray(value)) {
      return [...new Set(value.map(function (v) { return String(v || "").trim(); }).filter(Boolean))];
    }
    return [...new Set(
      String(value || "").split(/\||,|;|\//).map(function (v) { return v.trim(); }).filter(Boolean)
    )];
  }

  function normalizeCategory(value) {
    const cat = String(value || "other").trim().toLowerCase();
    return VALID_CATEGORIES.has(cat) ? cat : "other";
  }

  function normalizeCategoryDisplay(cat) { return CATEGORY_LABELS[cat] || "기타"; }

  function normalizeBoolean(val) {
    if (typeof val === "boolean") return val;
    if (typeof val === "string") {
      const lower = val.toLowerCase();
      if (lower === "true" || lower === "o" || lower === "1") return true;
    }
    return false;
  }

  function normalizeItem(item) {
    return {
      __id:      item.__id || item.id || createQAId(),
      category:  normalizeCategory(item.category),
      question:  String(item.question || "").trim(),
      keywords:  normalizeKeywords(item.keywords),
      answer:    String(item.answer   || "").trim(),
      top:       !!item.top,
      contactId: item.contactId || ""
    };
  }

  function normalizeText(value) { return String(value || "").trim().toLowerCase(); }

  function stripText(value) {
    return String(value || "").replace(/[\s?!.,·…\-_()（）「」『』""''~]/g, "").toLowerCase();
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function _fetchWithTimeout(url, options, timeoutMs) {
    timeoutMs = timeoutMs || 10000;
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    return fetch(url, Object.assign({}, options, { signal: controller.signal }))
      .finally(function () { clearTimeout(timer); });
  }

  // ── QA 캐시 (서버 → 로컬 캐시) ──────────────────────────────
  let _qaCache = null;
  let _qaCacheTime = 0;
  const CACHE_TTL = 60000; // 1분

  function getQAFromCache() {
    if (_qaCache && (Date.now() - _qaCacheTime < CACHE_TTL)) {
      return _qaCache;
    }
    // 캐시 만료 시 localStorage fallback
    const stored = safeParse(localStorage.getItem(QA_KEY), null);
    if (Array.isArray(stored) && stored.length) {
      return stored.map(normalizeItem).filter(function (i) { return i.question && i.answer; });
    }
    return [];
  }

  function setQACache(items) {
    _qaCache = items;
    _qaCacheTime = Date.now();
    // localStorage에도 동기화 (오프라인 대비)
    localStorage.setItem(QA_KEY, JSON.stringify(items));
  }

  // ── 서버에서 QA 로드 ─────────────────────────────────────────
  async function loadQAFromServer() {
    try {
      const res = await _fetchWithTimeout(QA_API_BASE + "/getAll", { method: "GET" }, 8000);
      if (!res.ok) throw new Error("QA API " + res.status);
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        const items = data.items.map(normalizeItem).filter(function (i) { return i.question && i.answer; });
        setQACache(items);
        console.log("서버 QA 로드 완료:", items.length + "건");
        return items;
      }
      throw new Error("Invalid response");
    } catch (err) {
      console.warn("서버 QA 로드 실패, 로컬 캐시 사용:", err.message);
      return getQAFromCache();
    }
  }

  function loadQA() {
    return getQAFromCache();
  }

  function saveQALocal(items) {
    const normalized = items.map(normalizeItem).filter(function (i) { return i.question && i.answer; });
    setQACache(normalized);
  }

  // ── 히스토리 ─────────────────────────────────────────────────
  function getHistory() {
    const data = safeParse(localStorage.getItem(HISTORY_KEY), []);
    return Array.isArray(data) ? data : [];
  }

  function saveHistoryItem(item) {
    const history = getHistory();
    history.unshift(Object.assign({}, item, { timestamp: item.timestamp || Date.now() }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 500)));
  }

  // ── 매칭 로직 ────────────────────────────────────────────────
  function calculateMatchScore(item, text) {
    const q            = normalizeText(text);
    const itemQuestion = normalizeText(item.question);
    if (!q) return 0;

    if (q === itemQuestion) return 100;

    const strippedQ    = stripText(text);
    const strippedItem = stripText(item.question);
    if (strippedQ && strippedItem && strippedQ === strippedItem) return 95;

    let score = 0;

    if (itemQuestion && q.includes(itemQuestion)) score = Math.max(score, 85);
    if (q.length >= 4 && itemQuestion.includes(q)) {
      score = Math.max(score, 60 + (q.length / itemQuestion.length) * 25);
    }
    if (strippedItem && strippedQ.includes(strippedItem)) score = Math.max(score, 80);
    if (strippedQ.length >= 4 && strippedItem.includes(strippedQ)) {
      score = Math.max(score, 55 + (strippedQ.length / strippedItem.length) * 25);
    }

    const validKeywords = item.keywords.filter(function(kw) {
      return normalizeText(kw).length >= 2;
    });
    const matchedKeywords = validKeywords.filter(function (kw) {
      const k = normalizeText(kw);
      const kStripped = k.replace(/\s+/g, "");
      const qStripped = q.replace(/\s+/g, "");
      return q.includes(k) || qStripped.includes(kStripped);
    });

    if (matchedKeywords.length > 0 && validKeywords.length > 0) {
      var keywordRatio = matchedKeywords.length / validKeywords.length;
      var keywordScore = 15 + (matchedKeywords.length * 8) + (keywordRatio * 25);
      score = Math.max(score, Math.min(65, keywordScore));
    }

    const qWords = q.split(/\s+/).filter(function(w) { return w.length >= 2; });
    const itemWords = itemQuestion.split(/\s+/).filter(function(w) { return w.length >= 2; });

    if (qWords.length >= 2 && itemWords.length >= 2) {
      var wordOverlap = 0;
      qWords.forEach(function(qw) {
        if (itemWords.some(function(iw) {
          if (iw === qw) return true;
          var shorter = iw.length < qw.length ? iw : qw;
          if (shorter.length < 3) return false;
          return iw.includes(qw) || qw.includes(iw);
        })) {
          wordOverlap++;
        }
      });

      var overlapRatio = wordOverlap / Math.max(qWords.length, 1);
      if (overlapRatio >= 0.5) {
        var phraseScore = 30 + (overlapRatio * 40);
        score = Math.max(score, Math.min(75, phraseScore));
      }
    }

    const intentPatterns = [
      { regex: /무엇|뭐|무슨/, intent: "what" },
      { regex: /어떻게|어떤|방법/, intent: "how" },
      { regex: /가능|되나|될까|할수/, intent: "possible" },
      { regex: /어디|어디서|위치/, intent: "where" },
      { regex: /언제|기간|얼마나/, intent: "when" },
      { regex: /왜|이유/, intent: "why" }
    ];

    var qIntent = null, itemIntent = null;
    intentPatterns.forEach(function(p) {
      if (p.regex.test(q)) qIntent = p.intent;
      if (p.regex.test(itemQuestion)) itemIntent = p.intent;
    });

    if (qIntent && itemIntent && qIntent !== itemIntent && score < 80) {
      score = Math.max(0, score - 15);
    }

    return score;
  }

  function findBestMatch(candidates, text) {
    let bestMatch = null, bestScore = 0;
    candidates.forEach(function (item) {
      const score = calculateMatchScore(item, text);
      if (score > bestScore) { bestScore = score; bestMatch = item; }
    });
    return bestScore >= 40 ? bestMatch : null;
  }

  // ── Pending Logs ─────────────────────────────────────────────
  function getPendingLogs() {
    return safeParse(localStorage.getItem(PENDING_LOGS_KEY), []);
  }
  function savePendingLog(data) {
    const pending = getPendingLogs();
    pending.push(data);
    localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(pending.slice(-100)));
  }
  function clearPendingLogs() { localStorage.removeItem(PENDING_LOGS_KEY); }

  async function retryPendingLogs(logApiUrl) {
    if (!logApiUrl) return;
    const pending = getPendingLogs();
    if (!pending.length) return;
    const remaining = [];
    for (let i = 0; i < pending.length; i++) {
      try {
        const res = await _fetchWithTimeout(logApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pending[i])
        }, 5000);
        if (!res.ok) throw new Error("retry failed " + res.status);
      } catch (e) {
        remaining.push(pending[i]);
      }
    }
    remaining.length
      ? localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(remaining.slice(-100)))
      : clearPendingLogs();
  }

  // ── Public API ───────────────────────────────────────────────
  window.ChatbotStore = {
    // 서버에서 QA 로드 (비동기 — 초기화 시 호출)
    loadFromServer: loadQAFromServer,

    getQA()                    { return loadQA(); },
    getQAByCategory(category)  {
      const all = loadQA();
      if (!category || category === "all") return all;
      return all.filter(function (item) { return item.category === category; });
    },
    getCategories() {
      const qa = loadQA();
      const cats = [...new Set(qa.map(function (i) { return i.category; }).filter(Boolean))].sort();
      return ["all", ...cats];
    },
    getCategoryLabels() { return Object.assign({}, CATEGORY_LABELS); },
    findAnswer(text, selectedCategory) {
      const candidates = this.getQAByCategory(selectedCategory === "all" ? "all" : selectedCategory);
      const found = findBestMatch(candidates, text);
      if (found) return found;
      if (selectedCategory !== "all") return findBestMatch(loadQA(), text) || null;
      return null;
    },
    saveHistory(item)  { saveHistoryItem(item); },
    getHistory()       { return getHistory(); },
    clearHistory()     { localStorage.removeItem(HISTORY_KEY); },

    // 로컬 캐시 업데이트 (admin에서 서버 저장 후 호출)
    updateLocalCache(items) { saveQALocal(items); },

    importTemplate(payload) {
      const mode     = payload && payload.mode === "append" ? "append" : "replace";
      const incoming = Array.isArray(payload && payload.data) ? payload.data.map(normalizeItem) : [];
      if (mode === "append") {
        const current   = loadQA();
        const mergedMap = new Map();
        current.forEach(function (item) { mergedMap.set(normalizeText(item.question), item); });
        incoming.forEach(function (item) {
          if (item.question && item.answer) mergedMap.set(normalizeText(item.question), item);
        });
        saveQALocal(Array.from(mergedMap.values()));
      } else {
        saveQALocal(incoming);
      }
    },
    deleteQAById(id) {
      const current = loadQA();
      const next    = current.filter(function (item) { return item.__id !== id; });
      if (next.length === current.length) return false;
      saveQALocal(next); return true;
    },
    deleteQAByIndex(index) {
      const current = loadQA();
      if (index < 0 || index >= current.length) return false;
      current.splice(index, 1); saveQALocal(current); return true;
    },
    clearQA() {
      setQACache([]);
    },
    resetToDefault() {
      setQACache([]);
    },
    searchQA(query) {
      if (!query) return this.getQA();
      const q = normalizeText(query);
      return this.getQA().filter(function (item) {
        return normalizeText(item.question).includes(q) ||
               normalizeText(item.answer).includes(q)   ||
               item.keywords.some(function (kw) { return normalizeText(kw).includes(q); });
      });
    },
    getStats() {
      const qa      = this.getQA();
      const history = this.getHistory();
      const cats    = {};
      qa.forEach(function (item) { cats[item.category] = (cats[item.category] || 0) + 1; });
      return {
        totalQA:          qa.length,
        totalHistory:     history.length,
        matchedHistory:   history.filter(function (h) { return h.matched; }).length,
        unmatchedHistory: history.filter(function (h) { return !h.matched; }).length,
        categoryCounts:   cats,
        topQuestions:     qa.filter(function (item) { return item.top; }).length
      };
    },
    getPendingLogs,
    savePendingLog,
    clearPendingLogs,
    retryPendingLogs
  };

  window.ChatbotUtils = {
    escapeHtml, normalizeCategory, normalizeCategoryDisplay,
    normalizeKeywords, normalizeBoolean, normalizeText,
    createQAId, safeParse
  };
})();
