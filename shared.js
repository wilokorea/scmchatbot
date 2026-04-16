(function () {
  const QA_KEY           = "chatbot_qa";
  const HISTORY_KEY      = "chatbot_history";
  const QA_VERSION_KEY   = "chatbot_qa_version";
  const PENDING_LOGS_KEY = "chatbot_pending_logs";
  const QA_VERSION       = "2026-04-16-v6"; // ✅ 변경: v5 → v6

  const DEFAULT_QA = [
    {
      "__id": "qa_1",
      "category": "delivery",
      "question": "독일 및 프랑스 본사로부터 해상 선적 기간은 얼마나 되나요?",
      "keywords": ["해상", "선적", "배송", "리드타임", "유럽", "기간", "얼마나"],
      "answer": "생산 리드타임 + 해상 운송 기준, 출하일부터 공장 입고까지는 총 약 2~3개월 소요됩니다. \n\n현재 수에즈 운하 및 호르무즈 해협의 지정학적 리스크로 인해,\n유럽 출발 해상 화물은 출항 → 부산항 도착까지 약 60~70일이 소요되고 있습니다.\n\n이는 수에즈 운하를 경유하지 않고, 아프리카 희망봉을 우회하는 항로로 운영되기 때문이며,\n기존 대비 약 15~20일 정도 운송 기간이 증가한 상태입니다.\n\n또한 부산항 입항 후 항만 혼잡, 통관 및 내륙 운송 일정에 따라 추가 지연이 발생할 수 있음을 참고 부탁드립니다.",
      "top": true,
      "contactId": "" // ✅ 추가
    },
    {
      "__id": "qa_2",
      "category": "delivery",
      "question": "독일 본사 제품을 주문했는데 수입신고필증에 적출국이 네델란드 혹은 벨기에인 이유는 무었인가요?",
      "keywords": ["적출국", "네덜란드", "벨기에", "항구", "이유"],
      "answer": "유럽 출발 화물은 Port Share 방식에 따라 가장 가까운 항구를 이용하는 것이 일반적입니다.\n\n독일 본사(WILO Dortmund, Hof)는 지리적 위치상 독일 함부르크 항보다 네덜란드 로테르담 또는 벨기에 안트베르펜 항이 더 가까워,\n물류 효율을 고려해 인접 국가 항구를 주로 이용합니다.\n\n따라서 출발항이 독일이 아니더라도, 제품의 생산국은 독일 본사로 변함이 없습니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_3",
      "category": "delivery",
      "question": "도입 완제품 진행상황은 어디서 확인 할 수 있나요?",
      "keywords": ["진행상황", "BI", "리포트", "조회", "어디서", "확인"],
      "answer": "관계사 도입 완제품 진행 현황은 아래 링크의 BI Report에서 확인 가능합니다.\n해당 리포트는 실시간 업데이트되며, 업데이트 일시는 리포트 상단에서 확인하실 수 있습니다.\n\n▶ BI Report 링크\nhttps://app.powerbi.com/groups/5fc0b5cf-3dfe-4aad-86f1-7792f9e343c8/reports/3da87949-651c-4bac-9ac6-f674e1db74a5/f91f4b637e94b4842457?experience=power-bi \n\n조회 방법\n→ '영업담당별 요청자' 버튼 클릭 → 현재 진행 중인 건의 일정 확인 가능\n\n※ 조회되지 않는 경우, 담당자에 문의 부탁드립니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_4",
      "category": "documents",
      "question": "원산지 증명서를 생산자인 윌로가 아닌 고객측에서 발급받을 시 제조공정도와 BOM 소요량 계산서를 발급자에게 직접 제출할 수 있나요?",
      "keywords": ["원산지증명서", "BOM", "제조공정도", "고객", "직접제출"],
      "answer": "생산자가 직접 원산지증명서를 발급하지 않고 수출자가 발급받는 경우,\n수출자에게 BOM 소요량 계산서, 제조공정도, 원산지 소명서 등의 자료를 직접 제출하는 것은 어렵습니다.\n\n이는 해당 자료가 회사 내부 정보 관리상 단가, 공급업체 정보 등 대외비에 해당하기 때문이며,\n발급 기관에서 BACK DATA로 요청하는 자료(제조공정도, BOM 소요량 계산서, 원산지 소명서 등)는 발급 신청자에게가 아닌, 발급 기관(대한상공회의소 또는 세관)에 생산자가 직접 제출하는 방식으로 진행합니다.\n\n따라서, 증명서를 신청하는 주체는 대한상공회의소 원산지증명센터 또는 세관에 원산지증명서 발급 접수 후 접수번호를 회신해 주시기 바라며, 생산자인 윌로는 해당 접수번호를 기준으로 발급 기관에 직접 관련 자료를 제출하여 대외비 노출 리스크 없이 안전하게 발급 절차를 진행합니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_5",
      "category": "documents",
      "question": "고객이 수입신고필증을 요구합니다. 수입신고필증 제공이 가능한가요?",
      "keywords": ["수입신고필증", "제공", "발급", "가능"],
      "answer": "수입신고필증 제공은 가능합니다.\n단, 아래 사항을 반드시 확인해 주시기 바랍니다.\n\n1. 가격 정보 삭제 필수\n단가, 총액, 세금 등 가격 관련 항목은 반드시 삭제 후 제공해야 합니다.\n삭제 작업은 요청자가 직접 진행해야 하며, 삭제 누락으로 발생하는 모든 이슈에 대해서는 SCM에서 책임지지 않습니다.\n\n2. 제공 가능 품목 제한\n모든 부품에 대해 제공되지 않습니다.\n펌프 제품은 하이드로 부품(모터, 케이싱, 샤프트, 임펠러, 스테이지)에 한해 제공 가능\nB급, C급 부품은 제공 불가\n\n3. 적출국 정보 수정 불가\n수입신고필증 상 적출국 정보는 수정이 불가능합니다.\n제품이 독일산이라 하더라도, 유럽 내 물류 운영에 따라 네덜란드·벨기에 등으로 표기될 수 있습니다.\n\n4. 일부 항목 수정 요청 불가\n수입신고필증 내 일부 항목에 대한 수정 요청은 불가합니다.\n기타 요청사항은 SCM팀 담당자에게 문의 부탁드립니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_6",
      "category": "documents",
      "question": "원산지(포괄)확인서와 원산지증명서의 차이는 무엇인가요?",
      "keywords": ["원산지확인서", "원산지증명서", "차이", "무엇"],
      "answer": "원산지 확인서와 원산지 증명서는 발급주체에 따라 구분됩니다.\n\n원산지 증명서의 최종 목적은 '원산지 증명'이며, 원산지 확인서는 증명서 발급을 위한 '근거 자료'로 이해하시면 됩니다.\n\n원산지 확인서는 제품의 BOM 및 소요량 계산 정보를 보유한 '생산자'만 발급 가능하며,\n수출자가 원산지 증명서를 발급받기 위해서는, 생산자가 발급한 '원산지(포괄)확인서'를 반드시 제출해야 합니다.\n\n원산지증명서 발급 가능 주체: 생산자, 수출자\n원산지(포괄)확인서 발급 가능 주체: 생산자",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_7",
      "category": "documents",
      "question": "원산지 증명서 발급 시 필요한 서류는 어떤 것이 있나요?",
      "keywords": ["원산지증명서", "필요서류", "서류", "어떤"],
      "answer": "원산지증명서 발급에 필요한 서류는 다음과 같습니다.\n\n- 상업송장 (Commercial Invoice) → 명판 및 수출자 서명 날인 필수\n- 포장명세서 (Packing List)\n- 선하증권 (Bill of Lading)\n- 수출신고필증",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_8",
      "category": "documents",
      "question": "원산지 증명서 발급 가능한가요?",
      "keywords": ["원산지증명서", "발급", "가능"],
      "answer": "원산지증명서는 요청 제품(부품)이 해당 FTA 협정의 원산지 기준을 충족하는 경우에 한하여 발급 가능합니다.\n따라서 발급 요청 전 SCM 담당자를 통한 사전 검증 절차가 필요합니다.",
      "top": true,
      "contactId": ""
    },
    {
      "__id": "qa_9",
      "category": "documents",
      "question": "원산지 증명서 종류는 어떤게 있나요?",
      "keywords": ["원산지증명서", "종류", "FTA", "어떤"],
      "answer": "원산지증명서는 제품의 BOM 분석을 기반으로, 해당 품목의 국산 여부 및 체약국 기준 충족 시 발급 가능합니다.\n\n원산지증명서의 종류는 아래와 같습니다.\n\n - 비특혜원산지증명서\n    1) 발급 대상: 윌로펌프 제품 및 부품\n    2) 발급 기관: 대한상공회의소\n    3) 발급 기간: 1-2일 소요\n    4) 발급 시 필수 구비 서류: 상업송장 (Invoice), 포장명세서(Packing List), 선하증권(Bill of Loading), 수출신고필증\n    5) 발급 기준: 수입국의 단순 한국산 여부만 확인하며 발급기관은 수출신고필증상의 원산지 기준으로만 확인. 상대국의 수입시 양허관세는 적용 받을 수 없음\n    6) 발급 요청국: FTA 협정이 없는 국가들 위주로 요청 받고 있으며 (중동, 아프리카국가), FTA 체결국가에서도 요청 받고 있음 (베트남)\n\n - FTA 원산지증명서\n    1) 발급 대상: 윌로펌프 제품\n    2) 발급 기관: 대한상공회의소 또는 관세청 유니패스\n    3) 발급 기간: 5~7일 소요 (예외 : 한-아세안의 경우, 3-4일 소요)\n    4) 발급 시 필수 구비 서류: 상업송장 (Invoice), 포장명세서(Packing List), 선하증권(Bill of Loading), 수출신고필증\n    5) 발급 기준: FTA 협정이 체결되어 있는 국가들로부터 수입관세에 대해 양허관세 적용을 받아 관세를 낮추려는 목적으로 발급을 요청 받고 있음\n    6) 발급 요청국: 칠레, 아세안(동남아시아), 콜롬비아, EU, 중국, 인도, 미국 등.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_10",
      "category": "documents",
      "question": "국내제조(포괄) 확인서 발급이 가능한가요?",
      "keywords": ["국내제조확인서", "발급", "가능"],
      "answer": "재료 또는 최종물품의 생산자는 생산자 또는 수출자의 요청이 있는 경우,\n해당 재료 또는 최종물품의 국내 제조 사실을 확인하여 작성한 서류(전자문서 포함)를 생산자 또는 수출자에게 제공할 수 있습니다.\n[FTA 관세법 시행규칙 제13조 (국내제조확인서)]\n\n다만, 부품 단가 등 민감 정보가 포함될 수 있어 대외비에 해당될 수 있으므로, 자료 제공 시 보안에 각별한 주의가 필요합니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_11",
      "category": "documents",
      "question": "자재 성적서(Mill Certificate, Mill Sheet) 발급 가능한가요?",
      "keywords": ["성적서", "Mill Certificate", "재질성적서", "Mill Sheet"],
      "answer": "재질성적서는 QA팀에서 관리하며, QA팀과 구매팀이 정기적으로 데이터를 업데이트하고 있습니다.\n\n관련 문의는 QA팀 또는 구매팀으로 부탁드립니다.",
      "top": true,
      "contactId": ""
    },
    {
      "__id": "qa_12",
      "category": "documents",
      "question": "그룹 도입품에 대한 원산지증명서 또는 수입신고 필증이 필요합니다.",
      "keywords": ["그룹도입", "원산지증명서", "수입신고필증"],
      "answer": "유럽산 수입 품목에 대해서는 별도의 원산지증명서가 제공되지 않으며, 해당 인보이스로 대체하고 있습니다. \n필요한 품목에 대해서는 파트넘버를 확인한 후 SCM팀 담당자에게 요청해 주시기 바랍니다. \n\n또한, 수입신고필증은 아래 경로에서 확인하실 수 있습니다:\n[T:\\Project\\MVI, IL 관련 연도별 수입신고필증] \n확인되지 않는 경우 SCM팀 담당자에게 문의 부탁드립니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_13",
      "category": "other",
      "question": "항공비용이 어느정도 나올까요?",
      "keywords": ["항공", "운임", "비용", "얼마"],
      "answer": "운송비는 선적 국가, 중량, 운송 방식(항공/해상)에 따라 상이합니다.\n\n해상 운임은 실시간 변동성이 커 사전 정확한 산정이 어려우며,\n항공 운임은 아래 '국가물류통합정보센터' 사이트에서 국가별 평균 비용 기준으로 확인 가능합니다.\n\n▶ 국가물류통합정보센터 (항공 수입 운임)\nhttps://nlic.go.kr/nlic/flightImportTrnsCt.action",
      "top": true,
      "contactId": ""
    },
    {
      "__id": "qa_14",
      "category": "other",
      "question": "원재료 타계정 부품 재고 없는 경우엔 어떻게 하나요?",
      "keywords": ["타계정", "재고", "부품", "없는", "어떻게"],
      "answer": "원재료 타계정 품의 완료 후에도 사내 재고가 없는 경우,\nSCM 부품 담당자에게 공유하여 확인 절차를 진행해 주시기 바랍니다.\n\n품의 진행 전 SCM 담당자와 재고 유무를 사전 확인하시면 업무 처리에 도움이 됩니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_15",
      "category": "other",
      "question": "우리회사의 펌프 HS코드에 대해서 알려주세요",
      "keywords": ["HS코드", "HScode", "관세", "품목분류"],
      "answer": "윌로펌프에서 취급하는 펌프 완제품 및 부품의 기본 HS CODE는 아래와 같습니다.\n\n- 원심펌프 기타 (Other Centrifugal Pump) : 8413.70-9090\n- 터빈펌프 (Turbine Pump) : 8413.70-9010\n- 볼류트펌프 (Volute Pump) : 8413.70-9020\n- 펌프 부분품 (Of Centrifugal Pump) : 8413.91-4000\n\n펌프의 종류는 원심펌프를 기준으로 터빈형 또는 볼류트형으로 구분되며,\n제품 구조에 대한 상세 사항은 R&D 센터 담당자에게 문의해 주시기 바랍니다.\n\nHS Code에 대한 추가 정보는 관세청 유니패스(Unipass)에서 확인 가능합니다.\nhttps://unipass.customs.go.kr/clip/index.do",
      "top": true,
      "contactId": ""
    },
    {
      "__id": "qa_16",
      "category": "other",
      "question": "원재료 타계정 부품은 어디서 받아가나요?",
      "keywords": ["타계정", "부품", "수령", "어디서", "받아"],
      "answer": "타계정 품의 완료 후 품의서를 출력하여 지참하시고,\nSCM반 담당자에게 전달하시면 부품 수령이 가능합니다.\n\n부품 수령 전 반드시 품의 절차를 완료해 주시기 바랍니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_17",
      "category": "other",
      "question": "금형투자관련 입고 프로세스가 궁금합니다",
      "keywords": ["금형", "투자", "입고", "프로세스"],
      "answer": "금형 투자 관련 입고 절차는 다음과 같습니다:\nPR 생성 → 자산번호 부여 → PO 생성 → 입고 처리",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_18",
      "category": "other",
      "question": "구매 업체 등록은 어떻게 하나요?",
      "keywords": ["업체등록", "Ariba", "협력사", "어떻게"],
      "answer": "Ariba 시스템을 통한 업체 등록은 필수이며, 등록까지 최소 3일이 소요됩니다. 사전 구매팀 협의가 반드시 필요합니다.\n\n등록 절차:\n1. 1차 정보 입력 – 구매팀\n2. 1차 승인 – Group Purchasing \n3. 협력사 사이트 접속 후 사업자등록증 및 통장사본 업로드, 정보 입력 – 협력사\n4. 재무팀 승인\n5. 상세 정보 및 질문서 입력 – 구매팀\n6. 최종 승인 – Group Purchasing 부서",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_19",
      "category": "other",
      "question": "Ariba 제출 서류에 대해서 안내해주세요",
      "keywords": ["Ariba", "제출서류", "안내"],
      "answer": "Ariba 시스템을 통한 제출 시 아래 서류가 필요합니다:\n\nPR 문서 (구매문서번호 확인 필수)\n세금계산서\n거래명세서 (필요 시 제출)",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_20",
      "category": "other",
      "question": "Ariba 비용 선급금 처리해야 하는 경우는 어떻게 하나요?",
      "keywords": ["Ariba", "선급금", "어떻게"],
      "answer": "선급금 처리 시 다음과 같은 절차를 따릅니다:\n\n1. PR 작성 시, 재무 부문장을 합의자로 지정하여 결재를 받은 후, 문서 상단에 '선급지급' 문구를 명시하여 재무팀에 제출\n2. 선급금 지급 완료 후, 세금계산서를 수령한 시점에서 문서 상단에 '가불반제' 문구를 표기한 뒤, Ariba PR 문서와 함께 SCM팀에 제출",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_21",
      "category": "other",
      "question": "Ariba 비용처리되었는지 확인 부탁드립니다.",
      "keywords": ["Ariba", "비용처리", "확인"],
      "answer": "Ariba 관련 비용 처리는 재무팀에서 전담하고 있으므로, 재무팀의 비용 처리 담당자에게 직접 문의해 주시기 바랍니다.\n\n입고 처리 여부가 궁금하신 경우에는 SCM팀 담당자에게 구매오더 번호를 전달하여 확인 요청하시면 됩니다.",
      "top": true,
      "contactId": ""
    },
    {
      "__id": "qa_22",
      "category": "production",
      "question": "MVI 90, 125제품은 단종되었나요?",
      "keywords": ["MVI", "단종", "90", "125", "10인치"],
      "answer": "MVI 10인치 제품(90, 125 시리즈)은 2025년 11월 14일 기준으로, 라발 공장으로부터 오더 접수 중단 공문이 접수되어 현재 추가 오더 접수가 불가합니다.\n\n해당 내용은 BD팀을 통해 공유 완료되었으며, 현재 WPK 사내 재고 또한 없는 상태입니다.\n\n이에 따라 대체 모델로 Helix First 제품으로 모델 변경을 진행 중입니다.\n\n자세한 사항은 R&D 센터 담당자에게 문의 부탁드립니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_23",
      "category": "production",
      "question": "NL 제품은 단종되었나요?",
      "keywords": ["NL", "단종"],
      "answer": "NL 제품은 인도 Mather & Platt 공장에서 생산되던 제품으로, 현재 인도 공장에서도 단종되었습니다.\n\n대체품으로는 ATOMOS GIGA N 제품 적용이 가능하며,\n자세한 사항은 개발팀 담당자에게 문의 부탁드립니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_24",
      "category": "production",
      "question": "단종된 제품의 경우 추가 오더가 가능한가요?",
      "keywords": ["단종", "추가오더", "가능"],
      "answer": "단종된 제품의 경우 사내에 부품 재고가 남아 있는 경우에 한해 생산 가능 수량을 안내드립니다.\n다만, 관계사에서 제조하는 제품은 공지된 '라스트 오더(Last Order) 가능 시점' 이후에는 추가 오더가 불가합니다.\n\n자세한 사항은 SCM팀 담당자 통해 확인 부탁드립니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_25",
      "category": "purchase",
      "question": "발주 취소가 가능한가요?",
      "keywords": ["발주", "취소", "가능"],
      "answer": "관계사 제품의 경우, 최초 발주 진행일 기준 약 3~4일 이내에는 오더 취소가 가능하나,\n이후 취소 요청 시에는 발주 취소가 불가하거나 추가적인 취소 차지가 발생할 수 있습니다.\n\n특히 최근 독일 Hof의 경우, 최초 오더 컨펌 이후 운송방법 변경, Spec 변경, 컨펌 요청 미회신 후 변경 요청 등 변동사항 발생 시 추가 차지를 부과하는 정책을 적용하고 있으므로,\n오더 확정 전 사양 및 조건을 충분히 검토 후 진행 부탁드립니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_26",
      "category": "purchase",
      "question": "해외 도입 제품의 표준 리드타임이 어떻게 되나요?",
      "keywords": ["도입", "리드타임", "납기", "기간", "어떻게"],
      "answer": "도입 업체별로 리드타임이 상이하므로, 정확한 일정은 해당 업체 담당자에게 확인 부탁드립니다.\n유럽발 : 항공 2~3주, 해상 2.5개월~3.5개월\n중국발 : 항공 1~2주, 해상 2~3주",
      "top": true,
      "contactId": ""
    },
    {
      "__id": "qa_27",
      "category": "purchase",
      "question": "수량 변경이 가능한가요?",
      "keywords": ["수량", "변경", "가능"],
      "answer": "사내 조립품의 경우, 오더 수량 변경은 가능합니다.\n\n다만 이미 생산 완료 또는 생산 진행 중인 경우, 변경·취소 수량에 대해 불용 재고 비용이 발생할 수 있으며, 해당 비용은 요청 부서에 부담될 수 있습니다.\n\n도입품의 경우, 이미 생산이 완료되었거나 선적이 진행 중인 건에 대한 취소 수량은 불가합니다.\n추가 수량이 필요한 경우에는 신규 오더로 진행 가능하며, 추가 수량의 납기는 기존 오더와 상이할 수 있습니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_28",
      "category": "purchase",
      "question": "샘플 발주가 가능한가요?",
      "keywords": ["샘플", "발주", "가능"],
      "answer": "샘플 발주 가능 여부는 공급업체의 제작 가능 여부 및 단가 확인이 필요하므로, 구매팀을 통해 문의해 주시면 상세 안내 받을 수 있습니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_29",
      "category": "purchase",
      "question": "시험 생산용 자재 조달 가능한가요?",
      "keywords": ["시험생산", "자재", "조달", "가능"],
      "answer": "시험 생산용 자재 조달 문의는 구매팀을 통해 먼저 확인 부탁드립니다.\n\n시험 생산용 자재는 대부분 입고 이력이 없는 신규 부품으로, 단가 입력 여부 등 사전 확인이 필요하여 구매팀 문의가 우선입니다.\n\n양산에 이미 사용 중인 부품을 시험 생산에 사용하는 경우 SCM통하여 공급 가능합니다.\n\n신규 부품 및 입고 이력 없는 부품 (아래 프로세스 필수)\n→ 개발팀: 자재 확장\n→ 기획팀: 단가 확인\n→ 구매팀: 단가 입력\n\n기존 양산 사용 부품\n→ SCM팀",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_30",
      "category": "purchase",
      "question": "그룹 제품의 OTP 혹은 TPL의 NEGO가 가능한가요?",
      "keywords": ["OTP", "TPL", "NEGO", "가격협상"],
      "answer": "한 번 설정된 OTP 또는 TPL 가격은 1년간 고정되며, 해당 기간 중 추가 인상 또는 인하는 원칙적으로 불가합니다.\n\n그룹 제품 가격 관련 구체적인 안내가 필요하신 경우, 기획팀 담당자에게 문의 부탁드립니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_31",
      "category": "purchase",
      "question": "도입제품 단가 확인 부탁드립니다.",
      "keywords": ["도입", "단가", "확인"],
      "answer": "아래 담당자 확인 후 해당 부서로 문의 부탁드립니다.\n\n관계사: 기획팀 담당자\n비관계사: 구매팀",
      "top": true,
      "contactId": ""
    },
    {
      "__id": "qa_32",
      "category": "other",
      "question": "해외 발송한 품목에 대한 비용 처리",
      "keywords": ["해외발송", "운반비", "비용처리", "코스트센터"],
      "answer": "그룹차원에서 운반비 관련 비용 집계 목적으로 3615135(운반비) or 3615140(수출운반비) 정산 시 코스트센터는 코스트센터 : 36500(Outbound Freight)로 통일하기로 하였습니다.\n이에, 상기 두 계정과목 사용 시 해당 코스트센터를 사용하시어 비용 처리 부탁드립니다.",
      "top": true,
      "contactId": ""
    },
    {
      "__id": "qa_33",
      "category": "other",
      "question": "타계정 처리란 무엇인가요?",
      "keywords": ["타계정", "처리", "무엇", "의미"],
      "answer": "회계상 재고자산(원재료, 상품 등)을 판매 목적이 아닌 자가사용, 접대, 연구개발 등 다른 용도로 사용할 경우, 기존 재고 계정에서 해당 목적에 맞는 계정 과목으로 변경 처리하는 것을 의미합니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_34",
      "category": "other",
      "question": "타계정 처리는 언제 필요한가요?",
      "keywords": ["타계정", "필요", "언제"],
      "answer": "재고자산을 판매 목적 외의 용도로 사용할 때 반드시 필요합니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_35",
      "category": "other",
      "question": "타계정 처리 시 기본 원칙은 무엇인가요?",
      "keywords": ["타계정", "원칙", "기본"],
      "answer": "재고자산을 판매 목적 외로 사용할 경우 반드시 타계정 품의 절차를 거쳐야 합니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_36",
      "category": "other",
      "question": "타계정 부품 인출 절차는 어떻게 되나요?",
      "keywords": ["타계정", "인출", "절차", "단계", "어떻게"],
      "answer": "1단계 품의서 작성 → 2단계 승인 절차 → 3단계 수령 및 인계 순으로 진행됩니다.",
      "top": false,
      "contactId": ""
    },
    {
      "__id": "qa_37",
      "category": "other",
      "question": "재고가 없을 경우 어떻게 해야 하나요?",
      "keywords": ["재고", "없음", "없을", "어떻게"],
      "answer": "먼저 해당 부품 담당자에게 연락하여 입고 예정일을 문의합니다. 입고 완료 후 담당자에게 연락하여 인계를 받습니다.",
      "top": false,
      "contactId": ""
    }
  ];

  const CATEGORY_LABELS = {
    all: "전체", delivery: "배송", documents: "문서",
    production: "생산", purchase: "구매", other: "기타"
  };

  const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS).filter(function (c) { return c !== "all"; }));

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

  // ✅ 변경: contactId 필드 추가
  function normalizeItem(item) {
    return {
      __id:      item.__id || createQAId(),
      category:  normalizeCategory(item.category),
      question:  String(item.question || "").trim(),
      keywords:  normalizeKeywords(item.keywords),
      answer:    String(item.answer   || "").trim(),
      top:       !!item.top,
      contactId: item.contactId || "" // ✅ 추가: QA별 담당자 ID
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

  // ── 버전 관리 / QA 로드 ──────────────────────────────────────
  function ensureLatestDefaultQA() {
    const currentVersion = localStorage.getItem(QA_VERSION_KEY);
    const stored = safeParse(localStorage.getItem(QA_KEY), null);

    if (currentVersion !== QA_VERSION || !Array.isArray(stored) || !stored.length) {
      const normalizedDefaults = DEFAULT_QA.map(normalizeItem).filter(function (i) { return i.question && i.answer; });

      if (Array.isArray(stored) && stored.length) {
        const mergedMap  = new Map();
        const defaultIds = new Set(DEFAULT_QA.map(function (d) { return d.__id; }));

        normalizedDefaults.forEach(function (item) { mergedMap.set(item.__id, item); });
        stored.forEach(function (raw) {
          const item = normalizeItem(raw);
          if (item.question && item.answer && !defaultIds.has(item.__id)) {
            mergedMap.set(item.__id, item);
          }
        });

        const merged = Array.from(mergedMap.values());
        localStorage.setItem(QA_KEY, JSON.stringify(merged));
        localStorage.setItem(QA_VERSION_KEY, QA_VERSION);
        return merged;
      }

      localStorage.setItem(QA_KEY, JSON.stringify(normalizedDefaults));
      localStorage.setItem(QA_VERSION_KEY, QA_VERSION);
      return normalizedDefaults;
    }

    return stored.map(normalizeItem).filter(function (i) { return i.question && i.answer; });
  }

  function loadQA()      { return ensureLatestDefaultQA(); }
  function saveQA(items) {
    const normalized = items.map(normalizeItem).filter(function (i) { return i.question && i.answer; });
    localStorage.setItem(QA_KEY, JSON.stringify(normalized));
    localStorage.setItem(QA_VERSION_KEY, QA_VERSION);
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
      return q.includes(k);
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
        if (itemWords.some(function(iw) { return iw.includes(qw) || qw.includes(iw); })) {
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

  function _fetchWithTimeout(url, options, timeoutMs) {
    timeoutMs = timeoutMs || 10000;
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    return fetch(url, Object.assign({}, options, { signal: controller.signal }))
      .finally(function () { clearTimeout(timer); });
  }

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
        saveQA(Array.from(mergedMap.values()));
      } else {
        saveQA(incoming);
      }
    },
    deleteQAById(id) {
      const current = loadQA();
      const next    = current.filter(function (item) { return item.__id !== id; });
      if (next.length === current.length) return false;
      saveQA(next); return true;
    },
    deleteQAByIndex(index) {
      const current = loadQA();
      if (index < 0 || index >= current.length) return false;
      current.splice(index, 1); saveQA(current); return true;
    },
    clearQA() {
      localStorage.setItem(QA_KEY, JSON.stringify([]));
      localStorage.setItem(QA_VERSION_KEY, QA_VERSION);
    },
    resetToDefault() {
      localStorage.setItem(QA_KEY, JSON.stringify(DEFAULT_QA.map(normalizeItem)));
      localStorage.setItem(QA_VERSION_KEY, QA_VERSION);
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
