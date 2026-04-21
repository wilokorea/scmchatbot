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
    "에게", "한테", "께", "처럼", "보다", "라고", "하고",
    "좀", "좀요", "해주세요", "부탁", "합니다", "입니다",
    "있나요", "있을까요", "알려주세요", "말해주세요",
    "필요해", "필요합니다", "싶습니다", "싶어요",
    "뭐", "머", "어떻게", "어디", "무엇"
  ];
  var STOP_WORDS_SET = {};
  STOP_WORDS.forEach(function (w) {
    STOP_WORDS_SET[w] = true;
  });

  // ★ 변경: 의도(Intent) 분류 패턴
  var INTENT_PATTERNS = [
    { intent: "file_request",   patterns: [/엑셀/, /파일/, /다운로드/, /보내줘/, /공유/] },
    { intent: "cost_inquiry",   patterns: [/비용/, /요금/, /가격/, /얼마/, /관세/, /운임/, /단가/] },
    { intent: "customs",        patterns: [/통관/, /관세/, /세관/, /수입신고/, /hs코드/] },
    { intent: "lead_time",      patterns: [/납기/, /리드타임/, /소요기간/, /언제/, /며칠/, /기간/] },
    { intent: "stock_check",    patterns: [/재고/, /수량/, /몇개/, /남아/] },
    { intent: "product_info",   patterns: [/제품/, /종류/, /모델/, /사양/, /스펙/, /라인업/] },
    { intent: "certificate",    patterns: [/원산지/, /증명서/, /인증서/, /성적서/, /서류/] },
    { intent: "delivery_track", patterns: [/배송/, /추적/, /운송/, /도착/, /선적/] },
    { intent: "org_info",       patterns: [/업무분장/, /조직/, /담당자/, /연락처/, /누구/] },
    { intent: "process",        patterns: [/절차/, /프로세스/, /방법/, /어떻게/, /진행/] }
  ];

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

  // ★ 변경: 의미 있는 토큰만 추출 (불용어 제거 강화)
  function tokenizeContent(text) {
    var raw = stripText(text).match(/[가-힣a-z0-9]+/g) || [];
    return raw.filter(function (t) {
      return t.length >= 2 && !STOP_WORDS_SET[t];
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

  /* ================== ★ 변경: Intent 분류 ================== */
  function detectIntents(text) {
    var t = normalizeText(text);
    var intents = [];
    INTENT_PATTERNS.forEach(function (ip) {
      var matched = ip.patterns.some(function (p) { return p.test(t); });
      if (matched) intents.push(ip.intent);
    });
    return intents;
  }

  /* ================== ★ 변경: 개선된 매칭 엔진 ================== */
  function calculateMatchScore(item, input) {
    var q = normalizeText(input);
    var iq = normalizeText(item.question);
    if (!q || !iq) return 0;

    var strippedQ = stripText(q);
    var strippedIQ = stripText(iq);

    // ── 1단계: 완전 일치 (최고 점수) ──
    if (strippedQ === strippedIQ) return 100;

    // ── 2단계: 의도(Intent) 비교 ──
    var qIntents = detectIntents(q);
    var iIntents = detectIntents(iq);
    // 답변 텍스트에서도 의도를 추출 (질문이 짧을 때 답변으로 보완)
    var aIntents = detectIntents(item.answer);

    var intentMatch = false;
    var intentMismatch = false;

    if (qIntents.length > 0) {
      // 질문의 의도가 감지된 경우
      var itemIntents = iIntents.concat(aIntents);
      intentMatch = qIntents.some(function (qi) {
        return itemIntents.indexOf(qi) !== -1;
      });
      // 의도가 명확히 다르면 강한 감점
      if (!intentMatch && itemIntents.length > 0) {
        intentMismatch = true;
      }
    }

    // ── 3단계: 토큰 기반 유사도 ──
    var qTokens = tokenizeContent(q);
    var iTokens = tokenizeContent(iq);
    var keywords = item.keywords.map(function (k) { return normalizeText(k); });

    // QA 측 전체 토큰 풀 (질문 토큰 + 키워드)
    var qaTokenPool = iTokens.concat(keywords);

    var score = 0;

    if (qTokens.length > 0 && qaTokenPool.length > 0) {
      // 양방향 매칭 계산
      var qMatchCount = 0; // 사용자 토큰 중 QA에 매칭된 수
      var iMatchCount = 0; // QA 토큰 중 사용자에 매칭된 수

      qTokens.forEach(function (qt) {
        var found = qaTokenPool.some(function (it) {
          return it.includes(qt) || qt.includes(it);
        });
        if (found) qMatchCount++;
      });

      iTokens.forEach(function (it) {
        var found = qTokens.some(function (qt) {
          return qt.includes(it) || it.includes(qt);
        });
        if (found) iMatchCount++;
      });

      // 사용자 입력 커버리지 (사용자가 말한 것 중 얼마나 매칭?)
      var qCoverage = qTokens.length > 0 ? qMatchCount / qTokens.length : 0;
      // QA 질문 커버리지 (QA 질문 중 얼마나 매칭?)
      var iCoverage = iTokens.length > 0 ? iMatchCount / iTokens.length : 0;

      // 양방향 조합 (F1-score 방식)
      if (qCoverage > 0 && iCoverage > 0) {
        var f1 = 2 * (qCoverage * iCoverage) / (qCoverage + iCoverage);
        score = f1 * 80; // 최대 80점
      } else if (qCoverage > 0) {
        score = qCoverage * 50; // 한쪽만 매칭: 최대 50점
      }

      // ★ 키워드 직접 매칭 보너스
      if (keywords.length > 0) {
        var kwMatch = 0;
        keywords.forEach(function (kw) {
          if (q.includes(kw) || kw.includes(strippedQ)) kwMatch++;
        });
        if (kwMatch > 0) {
          var kwBonus = Math.min(kwMatch / keywords.length, 1) * 15;
          score += kwBonus;
        }
      }
    }

    // ── 4단계: 부분 문장 포함 보너스 (길이 비례) ──
    if (strippedIQ.includes(strippedQ) && strippedQ.length >= 4) {
      var lengthRatio = strippedQ.length / strippedIQ.length;
      var containBonus = lengthRatio * 85;
      score = Math.max(score, containBonus);
    }
    if (strippedQ.includes(strippedIQ) && strippedIQ.length >= 4) {
      var lengthRatio2 = strippedIQ.length / strippedQ.length;
      var containBonus2 = lengthRatio2 * 80;
      score = Math.max(score, containBonus2);
    }

    // ── 5단계: 의도 보정 ──
    if (intentMatch) {
      score += 10; // 의도 일치 보너스
    }
    if (intentMismatch) {
      score -= 25; // 의도 불일치 감점 (기존 15 → 25로 강화)
    }

    // ── 6단계: 단일 토큰 매칭 방지 ──
    // 사용자 토큰이 2개 이상인데 매칭된 게 1개뿐이면 점수 제한
    if (qTokens.length >= 2 && qMatchCount <= 1) {
      score = Math.min(score, 40); // 임계값 미만으로 제한
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ★ 변경: 임계값 상향 (45 → 55) + 디버그 로깅
  var MATCH_THRESHOLD = 55;

  function findBestMatch(list, text) {
    var best = null;
    var bestScore = 0;
    var debugTop3 = []; // 디버깅용

    list.forEach(function (item) {
      var s = calculateMatchScore(item, text);
      debugTop3.push({ question: item.question, score: s, category: item.category });
      if (s > bestScore) {
        bestScore = s;
        best = item;
      }
    });

    // 디버그 로깅 (개발 중 확인용, 운영 시 제거 가능)
    debugTop3.sort(function (a, b) { return b.score - a.score; });
    console.log(
      "[매칭 디버그] 입력: \"" + text + "\" | 최고점: " + bestScore +
      " | 임계값: " + MATCH_THRESHOLD +
      " | 결과: " + (bestScore >= MATCH_THRESHOLD ? "매칭" : "미매칭")
    );
    console.table(debugTop3.slice(0, 5));

    return bestScore >= MATCH_THRESHOLD ? best : null;
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
    if (!Array.isArray(p) || p.length === 0) return;

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
