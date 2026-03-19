SCM 챗봇 최종 패키지

구성 파일
- index.html : 사용자용 챗봇 화면
- shared.js : FAQ 데이터/검색 로직
- admin.html : 관리자 페이지
- README.txt : 사용 안내

적용 방법
1. 기존 GitHub Pages 폴더 안의 index.html, shared.js, admin.html 을 이 파일들로 교체합니다.
2. 같은 폴더에 업로드해야 합니다.
3. GitHub Pages 반영 후 브라우저에서 강력 새로고침(Ctrl+F5) 해주세요.

중요
- index.html 에서 서버 상태 배너는 제거되어 있습니다.
- 서버 상위 질문 API가 실패해도 화면에 경고 문구 없이 로컬 FAQ로 자동 대체됩니다.
- admin.html 로그인 비밀번호는 현재 dev 모드 기준으로 wpkscm 입니다.
- 실운영 시에는 admin.html 의 window.ADMIN_CONFIG 를 server 모드로 바꾸는 것이 더 안전합니다.

Azure API
- logQuestion: https://scmchatbot-api-e9bdbzbgeae3ecgj.koreasouth-01.azurewebsites.net/api/logQuestion
- getTopQuestions: https://scmchatbot-api-e9bdbzbgeae3ecgj.koreasouth-01.azurewebsites.net/api/getTopQuestions
- getUnmatched: https://scmchatbot-api-e9bdbzbgeae3ecgj.koreasouth-01.azurewebsites.net/api/getUnmatched
