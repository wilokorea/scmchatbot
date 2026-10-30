(function (window) {
  "use strict";

  /* =========================================================
     SCM FAQ BOT - shared.js
     - index.html / admin.html 공통 모듈
     - 한국어 토큰, 동의어, aliases, intent 기반 매칭
     - 카테고리/저장소 키/서버 응답 형식 통일
     ========================================================= */

  var STORAGE_KEYS = {
    qa: "scmFaqQaCacheV2",
    history: "scmFaqHistoryV2",
    pendingLogs: "scmFaqPendingLogsV2"
  };

  var CATEGORY_ORDER = [
    "all", "product", "logistics", "origin",
    "production", "cost", "system"
  ];

  var CATEGORY_LABELS = {
    all: "전체",
    product: "제품 주문/도입",
    logistics: "배송/통관",
    origin: "원산지/FTA",
    production: "생산/공급계획",
    cost: "비용/결재",
    system: "시스템/조회"
  };

  var CATEGORY_ALIASES = {
    all: "all", "전체": "all",
    product: "product", products: "product", order: "product",
    purchase: "product", purchasing: "product", procurement: "product",
    "제품 주문/도입": "product", "제품주문/도입": "product",
    "제품 주문": "product", "제품주문": "product", "주문/도입": "product",
    "주문": "product", "도입": "product", "발주": "product", "구매": "product",
    logistics: "logistics", logistic: "logistics", delivery: "logistics",
    shipping: "logistics", customs: "logistics", "배송/통관": "logistics",
    "배송": "logistics", "통관": "logistics", "물류": "logistics", "운송": "logistics",
    origin: "origin", fta: "origin", documents: "origin", document: "origin",
    "원산지/FTA": "origin", "원산지/fta": "origin", "원산지": "origin",
    "서류": "origin", "증명서": "origin",
    production: "production", supply: "production", planning: "production",
    "생산/공급계획": "production", "생산": "production",
    "공급계획": "production", "공급 계획": "production", mrp: "production",
    cost: "cost", expense: "cost", approval: "cost", "비용/결재": "cost",
    "비용": "cost", "결재": "cost", "품의": "cost",
    system: "system", lookup: "system", inquiry: "system",
    "시스템/조회": "system", "시스템": "system", "조회": "system", sap: "system",
    other: "system", "기타": "system"
  };

  var STOP_WORDS = [
    "은", "는", "이", "가", "을", "를", "의", "에", "에서", "로", "으로",
    "와", "과", "도", "만", "까지", "부터", "에게", "한테", "께", "처럼", "보다",
    "라고", "하고", "좀", "좀요", "해주세요", "부탁", "합니다", "입니다",
    "있나요", "있을까요", "알려주세요", "말해주세요", "필요해", "필요합니다",
    "싶습니다", "싶어요", "뭐", "머", "무엇", "어떻게", "관련", "문의"
  ];

  var STOP_WORDS_SET = {};
  STOP_WORDS.forEach(function (word) { STOP_WORDS_SET[word] = true; });

  var SYNONYM_GROUPS = [
    ["발주", "po", "purchase order", "발주서", "구매오더"],
    ["변경", "수정", "정정", "바꾸기", "바꿔", "고치기"],
    ["취소", "삭제", "캔슬", "cancel"],
    ["납기", "납기일", "입고일", "도착일", "리드타임", "lead time", "leadtime"],
    ["업체", "거래처", "vendor", "supplier", "공급사"],
    ["재고", "stock", "재고량", "재고수량"],
    ["배송", "운송", "delivery", "출하", "shipping", "shipment"],
    ["구매", "purchase", "procurement"],
    ["가격", "금액", "비용", "단가", "price", "cost"],
    ["담당자", "담당", "연락처"],
    ["서류", "문서", "document", "documents"],
    ["증명서", "인증서", "certificate", "성적서"],
    ["원산지", "coo", "certificate of origin"],
    ["제품", "상품", "모델", "product", "자재", "material"],
    ["통관", "customs", "수입신고", "세관"],
    ["조회", "확인", "검색", "찾기"]
  ];

  var SYNONYM_MAP = {};
  SYNONYM_GROUPS.forEach(function (group) {
    var canonical = String(group[0]).toLowerCase();
    group.forEach(function (word) {
      SYNONYM_MAP[String(word).trim().toLowerCase()] = canonical;
    });
  });

  var INTENT_PATTERNS = [
    { intent: "file_request", patterns: [/엑셀/, /파일/, /다운로드/, /양식/, /템플릿/] },
    { intent: "cost_inquiry", patterns: [/비용/, /요금/, /가격/, /얼마/, /관세/, /운임/, /단가/] },
    { intent: "customs", patterns: [/통관/, /관세/, /세관/, /수입신고/, /hs\s*코드/i, /hscode/i] },
    { intent: "lead_time", patterns: [/납기/, /납기일/, /리드타임/, /소요기간/, /배송기간/] },
    { intent: "stock_check", patterns: [/재고/, /재고량/, /재고수량/] },
    { intent: "product_info", patterns: [/제품/, /자재/, /종류/, /모델/, /사양/, /스펙/, /라인업/] },
    { intent: "certificate", patterns: [/원산지/, /증명서/, /인증서/, /성적서/, /fta/i, /coo/i] },
    { intent: "delivery_track", patterns: [/배송/, /배송조회/, /추적/, /운송/, /도착/, /선적/, /출하/] },
    { intent: "org_info", patterns: [/업무분장/, /조직/, /담당자/, /연락처/] },
    { intent: "process", patterns: [/절차/, /프로세스/, /방법/, /진행방법/] },
    { intent: "system_lookup", patterns: [/sap/i, /조회/, /tcode/i, /트랜잭션/, /테이블/] }
  ];

  var DIRECT_THRESHOLD = 68;
  var SUGGEST_THRESHOLD = 34;
  var MIN_GAP_FOR_DIRECT = 9;
  var CACHE_TTL = 60000;
  var qaCache = null;
  var qaCacheTime = 0;

  function safeJsonParse(value, fallback) {
    try {
      var parsed = JSON.parse(value);
      return parsed == null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function storageGet(key, fallback) {
    try {
      return safeJsonParse(window.localStorage.getItem(key), fallback);
    } catch (error) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("localStorage 저장 실패:", error);
      return false;
    }
  }

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .trim().toLowerCase().replace(/\s+/g, " ");
  }

  function stripText(value) {
    return normalizeText(value)
      .replace(/[\s?!.,·…\-_()（）「」『』\[\]{}"“”'‘’~:;|/\\]/g, "");
  }

  function cleanForTokens(value) {
    return normalizeText(value)
      .replace(/[?!.,·…\-_()（）「」『』\[\]{}"“”'‘’~:;|/\\]/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  function normalizeToken(token) {
    var value = normalizeText(token);
    return SYNONYM_MAP[value] || value;
  }

  function tokenizeContent(text) {
    var raw = cleanForTokens(text).match(/[가-힣a-z0-9]+/g) || [];
    var seen = {};
    return raw.map(normalizeToken).filter(function (token) {
      if (token.length < 2 || STOP_WORDS_SET[token] || seen[token]) return false;
      seen[token] = true;
      return true;
    });
  }

  function normalizeKeywords(value) {
    var array = Array.isArray(value) ? value : String(value || "").split(/[|,;\/\n]/);
    var seen = {};
    return array.map(function (item) { return normalizeText(item); })
      .filter(function (item) {
        if (!item || seen[item]) return false;
        seen[item] = true;
        return true;
      });
  }

  function normalizeCategory(value) {
    var raw = normalizeText(value).replace(/[📦🚚🌍🏭💰💻]/g, "").trim();
    if (!raw) return "system";
    if (CATEGORY_ALIASES[raw] != null) return CATEGORY_ALIASES[raw];
    if (/제품|주문|도입|발주|구매/.test(raw)) return "product";
    if (/배송|통관|물류|운송|선적|출하/.test(raw)) return "logistics";
    if (/원산지|fta|증명서|인증서/.test(raw)) return "origin";
    if (/생산|공급|mrp/.test(raw)) return "production";
    if (/비용|결재|품의|단가|가격/.test(raw)) return "cost";
    if (/시스템|조회|sap|report|테이블/.test(raw)) return "system";
    return raw === "all" ? "all" : "system";
  }

  function normalizeCategoryDisplay(value) {
    var category = normalizeCategory(value);
    return CATEGORY_LABELS[category] || String(value || "미분류");
  }

  function normalizeBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    return ["true", "1", "o", "yes", "y", "on", "예", "사용", "노출"]
      .indexOf(normalizeText(value)) >= 0;
  }

  function createQAId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "qa_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  function normalizeItem(item) {
    item = item || {};
    return {
      __id: item.__id || item.id || createQAId(),
      category: normalizeCategory(item.category),
      question: String(item.question || "").trim(),
      keywords: normalizeKeywords(item.keywords),
      aliases: normalizeKeywords(item.aliases),
      answer: String(item.answer || "").trim(),
      top: normalizeBoolean(item.top),
      contactId: String(item.contactId || "")
    };
  }

  function normalizeList(items) {
    if (!Array.isArray(items)) return [];
    return items.map(normalizeItem).filter(function (item) {
      return !!item.question && !!item.answer;
    });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    var timeout = Number(timeoutMs || 10000);
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var requestOptions = Object.assign({}, options || {});
    var timer = null;
    if (controller) {
      requestOptions.signal = controller.signal;
      timer = window.setTimeout(function () { controller.abort(); }, timeout);
    }
    return window.fetch(url, requestOptions).finally(function () {
      if (timer) window.clearTimeout(timer);
    });
  }

function getQAApiBase() {
  var config = window.CHATBOT_CONFIG || window.ADMIN_CONFIG || {};
  return String(
    config.qaApiBase ||
    "https://scmchatbot-api-e9bdbzbgeae3ecgj.koreasouth-01.azurewebsites.net/api/qa"
  ).replace(/\/$/, "");
}

  function detectIntents(text) {
    var value = normalizeText(text);
    var intents = [];
    INTENT_PATTERNS.forEach(function (entry) {
      if (entry.patterns.some(function (pattern) { return pattern.test(value); })) {
        intents.push(entry.intent);
      }
    });
    return intents;
  }

  function intersectionCount(a, b) {
    var lookup = {};
    b.forEach(function (value) { lookup[value] = true; });
    return a.reduce(function (count, value) { return count + (lookup[value] ? 1 : 0); }, 0);
  }

  function tokenSimilarity(a, b) {
    var tokensA = tokenizeContent(a);
    var tokensB = tokenizeContent(b);
    if (!tokensA.length || !tokensB.length) return 0;

    function isMatch(x, y) {
      if (x === y) return true;
      if (x.length < 2 || y.length < 2) return false;
      return x.indexOf(y) >= 0 || y.indexOf(x) >= 0;
    }

    var matchedA = tokensA.filter(function (aToken) {
      return tokensB.some(function (bToken) { return isMatch(aToken, bToken); });
    }).length;
    var matchedB = tokensB.filter(function (bToken) {
      return tokensA.some(function (aToken) { return isMatch(aToken, bToken); });
    }).length;
    var precision = matchedA / tokensA.length;
    var recall = matchedB / tokensB.length;
    return precision && recall ? (2 * precision * recall) / (precision + recall) : 0;
  }

  function phraseHit(input, phrase) {
    var compactInput = stripText(input);
    var compactPhrase = stripText(phrase);
    if (!compactPhrase) return false;
    if (compactInput.indexOf(compactPhrase) >= 0) return true;
    var phraseTokens = tokenizeContent(phrase);
    var inputTokens = tokenizeContent(input);
    return phraseTokens.length > 0 && intersectionCount(phraseTokens, inputTokens) === phraseTokens.length;
  }

  function calculateMatchScore(item, input, selectedCategory) {
    var userQuestion = normalizeText(input);
    var faqQuestion = normalizeText(item.question);
    if (!userQuestion || !faqQuestion) return 0;

    var strippedUser = stripText(userQuestion);
    var strippedFAQ = stripText(faqQuestion);
    if (strippedUser === strippedFAQ) return 100;

    var score = tokenSimilarity(userQuestion, faqQuestion) * 62;

    if (strippedUser.length >= 4 && strippedFAQ.indexOf(strippedUser) >= 0) {
      score = Math.max(score, 62 + Math.min(22, strippedUser.length / strippedFAQ.length * 22));
    }
    if (strippedFAQ.length >= 4 && strippedUser.indexOf(strippedFAQ) >= 0) {
      score = Math.max(score, 60 + Math.min(20, strippedFAQ.length / strippedUser.length * 20));
    }

    var keywordHits = (item.keywords || []).filter(function (keyword) {
      return phraseHit(userQuestion, keyword);
    }).length;
    score += Math.min(20, keywordHits * 7);

    var bestAliasScore = 0;
    (item.aliases || []).forEach(function (alias) {
      var strippedAlias = stripText(alias);
      if (!strippedAlias) return;
      if (strippedAlias === strippedUser) {
        bestAliasScore = Math.max(bestAliasScore, 98);
        return;
      }
      bestAliasScore = Math.max(bestAliasScore, tokenSimilarity(userQuestion, alias) * 90);
      if (strippedAlias.length >= 4 &&
          (strippedAlias.indexOf(strippedUser) >= 0 || strippedUser.indexOf(strippedAlias) >= 0)) {
        bestAliasScore = Math.max(bestAliasScore, 80);
      }
    });
    score = Math.max(score, bestAliasScore);

    var userIntents = detectIntents(userQuestion);
    var faqIntents = detectIntents([faqQuestion, (item.keywords || []).join(" "),
      (item.aliases || []).join(" "), item.answer].join(" "));
    if (userIntents.length) {
      var matchedIntentCount = intersectionCount(userIntents, faqIntents);
      if (matchedIntentCount) score += Math.min(10, matchedIntentCount * 5);
      else if (faqIntents.length) score -= 8;
    }

    if (selectedCategory && selectedCategory !== "all") {
      score += item.category === normalizeCategory(selectedCategory) ? 5 : -4;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function rankMatches(list, text, category) {
    var ranked = list.map(function (item) {
      return { item: item, score: calculateMatchScore(item, text, category) };
    }).sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (!!b.item.top !== !!a.item.top) return b.item.top ? 1 : -1;
      return String(a.item.question).localeCompare(String(b.item.question), "ko");
    });

    if (window.CHATBOT_CONFIG && window.CHATBOT_CONFIG.debugMatching &&
        window.console && console.table) {
      console.log("[SCM FAQ 매칭] 입력:", text);
      console.table(ranked.slice(0, 5).map(function (result) {
        return { score: result.score, category: result.item.category, question: result.item.question };
      }));
    }
    return ranked;
  }

  function getMatchResult(list, text, category) {
    var input = String(text == null ? "" : text).trim();
    if (!input) return { status: "none", item: null, score: 0, candidates: [] };

    var usable = Array.isArray(list) ? list : [];
    var ranked = rankMatches(usable, input, category || "all");
    if (!ranked.length) return { status: "none", item: null, score: 0, candidates: [] };

    var first = ranked[0];
    var secondScore = ranked[1] ? ranked[1].score : 0;
    var gap = first.score - secondScore;

    if (first.score >= DIRECT_THRESHOLD && (gap >= MIN_GAP_FOR_DIRECT || first.score >= 90)) {
      return { status: "matched", item: first.item, score: first.score, candidates: ranked.slice(0, 3) };
    }
    if (first.score >= SUGGEST_THRESHOLD) {
      return {
        status: "suggest", item: null, score: first.score,
        candidates: ranked.filter(function (result) {
          return result.score >= SUGGEST_THRESHOLD;
        }).slice(0, 3)
      };
    }
    return { status: "none", item: null, score: first.score, candidates: ranked.slice(0, 3) };
  }

  function setQACache(items) {
    qaCache = normalizeList(items);
    qaCacheTime = Date.now();
    storageSet(STORAGE_KEYS.qa, qaCache);
    return qaCache.slice();
  }

  function getQAFromCache() {
    if (qaCache && Date.now() - qaCacheTime < CACHE_TTL) return qaCache.slice();
    qaCache = normalizeList(storageGet(STORAGE_KEYS.qa, []));
    qaCacheTime = Date.now();
    return qaCache.slice();
  }

  async function loadQAFromServer() {
    try {
      var response = await fetchWithTimeout(getQAApiBase() + "/getAll", {
        method: "GET", headers: { Accept: "application/json" }
      }, ((window.CHATBOT_CONFIG || window.ADMIN_CONFIG || {}).requestTimeoutMs || 15000));
      if (!response.ok) throw new Error("QA API " + response.status);
      var data = await response.json();
      var items = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : null);
      if (!items) throw new Error("FAQ 데이터 형식 오류");
      return setQACache(items);
    } catch (error) {
      console.warn("QA API 실패, 로컬 캐시 사용:", error);
      return getQAFromCache();
    }
  }

  function getHistory() {
    var history = storageGet(STORAGE_KEYS.history, []);
    return Array.isArray(history) ? history : [];
  }

  function saveHistoryItem(item) {
    var history = getHistory();
    var payload = Object.assign({}, item || {});
    if (!payload.timestamp) payload.timestamp = Date.now();
    history.unshift(payload);
    storageSet(STORAGE_KEYS.history, history.slice(0, 500));
  }

  function getPendingLogs() {
    var pending = storageGet(STORAGE_KEYS.pendingLogs, []);
    return Array.isArray(pending) ? pending : [];
  }

  function savePendingLog(data) {
    var pending = getPendingLogs();
    pending.push(Object.assign({}, data || {}, { pendingSavedAt: new Date().toISOString() }));
    storageSet(STORAGE_KEYS.pendingLogs, pending.slice(-200));
  }

  async function retryPendingLogs(url) {
    var target = String(url || "").trim();
    if (!target) return { sent: 0, remaining: getPendingLogs().length };
    var pending = getPendingLogs();
    if (!pending.length) return { sent: 0, remaining: 0 };

    var remain = [];
    var sent = 0;
    for (var i = 0; i < pending.length; i += 1) {
      try {
        var response = await fetchWithTimeout(target, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pending[i])
        }, 10000);
        if (!response.ok) throw new Error("HTTP " + response.status);
        sent += 1;
      } catch (error) {
        remain.push(pending[i]);
      }
    }
    storageSet(STORAGE_KEYS.pendingLogs, remain);
    return { sent: sent, remaining: remain.length };
  }

  window.ChatbotStore = {
    loadFromServer: loadQAFromServer,
    getQA: getQAFromCache,
    getQAByCategory: function (category) {
      var all = getQAFromCache();
      var normalized = category === "all" ? "all" : normalizeCategory(category);
      return normalized === "all" ? all : all.filter(function (item) {
        return item.category === normalized;
      });
    },
    getCategories: function () { return CATEGORY_ORDER.slice(); },
    getCategoryLabels: function () { return Object.assign({}, CATEGORY_LABELS); },
    findAnswer: function (text, category) {
      var result = getMatchResult(getQAFromCache(), text, category || "all");
      return result.status === "matched" ? result.item : null;
    },
    findAnswerSmart: function (text, category) {
      return getMatchResult(getQAFromCache(), text, category || "all");
    },
    saveHistory: saveHistoryItem,
    getHistory: getHistory,
    clearHistory: function () { storageSet(STORAGE_KEYS.history, []); },
    updateLocalCache: setQACache,
    searchQA: function (query) {
      var text = normalizeText(query);
      if (!text) return getQAFromCache();
      return getQAFromCache().filter(function (item) {
        return normalizeText([
          item.question, item.answer, (item.keywords || []).join(" "),
          (item.aliases || []).join(" ")
        ].join(" ")).indexOf(text) >= 0;
      });
    },
    getStats: function () {
      var qa = getQAFromCache();
      var history = getHistory();
      var categories = {};
      qa.forEach(function (item) {
        categories[item.category] = (categories[item.category] || 0) + 1;
      });
      return {
        totalQA: qa.length,
        totalHistory: history.length,
        matchedHistory: history.filter(function (item) { return !!item.matched; }).length,
        unmatchedHistory: history.filter(function (item) { return !item.matched; }).length,
        categoryCounts: categories,
        topQuestions: qa.filter(function (item) { return !!item.top; }).length
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
    safeParse: safeJsonParse,
    fetchWithTimeout: fetchWithTimeout
  };

})(window);
