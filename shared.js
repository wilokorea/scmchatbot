(function () {
  "use strict";

  /* =========================================================
     SCM FAQ BOT - shared.js
     - 한국어 토큰 매칭 개선
     - 동의어 처리
     - keywords / aliases 지원
     - Intent 보조 판정
     - 카테고리 가산점
     - TOP 후보 및 확신도 판정
     ========================================================= */

  var QA_KEY = "chatbot_qa";
  var HISTORY_KEY = "chatbot_history";
  var PENDING_LOGS_KEY = "chatbot_pending_logs";

  /* =========================
     카테고리
     ========================= */

  var CATEGORY_LABELS = {
    all: "전체",
    delivery: "배송",
    documents: "서류",
    production: "생산",
    purchase: "구매",
    other: "기타"
  };

  var VALID_CATEGORIES = {};

  Object.keys(CATEGORY_LABELS)
    .filter(function (c) {
      return c !== "all";
    })
    .forEach(function (c) {
      VALID_CATEGORIES[c] = true;
    });


  /* =========================
     한국어 불용어
     ========================= */

  var STOP_WORDS = [
    "은", "는", "이", "가",
    "을", "를", "의",
    "에", "에서",
    "로", "으로",
    "와", "과",
    "도", "만",
    "까지", "부터",
    "에게", "한테", "께",
    "처럼", "보다",
    "라고", "하고",

    "좀",
    "좀요",
    "해주세요",
    "부탁",
    "합니다",
    "입니다",

    "있나요",
    "있을까요",
    "알려주세요",
    "말해주세요",

    "필요해",
    "필요합니다",
    "싶습니다",
    "싶어요",

    "뭐",
    "머",
    "무엇"
  ];

  var STOP_WORDS_SET = {};

  STOP_WORDS.forEach(function (word) {
    STOP_WORDS_SET[word] = true;
  });


  /* =========================================================
     동의어 사전

     회사에서 사용하는 용어가 생기면 여기에 추가하면 됩니다.

     예:
     ["발주", "po", "발주서"]
     ========================================================= */

  var SYNONYM_GROUPS = [

    [
      "발주",
      "po",
      "purchase order",
      "발주서"
    ],

    [
      "변경",
      "수정",
      "정정",
      "바꾸기",
      "바꿔",
      "고치기"
    ],

    [
      "취소",
      "삭제",
      "캔슬",
      "cancel"
    ],

    [
      "납기",
      "납기일",
      "입고일",
      "도착일",
      "리드타임",
      "lead time"
    ],

    [
      "업체",
      "거래처",
      "vendor",
      "supplier",
      "공급사"
    ],

    [
      "재고",
      "stock",
      "재고량"
    ],

    [
      "배송",
      "운송",
      "delivery",
      "출하"
    ],

    [
      "구매",
      "purchase"
    ],

    [
      "가격",
      "금액",
      "비용",
      "단가",
      "price"
    ],

    [
      "담당자",
      "담당",
      "연락처"
    ],

    [
      "서류",
      "문서",
      "document"
    ],

    [
      "증명서",
      "인증서",
      "certificate"
    ],

    [
      "원산지",
      "coo"
    ],

    [
      "제품",
      "상품",
      "모델",
      "product"
    ]
  ];


  /* =========================
     동의어 MAP 생성
     ========================= */

  var SYNONYM_MAP = {};

  SYNONYM_GROUPS.forEach(function (group) {

    var canonical = group[0];

    group.forEach(function (word) {

      SYNONYM_MAP[
        String(word).toLowerCase()
      ] = canonical;

    });

  });


  /* =========================================================
     Intent 패턴

     너무 일반적인 "언제", "보내줘" 등은
     오탐 방지를 위해 제외했습니다.
     ========================================================= */

  var INTENT_PATTERNS = [

    {
      intent: "file_request",
      patterns: [
        /엑셀/,
        /파일/,
        /다운로드/,
        /양식/,
        /템플릿/
      ]
    },

    {
      intent: "cost_inquiry",
      patterns: [
        /비용/,
        /요금/,
        /가격/,
        /얼마/,
        /관세/,
        /운임/,
        /단가/
      ]
    },

    {
      intent: "customs",
      patterns: [
        /통관/,
        /관세/,
        /세관/,
        /수입신고/,
        /hs\s*코드/
      ]
    },

    {
      intent: "lead_time",
      patterns: [
        /납기/,
        /납기일/,
        /리드타임/,
        /소요기간/,
        /배송기간/
      ]
    },

    {
      intent: "stock_check",
      patterns: [
        /재고/,
        /재고량/,
        /재고수량/
      ]
    },

    {
      intent: "product_info",
      patterns: [
        /제품/,
        /종류/,
        /모델/,
        /사양/,
        /스펙/,
        /라인업/
      ]
    },

    {
      intent: "certificate",
      patterns: [
        /원산지/,
        /증명서/,
        /인증서/,
        /성적서/
      ]
    },

    {
      intent: "delivery_track",
      patterns: [
        /배송/,
        /배송조회/,
        /추적/,
        /운송/,
        /도착/,
        /선적/,
        /출하/
      ]
    },

    {
      intent: "org_info",
      patterns: [
        /업무분장/,
        /조직/,
        /담당자/,
        /연락처/
      ]
    },

    {
      intent: "process",
      patterns: [
        /절차/,
        /프로세스/,
        /방법/,
        /진행방법/
      ]
    }

  ];


  /* =========================================================
     QA API 주소
     ========================================================= */

  function getQAApiBase() {

    return (
      (
        window.CHATBOT_CONFIG &&
        window.CHATBOT_CONFIG.qaApiBase
      ) ||

      (
        window.ADMIN_CONFIG &&
        window.ADMIN_CONFIG.qaApiBase
      ) ||

      "https://scmchatbot-api-e9bdbzbgeae3ecgj.koreasouth-01.azurewebsites.net/api/qa"
    );

  }


  /* =========================================================
     기본 Utils
     ========================================================= */

  function safeParse(value, fallback) {

    try {

      var result = JSON.parse(value);

      if (
        result === null ||
        result === undefined
      ) {
        return fallback;
      }

      return result;

    } catch (error) {

      return fallback;

    }

  }


  function normalizeText(value) {

    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  }


  /*
   * 완전 일치 / 부분 문장 비교용
   *
   * 여기서는 공백을 제거합니다.
   */
  function stripText(value) {

    return normalizeText(value)
      .replace(
        /[\s?!.,·…\-_()（）「」『』"“”'‘’~]/g,
        ""
      );

  }


  /*
   * 토큰화용
   *
   * 중요:
   * 공백을 없애면 안 됩니다.
   *
   * 기존 코드에서 매칭률을 떨어뜨리던
   * 가장 중요한 부분입니다.
   */
  function cleanForTokens(value) {

    return normalizeText(value)
      .replace(
        /[?!.,·…\-_()（）「」『』"“”'‘’~]/g,
        " "
      );

  }


  /* =========================================================
     동의어 정규화
     ========================================================= */

  function normalizeToken(token) {

    var value = normalizeText(token);

    return SYNONYM_MAP[value] || value;

  }


  /* =========================================================
     토큰 생성
     ========================================================= */

  function tokenizeContent(text) {

    var cleaned = cleanForTokens(text);

    var raw =
      cleaned.match(/[가-힣a-z0-9]+/g) || [];

    return raw

      .filter(function (token) {

        return (
          token.length >= 2 &&
          !STOP_WORDS_SET[token]
        );

      })

      .map(function (token) {

        return normalizeToken(token);

      });

  }


  /* =========================================================
     keywords / aliases 정규화
     ========================================================= */

  function normalizeKeywords(value) {

    var array;

    if (Array.isArray(value)) {

      array = value;

    } else {

      array = String(value || "")
        .split(/[|,;\/]/);

    }

    var seen = {};

    return array

      .map(function (item) {

        return normalizeText(item);

      })

      .filter(function (item) {

        if (!item) {
          return false;
        }

        if (seen[item]) {
          return false;
        }

        seen[item] = true;

        return true;

      });

  }


  /* =========================================================
     Category
     ========================================================= */

  function normalizeCategory(value) {

    var category =
      normalizeText(value);

    return VALID_CATEGORIES[category]
      ? category
      : "other";

  }


  function normalizeCategoryDisplay(value) {

    var category =
      normalizeCategory(value);

    return (
      CATEGORY_LABELS[category] ||
      category
    );

  }


  /* =========================================================
     Boolean
     ========================================================= */

  function normalizeBoolean(value) {

    if (typeof value === "boolean") {

      return value;

    }

    if (typeof value === "string") {

      var text =
        value.trim().toLowerCase();

      return (
        text === "true" ||
        text === "1" ||
        text === "o" ||
        text === "yes" ||
        text === "y"
      );

    }

    return !!value;

  }


  /* =========================================================
     QA ID
     ========================================================= */

  function createQAId() {

    return (
      "qa_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .slice(2, 10)
    );

  }


  /* =========================================================
     QA 데이터 정규화
     ========================================================= */

  function normalizeItem(item) {

    return {

      __id:
        item.__id ||
        item.id ||
        createQAId(),

      category:
        normalizeCategory(
          item.category
        ),

      question:
        String(
          item.question || ""
        ).trim(),

      keywords:
        normalizeKeywords(
          item.keywords
        ),

      /*
       * aliases가 서버에 없어도
       * 자동으로 [] 처리됩니다.
       */
      aliases:
        normalizeKeywords(
          item.aliases
        ),

      answer:
        String(
          item.answer || ""
        ).trim(),

      top:
        !!item.top,

      contactId:
        item.contactId || ""

    };

  }


  /* =========================================================
     HTML Escape
     ========================================================= */

  function escapeHtml(text) {

    return String(text)

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/>/g, "&gt;")

      .replace(/"/g, "&quot;")

      .replace(/'/g, "&#039;");

  }


  /* =========================================================
     Fetch Timeout
     ========================================================= */

  function fetchWithTimeout(
    url,
    options,
    timeoutMs
  ) {

    options =
      options || {};

    timeoutMs =
      timeoutMs || 10000;

    var controller =
      new AbortController();

    var timer =
      setTimeout(function () {

        controller.abort();

      }, timeoutMs);

    return fetch(

      url,

      Object.assign(
        {},
        options,
        {
          signal:
            controller.signal
        }
      )

    ).finally(function () {

      clearTimeout(timer);

    });

  }


  /* =========================================================
     Intent 감지
     ========================================================= */

  function detectIntents(text) {

    var value =
      normalizeText(text);

    var intents = [];

    INTENT_PATTERNS.forEach(
      function (intentPattern) {

        var matched =
          intentPattern.patterns.some(
            function (pattern) {

              return pattern.test(value);

            }
          );

        if (matched) {

          intents.push(
            intentPattern.intent
          );

        }

      }
    );

    return intents;

  }


  /* =========================================================
     배열 중복 제거
     ========================================================= */

  function unique(array) {

    var seen = {};

    return array.filter(
      function (value) {

        if (seen[value]) {
          return false;
        }

        seen[value] = true;

        return true;

      }
    );

  }


  /* =========================================================
     토큰 유사도

     양방향 F1 방식
     ========================================================= */

  function tokenSimilarity(a, b) {

    var tokensA =
      unique(
        tokenizeContent(a)
      );

    var tokensB =
      unique(
        tokenizeContent(b)
      );

    if (
      !tokensA.length ||
      !tokensB.length
    ) {

      return 0;

    }

    var matchedA = 0;
    var matchedB = 0;


    tokensA.forEach(
      function (tokenA) {

        var found =
          tokensB.some(
            function (tokenB) {

              return (
                tokenA === tokenB ||

                (
                  tokenA.length >= 2 &&
                  tokenB.length >= 2 &&

                  (
                    tokenA.indexOf(tokenB) >= 0 ||
                    tokenB.indexOf(tokenA) >= 0
                  )
                )
              );

            }
          );

        if (found) {
          matchedA++;
        }

      }
    );


    tokensB.forEach(
      function (tokenB) {

        var found =
          tokensA.some(
            function (tokenA) {

              return (
                tokenA === tokenB ||

                (
                  tokenA.length >= 2 &&
                  tokenB.length >= 2 &&

                  (
                    tokenA.indexOf(tokenB) >= 0 ||
                    tokenB.indexOf(tokenA) >= 0
                  )
                )
              );

            }
          );

        if (found) {
          matchedB++;
        }

      }
    );


    var precision =
      matchedA /
      tokensA.length;

    var recall =
      matchedB /
      tokensB.length;


    if (
      precision === 0 ||
      recall === 0
    ) {

      return 0;

    }


    return (
      2 *
      precision *
      recall /
      (
        precision +
        recall
      )
    );

  }


  /* =========================================================
     핵심 매칭 점수
     ========================================================= */

  function calculateMatchScore(
    item,
    input,
    selectedCategory
  ) {

    var userQuestion =
      normalizeText(input);

    var faqQuestion =
      normalizeText(
        item.question
      );


    if (
      !userQuestion ||
      !faqQuestion
    ) {

      return 0;

    }


    var strippedUser =
      stripText(
        userQuestion
      );

    var strippedFAQ =
      stripText(
        faqQuestion
      );


    /*
     * 1.
     * 완전 일치
     */
    if (
      strippedUser ===
      strippedFAQ
    ) {

      return 100;

    }


    /*
     * 2.
     * 기본 토큰 유사도
     */
    var score =
      tokenSimilarity(
        userQuestion,
        faqQuestion
      ) * 65;


    /*
     * 3.
     * 부분 문장 포함
     */
    if (
      strippedUser.length >= 4 &&
      strippedFAQ.indexOf(
        strippedUser
      ) >= 0
    ) {

      score =
        Math.max(
          score,

          60 +
          Math.min(
            25,
            (
              strippedUser.length /
              strippedFAQ.length
            ) * 25
          )
        );

    }


    if (
      strippedFAQ.length >= 4 &&
      strippedUser.indexOf(
        strippedFAQ
      ) >= 0
    ) {

      score =
        Math.max(
          score,

          58 +
          Math.min(
            22,
            (
              strippedFAQ.length /
              strippedUser.length
            ) * 22
          )
        );

    }


    /*
     * 4.
     * Keywords
     */
    var keywordHits = 0;

    var userTokens =
      tokenizeContent(
        userQuestion
      );


    (
      item.keywords || []
    ).forEach(
      function (keyword) {

        var normalizedKeyword =
          normalizeText(
            keyword
          );

        var canonicalKeyword =
          normalizeToken(
            normalizedKeyword
          );


        if (
          userQuestion.indexOf(
            normalizedKeyword
          ) >= 0 ||

          userTokens.indexOf(
            canonicalKeyword
          ) >= 0
        ) {

          keywordHits++;

        }

      }
    );


    /*
     * 키워드 하나당 +6
     * 최대 +18
     */
    score +=
      Math.min(
        18,
        keywordHits * 6
      );


    /*
     * 5.
     * Aliases
     *
     * 실제 직원이 사용하는 표현을
     * 등록해 두면 가장 강력합니다.
     */
    var bestAliasScore = 0;


    (
      item.aliases || []
    ).forEach(
      function (alias) {

        var strippedAlias =
          stripText(alias);


        /*
         * alias 완전 일치
         */
        if (
          strippedAlias &&
          strippedAlias ===
          strippedUser
        ) {

          bestAliasScore =
            Math.max(
              bestAliasScore,
              96
            );

          return;

        }


        /*
         * alias 토큰 유사도
         */
        var aliasSimilarity =
          tokenSimilarity(
            userQuestion,
            alias
          );


        bestAliasScore =
          Math.max(
            bestAliasScore,
            aliasSimilarity * 88
          );


        /*
         * alias 부분 포함
         */
        if (
          strippedAlias.length >= 4 &&

          (
            strippedAlias.indexOf(
              strippedUser
            ) >= 0 ||

            strippedUser.indexOf(
              strippedAlias
            ) >= 0
          )
        ) {

          bestAliasScore =
            Math.max(
              bestAliasScore,
              78
            );

        }

      }
    );


    score =
      Math.max(
        score,
        bestAliasScore
      );


    /*
     * 6.
     * Intent
     *
     * Intent는 보조 신호로만 사용
     */
    var userIntents =
      detectIntents(
        userQuestion
      );


    var faqIntents =
      unique(

        detectIntents(
          faqQuestion
        ).concat(

          detectIntents(
            item.answer
          )

        )

      );


    if (
      userIntents.length
    ) {

      var intentMatched =
        userIntents.some(
          function (intent) {

            return (
              faqIntents.indexOf(
                intent
              ) >= 0
            );

          }
        );


      if (intentMatched) {

        score += 7;

      } else if (
        faqIntents.length
      ) {

        /*
         * 너무 강하게 깎지 않음
         */
        score -= 10;

      }

    }


    /*
     * 7.
     * 현재 선택 카테고리
     *
     * 필터가 아니라 +5점 보너스
     */
    if (
      selectedCategory &&
      selectedCategory !== "all" &&
      item.category ===
      selectedCategory
    ) {

      score += 5;

    }


    /*
     * 최종 점수
     * 0 ~ 100
     */
    return Math.max(
      0,

      Math.min(
        100,
        Math.round(score)
      )
    );

  }


  /* =========================================================
     매칭 기준
     ========================================================= */

  /*
   * 65점 이상:
   * 바로 답변 후보
   */
  var DIRECT_THRESHOLD = 65;


  /*
   * 35점 이상:
   * 관련 질문 후보로 표시
   */
  var SUGGEST_THRESHOLD = 35;


  /*
   * 1위와 2위가 최소 8점 차이나야
   * 자동 답변
   */
  var MIN_GAP_FOR_DIRECT = 8;


  /* =========================================================
     전체 FAQ Ranking
     ========================================================= */

  function rankMatches(
    list,
    text,
    category
  ) {

    var ranked =
      list.map(
        function (item) {

          return {

            item: item,

            score:
              calculateMatchScore(
                item,
                text,
                category
              )

          };

        }
      );


    ranked.sort(
      function (a, b) {

        return (
          b.score -
          a.score
        );

      }
    );


    /*
     * 개발자도구 콘솔에서
     * TOP 5 확인 가능
     */
    if (
      window.console &&
      console.table
    ) {

      console.log(
        "[SCM FAQ 매칭] 입력:",
        text
      );


      console.table(

        ranked
          .slice(0, 5)
          .map(
            function (result) {

              return {

                score:
                  result.score,

                category:
                  result.item.category,

                question:
                  result.item.question

              };

            }
          )

      );

    }


    return ranked;

  }


  /* =========================================================
     최종 매칭 판정
     ========================================================= */

  function getMatchResult(
    list,
    text,
    category
  ) {

    var ranked =
      rankMatches(
        list,
        text,
        category
      );


    if (!ranked.length) {

      return {

        status: "none",

        item: null,

        score: 0,

        candidates: []

      };

    }


    var first =
      ranked[0];

    var second =
      ranked[1];


    var gap =
      second
        ? first.score -
          second.score
        : first.score;


    /*
     * 확실한 경우
     */
    if (
      first.score >=
      DIRECT_THRESHOLD &&

      (
        gap >=
        MIN_GAP_FOR_DIRECT ||

        first.score >= 88
      )
    ) {

      return {

        status:
          "matched",

        item:
          first.item,

        score:
          first.score,

        candidates:
          ranked.slice(
            0,
            3
          )

      };

    }


    /*
     * 애매하지만 관련 FAQ가 있는 경우
     */
    if (
      first.score >=
      SUGGEST_THRESHOLD
    ) {

      return {

        status:
          "suggest",

        item:
          null,

        score:
          first.score,

        candidates:
          ranked
            .filter(
              function (result) {

                return (
                  result.score >=
                  SUGGEST_THRESHOLD
                );

              }
            )
            .slice(
              0,
              3
            )

      };

    }


    /*
     * 관련 답변 없음
     */
    return {

      status:
        "none",

      item:
        null,

      score:
        first.score,

      candidates:
        ranked.slice(
          0,
          3
        )

    };

  }


  /* =========================================================
     QA Cache
     ========================================================= */

  var _qaCache = null;

  var _qaCacheTime = 0;

  var CACHE_TTL =
    60000;


  function setQACache(items) {

    _qaCache =
      items;

    _qaCacheTime =
      Date.now();


    try {

      localStorage.setItem(
        QA_KEY,
        JSON.stringify(items)
      );

    } catch (error) {

      console.warn(
        "localStorage 저장 실패:",
        error
      );

    }

  }


  function getQAFromCache() {

    if (
      _qaCache &&
      Date.now() -
      _qaCacheTime <
      CACHE_TTL
    ) {

      return _qaCache;

    }


    var stored =
      safeParse(
        localStorage.getItem(
          QA_KEY
        ),
        []
      );


    var items =
      stored

        .map(
          normalizeItem
        )

        .filter(
          function (item) {

            return (
              item.question &&
              item.answer
            );

          }
        );


    _qaCache =
      items;

    _qaCacheTime =
      Date.now();


    return items;

  }


  /* =========================================================
     QA 서버 로드
     ========================================================= */

  async function loadQAFromServer() {

    try {

      var response =
        await fetchWithTimeout(

          getQAApiBase() +
          "/getAll",

          {
            method: "GET"
          },

          10000

        );


      var data =
        await response.json();


      if (
        data.success &&
        Array.isArray(
          data.items
        )
      ) {

        var items =
          data.items.map(
            normalizeItem
          );


        setQACache(
          items
        );


        return items;

      }

    } catch (error) {

      console.warn(
        "QA API 실패, 로컬 사용:",
        error
      );

    }


    return getQAFromCache();

  }


  /* =========================================================
     History
     ========================================================= */

  function getHistory() {

    return safeParse(

      localStorage.getItem(
        HISTORY_KEY
      ),

      []

    );

  }


  function saveHistoryItem(item) {

    var history =
      getHistory();


    history.unshift(

      Object.assign(
        {},
        item,
        {
          timestamp:
            Date.now()
        }
      )

    );


    try {

      localStorage.setItem(

        HISTORY_KEY,

        JSON.stringify(
          history.slice(
            0,
            500
          )
        )

      );

    } catch (error) {

      console.warn(
        "히스토리 저장 실패:",
        error
      );

    }

  }


  /* =========================================================
     Pending Logs
     ========================================================= */

  function getPendingLogs() {

    return safeParse(

      localStorage.getItem(
        PENDING_LOGS_KEY
      ),

      []

    );

  }


  function savePendingLog(data) {

    var pending =
      getPendingLogs();


    pending.push(
      data
    );


    try {

      localStorage.setItem(

        PENDING_LOGS_KEY,

        JSON.stringify(
          pending.slice(
            -100
          )
        )

      );

    } catch (error) {

      console.warn(
        "pending log 저장 실패:",
        error
      );

    }

  }


  async function retryPendingLogs(url) {

    if (!url) {
      return;
    }


    var pending =
      getPendingLogs();


    if (
      !Array.isArray(
        pending
      ) ||
      !pending.length
    ) {

      return;

    }


    var remain = [];


    for (
      var i = 0;
      i < pending.length;
      i++
    ) {

      try {

        var response =
          await fetch(
            url,
            {

              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  pending[i]
                )

            }
          );


        /*
         * fetch는 HTTP 500에서도
         * reject되지 않기 때문에
         * ok 확인 필요
         */
        if (
          !response.ok
        ) {

          throw new Error(
            "HTTP " +
            response.status
          );

        }

      } catch (error) {

        remain.push(
          pending[i]
        );

      }

    }


    try {

      localStorage.setItem(

        PENDING_LOGS_KEY,

        JSON.stringify(
          remain
        )

      );

    } catch (error) {

      console.warn(
        "pending log 업데이트 실패:",
        error
      );

    }

  }


  /* =========================================================
     Public API
     ========================================================= */

  window.ChatbotStore = {


    /* -------------------------
       서버 QA 로드
       ------------------------- */

    loadFromServer:
      loadQAFromServer,


    /* -------------------------
       전체 QA
       ------------------------- */

    getQA:
      function () {

        return (
          getQAFromCache()
        );

      },


    /* -------------------------
       카테고리별 QA
       ------------------------- */

    getQAByCategory:
      function (category) {

        var all =
          getQAFromCache();


        if (
          !category ||
          category === "all"
        ) {

          return all;

        }


        return all.filter(
          function (item) {

            return (
              item.category ===
              category
            );

          }
        );

      },


    /* -------------------------
       카테고리 목록
       ------------------------- */

    getCategories:
      function () {

        var seen = {};

        var categories = [];


        getQAFromCache()
          .forEach(
            function (item) {

              if (
                !seen[
                  item.category
                ]
              ) {

                seen[
                  item.category
                ] = true;

                categories.push(
                  item.category
                );

              }

            }
          );


        categories.sort();


        return (
          ["all"].concat(
            categories
          )
        );

      },


    /* -------------------------
       카테고리 Label
       ------------------------- */

    getCategoryLabels:
      function () {

        return Object.assign(
          {},
          CATEGORY_LABELS
        );

      },


    /* =====================================================
       기존 코드 호환용

       확실한 경우에만 item 반환
       ===================================================== */

    findAnswer:
      function (
        text,
        category
      ) {

        var result =
          getMatchResult(

            getQAFromCache(),

            text,

            category ||
            "all"

          );


        if (
          result.status ===
          "matched"
        ) {

          return result.item;

        }


        return null;

      },


    /* =====================================================
       신규 스마트 검색

       index.html에서 사용

       반환:
       {
         status: "matched" | "suggest" | "none",
         item,
         score,
         candidates
       }
       ===================================================== */

    findAnswerSmart:
      function (
        text,
        category
      ) {

        return getMatchResult(

          getQAFromCache(),

          text,

          category ||
          "all"

        );

      },


    /* -------------------------
       History
       ------------------------- */

    saveHistory:
      saveHistoryItem,


    getHistory:
      getHistory,


    clearHistory:
      function () {

        try {

          localStorage.removeItem(
            HISTORY_KEY
          );

        } catch (error) {

          console.warn(
            "히스토리 삭제 실패:",
            error
          );

        }

      },


    /* -------------------------
       관리자 캐시 갱신
       ------------------------- */

    updateLocalCache:
      function (items) {

        setQACache(

          items.map(
            normalizeItem
          )

        );

      },


    /* -------------------------
       관리자 검색
       ------------------------- */

    searchQA:
      function (query) {

        var text =
          normalizeText(
            query
          );


        return getQAFromCache()
          .filter(
            function (item) {

              return (

                normalizeText(
                  item.question
                ).includes(
                  text
                )

                ||

                normalizeText(
                  item.answer
                ).includes(
                  text
                )

                ||

                item.keywords.some(
                  function (keyword) {

                    return (
                      normalizeText(
                        keyword
                      ).includes(
                        text
                      )
                    );

                  }
                )

                ||

                (
                  item.aliases ||
                  []
                ).some(
                  function (alias) {

                    return (
                      normalizeText(
                        alias
                      ).includes(
                        text
                      )
                    );

                  }
                )

              );

            }
          );

      },


    /* -------------------------
       통계
       ------------------------- */

    getStats:
      function () {

        var qa =
          getQAFromCache();

        var history =
          getHistory();

        var categories = {};


        qa.forEach(
          function (item) {

            categories[
              item.category
            ] =
              (
                categories[
                  item.category
                ] || 0
              ) + 1;

          }
        );


        return {

          totalQA:
            qa.length,

          totalHistory:
            history.length,

          matchedHistory:
            history.filter(
              function (item) {

                return (
                  item.matched
                );

              }
            ).length,

          unmatchedHistory:
            history.filter(
              function (item) {

                return (
                  !item.matched
                );

              }
            ).length,

          categoryCounts:
            categories,

          topQuestions:
            qa.filter(
              function (item) {

                return item.top;

              }
            ).length

        };

      },


    /* -------------------------
       Pending Logs
       ------------------------- */

    getPendingLogs:
      getPendingLogs,

    savePendingLog:
      savePendingLog,

    retryPendingLogs:
      retryPendingLogs

  };


  /* =========================================================
     Utils 공개
     ========================================================= */

  window.ChatbotUtils = {

    escapeHtml:
      escapeHtml,

    normalizeCategory:
      normalizeCategory,

    normalizeCategoryDisplay:
      normalizeCategoryDisplay,

    normalizeKeywords:
      normalizeKeywords,

    normalizeBoolean:
      normalizeBoolean,

    normalizeText:
      normalizeText,

    createQAId:
      createQAId,

    safeParse:
      safeParse,

    fetchWithTimeout:
      fetchWithTimeout

  };

})();
