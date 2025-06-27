# 🤖 Google Gemini API 설정 가이드

## 📋 Google AI Studio에서 API 키 발급받기

### 1. Google AI Studio 접속
1. **https://makersuite.google.com/app/apikey** 또는 **https://aistudio.google.com** 접속
2. Google 계정으로 로그인

### 2. API 키 생성
1. **"Create API Key"** 또는 **"API 키 만들기"** 클릭
2. 프로젝트 선택 또는 새 프로젝트 생성
3. API 키가 생성되면 **안전한 곳에 복사해서 저장**

### 3. 무료 사용량 확인
- **Gemini Pro**: 월 60회 요청 (무료)
- **Gemini Pro Vision**: 월 60회 요청 (무료)
- **매일 15 RPM (Requests Per Minute)** 제한

## ⚙️ AI 개발 시스템에 Gemini API 설정

### 방법 1: 환경변수 설정
```bash
# .env 파일에 추가
GEMINI_API_KEY=your-gemini-api-key-here
AI_PROVIDER=gemini
```

### 방법 2: 웹 인터페이스에서 설정
1. **고급 기능** 페이지 접속
2. **AI 설정 관리** 카드에서 제공자를 'Google Gemini'로 변경
3. **연결 테스트** 버튼으로 API 키 확인

## 🚀 사용법

### OpenAI 대신 Gemini 사용
```javascript
// 자동으로 Gemini 사용 (AI_PROVIDER=gemini 설정 시)
const response = await aiService.generateText("안녕하세요!");

// 명시적으로 Gemini 사용
const response = await aiService.generateText("안녕하세요!", { 
  provider: 'gemini' 
});
```

### 웹 인터페이스에서 사용
1. **AI 설정 관리**에서 현재 제공자 확인
2. **🔄 제공자 변경** 버튼으로 Gemini로 전환
3. **🧪 연결 테스트**로 정상 작동 확인

## 💡 장점과 특징

### Google Gemini의 장점
1. **무료 사용량**: 월 60회 요청 무료 제공
2. **다국어 지원**: 한국어 지원 우수
3. **빠른 응답**: 일반적으로 OpenAI보다 빠른 응답
4. **Google 생태계**: Google 서비스와 연동 용이

### 사용 시나리오
- **개발 학습**: 무료 할당량으로 충분
- **프로토타이핑**: 빠른 개발 및 테스트
- **백업 솔루션**: OpenAI 장애 시 대체 수단
- **비용 절약**: 상용 서비스 전 무료 테스트

## 🔄 제공자 자동 전환

시스템에서 자동으로 제공자를 전환하는 경우:
1. **주 제공자 장애** 시 자동으로 보조 제공자 사용
2. **API 할당량 초과** 시 다른 제공자로 전환
3. **응답 속도 최적화**를 위한 동적 전환

## 🛠️ 문제 해결

### API 키가 작동하지 않는 경우
1. **API 키 확인**: 올바르게 복사했는지 확인
2. **프로젝트 활성화**: Google Cloud에서 프로젝트 활성화 확인
3. **할당량 확인**: 무료 할당량 초과 여부 확인

### 연결 테스트 실패
```bash
# 환경변수 확인
echo $GEMINI_API_KEY

# 서버 재시작
npm restart
```

### 오류 메시지 해석
- **403 Forbidden**: API 키 권한 문제
- **429 Too Many Requests**: 할당량 초과
- **400 Bad Request**: 요청 형식 오류

## 📊 사용량 모니터링

### Google AI Studio에서 확인
1. **https://aistudio.google.com** 접속
2. **Usage** 또는 **사용량** 탭 확인
3. 일일/월간 사용량 및 남은 할당량 확인

### 시스템에서 확인
1. **AI 설정 관리** → **📊 상태 새로고침**
2. 현재 제공자 및 상태 확인
3. **🧪 연결 테스트**로 API 상태 점검

## 🎯 추천 사용법

### 초보자
```bash
# 1. 무료로 시작
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key

# 2. 기본 기능 테스트
- 텍스트 생성
- 코드 생성  
- 페어 프로그래밍
```

### 고급 사용자
```bash
# 1. 다중 제공자 설정
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
AI_PROVIDER=openai  # 주 제공자

# 2. 자동 폴백 활용
- OpenAI 장애 시 자동으로 Gemini 사용
- API 할당량 관리
```

## 🔮 미래 계획

### 추가 예정 기능
1. **Claude API** 지원 (Anthropic)
2. **로컬 AI 모델** 지원 (Ollama, LM Studio)
3. **AI 모델 성능 비교** 도구
4. **사용량 분석** 및 **비용 최적화**

---

**💡 팁**: OpenAI API 키가 없어도 Google Gemini로 대부분의 AI 기능을 무료로 사용할 수 있습니다!

**🔗 유용한 링크**:
- [Google AI Studio](https://aistudio.google.com)
- [Gemini API 문서](https://ai.google.dev/docs)
- [사용량 제한 정보](https://ai.google.dev/pricing)
