/**
 * 데이터베이스 서비스
 * SQLite를 사용한 데이터 영속성 관리
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';

export class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = path.join(process.cwd(), 'data', 'ai-dev-system.db');
    this.initializeDatabase();
  }

  /**
   * 데이터베이스 초기화
   */
  async initializeDatabase() {
    try {
      // 데이터 디렉토리 생성
      const dataDir = path.dirname(this.dbPath);
      await fs.mkdir(dataDir, { recursive: true });

      // 데이터베이스 연결
      this.db = new Database(this.dbPath);
      
      // WAL 모드 활성화 (성능 향상)
      this.db.pragma('journal_mode = WAL');
      
      // 테이블 생성
      await this.createTables();
      
      console.log('📀 데이터베이스 초기화 완료:', this.dbPath);
    } catch (error) {
      console.error('데이터베이스 초기화 오류:', error);
    }
  }

  /**
   * 테이블 생성
   */
  async createTables() {
    // 프로젝트 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT,
        language TEXT,
        framework TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT -- JSON 형태의 추가 데이터
      )
    `);

    // 코드 생성 히스토리
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS code_generations (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        prompt TEXT NOT NULL,
        language TEXT,
        framework TEXT,
        generated_code TEXT,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )
    `);

    // 코드 리뷰 히스토리
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS code_reviews (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        file_path TEXT,
        score INTEGER,
        issues_found INTEGER,
        suggestions_count INTEGER,
        review_data TEXT, -- JSON 형태
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )
    `);

    // 배포 히스토리
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS deployments (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        pipeline_id TEXT,
        pipeline_name TEXT,
        environment TEXT,
        branch TEXT,
        \`commit\` TEXT,
        status TEXT,
        triggered_by TEXT,
        start_time DATETIME,
        end_time DATETIME,
        duration INTEGER,
        deployment_data TEXT, -- JSON 형태
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )
    `);

    // 파이프라인 설정
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pipelines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        project_path TEXT,
        environment TEXT,
        branch TEXT,
        pipeline_config TEXT, -- JSON 형태
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 시스템 메트릭 히스토리
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        cpu_usage REAL,
        memory_usage REAL,
        disk_usage REAL,
        network_info TEXT, -- JSON 형태
        performance_data TEXT -- JSON 형태
      )
    `);

    // 사용자 설정
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        type TEXT DEFAULT 'string',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 인덱스 생성
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);
      CREATE INDEX IF NOT EXISTS idx_code_generations_project ON code_generations (project_id);
      CREATE INDEX IF NOT EXISTS idx_code_reviews_project ON code_reviews (project_id);
      CREATE INDEX IF NOT EXISTS idx_deployments_pipeline ON deployments (pipeline_id);
      CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments (project_id);
      CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics (timestamp);
    `);
  }

  /**
   * 프로젝트 저장
   */
  saveProject(project) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO projects 
      (id, name, description, type, language, framework, status, metadata, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    return stmt.run(
      project.id,
      project.name,
      project.description,
      project.type,
      project.language,
      project.framework,
      project.status || 'active',
      JSON.stringify(project.metadata || {})
    );
  }

  /**
   * 프로젝트 조회
   */
  getProject(id) {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const project = stmt.get(id);
    
    if (project && project.metadata) {
      project.metadata = JSON.parse(project.metadata);
    }
    
    return project;
  }

  /**
   * 모든 프로젝트 조회
   */
  getAllProjects(filters = {}) {
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.language) {
      query += ' AND language = ?';
      params.push(filters.language);
    }

    query += ' ORDER BY updated_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    const projects = stmt.all(...params);

    return projects.map(project => {
      if (project.metadata) {
        project.metadata = JSON.parse(project.metadata);
      }
      return project;
    });
  }

  /**
   * 코드 생성 히스토리 저장
   */
  saveCodeGeneration(generation) {
    const stmt = this.db.prepare(`
      INSERT INTO code_generations 
      (id, project_id, prompt, language, framework, generated_code, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      generation.id,
      generation.project_id,
      generation.prompt,
      generation.language,
      generation.framework,
      generation.generated_code,
      generation.status || 'completed'
    );
  }

  /**
   * 코드 리뷰 저장
   */
  saveCodeReview(review) {
    const stmt = this.db.prepare(`
      INSERT INTO code_reviews 
      (id, project_id, file_path, score, issues_found, suggestions_count, review_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      review.id,
      review.project_id || null,
      review.file_path,
      review.score,
      review.issues_found,
      review.suggestions_count,
      review.review_data,
      review.created_at
    );
  }

  /**
   * 코드 리뷰 조회
   */
  getCodeReviews(filePath = null, limit = 50) {
    let query = 'SELECT * FROM code_reviews';
    let params = [];
    
    if (filePath) {
      query += ' WHERE file_path = ?';
      params.push(filePath);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * 모든 코드 리뷰 조회
   */
  getAllCodeReviews() {
    const stmt = this.db.prepare('SELECT * FROM code_reviews ORDER BY created_at DESC');
    return stmt.all();
  }

  /**
   * 배포 기록 저장
   */
  saveDeployment(deployment) {
    const stmt = this.db.prepare(`
      INSERT INTO deployments 
      (id, project_id, pipeline_id, pipeline_name, environment, branch, \`commit\`, status, 
       triggered_by, start_time, end_time, duration, deployment_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      deployment.id,
      deployment.project_id || null,
      deployment.pipeline_id,
      deployment.pipeline_name,
      deployment.environment,
      deployment.branch,
      deployment.commit,
      deployment.status,
      deployment.triggered_by,
      deployment.start_time,
      deployment.end_time,
      deployment.duration,
      deployment.deployment_data,
      deployment.created_at
    );
  }

  /**
   * 파이프라인 설정 저장
   */
  savePipeline(pipeline) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pipelines 
      (id, name, project_path, environment, branch, pipeline_config, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      pipeline.id,
      pipeline.name,
      pipeline.project_path,
      pipeline.environment,
      pipeline.branch,
      pipeline.pipeline_config,
      pipeline.created_at
    );
  }

  /**
   * 배포 기록 조회
   */
  getDeployments(pipelineId = null, limit = 50) {
    let query = 'SELECT * FROM deployments';
    let params = [];
    
    if (pipelineId) {
      query += ' WHERE pipeline_id = ?';
      params.push(pipelineId);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * 모든 배포 기록 조회
   */
  getAllDeployments() {
    const stmt = this.db.prepare('SELECT * FROM deployments ORDER BY created_at DESC');
    return stmt.all();
  }

  /**
   * 파이프라인 조회
   */
  getPipelines(limit = 50) {
    const stmt = this.db.prepare('SELECT * FROM pipelines ORDER BY created_at DESC LIMIT ?');
    return stmt.all(limit);
  }

  /**
   * 시스템 메트릭 저장
   */
  saveSystemMetrics(metrics) {
    const stmt = this.db.prepare(`
      INSERT INTO system_metrics 
      (cpu_usage, memory_usage, disk_usage, network_info, performance_data)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      metrics.cpu_usage,
      metrics.memory_usage,
      metrics.disk_usage,
      JSON.stringify(metrics.network_info || {}),
      JSON.stringify(metrics.performance_data || {})
    );
  }

  /**
   * 시스템 메트릭 조회
   */
  getSystemMetrics(limit = 50) {
    const stmt = this.db.prepare('SELECT * FROM system_metrics ORDER BY timestamp DESC LIMIT ?');
    return stmt.all(limit);
  }

  /**
   * 모든 시스템 메트릭 조회
   */
  getAllSystemMetrics() {
    const stmt = this.db.prepare('SELECT * FROM system_metrics ORDER BY timestamp DESC');
    return stmt.all();
  }

  /**
   * 사용자 설정 저장
   */
  saveSetting(key, value, type = 'string') {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_settings (id, key, value, type, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const id = `setting_${key}`;
    return stmt.run(id, key, value, type);
  }

  /**
   * 사용자 설정 조회
   */
  getSetting(key, defaultValue = null) {
    const stmt = this.db.prepare('SELECT * FROM user_settings WHERE key = ?');
    const result = stmt.get(key);
    
    if (!result) return defaultValue;
    
    // 타입에 따른 변환
    switch (result.type) {
      case 'boolean':
        return result.value === 'true';
      case 'number':
        return parseFloat(result.value);
      case 'json':
        return JSON.parse(result.value);
      default:
        return result.value;
    }
  }

  /**
   * 통계 조회
   */
  getStatistics() {
    const stats = {};
    
    // 프로젝트 통계
    stats.projects = this.db.prepare('SELECT COUNT(*) as count FROM projects WHERE status = "active"').get();
    
    // 코드 생성 통계
    stats.codeGenerations = this.db.prepare('SELECT COUNT(*) as count FROM code_generations').get();
    
    // 코드 리뷰 통계
    stats.codeReviews = this.db.prepare('SELECT COUNT(*) as count FROM code_reviews').get();
    
    // 배포 통계
    stats.deployments = this.db.prepare('SELECT COUNT(*) as count FROM deployments').get();
    stats.successfulDeployments = this.db.prepare('SELECT COUNT(*) as count FROM deployments WHERE status = "completed"').get();
    
    return stats;
  }

  /**
   * 데이터베이스 백업
   */
  async backup() {
    const backupPath = path.join(process.cwd(), 'data', 'backups', `backup_${Date.now()}.db`);
    const backupDir = path.dirname(backupPath);
    
    await fs.mkdir(backupDir, { recursive: true });
    await this.db.backup(backupPath);
    
    console.log('📀 데이터베이스 백업 완료:', backupPath);
    return backupPath;
  }

  /**
   * 데이터베이스 연결 종료
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('📀 데이터베이스 연결 종료');
    }
  }
}

export default DatabaseService;
