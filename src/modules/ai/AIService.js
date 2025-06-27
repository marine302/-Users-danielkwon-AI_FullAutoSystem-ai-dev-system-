import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../../../config/index.js';

class AIService {
  constructor() {
    // 싱글톤 인스턴스가 이미 있으면 반환
    if (AIService.instance) {
      return AIService.instance;
    }
    
    this.provider = config.ai.defaultProvider;
    this.isEnabled = false;
    
    // OpenAI API 초기화
    if (config.ai.openaiApiKey && config.ai.openaiApiKey !== 'your-openai-api-key-here') {
      this.openai = new OpenAI({
        apiKey: config.ai.openaiApiKey
      });
      if (this.provider === 'openai') {
        this.isEnabled = true;
      }
    } else {
      this.openai = null;
    }
    
    // Google Gemini API 초기화
    if (config.ai.geminiApiKey && config.ai.geminiApiKey !== 'your-gemini-api-key-here') {
      this.gemini = new GoogleGenerativeAI(config.ai.geminiApiKey);
      this.geminiModel = this.gemini.getGenerativeModel({ model: config.ai.geminiModel });
      if (this.provider === 'gemini') {
        this.isEnabled = true;
      }
    } else {
      this.gemini = null;
      this.geminiModel = null;
    }
    
    // 경고 메시지 출력
    if (!this.isEnabled) {
      if (!AIService.warningShown) {
        console.warn('⚠️  AI API 키가 설정되지 않았습니다. AI 기능이 제한됩니다.');
        console.warn('💡  OpenAI 또는 Google Gemini API 키를 설정하세요.');
        AIService.warningShown = true;
      }
    } else {
      console.log(`✅ AI 서비스가 ${this.provider.toUpperCase()}로 활성화되었습니다.`);
    }
    
    this.defaultModel = config.ai.defaultModel;
    this.geminiModelName = config.ai.geminiModel;
    this.maxTokens = config.ai.maxTokens;
    this.temperature = config.ai.temperature;
    
    // 싱글톤 인스턴스 저장
    AIService.instance = this;
  }

  /**
   * 텍스트 생성
   * @param {string} prompt - 프롬프트
   * @param {Object} options - 옵션
   * @returns {Promise<string>} 생성된 텍스트
   */
  async generateText(prompt, options = {}) {
    if (!this.isEnabled) {
      return this.generateSmartDemoResponse(prompt);
    }

    try {
      const provider = options.provider || this.provider;
      
      if (provider === 'gemini' && this.geminiModel) {
        return await this.generateTextWithGemini(prompt, options);
      } else if (provider === 'openai' && this.openai) {
        return await this.generateTextWithOpenAI(prompt, options);
      } else {
        // 기본 제공자가 사용 불가능하면 다른 제공자 시도
        if (this.geminiModel) {
          return await this.generateTextWithGemini(prompt, options);
        } else if (this.openai) {
          return await this.generateTextWithOpenAI(prompt, options);
        } else {
          return this.generateSmartDemoResponse(prompt);
        }
      }
    } catch (error) {
      console.error('AI 텍스트 생성 오류:', error);
      // 실패 시 대체 제공자 시도
      try {
        if (this.provider === 'openai' && this.geminiModel) {
          console.log('OpenAI 실패, Gemini로 재시도...');
          return await this.generateTextWithGemini(prompt, options);
        } else if (this.provider === 'gemini' && this.openai) {
          console.log('Gemini 실패, OpenAI로 재시도...');
          return await this.generateTextWithOpenAI(prompt, options);
        }
      } catch (fallbackError) {
        console.error('대체 AI 제공자도 실패:', fallbackError);
      }
      
      return this.generateSmartDemoResponse(prompt);
    }
  }

  /**
   * OpenAI로 텍스트 생성
   */
  async generateTextWithOpenAI(prompt, options = {}) {
    const response = await this.openai.chat.completions.create({
      model: options.model || this.defaultModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature || this.temperature,
      ...options
    });

    return response.choices[0].message.content;
  }

