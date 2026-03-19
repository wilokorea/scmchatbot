SCM 챗봇 최종 패키지 안내

구성 파일
1. index_final.html  : 사용자용 챗봇 화면
2. admin_final.html  : 관리자 페이지
3. shared.js         : 공통 데이터 저장/검색 로직

배치 방법
- 같은 폴더에 3개 파일을 함께 업로드하세요.
- 사용자 페이지는 index_final.html
- 관리자 페이지는 admin_final.html
- 두 파일 모두 shared.js를 같은 경로에서 불러옵니다.

관리자 로그인 설정
admin_final.html 상단의 window.ADMIN_CONFIG를 환경에 맞게 설정하세요.

개발 테스트 예시
window.ADMIN_CONFIG = {
  authMode: "dev",
  devPassword: "1234",
  unmatchedApiUrl: "https://scmchatbot-api-e9bdbzbgeae3ecgj.koreasouth-01.azurewebsites.net/api/getUnmatched"
};

운영 예시
window.ADMIN_CONFIG = {
  authMode: "server",
  loginApiUrl: "https://your-api/login",
  verifyApiUrl: "https://your-api/verify",
  logoutApiUrl: "https://your-api/logout",
  unmatchedApiUrl: "https://scmchatbot-api-e9bdbzbgeae3ecgj.koreasouth-01.azurewebsites.net/api/getUnmatched",
  requestTimeoutMs: 12000
};

사용자 페이지 설정
index_final.html 상단의 window.CHATBOT_CONFIG를 바꾸면 됩니다.
- logApiUrl
- topQuestionsApiUrl
- requestTimeoutMs
- faqButtonCount

이번 최종본에서 반영된 내용
- 챗봇 화면 서버 장애 시 로컬 FAQ 자동 대체
- FAQ 버튼 연타 방지
- 질문 전송 중 입력 잠금 처리
- 로딩 메시지 추가
- 서버 로그 실패 시 localStorage 임시 저장
- 관리자 페이지 보안 구조 개선 버전 반영
- Q&A 삭제를 __id 기반으로 처리
- CSV 업로드 시 중복 질문 갱신, 형식 정규화

주의
- admin_final.html은 구조만 안전하게 바꾼 것이며, 실제 운영 보안은 반드시 서버 인증이 필요합니다.
- shared.js 데이터는 localStorage 기반이라 브라우저별로 독립 저장됩니다.
