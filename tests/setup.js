// 테스트 환경 설정
process.env.NODE_ENV = 'test';
process.env.PORT = 3001;

// 콘솔 출력 최소화
if (process.env.NODE_ENV === 'test') {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
}

// 테스트 타임아웃 설정
jest.setTimeout(30000);