  /**
   * Google Gemini로 텍스트 생성
   */
  async generateTextWithGemini(prompt, options = {}) {
    const result = await this.geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature || this.temperature,
        maxOutputTokens: options.maxTokens || this.maxTokens,
      },
    });

    const response = await result.response;
    return response.text();
  }

  /**
   * 스마트 DEMO 응답 생성
   * @param {string} prompt - 프롬프트
   * @returns {string} 맥락에 맞는 응답
   */
  generateSmartDemoResponse(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // 코드 관련 질문들
    if (lowerPrompt.includes('코드') || lowerPrompt.includes('함수') || lowerPrompt.includes('개선')) {
      if (lowerPrompt.includes('개선') || lowerPrompt.includes('최적화')) {
        return `🔧 코드 개선 제안:

1. **가독성 향상**: 변수명을 더 명확하게 작성하세요
2. **성능 최적화**: 불필요한 반복문을 줄이고 캐싱을 활용하세요
3. **에러 핸들링**: try-catch 문을 추가하여 예외 상황을 처리하세요
4. **주석 추가**: 복잡한 로직에는 설명을 추가하세요

현재 코드를 보여주시면 더 구체적인 개선안을 제안해드릴 수 있습니다!`;
      }
      
      if (lowerPrompt.includes('버그') || lowerPrompt.includes('오류')) {
        return `🐛 버그 찾기 체크리스트:

1. **문법 오류**: 괄호, 세미콜론 누락 확인
2. **변수 스코프**: 변수가 올바른 범위에서 사용되는지 확인
3. **타입 오류**: 데이터 타입이 예상과 일치하는지 확인
4. **논리 오류**: 조건문과 반복문의 로직 검토
5. **API 호출**: 네트워크 요청의 응답 처리 확인

코드를 공유해주시면 구체적인 문제점을 찾아드리겠습니다!`;
      }
      
      return `💻 코딩 도움말:

다음과 같은 도움을 제공할 수 있습니다:
- 코드 리뷰 및 개선 제안
- 버그 찾기 및 디버깅 팁
- 성능 최적화 방법
- 베스트 프랙티스 가이드
- 새로운 기능 구현 아이디어

구체적인 질문이나 코드를 공유해주세요!`;
    }
    
    // 봇/프로젝트 관련 질문들
    if (lowerPrompt.includes('봇') || lowerPrompt.includes('만들') || lowerPrompt.includes('프로젝트')) {
      return `🤖 봇 개발 가이드:

**1. 기본 구조 설계**
\`\`\`javascript
class ChatBot {
  constructor(name) {
    this.name = name;
    this.responses = new Map();
  }
  
  addResponse(trigger, response) {
    this.responses.set(trigger, response);
  }
  
  respond(input) {
    // 입력에 따른 응답 로직
    return this.findBestResponse(input);
  }
}
\`\`\`

**2. 필요한 기능들**
- 자연어 처리 (NLP)
- 응답 패턴 매칭
- 컨텍스트 관리
- 학습 능력

**3. 구현 단계**
1. 기본 명령어 처리
2. 패턴 매칭 시스템
3. 대화 맥락 유지
4. 외부 API 연동

어떤 종류의 봇을 만들고 싶으신가요?`;
    }
    
    // 일반적인 도움 요청
    if (lowerPrompt.includes('도움') || lowerPrompt.includes('help') || lowerPrompt.includes('안녕')) {
      return `👋 안녕하세요! 페어 프로그래밍 AI 도우미입니다.

**제가 도울 수 있는 것들:**
- 📝 코드 작성 및 리뷰
- 🐛 버그 찾기 및 디버깅
- 🚀 성능 최적화 제안
- 💡 새로운 기능 아이디어
- 📚 개발 지식 공유
- 🔧 문제 해결 방법

**사용법:**
채팅창에 \`@ai\` 뒤에 질문을 입력하시면 됩니다.

예시:
- \`@ai 이 함수를 최적화해주세요\`
- \`@ai React 컴포넌트 만드는 법\`
- \`@ai 버그를 찾아주세요\`

무엇을 도와드릴까요?`;
    }
    
    // 기술 스택 관련
    if (lowerPrompt.includes('react') || lowerPrompt.includes('javascript') || lowerPrompt.includes('node')) {
      const tech = lowerPrompt.includes('react') ? 'React' : 
                  lowerPrompt.includes('node') ? 'Node.js' : 'JavaScript';
      
      return `⚛️ ${tech} 개발 팁:

**${tech === 'React' ? 'React 컴포넌트 개발' : tech === 'Node.js' ? 'Node.js 서버 개발' : 'JavaScript 개발'}:**

${tech === 'React' ? `
\`\`\`jsx
function MyComponent({ title, children }) {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        증가
      </button>
      {children}
    </div>
  );
}
\`\`\`
` : tech === 'Node.js' ? `
\`\`\`javascript
const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.listen(3000, () => {
  console.log('서버가 포트 3000에서 실행 중입니다');
});
\`\`\`
` : `
\`\`\`javascript
// 모던 JavaScript 패턴
const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('데이터 가져오기 실패:', error);
    throw error;
  }
};
\`\`\`
`}

구체적으로 어떤 부분이 궁금하신가요?`;
    }
    
    // 기본 응답
    return `🤔 "${prompt}"에 대해 도움을 드리겠습니다!

현재 DEMO 모드에서 작동 중이지만, 다음과 같은 도움을 제공할 수 있습니다:

**💡 가능한 질문 유형:**
- 코드 리뷰 및 개선
- 버그 찾기 및 해결
- 새로운 기능 구현
- 기술 스택 선택
- 개발 방법론

**🔧 더 나은 응답을 위한 팁:**
1. 구체적인 코드나 상황을 설명해주세요
2. 어떤 언어/프레임워크를 사용하는지 알려주세요
3. 현재 겪고 있는 문제를 자세히 설명해주세요

예시: "@ai React에서 useState 훅을 사용해서 카운터를 만들고 싶어요"

더 구체적인 질문을 해주시면 더 도움이 되는 답변을 드릴 수 있습니다!`;
  }

  /**
   * 코드 생성
   * @param {string} description - 코드 설명
   * @param {string} language - 프로그래밍 언어
   * @param {Object} options - 옵션
   * @returns {Promise<string>} 생성된 코드
   */
  async generateCode(description, language = 'javascript', options = {}) {
    if (!this.isEnabled) {
      return this.generateSmartCodeDemo(description, language);
    }

    const prompt = `
다음 요구사항에 맞는 ${language} 코드를 생성해주세요:

요구사항: ${description}

코드는 다음 조건을 만족해야 합니다:
- 클린 코드 원칙 준수
- 적절한 주석 포함
- 에러 핸들링 포함
- 테스트 가능한 구조

코드만 반환해주세요:
`;

    return await this.generateText(prompt, {
      ...options,
      temperature: 0.3 // 코드 생성시 더 낮은 창의성
    });
  }

  /**
   * 스마트 코드 DEMO 생성
   * @param {string} description - 코드 설명
   * @param {string} language - 프로그래밍 언어
   * @returns {string} 실용적인 예제 코드
   */
  generateSmartCodeDemo(description, language) {
    const lowerDesc = description.toLowerCase();
    
    if (language === 'javascript') {
      if (lowerDesc.includes('로그인') || lowerDesc.includes('인증')) {
        return `// 로그인 기능 구현
async function login(username, password) {
  try {
    // 입력값 검증
    if (!username || !password) {
      throw new Error('사용자명과 비밀번호를 입력해주세요');
    }
    
    // API 호출
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      throw new Error('로그인에 실패했습니다');
    }
    
    const data = await response.json();
    
    // 토큰 저장
    localStorage.setItem('authToken', data.token);
    
    return {
      success: true,
      user: data.user,
      token: data.token
    };
  } catch (error) {
    console.error('로그인 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 사용 예시
login('user@example.com', 'password123')
  .then(result => {
    if (result.success) {
      console.log('로그인 성공:', result.user);
    } else {
      console.error('로그인 실패:', result.error);
    }
  });`;
      }
      
      if (lowerDesc.includes('봇') || lowerDesc.includes('챗봇')) {
        return `// 간단한 챗봇 구현
class ChatBot {
  constructor(name = 'AI Assistant') {
    this.name = name;
    this.responses = new Map();
    this.setupDefaultResponses();
  }
  
  setupDefaultResponses() {
    // 기본 응답 패턴들
    this.addResponse(['안녕', 'hello', 'hi'], '안녕하세요! 무엇을 도와드릴까요?');
    this.addResponse(['도움', 'help'], '다음과 같은 도움을 드릴 수 있습니다:\\n- 질문 답변\\n- 정보 검색\\n- 간단한 계산');
    this.addResponse(['시간', 'time'], () => \`현재 시간은 \${new Date().toLocaleString()}입니다.\`);
    this.addResponse(['이름'], \`제 이름은 \${this.name}입니다.\`);
  }
  
  addResponse(triggers, response) {
    triggers.forEach(trigger => {
      this.responses.set(trigger.toLowerCase(), response);
    });
  }
  
  respond(input) {
    const lowerInput = input.toLowerCase();
    
    // 정확한 매칭 찾기
    for (let [trigger, response] of this.responses) {
      if (lowerInput.includes(trigger)) {
        return typeof response === 'function' ? response() : response;
      }
    }
    
    // 기본 응답
    return '죄송합니다. 이해하지 못했습니다. 다시 말씀해주시겠어요?';
  }
  
  chat(message) {
    const response = this.respond(message);
    console.log(\`\${this.name}: \${response}\`);
    return response;
  }
}

// 사용 예시
const bot = new ChatBot('MyBot');
bot.chat('안녕하세요');
bot.chat('시간이 몇 시인가요?');
bot.chat('도움이 필요해요');`;
      }
      
      if (lowerDesc.includes('api') || lowerDesc.includes('서버')) {
        return `// Express.js API 서버 구현
const express = require('express');
const cors = require('cors');
const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 데이터 저장소 (실제로는 데이터베이스 사용)
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

// 모든 사용자 조회
app.get('/api/users', (req, res) => {
  try {
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 특정 사용자 조회
app.get('/api/users/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = users.find(u => u.id === id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 새 사용자 생성
app.post('/api/users', (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: '이름과 이메일이 필요합니다'
      });
    }
    
    const newUser = {
      id: users.length + 1,
      name,
      email,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    res.status(201).json({
      success: true,
      data: newUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`서버가 포트 \${PORT}에서 실행 중입니다\`);
});`;
      }
      
      if (lowerDesc.includes('react') || lowerDesc.includes('컴포넌트')) {
        return `// React 컴포넌트 예시
import React, { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchUser();
  }, [userId]);
  
  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(\`/api/users/\${userId}\`);
      
      if (!response.ok) {
        throw new Error('사용자 정보를 가져올 수 없습니다');
      }
      
      const userData = await response.json();
      setUser(userData.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = () => {
    fetchUser();
  };
  
  if (loading) {
    return <div className="loading">사용자 정보를 불러오는 중...</div>;
  }
  
  if (error) {
    return (
      <div className="error">
        <p>오류: {error}</p>
        <button onClick={handleRefresh}>다시 시도</button>
      </div>
    );
  }
  
  if (!user) {
    return <div className="not-found">사용자를 찾을 수 없습니다</div>;
  }
  
  return (
    <div className="user-profile">
      <div className="user-header">
        <h2>{user.name}</h2>
        <p className="user-email">{user.email}</p>
      </div>
      
      <div className="user-details">
        <p><strong>ID:</strong> {user.id}</p>
        {user.createdAt && (
          <p><strong>가입일:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
        )}
      </div>
      
      <div className="user-actions">
        <button onClick={handleRefresh} className="btn-primary">
          새로고침
        </button>
      </div>
    </div>
  );
}

export default UserProfile;`;
      }
    }
    
    // Python 코드 예시들
    if (language === 'python') {
      if (lowerDesc.includes('웹 스크래핑') || lowerDesc.includes('크롤링')) {
        return `# 웹 스크래핑 예시
import requests
from bs4 import BeautifulSoup
import time
import csv

class WebScraper:
    def __init__(self, base_url, delay=1):
        self.base_url = base_url
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def scrape_page(self, url):
        """단일 페이지 스크래핑"""
        try:
            response = self.session.get(url, timeout=10);
            response.raise_for_status();
            
            soup = BeautifulSoup(response.content, 'html.parser');
            return soup;
            
        except requests.RequestException as e:
            print(f"페이지 요청 실패: {e}");
            return None;
    
    def extract_data(self, soup):
        """데이터 추출 로직 (사이트에 맞게 수정 필요)"""
        data = [];
        
        # 예시: 제목과 링크 추출
        articles = soup.find_all('article', class_='post');
        
        for article in articles:
            title_elem = article.find('h2', class_='title');
            link_elem = article.find('a');
            
            if title_elem and link_elem:
                data.append({
                    'title': title_elem.get_text(strip=True),
                    'link': link_elem.get('href'),
                    'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S')
                });
        
        return data;
    
    def save_to_csv(self, data, filename='scraped_data.csv'):
        """데이터를 CSV 파일로 저장"""
        if not data:
            print("저장할 데이터가 없습니다.");
            return;
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = data[0].keys();
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames);
            
            writer.writeheader();
            writer.writerows(data);
        
        print(f"데이터가 {filename}에 저장되었습니다.");
    
    def scrape_multiple_pages(self, urls):
        """여러 페이지 스크래핑"""
        all_data = [];
        
        for i, url in enumerate(urls, 1):
            print(f"페이지 {i}/{len(urls)} 스크래핑 중: {url}");
            
            soup = self.scrape_page(url);
            if soup:
                page_data = self.extract_data(soup);
                all_data.extend(page_data);
                
                # 서버 부하 방지를 위한 지연
                time.sleep(self.delay);
        
        return all_data;

# 사용 예시
if __name__ == "__main__":
    scraper = WebScraper("https://example.com", delay=2);
    
    urls = [
        "https://example.com/page1",
        "https://example.com/page2",
        "https://example.com/page3"
    ];
    
    data = scraper.scrape_multiple_pages(urls);
    scraper.save_to_csv(data, 'scraped_results.csv');
    
    print(f"총 {len(data)}개의 항목을 스크래핑했습니다.");`;
      }
      
      if (lowerDesc.includes('api') || lowerDesc.includes('플라스크') || lowerDesc.includes('flask')) {
        return `# Flask API 서버 구현
from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# 데이터베이스 설정
DATABASE = 'users.db'

def init_db():
    """데이터베이스 초기화"""
    with sqlite3.connect(DATABASE) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''');
        conn.commit();

def get_db_connection():
    """데이터베이스 연결"""
    conn = sqlite3.connect(DATABASE);
    conn.row_factory = sqlite3.Row;
    return conn;

@app.route('/api/users', methods=['GET'])
def get_users():
    """모든 사용자 조회"""
    try:
        conn = get_db_connection();
        users = conn.execute('SELECT * FROM users ORDER BY created_at DESC').fetchall();
        conn.close();
        
        return jsonify({
            'success': True,
            'data': [dict(user) for user in users],
            'count': len(users)
        });
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500;

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """특정 사용자 조회"""
    try:
        conn = get_db_connection();
        user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone();
        conn.close();
        
        if user:
            return jsonify({
                'success': True,
                'data': dict(user)
            });
        else:
            return jsonify({
                'success': False,
                'error': '사용자를 찾을 수 없습니다'
            }), 404;
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500;

@app.route('/api/users', methods=['POST'])
def create_user():
    """새 사용자 생성"""
    try:
        data = request.get_json();
        
        if not data or not data.get('name') or not data.get('email'):
            return jsonify({
                'success': False,
                'error': '이름과 이메일이 필요합니다'
            }), 400;
        
        conn = get_db_connection();
        cursor = conn.execute(
            'INSERT INTO users (name, email) VALUES (?, ?)',
            (data['name'], data['email'])
        );
        user_id = cursor.lastrowid;
        conn.commit();
        
        # 생성된 사용자 정보 조회
        new_user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone();
        conn.close();
        
        return jsonify({
            'success': True,
            'data': dict(new_user)
        }), 201;
        
    except sqlite3.IntegrityError:
        return jsonify({
            'success': False,
            'error': '이미 존재하는 이메일입니다'
        }), 400;
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500;

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """사용자 삭제"""
    try:
        conn = get_db_connection();
        result = conn.execute('DELETE FROM users WHERE id = ?', (user_id,)).rowcount;
        conn.commit();
        conn.close();
        
        if result:
            return jsonify({
                'success': True,
                'message': '사용자가 삭제되었습니다'
            });
        else:
            return jsonify({
                'success': False,
                'error': '사용자를 찾을 수 없습니다'
            }), 404;
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500;

@app.route('/api/health', methods=['GET'])
def health_check():
    """헬스체크"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    });

if __name__ == '__main__':
    # 데이터베이스 초기화
    init_db();
    
    # 개발 서버 실행
    app.run(debug=True, host='0.0.0.0', port=5000);`;
      }
    }
    
    // 기본 코드 템플릿
    const templates = {
      javascript: `// ${description} 구현
function solution() {
  try {
    // TODO: ${description} 로직 구현
    console.log('기능을 구현해주세요');
    
    return {
      success: true,
      message: '구현 완료'
    };
  } catch (error) {
    console.error('오류 발생:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 사용 예시
const result = solution();
console.log(result);`,
      
      python: `# ${description} 구현
def solution():
    """${description}을 위한 함수"""
    try:
        # TODO: ${description} 로직 구현
        print("기능을 구현해주세요")
        
        return {
            "success": True,
            "message": "구현 완료"
        }
    except Exception as e:
        print(f"오류 발생: {e}")
        return {
            "success": False,
            "error": str(e)
        }

# 사용 예시
if __name__ == "__main__":
    result = solution()
    print(result)`,
      
      java: `// ${description} 구현
public class Solution {
    
    public static class Result {
        private boolean success;
        private String message;
        private String error;
        
        public Result(boolean success, String message, String error) {
            this.success = success;
            this.message = message;
            this.error = error;
        }
        
        // getters and setters
        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public String getError() { return error; }
    }
    
    public static Result solution() {
        try {
            // TODO: ${description} 로직 구현
            System.out.println("기능을 구현해주세요");
            
            return new Result(true, "구현 완료", null);
        } catch (Exception e) {
            System.err.println("오류 발생: " + e.getMessage());
            return new Result(false, null, e.getMessage());
        }
    }
    
    public static void main(String[] args) {
        Result result = solution();
        System.out.println("Success: " + result.isSuccess());
        if (result.isSuccess()) {
            System.out.println("Message: " + result.getMessage());
        } else {
            System.out.println("Error: " + result.getError());
        }
    }
}`
    };
    
    return templates[language] || templates.javascript;
  }

  /**
   * 코드 리뷰
   * @param {string} code - 리뷰할 코드
   * @param {string} language - 프로그래밍 언어
   * @returns {Promise<Object>} 리뷰 결과
   */
  async reviewCode(code, language = 'javascript') {
    if (!this.isEnabled) {
      return {
        score: 7,
        issues: ['[DEMO] AI 기능이 비활성화되어 실제 리뷰를 수행할 수 없습니다'],
        suggestions: ['OpenAI API 키를 설정하여 실제 AI 리뷰 기능을 사용하세요'],
        security: ['보안 검사를 위해 AI 기능이 필요합니다'],
        performance: ['성능 분석을 위해 AI 기능이 필요합니다']
      };
    }

    const prompt = `
다음 ${language} 코드를 리뷰해주세요:

\`\`\`${language}
${code}
\`\`\`

다음 관점에서 분석해주세요:
1. 코드 품질
2. 성능 최적화 가능성
3. 보안 이슈
4. 버그 가능성
5. 개선 제안

JSON 형태로 결과를 반환해주세요:
{
  "score": 1-10,
  "issues": [],
  "suggestions": [],
  "security": [],
  "performance": []
}
`;

    const result = await this.generateText(prompt, {
      temperature: 0.2
    });

    try {
      return JSON.parse(result);
    } catch (error) {
      return {
        score: 5,
        issues: ['파싱 오류로 인한 기본 응답'],
        suggestions: ['코드를 다시 확인해주세요'],
        security: [],
        performance: []
      };
    }
  }

  /**
   * 프로젝트 구조 생성
   * @param {string} projectType - 프로젝트 타입
   * @param {string} description - 프로젝트 설명
   * @returns {Promise<Object>} 프로젝트 구조
   */
  async generateProjectStructure(projectType, description) {
    if (!this.isEnabled) {
      return {
        structure: {
          folders: ['src', 'tests', 'docs', 'config'],
          files: ['README.md', 'package.json', '.gitignore', 'index.js']
        },
        dependencies: ['express', 'dotenv'],
        scripts: {
          start: 'node index.js',
          dev: 'nodemon index.js',
          test: 'jest'
        },
        description: `[DEMO] ${projectType} 프로젝트: ${description}`
      };
    }

    const prompt = `
${projectType} 프로젝트를 위한 폴더 구조를 생성해주세요.

프로젝트 설명: ${description}

다음 형태의 JSON으로 반환해주세요:
{
  "structure": {
    "folders": [],
    "files": []
  },
  "dependencies": [],
  "scripts": {},
  "description": ""
}
`;

    const result = await this.generateText(prompt, {
      temperature: 0.4
    });

    try {
      return JSON.parse(result);
    } catch (error) {
      return {
        structure: {
          folders: ['src', 'tests', 'docs'],
          files: ['README.md', 'package.json', '.gitignore']
        },
        dependencies: [],
        scripts: {},
        description: '기본 프로젝트 구조'
      };
    }
  }

  /**
   * 문서 생성
   * @param {string} type - 문서 타입 (README, API, GUIDE 등)
   * @param {Object} data - 문서 데이터
   * @returns {Promise<string>} 생성된 문서
   */
  async generateDocumentation(type, data) {
    if (!this.isEnabled) {
      return `# [DEMO] ${type} 문서

AI 기능이 비활성화되어 있어 모의 문서를 생성합니다.

## 프로젝트 정보
- 이름: ${data.name || '알 수 없음'}
- 설명: ${data.description || '설명 없음'}

## 시작하기
1. 의존성 설치: \`npm install\`
2. 개발 서버 시작: \`npm run dev\`
3. 프로덕션 빌드: \`npm run build\`

> OpenAI API 키를 설정하면 실제 AI 생성 문서를 받을 수 있습니다.
`;
    }

    const prompt = `
${type} 문서를 생성해주세요.

데이터: ${JSON.stringify(data, null, 2)}

마크다운 형식으로 작성해주세요.
`;

    return await this.generateText(prompt, {
      temperature: 0.5
    });
  }

  /**
   * AI 서비스 상태 확인
   * @returns {Object} 상태 정보
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      provider: this.provider,
      availableProviders: {
        openai: !!this.openai,
        gemini: !!this.geminiModel
      },
      models: {
        openai: this.defaultModel,
        gemini: this.geminiModelName
      },
      temperature: this.temperature,
      maxTokens: this.maxTokens
    };
  }

  /**
   * AI 제공자 변경
   * @param {string} provider - 'openai' 또는 'gemini'
   */
  setProvider(provider) {
    const availableProviders = [];
    if (this.openai) availableProviders.push('openai');
    if (this.geminiModel) availableProviders.push('gemini');
    
    if (!availableProviders.includes(provider)) {
      throw new Error(`제공자 '${provider}'를 사용할 수 없습니다. 사용 가능한 제공자: ${availableProviders.join(', ')}`);
    }
    
    this.provider = provider;
    console.log(`✅ AI 제공자가 ${provider.toUpperCase()}로 변경되었습니다.`);
  }

  /**
   * 사용 가능한 AI 제공자 목록
   * @returns {Array} 사용 가능한 제공자들
   */
  getAvailableProviders() {
    const providers = [];
    if (this.openai) providers.push('openai');
    if (this.geminiModel) providers.push('gemini');
    return providers;
  }

  /**
   * AI 제공자 테스트
   * @param {string} provider - 테스트할 제공자
   * @returns {Promise<boolean>} 테스트 결과
   */
  async testProvider(provider = this.provider) {
    try {
      const testPrompt = "Hello, this is a test message. Please respond with 'Test successful'.";
      const response = await this.generateText(testPrompt, { provider });
      return response.toLowerCase().includes('test successful') || response.length > 0;
    } catch (error) {
      console.error(`${provider} 테스트 실패:`, error);
      return false;
    }
  }

  // ...existing code...
}

// 싱글톤 패턴을 위한 정적 변수들
AIService.instance = null;
AIService.warningShown = false;

export { AIService };
export default AIService;
