const ChatbotStore = (() => {
  const QA_KEY = "faq_chatbot_qa_v4";
  const HISTORY_KEY = "faq_chatbot_history_v4";

  const CATEGORY_LABELS = {
    all: "전체",
    delivery: "delivery",
    documents: "documents",
    other: "other",
    production: "production",
    purchase: "purchase"
  };

  const defaultQA = [
    {
      category: "delivery",
      question: "독일 및 프랑스 본사로부터 해상 선적 기간은 얼마나 되나요?",
      keywords: ["해상", "선적", "기간", "리드타임"],
      answer: "생산 리드타임과 해상 운송을 포함해 출하일부터 공장 입고까지 총 약 2~3개월 소요됩니다.\n현재 유럽 출발 해상 화물은 지정학적 리스크로 인해 출항 후 부산항 도착까지 약 60~70일이 걸릴 수 있습니다."
    },
    {
      category: "delivery",
      question: "독일 본사 제품을 주문했는데 수입신고필증에 적출국이 네덜란드 혹은 벨기에인 이유는 무엇인가요?",
      keywords: ["적출국", "네덜란드", "벨기에", "독일 본사"],
      answer: "유럽 출발 화물은 Port Share 방식에 따라 가장 가까운 항구를 이용하는 것이 일반적입니다. 독일 본사 제품도 물류 효율상 네덜란드 로테르담 또는 벨기에 안트베르펜 항을 이용할 수 있으며, 제품의 생산국이 독일이라는 점은 변하지 않습니다."
    },
    {
      category: "delivery",
      question: "도입 완제품 진행상황은 어디서 확인 할 수 있나요?",
      keywords: ["진행상황", "bi report", "도입 완제품"],
      answer: "관계사 도입 완제품 진행 현황은 BI Report에서 확인 가능합니다. 조회되지 않는 경우 담당자에게 문의해 주세요."
    },
    {
      category: "documents",
      question: "세금계산서는 언제 발급해야 하나요?",
      keywords: ["세금계산서", "발급", "기한"],
      answer: "공급 시기마다 발행하는 것이 원칙이며, 예외적으로 공급일이 속한 달의 다음 달 10일까지 발행할 수 있습니다."
    },
    {
      category: "documents",
      question: "세금계산서를 기한 이후 발행하면 어떻게 되나요?",
      keywords: ["세금계산서", "가산세", "기한"],
      answer: "발행자에게 1%, 수취자에게 0.5%의 가산세가 부과될 수 있습니다."
    },
    {
      category: "documents",
      question: "고객이 수입신고필증을 요구합니다. 수입신고필증 제공이 가능한가요?",
      keywords: ["수입신고필증", "제공", "가격 정보"],
      answer: "수입신고필증 제공은 가능하지만, 단가·총액·세금 등 가격 정보는 반드시 삭제 후 제공해야 합니다."
    },
    {
      category: "documents",
      question: "원산지(포괄)확인서와 원산지증명서의 차이는 무엇인가요?",
      keywords: ["원산지 확인서", "원산지 증명서", "차이"],
      answer: "원산지 확인서는 원산지증명서 발급을 위한 근거 자료이고, 원산지증명서는 최종적으로 원산지를 증명하는 문서입니다. 생산자만 원산지(포괄)확인서를 발급할 수 있습니다."
    },
    {
      category: "documents",
      question: "원산지 증명서 발급 시 필요한 서류는 어떤 것이 있나요?",
      keywords: ["원산지 증명서", "필요 서류", "상업송장"],
      answer: "상업송장, 포장명세서, 선하증권, 수출신고필증이 필요합니다."
    },
    {
      category: "documents",
      question: "원산지 증명서 발급 가능한가요?",
      keywords: ["원산지 증명서", "발급 가능", "fta"],
      answer: "요청 제품 또는 부품이 해당 FTA 협정의 원산지 기준을 충족하는 경우에 한하여 발급 가능합니다. 발급 요청 전 SCM 담당자를 통한 사전 검증이 필요합니다."
    },
    {
      category: "other",
      question: "타계정 처리란 무엇인가요?",
      keywords: ["타계정 처리", "타계정", "재고자산"],
      answer: "재고자산을 판매 목적이 아닌 자가사용, 접대, 연구개발 등 다른 용도로 사용할 경우, 기존 재고 계정에서 해당 목적에 맞는 계정 과목으로 변경 처리하는 것을 의미합니다."
    },
    {
      category: "other",
      question: "타계정 처리는 언제 필요한가요?",
      keywords: ["타계정", "언제", "판매 목적 외"],
      answer: "재고자산을 판매 목적 외의 용도로 사용할 때 반드시 필요합니다."
    },
    {
      category: "other",
      question: "타계정 부품 인출 절차는 어떻게 되나요?",
      keywords: ["타계정", "인출 절차", "품의서"],
      answer: "1단계 품의서 작성 → 2단계 승인 절차 → 3단계 수령 및 인계 순으로 진행됩니다."
    },
    {
      category: "other",
      question: "부품 수령 담당자는 누구인가요?",
      keywords: ["부품 수령", "담당자", "김현태"],
      answer: "부품 수령 담당자는 김현태 부장님입니다."
    },
    {
      category: "other",
      question: "원재료 타계정 부품은 어디서 받아가나요?",
      keywords: ["타계정 부품", "수령", "김현태"],
      answer: "타계정 품의 완료 후 품의서를 출력해 지참하고, SCM반 김현태 부장에게 전달하면 부품 수령이 가능합니다."
    },
    {
      category: "other",
      question: "원재료 타계정 부품 재고 없는 경우엔 어떻게 하나요?",
      keywords: ["타계정 부품", "재고 없음", "입고 예정"],
      answer: "사내 재고가 없는 경우 SCM 부품 담당자에게 공유하여 확인 절차를 진행해 주세요."
    },
    {
      category: "other",
      question: "항공비용이 어느정도 나올까요?",
      keywords: ["항공비", "운송비", "항공 운임"],
      answer: "운송비는 선적 국가, 중량, 운송 방식에 따라 다릅니다. 항공 운임은 국가물류통합정보센터 기준으로 확인 가능합니다."
    },
    {
      category: "other",
      question: "우리회사의 펌프 HS코드에 대해서 알려주세요",
      keywords: ["hs코드", "펌프", "8413"],
      answer: "대표 HS CODE는 다음과 같습니다.\n- 원심펌프 기타: 8413.70-9090\n- 터빈펌프: 8413.70-9010\n- 볼류트펌프: 8413.70-9020\n- 펌프 부분품: 8413.91-4000"
    },
    {
      category: "other",
      question: "경비는 어떻게 분류되나요?",
      keywords: ["경비 분류", "경비 종류", "사원 경비"],
      answer: "경비는 사원 경비, 업체 경비, 간담회/회의비의 세 가지로 분류됩니다."
    },
    {
      category: "other",
      question: "사원 경비란 무엇인가요?",
      keywords: ["사원 경비", "개인 비용", "정산"],
      answer: "임직원이 업무 목적으로 개인 비용을 선지출하고, 회계 정산 시스템을 통해 지급받는 경비입니다."
    },
    {
      category: "other",
      question: "업체 경비란 무엇인가요?",
      keywords: ["업체 경비", "외부 거래처", "지출"],
      answer: "회사 외부 거래처에 직접 지급되는 경비로, NPM 또는 지출품의서를 통해 승인 후 지급됩니다."
    },
    {
      category: "other",
      question: "간담회/회의비는 무엇인가요?",
      keywords: ["간담회", "회의비", "식사"],
      answer: "업무 관련 회의 또는 팀·부서 간 친목 도모를 위한 식사 및 다과 비용이며, 별도 규정된 한도 및 증빙 기준을 준수해야 합니다."
    },
    {
      category: "other",
      question: "사원 경비는 어떻게 정산하나요?",
      keywords: ["사원 경비", "정산", "비즈플레이"],
      answer: "비즈플레이(Bizplay) 시스템을 통해 경비 보고서를 작성하고 전자 결재를 거쳐 정산 신청합니다."
    },
    {
      category: "production",
      question: "NPM이란 무엇인가요?",
      keywords: ["npm", "비생산", "구매 절차"],
      answer: "생산에 직접 사용되지 않는 자재나 용역을 구매할 때 사용하는 Group Standard 절차입니다."
    },
    {
      category: "production",
      question: "MVI 90, 125제품은 단종되었나요?",
      keywords: ["mvi", "90", "125", "단종"],
      answer: "MVI 10인치 제품(90, 125 시리즈)은 추가 오더 접수가 불가하며, 대체 모델로 Helix First 제품으로 변경 진행 중입니다."
    },
    {
      category: "production",
      question: "NL 제품은 단종되었나요?",
      keywords: ["nl", "단종", "atomos giga n"],
      answer: "NL 제품은 인도 공장에서도 단종되었으며, 대체품으로 ATOMOS GIGA N 제품 적용이 가능합니다."
    },
    {
      category: "production",
      question: "단종된 제품의 경우 추가 오더가 가능한가요?",
      keywords: ["단종", "추가 오더", "라스트 오더"],
      answer: "단종된 제품은 사내 부품 재고가 남아 있는 경우에 한해 생산 가능 수량을 안내할 수 있으며, 관계사 제조 제품은 라스트 오더 가능 시점 이후에는 추가 오더가 불가합니다."
    },
    {
      category: "purchase",
      question: "발주 취소가 가능한가요?",
      keywords: ["발주", "취소", "오더 취소"],
      answer: "관계사 제품은 최초 발주 진행일 기준 약 3~4일 이내에는 오더 취소가 가능하나, 이후에는 불가하거나 추가 취소 비용이 발생할 수 있습니다."
    },
    {
      category: "purchase",
      question: "해외 도입 제품의 표준 리드타임이 어떻게 되나요?",
      keywords: ["도입 제품", "리드타임", "해외"],
      answer: "도입 업체별로 리드타임이 상이하므로, 정확한 일정은 해당 업체 담당자에게 확인해 주세요."
    },
    {
      category: "purchase",
      question: "수량 변경이 가능한가요?",
      keywords: ["수량 변경", "변경", "추가 수량"],
      answer: "사내 조립품은 변경 가능하나, 이미 생산 완료 또는 진행 중인 경우 불용 재고 비용이 발생할 수 있습니다. 도입품은 생산 완료 또는 선적 진행 중인 건의 취소 수량은 불가합니다."
    },
    {
      category: "purchase",
      question: "샘플 발주가 가능한가요?",
      keywords: ["샘플 발주", "샘플", "구매팀"],
      answer: "샘플 발주 가능 여부는 공급업체의 제작 가능 여부 및 단가 확인이 필요하므로 구매팀을 통해 문의해 주세요."
    },
    {
      category: "purchase",
      question: "시험 생산용 자재 조달 가능한가요?",
      keywords: ["시험 생산", "자재 조달", "신규 부품"],
      answer: "시험 생산용 자재는 대부분 신규 부품이므로 구매팀을 통해 먼저 확인해 주세요. 기존 양산 부품은 SCM을 통해 공급 가능합니다."
    }
  ];

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getQA() {
    const stored = localStorage.getItem(QA_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    localStorage.setItem(QA_KEY, JSON.stringify(defaultQA));
    return clone(defaultQA);
  }

  function setQA(data) {
    localStorage.setItem(QA_KEY, JSON.stringify(data));
  }

  function clearQA() {
    localStorage.setItem(QA_KEY, JSON.stringify([]));
  }

  function deleteQAByIndex(index) {
    const qa = getQA();
    if (index < 0 || index >= qa.length) return false;
    qa.splice(index, 1);
    setQA(qa);
    return true;
  }

  function getHistory() {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }

  function saveHistory(item) {
    const history = getHistory();
    history.push(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function clearHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  }

  function normalizeText(text) {
    return String(text || "").toLowerCase().trim();
  }

  function getQAByCategory(category) {
    const qa = getQA();
    if (!category || category === "all") {
      return qa;
    }
    return qa.filter(item => item.category === category);
  }

  function getCategories() {
    const qa = getQA();
    const set = new Set(["all"]);
    qa.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }

  function getCategoryLabels() {
    return { ...CATEGORY_LABELS };
  }

  function findAnswer(input, category = "all") {
    const text = normalizeText(input);
    const qa = getQAByCategory(category);

    let best = null;
    let bestScore = 0;

    for (const item of qa) {
      let score = 0;
      const q = normalizeText(item.question);

      if (text.includes(q)) score += 10;
      if (q.includes(text) && text.length >= 2) score += 5;

      for (const kw of item.keywords || []) {
        const keyword = normalizeText(kw);
        if (keyword && text.includes(keyword)) score += 3;
      }

      const words = q.split(/\s+/);
      for (const w of words) {
        if (w.length > 1 && text.includes(w)) score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    if (!best && category !== "all") {
      return findAnswer(input, "all");
    }

    return bestScore > 1 ? best : best;
  }

  function importTemplate(parsed) {
    if (!parsed || !Array.isArray(parsed.data) || !parsed.mode) {
      throw new Error("invalid template");
    }

    const normalized = parsed.data
      .map(item => ({
        category: item.category || "other",
        question: String(item.question || "").trim(),
        keywords: Array.isArray(item.keywords)
          ? item.keywords.map(x => String(x).trim()).filter(Boolean)
          : [],
        answer: String(item.answer || "").trim()
      }))
      .filter(item => item.question && item.answer);

    if (parsed.mode === "replace") {
      setQA(normalized);
      return;
    }

    if (parsed.mode === "append") {
      const current = getQA();
      setQA([...current, ...normalized]);
      return;
    }

    throw new Error("invalid mode");
  }

  return {
    getQA,
    setQA,
    clearQA,
    deleteQAByIndex,
    getHistory,
    saveHistory,
    clearHistory,
    getCategories,
    getCategoryLabels,
    getQAByCategory,
    findAnswer,
    importTemplate
  };
})();