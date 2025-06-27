/**
 * 데이터베이스 서비스
 * JSON 파일을 사용한 데이터 영속성 관리
 */

import path from 'path';
import fs from 'fs/promises';

class DatabaseService {
  constructor() {
    this.dataPath = path.join(process.cwd(), 'data');
    this.initializeDatabase();
  }

  /**
   * 데이터베이스 초기화
   */
  async initializeDatabase() {
    try {
      // 데이터 디렉토리 생성
      await fs.mkdir(this.dataPath, { recursive: true });
      await fs.mkdir(path.join(this.dataPath, 'projects'), { recursive: true });
      await fs.mkdir(path.join(this.dataPath, 'deployments'), { recursive: true });
      await fs.mkdir(path.join(this.dataPath, 'monitoring'), { recursive: true });
      
      console.log('📀 JSON 데이터베이스 초기화 완료:', this.dataPath);
    } catch (error) {
      console.error('데이터베이스 초기화 오류:', error);
    }
  }

  /**
   * JSON 파일 읽기
   */
  async readJSON(filepath) {
    try {
      const data = await fs.readFile(filepath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * JSON 파일 쓰기
   */
  async writeJSON(filepath, data) {
    try {
      await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('JSON 쓰기 오류:', error);
      return false;
    }
  }

  /**
   * 프로젝트 생성
   */
  async createProject(projectData) {
    try {
      const projectId = projectData.id || Date.now().toString();
      const filepath = path.join(this.dataPath, 'projects', `${projectId}.json`);
      
      const project = {
        id: projectId,
        ...projectData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.writeJSON(filepath, project);
      return project;
    } catch (error) {
      console.error('프로젝트 생성 오류:', error);
      return null;
    }
  }

  /**
   * 프로젝트 조회
   */
  async getProject(projectId) {
    try {
      const filepath = path.join(this.dataPath, 'projects', `${projectId}.json`);
      return await this.readJSON(filepath);
    } catch (error) {
      console.error('프로젝트 조회 오류:', error);
      return null;
    }
  }

  /**
   * 모든 프로젝트 조회
   */
  async getAllProjects() {
    try {
      const projectsDir = path.join(this.dataPath, 'projects');
      const files = await fs.readdir(projectsDir);
      const projects = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const project = await this.readJSON(path.join(projectsDir, file));
          if (project) projects.push(project);
        }
      }

      return projects;
    } catch (error) {
      console.error('프로젝트 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 프로젝트 업데이트
   */
  async updateProject(projectId, updates) {
    try {
      const project = await this.getProject(projectId);
      if (!project) return null;

      const updatedProject = {
        ...project,
        ...updates,
        updated_at: new Date().toISOString()
      };

      const filepath = path.join(this.dataPath, 'projects', `${projectId}.json`);
      await this.writeJSON(filepath, updatedProject);
      return updatedProject;
    } catch (error) {
      console.error('프로젝트 업데이트 오류:', error);
      return null;
    }
  }

  /**
   * 프로젝트 삭제
   */
  async deleteProject(projectId) {
    try {
      const filepath = path.join(this.dataPath, 'projects', `${projectId}.json`);
      await fs.unlink(filepath);
      return true;
    } catch (error) {
      console.error('프로젝트 삭제 오류:', error);
      return false;
    }
  }

  /**
   * 배포 기록 생성
   */
  async createDeployment(deploymentData) {
    try {
      const deploymentId = deploymentData.id || Date.now().toString();
      const filepath = path.join(this.dataPath, 'deployments', `${deploymentId}.json`);
      
      const deployment = {
        id: deploymentId,
        ...deploymentData,
        created_at: new Date().toISOString()
      };

      await this.writeJSON(filepath, deployment);
      return deployment;
    } catch (error) {
      console.error('배포 기록 생성 오류:', error);
      return null;
    }
  }

  /**
   * 배포 기록 조회
   */
  async getDeployment(deploymentId) {
    try {
      const filepath = path.join(this.dataPath, 'deployments', `${deploymentId}.json`);
      return await this.readJSON(filepath);
    } catch (error) {
      console.error('배포 기록 조회 오류:', error);
      return null;
    }
  }

  /**
   * 모니터링 데이터 저장
   */
  async saveMonitoringData(data) {
    try {
      const timestamp = Date.now();
      const filepath = path.join(this.dataPath, 'monitoring', `${timestamp}.json`);
      
      const monitoringData = {
        timestamp,
        data,
        created_at: new Date().toISOString()
      };

      await this.writeJSON(filepath, monitoringData);
      return monitoringData;
    } catch (error) {
      console.error('모니터링 데이터 저장 오류:', error);
      return null;
    }
  }

  /**
   * 최근 모니터링 데이터 조회
   */
  async getRecentMonitoringData(limit = 100) {
    try {
      const monitoringDir = path.join(this.dataPath, 'monitoring');
      const files = await fs.readdir(monitoringDir);
      
      // 타임스탬프로 정렬 (최신순)
      const sortedFiles = files
        .filter(file => file.endsWith('.json'))
        .sort((a, b) => {
          const timeA = parseInt(a.replace('.json', ''));
          const timeB = parseInt(b.replace('.json', ''));
          return timeB - timeA;
        })
        .slice(0, limit);

      const monitoringData = [];
      for (const file of sortedFiles) {
        const data = await this.readJSON(path.join(monitoringDir, file));
        if (data) monitoringData.push(data);
      }

      return monitoringData;
    } catch (error) {
      console.error('모니터링 데이터 조회 오류:', error);
      return [];
    }
  }

  /**
   * 데이터베이스 정리 (오래된 모니터링 데이터 삭제)
   */
  async cleanup() {
    try {
      const monitoringDir = path.join(this.dataPath, 'monitoring');
      const files = await fs.readdir(monitoringDir);
      
      // 1주일 이전 데이터 삭제
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const timestamp = parseInt(file.replace('.json', ''));
          if (timestamp < oneWeekAgo) {
            await fs.unlink(path.join(monitoringDir, file));
          }
        }
      }
      
      console.log('데이터베이스 정리 완료');
    } catch (error) {
      console.error('데이터베이스 정리 오류:', error);
    }
  }

  /**
   * 연결 종료 (JSON 파일 시스템에서는 불필요하지만 호환성을 위해 유지)
   */
  close() {
    console.log('JSON 데이터베이스 서비스 종료');
  }
}

// 기본 export와 named export 모두 제공
export default DatabaseService;
export { DatabaseService };
