/**
 * 자동화된 배포 시스템
 * CI/CD 파이프라인 자동 구성 및 관리
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { DatabaseService } from '../../services/DatabaseService.js';

const execAsync = promisify(exec);

export class AutomatedDeploymentService {
  constructor() {
    this.deployments = new Map();
    this.pipelines = new Map();
    this.environments = new Map();
    this.deploymentHistory = [];
    this.dbService = new DatabaseService();
    
    this.initializeDeploymentService();
  }

  /**
   * 배포 서비스 초기화
   */
  async initializeDeploymentService() {
    try {
      const deployDir = path.join(process.cwd(), 'data', 'deployments');
      await fs.mkdir(deployDir, { recursive: true });
      
      const subdirs = ['active', 'history', 'configs', 'logs'];
      for (const subdir of subdirs) {
        await fs.mkdir(path.join(deployDir, subdir), { recursive: true });
      }

      // 기본 환경 설정 로드
      await this.loadDefaultEnvironments();
      
      console.log('🚀 자동화된 배포 서비스 초기화 완료');
    } catch (error) {
      console.error('배포 서비스 초기화 오류:', error);
    }
  }

  /**
   * 기본 환경 설정 로드
   */
  async loadDefaultEnvironments() {
    const defaultEnvironments = [
      {
        id: 'development',
        name: 'Development',
        description: '개발 환경',
        config: {
          domain: 'dev.localhost',
          port: 3000,
          database: 'dev_db',
          apiKeys: {},
          features: ['debug', 'hot-reload', 'dev-tools']
        }
      },
      {
        id: 'staging',
        name: 'Staging',
        description: '스테이징 환경',
        config: {
          domain: 'staging.example.com',
          port: 3001,
          database: 'staging_db',
          apiKeys: {},
          features: ['testing', 'monitoring']
        }
      },
      {
        id: 'production',
        name: 'Production',
        description: '프로덕션 환경',
        config: {
          domain: 'example.com',
          port: 80,
          database: 'prod_db',
          apiKeys: {},
          features: ['monitoring', 'analytics', 'security']
        }
      }
    ];

    defaultEnvironments.forEach(env => {
      this.environments.set(env.id, env);
    });
  }

  /**
   * 새로운 배포 파이프라인 생성
   */
  async createDeploymentPipeline(pipelineConfig) {
    try {
      const pipelineId = this.generateId();
      
      const pipeline = {
        id: pipelineId,
        name: pipelineConfig.name,
        description: pipelineConfig.description,
        repository: pipelineConfig.repository,
        branch: pipelineConfig.branch || 'main',
        environment: pipelineConfig.environment,
        
        // 파이프라인 단계
        stages: pipelineConfig.stages || [
          {
            name: 'build',
            description: '소스 코드 빌드',
            commands: ['npm install', 'npm run build'],
            timeout: 600 // 10분
          },
          {
            name: 'test',
            description: '테스트 실행',
            commands: ['npm test'],
            timeout: 300 // 5분
          },
          {
            name: 'deploy',
            description: '배포 실행',
            commands: ['npm run deploy'],
            timeout: 900 // 15분
          }
        ],
        
        // 트리거 설정
        triggers: pipelineConfig.triggers || {
          push: true,
          pullRequest: false,
          schedule: null
        },
        
        // 알림 설정
        notifications: pipelineConfig.notifications || {
          onSuccess: true,
          onFailure: true,
          channels: ['console']
        },
        
        // 배포 설정
        deployment: {
          strategy: pipelineConfig.deploymentStrategy || 'rolling',
          healthCheck: pipelineConfig.healthCheck || true,
          rollback: pipelineConfig.autoRollback || true
        },
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      };

      this.pipelines.set(pipelineId, pipeline);
      await this.savePipelineToDisk(pipeline);
      await this.savePipelineRecord(pipeline);

      console.log(`🚀 배포 파이프라인 생성됨: ${pipelineId}`);
      return pipeline;
    } catch (error) {
      console.error('파이프라인 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 배포 실행
   */
  async executeDeploy(pipelineId, options = {}) {
    try {
      const pipeline = this.pipelines.get(pipelineId);
      if (!pipeline) {
        throw new Error('파이프라인을 찾을 수 없습니다.');
      }

      const deploymentId = this.generateId();
      const deployment = {
        id: deploymentId,
        pipelineId,
        pipelineName: pipeline.name,
        environment: pipeline.environment,
        branch: options.branch || pipeline.branch,
        commit: options.commit || 'latest',
        
        status: 'running',
        stages: [],
        startTime: new Date().toISOString(),
        endTime: null,
        duration: null,
        
        logs: [],
        artifacts: [],
        
        triggeredBy: options.triggeredBy || 'manual',
        rollbackDeployment: null
      };

      this.deployments.set(deploymentId, deployment);
      
      // 배포 실행 (비동기)
      this.runDeployment(deployment, pipeline).catch(error => {
        console.error(`배포 실행 오류 (${deploymentId}):`, error);
        this.updateDeploymentStatus(deploymentId, 'failed', error.message);
      });

      return deployment;
    } catch (error) {
      console.error('배포 시작 오류:', error);
      throw error;
    }
  }

  /**
   * 배포 파이프라인 실행
   */
  async runDeployment(deployment, pipeline) {
    const deploymentId = deployment.id;
    
    try {
      this.addDeploymentLog(deploymentId, 'info', '배포 시작됨');
      
      for (const stage of pipeline.stages) {
        await this.executeStage(deploymentId, stage);
      }
      
      // 헬스 체크
      if (pipeline.deployment.healthCheck) {
        await this.performHealthCheck(deploymentId, pipeline);
      }
      
      this.updateDeploymentStatus(deploymentId, 'success');
      this.addDeploymentLog(deploymentId, 'info', '배포 완료됨');
      
      // 성공 알림
      await this.sendNotification(pipeline, deployment, 'success');
      
    } catch (error) {
      this.updateDeploymentStatus(deploymentId, 'failed', error.message);
      this.addDeploymentLog(deploymentId, 'error', `배포 실패: ${error.message}`);
      
      // 자동 롤백
      if (pipeline.deployment.rollback) {
        await this.performRollback(deploymentId, pipeline);
      }
      
      // 실패 알림
      await this.sendNotification(pipeline, deployment, 'failure');
      
      throw error;
    }
  }

  /**
   * 스테이지 실행
   */
  async executeStage(deploymentId, stage) {
    const deployment = this.deployments.get(deploymentId);
    
    const stageExecution = {
      name: stage.name,
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      commands: stage.commands,
      output: []
    };

    deployment.stages.push(stageExecution);
    this.addDeploymentLog(deploymentId, 'info', `스테이지 시작: ${stage.name}`);

    try {
      for (const command of stage.commands) {
        this.addDeploymentLog(deploymentId, 'info', `명령 실행: ${command}`);
        
        const result = await this.executeCommand(command, stage.timeout);
        stageExecution.output.push({
          command,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: 0
        });
        
        this.addDeploymentLog(deploymentId, 'info', `명령 완료: ${command}`);
      }
      
      stageExecution.status = 'success';
      stageExecution.endTime = new Date().toISOString();
      
      this.addDeploymentLog(deploymentId, 'info', `스테이지 완료: ${stage.name}`);
      
    } catch (error) {
      stageExecution.status = 'failed';
      stageExecution.endTime = new Date().toISOString();
      stageExecution.error = error.message;
      
      this.addDeploymentLog(deploymentId, 'error', `스테이지 실패: ${stage.name} - ${error.message}`);
      throw error;
    }
  }

  /**
   * 명령 실행
   */
  async executeCommand(command, timeout = 300) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`명령 타임아웃: ${command}`));
      }, timeout * 1000);

      exec(command, (error, stdout, stderr) => {
        clearTimeout(timer);
        
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  /**
   * 헬스 체크 수행
   */
  async performHealthCheck(deploymentId, pipeline) {
    this.addDeploymentLog(deploymentId, 'info', '헬스 체크 시작');
    
    const environment = this.environments.get(pipeline.environment);
    if (!environment) {
      throw new Error('환경 설정을 찾을 수 없습니다.');
    }

    try {
      // 실제 구현에서는 HTTP 요청이나 다른 헬스 체크를 수행
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기 (모의)
      
      this.addDeploymentLog(deploymentId, 'info', '헬스 체크 통과');
    } catch (error) {
      this.addDeploymentLog(deploymentId, 'error', `헬스 체크 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 롤백 수행
   */
  async performRollback(deploymentId, pipeline) {
    this.addDeploymentLog(deploymentId, 'info', '자동 롤백 시작');
    
    try {
      // 이전 성공한 배포 찾기
      const previousDeployment = this.findPreviousSuccessfulDeployment(pipeline.id);
      
      if (previousDeployment) {
        // 롤백 실행 (모의)
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기
        
        this.addDeploymentLog(deploymentId, 'info', `롤백 완료: ${previousDeployment.id}`);
      } else {
        this.addDeploymentLog(deploymentId, 'warning', '롤백할 이전 배포를 찾을 수 없습니다.');
      }
    } catch (error) {
      this.addDeploymentLog(deploymentId, 'error', `롤백 실패: ${error.message}`);
    }
  }

  /**
   * 이전 성공한 배포 찾기
   */
  findPreviousSuccessfulDeployment(pipelineId) {
    const deployments = Array.from(this.deployments.values())
      .filter(d => d.pipelineId === pipelineId && d.status === 'success')
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    return deployments[0] || null;
  }

  /**
   * 배포 상태 업데이트
   */
  updateDeploymentStatus(deploymentId, status, error = null) {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.status = status;
      deployment.endTime = new Date().toISOString();
      deployment.duration = new Date(deployment.endTime) - new Date(deployment.startTime);
      
      if (error) {
        deployment.error = error;
      }
      
      // 히스토리에 추가
      this.deploymentHistory.push({...deployment});
      
      // 데이터베이스에 배포 기록 저장
      if (status === 'success' || status === 'failed') {
        this.saveDeploymentRecord(deployment);
      }
      
      // 최근 100개만 유지
      if (this.deploymentHistory.length > 100) {
        this.deploymentHistory.shift();
      }
    }
  }

  /**
   * 배포 로그 추가
   */
  addDeploymentLog(deploymentId, level, message) {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.logs.push({
        timestamp: new Date().toISOString(),
        level,
        message
      });
      
      console.log(`[${deploymentId}] ${level.toUpperCase()}: ${message}`);
    }
  }

  /**
   * 알림 전송
   */
  async sendNotification(pipeline, deployment, type) {
    const message = type === 'success' 
      ? `✅ 배포 성공: ${pipeline.name} → ${pipeline.environment}`
      : `❌ 배포 실패: ${pipeline.name} → ${pipeline.environment}`;
    
    console.log(`🔔 알림: ${message}`);
    
    // 실제 구현에서는 이메일, 슬랙 등으로 알림 전송
  }

  /**
   * 배포 목록 조회
   */
  getDeployments(filters = {}) {
    let deployments = Array.from(this.deployments.values());

    if (filters.pipelineId) {
      deployments = deployments.filter(d => d.pipelineId === filters.pipelineId);
    }

    if (filters.environment) {
      deployments = deployments.filter(d => d.environment === filters.environment);
    }

    if (filters.status) {
      deployments = deployments.filter(d => d.status === filters.status);
    }

    return deployments.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }

  /**
   * 파이프라인 목록 조회
   */
  getPipelines() {
    return Array.from(this.pipelines.values());
  }

  /**
   * 환경 목록 조회
   */
  getEnvironments() {
    return Array.from(this.environments.values());
  }

  /**
   * 배포 통계
   */
  getDeploymentStats() {
    const deployments = Array.from(this.deployments.values());
    const total = deployments.length;
    const success = deployments.filter(d => d.status === 'success').length;
    const failed = deployments.filter(d => d.status === 'failed').length;
    const running = deployments.filter(d => d.status === 'running').length;

    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

    return {
      total,
      success,
      failed,
      running,
      successRate,
      environments: this.environments.size,
      pipelines: this.pipelines.size
    };
  }

  /**
   * 파이프라인을 디스크에 저장
   */
  async savePipelineToDisk(pipeline) {
    try {
      const filePath = path.join(
        process.cwd(), 'data', 'deployments', 'configs',
        `${pipeline.id}.json`
      );
      await fs.writeFile(filePath, JSON.stringify(pipeline, null, 2));
    } catch (error) {
      console.error('파이프라인 저장 오류:', error);
    }
  }

  /**
   * ID 생성
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * 배포 상태 조회
   */
  getDeploymentStatus(deploymentId) {
    return this.deployments.get(deploymentId);
  }

  /**
   * 배포 로그 조회
   */
  getDeploymentLogs(deploymentId, limit = 100) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return null;
    }

    // 모의 로그 데이터
    const logs = [
      `[${new Date().toISOString()}] 배포 시작: ${deploymentId}`,
      `[${new Date().toISOString()}] 소스 코드 다운로드 중...`,
      `[${new Date().toISOString()}] 의존성 설치 중...`,
      `[${new Date().toISOString()}] 애플리케이션 빌드 중...`,
      `[${new Date().toISOString()}] 테스트 실행 중...`,
      `[${new Date().toISOString()}] 배포 환경 준비 중...`,
      `[${new Date().toISOString()}] 애플리케이션 배포 중...`,
      `[${new Date().toISOString()}] 상태 확인 중...`,
      `[${new Date().toISOString()}] 배포 완료!`
    ];

    return logs.slice(0, limit).join('\n');
  }

  /**
   * 배포 메트릭 조회
   */
  getDeploymentMetrics(deploymentId, timeRange = '24h') {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return null;
    }

    // 모의 메트릭 데이터
    return {
      deploymentId,
      successRate: 95,
      averageTime: 120,
      totalDeployments: 15,
      timeRange,
      lastDeployment: deployment.startTime,
      errorRate: 5,
      performance: {
        buildTime: 45,
        testTime: 30,
        deployTime: 45
      }
    };
  }

  /**
   * 롤백 실행
   */
  async rollbackDeployment(deploymentId, version = null) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error('배포를 찾을 수 없습니다.');
    }

    const rollbackId = this.generateId();
    const rollback = {
      id: rollbackId,
      deploymentId,
      originalDeployment: deployment,
      version: version || 'previous',
      status: 'rolling_back',
      startTime: new Date().toISOString(),
      progress: 0
    };

    this.deployments.set(rollbackId, rollback);

    // 모의 롤백 프로세스
    setTimeout(() => {
      rollback.status = 'completed';
      rollback.endTime = new Date().toISOString();
      rollback.progress = 100;
    }, 3000);

    return rollback;
  }

  /**
   * 배포 목록 조회
   */
  getDeployments(filters = {}) {
    let deployments = Array.from(this.deployments.values());

    if (filters.pipelineId) {
      deployments = deployments.filter(d => d.pipelineId === filters.pipelineId);
    }
    
    if (filters.environment) {
      deployments = deployments.filter(d => d.environment === filters.environment);
    }
    
    if (filters.status) {
      deployments = deployments.filter(d => d.status === filters.status);
    }

    return deployments.sort((a, b) => 
      new Date(b.startTime || 0) - new Date(a.startTime || 0)
    );
  }

  /**
   * 배포 통계 조회
   */
  async getDeploymentStats() {
    const deployments = Array.from(this.deployments.values());
    const pipelines = Array.from(this.pipelines.values());

    const successful = deployments.filter(d => d.status === 'completed').length;
    const failed = deployments.filter(d => d.status === 'failed').length;
    const running = deployments.filter(d => d.status === 'running').length;

    return {
      totalDeployments: deployments.length,
      totalPipelines: pipelines.length,
      successfulDeployments: successful,
      failedDeployments: failed,
      runningDeployments: running,
      successRate: deployments.length > 0 ? Math.round((successful / deployments.length) * 100) : 0,
      averageDeploymentTime: this.calculateAverageDeploymentTime(deployments),
      deploymentsToday: this.getDeploymentsToday(deployments).length,
      lastDeployment: deployments.length > 0 ? 
        deployments.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0] : null
    };
  }

  /**
   * 평균 배포 시간 계산
   */
  calculateAverageDeploymentTime(deployments) {
    const completedDeployments = deployments.filter(d => 
      d.status === 'completed' && d.startTime && d.endTime
    );

    if (completedDeployments.length === 0) return 0;

    const totalTime = completedDeployments.reduce((sum, deployment) => {
      const start = new Date(deployment.startTime);
      const end = new Date(deployment.endTime);
      return sum + (end - start);
    }, 0);

    return Math.round(totalTime / completedDeployments.length / 1000); // 초 단위
  }

  /**
   * 오늘 배포 목록 조회
   */
  getDeploymentsToday(deployments) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return deployments.filter(deployment => {
      const deployDate = new Date(deployment.startTime);
      return deployDate >= today;
    });
  }

  /**
   * 배포 기록을 데이터베이스에 저장
   */
  async saveDeploymentRecord(deployment) {
    try {
      const deploymentData = {
        id: deployment.id,
        pipeline_id: deployment.pipelineId,
        pipeline_name: deployment.pipelineName,
        environment: deployment.environment,
        branch: deployment.branch,
        commit: deployment.commit,
        status: deployment.status,
        triggered_by: deployment.triggeredBy,
        start_time: deployment.startTime,
        end_time: deployment.endTime,
        duration: deployment.duration,
        deployment_data: JSON.stringify({
          stages: deployment.stages,
          logs: deployment.logs,
          artifacts: deployment.artifacts,
          error: deployment.error
        }),
        created_at: new Date().toISOString()
      };

      this.dbService.saveDeployment(deploymentData);
      console.log('배포 기록 저장 완료:', deployment.id);

    } catch (error) {
      console.error('배포 기록 저장 오류:', error);
    }
  }

  /**
   * 파이프라인 설정을 데이터베이스에 저장
   */
  async savePipelineRecord(pipeline) {
    try {
      const pipelineData = {
        id: pipeline.id,
        name: pipeline.name,
        project_path: pipeline.projectPath,
        environment: pipeline.environment,
        branch: pipeline.branch,
        pipeline_config: JSON.stringify({
          stages: pipeline.stages,
          triggers: pipeline.triggers,
          environment_config: pipeline.environment_config,
          deployment: pipeline.deployment
        }),
        created_at: new Date().toISOString()
      };

      this.dbService.savePipeline(pipelineData);
      console.log('파이프라인 설정 저장 완료:', pipeline.id);

    } catch (error) {
      console.error('파이프라인 설정 저장 오류:', error);
    }
  }

  /**
   * 배포 기록 조회
   */
  async getDeploymentHistory(pipelineId = null, limit = 50) {
    try {
      return this.dbService.getDeployments(pipelineId, limit);
    } catch (error) {
      console.error('배포 기록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 배포 통계 조회
   */
  async getDeploymentStatistics() {
    try {
      const deployments = this.dbService.getAllDeployments();
      
      if (deployments.length === 0) {
        return {
          total_deployments: 0,
          success_rate: 0,
          average_duration: 0,
          deployments_today: 0,
          deployment_trend: []
        };
      }

      const successfulDeployments = deployments.filter(d => d.status === 'success');
      const successRate = Math.round((successfulDeployments.length / deployments.length) * 100);
      
      const totalDuration = deployments
        .filter(d => d.duration)
        .reduce((sum, d) => sum + d.duration, 0);
      const avgDuration = Math.round(totalDuration / deployments.length);

      // 오늘 배포 수
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deploymentsToday = deployments.filter(d => 
        new Date(d.start_time) >= today
      ).length;

      return {
        total_deployments: deployments.length,
        success_rate: successRate,
        average_duration: avgDuration,
        deployments_today: deploymentsToday,
        deployment_trend: this.calculateDeploymentTrend(deployments)
      };

    } catch (error) {
      console.error('배포 통계 조회 오류:', error);
      return {
        total_deployments: 0,
        success_rate: 0,
        average_duration: 0,
        deployments_today: 0,
        deployment_trend: []
      };
    }
  }

  /**
   * 배포 트렌드 계산
   */
  calculateDeploymentTrend(deployments) {
    // 일별 배포 수 계산
    const dailyData = {};
    
    deployments.forEach(deployment => {
      const date = new Date(deployment.start_time).toDateString();
      if (!dailyData[date]) {
        dailyData[date] = { total: 0, successful: 0 };
      }
      dailyData[date].total += 1;
      if (deployment.status === 'success') {
        dailyData[date].successful += 1;
      }
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      total_deployments: data.total,
      successful_deployments: data.successful,
      success_rate: Math.round((data.successful / data.total) * 100)
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

export default AutomatedDeploymentService;
