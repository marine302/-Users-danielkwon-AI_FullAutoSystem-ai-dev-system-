/**
 * 지능형 프로젝트 관리 시스템
 * AI 기반 프로젝트 계획, 추적, 최적화
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../ai/AIService.js';

export class IntelligentProjectManager {
  constructor() {
    this.aiService = new AIService();
    this.projects = new Map();
    this.tasks = new Map();
    this.milestones = new Map();
    this.teams = new Map();
    this.projectTemplates = new Map();
    
    this.initializeProjectManager();
  }

  async initializeProjectManager() {
    try {
      const projectDir = path.join(process.cwd(), 'data', 'projects');
      await fs.mkdir(projectDir, { recursive: true });
      
      const subdirs = ['active', 'completed', 'templates', 'analytics'];
      for (const subdir of subdirs) {
        await fs.mkdir(path.join(projectDir, subdir), { recursive: true });
      }

      // 기본 템플릿 로드
      await this.loadProjectTemplates();
    } catch (error) {
      console.error('프로젝트 관리자 초기화 오류:', error);
    }
  }

  /**
   * 새 프로젝트 생성 (AI 기반 계획)
   */
  async createIntelligentProject(projectInfo) {
    try {
      const projectId = uuidv4();
      
      // AI를 활용한 프로젝트 계획 생성
      const aiPlanning = await this.generateProjectPlan(projectInfo);
      
      const project = {
        id: projectId,
        name: projectInfo.name,
        description: projectInfo.description,
        created_at: new Date().toISOString(),
        created_by: projectInfo.createdBy || 'system',
        status: 'planning',
        priority: projectInfo.priority || 'medium',
        
        // AI 생성 정보
        ai_analysis: aiPlanning.analysis,
        estimated_duration: aiPlanning.estimatedDuration,
        estimated_complexity: aiPlanning.complexity,
        recommended_team_size: aiPlanning.teamSize,
        
        // 프로젝트 구조
        phases: aiPlanning.phases,
        milestones: aiPlanning.milestones,
        tasks: aiPlanning.tasks,
        dependencies: aiPlanning.dependencies,
        
        // 기술 스택
        tech_stack: {
          frontend: aiPlanning.techStack.frontend,
          backend: aiPlanning.techStack.backend,
          database: aiPlanning.techStack.database,
          tools: aiPlanning.techStack.tools
        },
        
        // 리소스 관리
        resources: {
          team_members: [],
          budget: projectInfo.budget || null,
          timeline: {
            start_date: projectInfo.startDate || new Date().toISOString(),
            end_date: aiPlanning.estimatedEndDate,
            buffer_time: aiPlanning.bufferTime
          }
        },
        
        // 위험 관리
        risk_assessment: aiPlanning.risks,
        mitigation_strategies: aiPlanning.mitigationStrategies,
        
        // 품질 관리
        quality_gates: aiPlanning.qualityGates,
        testing_strategy: aiPlanning.testingStrategy,
        
        // 진행 상황
        progress: {
          overall_completion: 0,
          phase_completion: {},
          milestone_status: {},
          task_completion: {}
        },
        
        // 설정
        settings: {
          auto_update: projectInfo.autoUpdate !== false,
          ai_monitoring: projectInfo.aiMonitoring !== false,
          notification_level: projectInfo.notificationLevel || 'normal'
        }
      };

      this.projects.set(projectId, project);
      await this.saveProjectToDisk(project);

      console.log(`지능형 프로젝트 생성됨: ${projectId}`);
      return project;
    } catch (error) {
      console.error('프로젝트 생성 오류:', error);
      throw error;
    }
  }

  /**
   * AI 기반 프로젝트 계획 생성
   */
  async generateProjectPlan(projectInfo) {
    try {
      const prompt = `
다음 프로젝트에 대한 상세한 개발 계획을 수립해주세요:

프로젝트명: ${projectInfo.name}
설명: ${projectInfo.description}
프로젝트 유형: ${projectInfo.type || '웹 애플리케이션'}
복잡도: ${projectInfo.complexity || '중간'}
팀 크기: ${projectInfo.teamSize || '알 수 없음'}
예산: ${projectInfo.budget || '제한 없음'}
목표 기간: ${projectInfo.targetDuration || '알 수 없음'}

다음 형식의 JSON으로 응답해주세요:
{
  "analysis": {
    "project_type": "프로젝트 유형 분석",
    "key_features": ["핵심 기능들"],
    "technical_challenges": ["기술적 도전 과제들"],
    "business_value": "비즈니스 가치 분석"
  },
  "estimatedDuration": "예상 기간 (주 단위)",
  "complexity": "HIGH|MEDIUM|LOW",
  "teamSize": "권장 팀 크기",
  "phases": [
    {
      "name": "단계명",
      "description": "단계 설명",
      "duration_weeks": 2,
      "deliverables": ["산출물들"]
    }
  ],
  "milestones": [
    {
      "name": "마일스톤명",
      "description": "설명",
      "target_date": "상대적 주차",
      "criteria": ["완료 기준들"]
    }
  ],
  "tasks": [
    {
      "name": "작업명",
      "description": "작업 설명",
      "phase": "소속 단계",
      "estimated_hours": 8,
      "priority": "HIGH|MEDIUM|LOW",
      "dependencies": ["선행 작업들"]
    }
  ],
  "techStack": {
    "frontend": ["프론트엔드 기술들"],
    "backend": ["백엔드 기술들"],
    "database": ["데이터베이스"],
    "tools": ["개발 도구들"]
  },
  "risks": [
    {
      "risk": "위험 요소",
      "probability": "HIGH|MEDIUM|LOW",
      "impact": "HIGH|MEDIUM|LOW",
      "mitigation": "대응 방안"
    }
  ],
  "qualityGates": [
    {
      "phase": "단계",
      "criteria": ["품질 기준들"],
      "tools": ["검증 도구들"]
    }
  ]
}
`;

      const response = await this.aiService.generateResponse(prompt);
      const planning = JSON.parse(response);

      // 추가 계산된 필드들
      planning.estimatedEndDate = this.calculateEndDate(
        projectInfo.startDate || new Date().toISOString(),
        planning.estimatedDuration
      );
      planning.bufferTime = Math.ceil(planning.estimatedDuration * 0.2); // 20% 버퍼
      planning.dependencies = this.analyzeDependencies(planning.tasks);
      planning.mitigationStrategies = planning.risks.map(risk => risk.mitigation);
      planning.testingStrategy = this.generateTestingStrategy(planning.techStack);

      return planning;
    } catch (error) {
      console.error('AI 프로젝트 계획 생성 오류:', error);
      
      // 기본 계획 반환
      return this.getDefaultProjectPlan(projectInfo);
    }
  }

  /**
   * 기본 프로젝트 계획 (AI 실패 시)
   */
  getDefaultProjectPlan(projectInfo) {
    return {
      analysis: {
        project_type: projectInfo.type || '일반 프로젝트',
        key_features: ['기본 기능'],
        technical_challenges: ['구현 복잡도'],
        business_value: '사업 가치 창출'
      },
      estimatedDuration: 8,
      complexity: 'MEDIUM',
      teamSize: '3-5명',
      estimatedEndDate: this.calculateEndDate(
        projectInfo.startDate || new Date().toISOString(), 8
      ),
      bufferTime: 2,
      phases: [
        {
          name: '계획 및 설계',
          description: '프로젝트 계획 수립 및 시스템 설계',
          duration_weeks: 2,
          deliverables: ['프로젝트 계획서', '시스템 설계서']
        },
        {
          name: '개발',
          description: '핵심 기능 개발',
          duration_weeks: 4,
          deliverables: ['핵심 기능', '단위 테스트']
        },
        {
          name: '테스트 및 배포',
          description: '통합 테스트 및 배포',
          duration_weeks: 2,
          deliverables: ['테스트 보고서', '배포 시스템']
        }
      ],
      milestones: [
        {
          name: '설계 완료',
          description: '시스템 설계 및 계획 완료',
          target_date: '2주차',
          criteria: ['설계 문서 완성', '팀 승인']
        },
        {
          name: 'MVP 완성',
          description: '최소 기능 제품 완성',
          target_date: '6주차',
          criteria: ['핵심 기능 구현', '기본 테스트 통과']
        }
      ],
      tasks: [],
      dependencies: [],
      techStack: {
        frontend: ['React', 'HTML', 'CSS'],
        backend: ['Node.js', 'Express'],
        database: ['MongoDB'],
        tools: ['Git', 'Jest']
      },
      risks: [
        {
          risk: '기술적 복잡도',
          probability: 'MEDIUM',
          impact: 'MEDIUM',
          mitigation: '충분한 학습 시간 확보'
        }
      ],
      mitigationStrategies: ['충분한 학습 시간 확보'],
      qualityGates: [
        {
          phase: '개발',
          criteria: ['코드 리뷰', '단위 테스트 90% 이상'],
          tools: ['ESLint', 'Jest']
        }
      ],
      testingStrategy: {
        unit_testing: true,
        integration_testing: true,
        e2e_testing: false,
        performance_testing: false
      }
    };
  }

  /**
   * 프로젝트 진행 상황 업데이트
   */
  async updateProjectProgress(projectId, updates) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    // 진행률 업데이트
    if (updates.taskCompletion) {
      Object.assign(project.progress.task_completion, updates.taskCompletion);
    }

    if (updates.milestoneStatus) {
      Object.assign(project.progress.milestone_status, updates.milestoneStatus);
    }

    // 전체 진행률 계산
    project.progress.overall_completion = this.calculateOverallProgress(project);

    // AI 기반 프로젝트 분석 및 제안
    if (project.settings.ai_monitoring) {
      const analysis = await this.analyzeProjectHealth(project);
      project.ai_insights = analysis;
    }

    project.updated_at = new Date().toISOString();
    await this.saveProjectToDisk(project);

    return {
      project_id: projectId,
      progress: project.progress,
      ai_insights: project.ai_insights || null,
      recommendations: await this.generateProgressRecommendations(project)
    };
  }

  /**
   * 전체 진행률 계산
   */
  calculateOverallProgress(project) {
    if (!project.tasks || project.tasks.length === 0) {
      return 0;
    }

    const completedTasks = Object.values(project.progress.task_completion || {})
      .filter(status => status === 'completed').length;

    return Math.round((completedTasks / project.tasks.length) * 100);
  }

  /**
   * AI 기반 프로젝트 건강도 분석
   */
  async analyzeProjectHealth(project) {
    try {
      const prompt = `
다음 프로젝트의 현재 상태를 분석하고 인사이트를 제공해주세요:

프로젝트: ${project.name}
전체 진행률: ${project.progress.overall_completion}%
시작일: ${project.resources.timeline.start_date}
목표 완료일: ${project.resources.timeline.end_date}
현재 날짜: ${new Date().toISOString()}

완료된 마일스톤: ${Object.entries(project.progress.milestone_status || {})
  .filter(([_, status]) => status === 'completed').length}
전체 마일스톤: ${project.milestones?.length || 0}

JSON 형식으로 응답해주세요:
{
  "health_score": 0-100,
  "status": "ON_TRACK|AT_RISK|DELAYED",
  "key_insights": ["주요 인사이트들"],
  "concerns": ["우려사항들"],
  "recommendations": ["개선 권장사항들"],
  "predicted_completion": "예상 완료일",
  "confidence_level": "HIGH|MEDIUM|LOW"
}
`;

      const response = await this.aiService.generateResponse(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('프로젝트 건강도 분석 오류:', error);
      return {
        health_score: 75,
        status: 'ON_TRACK',
        key_insights: ['분석 데이터 부족'],
        concerns: [],
        recommendations: ['정기적인 진행 상황 업데이트 권장'],
        predicted_completion: project.resources.timeline.end_date,
        confidence_level: 'LOW'
      };
    }
  }

  /**
   * 진행 상황 기반 권장사항 생성
   */
  async generateProgressRecommendations(project) {
    const recommendations = [];

    // 진행률 기반 권장사항
    if (project.progress.overall_completion < 20) {
      recommendations.push({
        type: 'progress',
        priority: 'medium',
        message: '프로젝트 초기 단계입니다. 팀 커뮤니케이션과 계획 검토에 집중하세요.'
      });
    } else if (project.progress.overall_completion > 80) {
      recommendations.push({
        type: 'progress',
        priority: 'high',
        message: '프로젝트 완료가 임박했습니다. 최종 테스트와 문서화에 집중하세요.'
      });
    }

    // 마일스톤 기반 권장사항
    const overdueElements = this.getOverdueElements(project);
    if (overdueElements.length > 0) {
      recommendations.push({
        type: 'timeline',
        priority: 'high',
        message: `${overdueElements.length}개의 지연된 항목이 있습니다. 우선순위를 재조정하세요.`
      });
    }

    return recommendations;
  }

  /**
   * 지연된 요소들 확인
   */
  getOverdueElements(project) {
    const overdue = [];
    const now = new Date();

    // 마일스톤 지연 확인
    if (project.milestones) {
      project.milestones.forEach(milestone => {
        const targetDate = new Date(milestone.target_date);
        if (targetDate < now && 
            project.progress.milestone_status?.[milestone.name] !== 'completed') {
          overdue.push({
            type: 'milestone',
            name: milestone.name,
            target_date: milestone.target_date
          });
        }
      });
    }

    return overdue;
  }

  /**
   * 프로젝트 분석 가져오기
   */
  async getProjectAnalytics(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    try {
      // AI 기반 프로젝트 건강도 분석
      const healthAnalysis = await this.analyzeProjectHealth(project);
      
      // 성능 메트릭 계산
      const performanceMetrics = this.calculatePerformanceMetrics(project);
      
      // 예측 분석
      const predictions = await this.generateProjectPredictions(project);

      return {
        project_id: projectId,
        project_name: project.name,
        health_analysis: healthAnalysis,
        performance_metrics: performanceMetrics,
        predictions: predictions,
        recommendations: await this.generateProgressRecommendations(project),
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('프로젝트 분석 오류:', error);
      return {
        project_id: projectId,
        project_name: project.name,
        health_analysis: {
          health_score: 50,
          status: 'UNKNOWN',
          key_insights: ['분석 오류로 인한 기본값'],
          concerns: ['분석 데이터 부족'],
          recommendations: ['정기적인 진행 상황 업데이트'],
          predicted_completion: 'Unknown',
          confidence_level: 'LOW'
        },
        performance_metrics: this.getDefaultPerformanceMetrics(),
        predictions: this.getDefaultPredictions(),
        recommendations: ['데이터 수집 개선 필요'],
        generated_at: new Date().toISOString()
      };
    }
  }

  /**
   * 성능 메트릭 계산
   */
  calculatePerformanceMetrics(project) {
    const currentDate = new Date();
    const startDate = new Date(project.resources.timeline.start_date);
    const endDate = new Date(project.resources.timeline.end_date);
    
    const totalDuration = (endDate - startDate) / (1000 * 60 * 60 * 24); // days
    const elapsed = (currentDate - startDate) / (1000 * 60 * 60 * 24); // days
    const plannedProgress = Math.min(100, (elapsed / totalDuration) * 100);
    
    return {
      overall_progress: project.progress.overall_completion,
      planned_progress: Math.round(plannedProgress),
      velocity: this.calculateVelocity(project),
      quality_score: this.calculateQualityScore(project),
      team_productivity: this.calculateTeamProductivity(project),
      schedule_variance: project.progress.overall_completion - plannedProgress,
      budget_variance: this.calculateBudgetVariance(project),
      risk_score: this.calculateRiskScore(project)
    };
  }

  /**
   * 프로젝트 예측 생성
   */
  async generateProjectPredictions(project) {
    try {
      const prompt = `
프로젝트 현황을 바탕으로 미래 예측을 제공해주세요:

프로젝트: ${project.name}
현재 진행률: ${project.progress.overall_completion}%
계획 대비 일정: ${this.calculateScheduleStatus(project)}
팀 크기: ${project.recommended_team_size}
복잡도: ${project.estimated_complexity}

JSON 형식으로 응답:
{
  "completion_probability": {
    "on_time": 0.8,
    "delayed_1_week": 0.15,
    "delayed_2_weeks": 0.05
  },
  "estimated_completion": "2024-12-15",
  "potential_risks": ["위험 요소들"],
  "success_factors": ["성공 요인들"],
  "resource_needs": ["필요 자원들"]
}
`;

      const response = await this.aiService.generateResponse(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('예측 생성 오류:', error);
      return this.getDefaultPredictions();
    }
  }

  /**
   * 팀 멤버 추가
   */
  async addTeamMember(projectId, memberData) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const member = {
      id: this.generateId(),
      ...memberData,
      added_at: new Date().toISOString()
    };

    if (!project.resources.team_members) {
      project.resources.team_members = [];
    }

    project.resources.team_members.push(member);
    project.updated_at = new Date().toISOString();
    
    await this.saveProjectToDisk(project);
    return member;
  }

  /**
   * 작업 추가
   */
  async addTask(projectId, taskData) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const task = {
      id: this.generateId(),
      ...taskData,
      created_at: new Date().toISOString()
    };

    if (!project.tasks) {
      project.tasks = [];
    }

    project.tasks.push(task);
    project.updated_at = new Date().toISOString();
    
    await this.saveProjectToDisk(project);
    return task;
  }

  /**
   * 작업 상태 업데이트
   */
  async updateTaskStatus(projectId, taskId, statusUpdate) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const task = project.tasks?.find(t => t.id === taskId);
    if (!task) {
      throw new Error('작업을 찾을 수 없습니다.');
    }

    Object.assign(task, statusUpdate);
    
    // 진행률 업데이트
    if (!project.progress.task_completion) {
      project.progress.task_completion = {};
    }
    project.progress.task_completion[taskId] = statusUpdate.status;
    
    // 전체 진행률 재계산
    project.progress.overall_completion = this.calculateOverallProgress(project);
    project.updated_at = new Date().toISOString();
    
    await this.saveProjectToDisk(project);
    return task;
  }

  /**
   * 템플릿으로부터 프로젝트 생성
   */
  async createProjectFromTemplate(templateId, projectName, customizations) {
    const template = this.projectTemplates.get(templateId);
    if (!template) {
      throw new Error('템플릿을 찾을 수 없습니다.');
    }

    const projectInfo = {
      name: projectName,
      description: `${template.description}를 기반으로 생성된 프로젝트`,
      type: template.category,
      complexity: template.estimated_complexity || 'MEDIUM',
      teamSize: template.recommended_team_size || '3-5명',
      targetDuration: template.estimated_duration || 12,
      ...customizations
    };

    const project = await this.createIntelligentProject(projectInfo);
    
    // 템플릿 정보 추가
    project.template_id = templateId;
    project.template_name = template.name;
    
    // 템플릿의 작업과 마일스톤 복사
    if (template.default_tasks) {
      project.tasks = [...template.default_tasks];
    }
    if (template.default_milestones) {
      project.milestones = [...template.default_milestones];
    }

    await this.saveProjectToDisk(project);
    return project;
  }

  /**
   * 프로젝트 템플릿 로드
   */
  async loadProjectTemplates() {
    const defaultTemplates = [
      {
        id: 'web-app-react',
        name: 'React 웹 애플리케이션',
        description: 'React를 사용한 현대적인 웹 애플리케이션',
        category: 'web-app',
        tech_stack: ['React', 'Node.js', 'Express', 'MongoDB'],
        estimated_duration: 12,
        estimated_complexity: 'MEDIUM',
        recommended_team_size: '3-5명'
      },
      {
        id: 'mobile-app-react-native',
        name: 'React Native 모바일 앱',
        description: 'React Native를 사용한 크로스플랫폼 모바일 앱',
        category: 'mobile-app',
        tech_stack: ['React Native', 'Node.js', 'Firebase'],
        estimated_duration: 16,
        estimated_complexity: 'HIGH',
        recommended_team_size: '4-6명'
      },
      {
        id: 'ai-ml-project',
        name: 'AI/ML 프로젝트',
        description: '머신러닝 모델 개발 및 배포',
        category: 'ai-project',
        tech_stack: ['Python', 'TensorFlow', 'Flask', 'Docker'],
        estimated_duration: 20,
        estimated_complexity: 'HIGH',
        recommended_team_size: '2-4명'
      },
      {
        id: 'api-service',
        name: 'REST API 서비스',
        description: 'RESTful API 백엔드 서비스',
        category: 'api',
        tech_stack: ['Node.js', 'Express', 'PostgreSQL', 'Redis'],
        estimated_duration: 8,
        estimated_complexity: 'MEDIUM',
        recommended_team_size: '2-3명'
      }
    ];

    defaultTemplates.forEach(template => {
      this.projectTemplates.set(template.id, template);
    });
  }

  // 헬퍼 메소드들
  calculateVelocity(project) {
    // 모의 구현
    return Math.random() * 100;
  }

  calculateTeamProductivity(project) {
    // 모의 구현
    return 85;
  }

  calculateBudgetVariance(project) {
    // 모의 구현
    return Math.random() * 20 - 10; // -10% to +10%
  }

  calculateRiskScore(project) {
    // 모의 구현
    const riskFactors = project.risk_assessment?.length || 0;
    return Math.min(100, riskFactors * 20);
  }

  calculateScheduleStatus(project) {
    const currentDate = new Date();
    const endDate = new Date(project.resources.timeline.end_date);
    const daysLeft = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return 'OVERDUE';
    if (daysLeft < 7) return 'CRITICAL';
    if (daysLeft < 14) return 'AT_RISK';
    return 'ON_TRACK';
  }

  getDefaultPerformanceMetrics() {
    return {
      overall_progress: 0,
      planned_progress: 0,
      velocity: 0,
      quality_score: 50,
      team_productivity: 50,
      schedule_variance: 0,
      budget_variance: 0,
      risk_score: 50
    };
  }

  getDefaultPredictions() {
    return {
      completion_probability: {
        on_time: 0.5,
        delayed_1_week: 0.3,
        delayed_2_weeks: 0.2
      },
      estimated_completion: 'Unknown',
      potential_risks: ['데이터 부족'],
      success_factors: ['팀 협업'],
      resource_needs: ['더 많은 데이터']
    };
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  calculateEndDate(startDate, durationWeeks) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + (durationWeeks * 7));
    return end.toISOString();
  }

  analyzeDependencies(tasks) {
    return tasks?.map(task => task.dependencies || []).flat() || [];
  }

  generateTestingStrategy(techStack) {
    return {
      unit_testing: true,
      integration_testing: true,
      e2e_testing: techStack.frontend?.includes('React') || false,
      performance_testing: techStack.backend?.length > 0 || false
    };
  }

  /**
   * 프로젝트 디스크 저장
   */
  async saveProjectToDisk(project) {
    try {
      const filePath = path.join(
        process.cwd(), 'data', 'projects', 
        project.status === 'completed' ? 'completed' : 'active',
        `${project.id}.json`
      );
      await fs.writeFile(filePath, JSON.stringify(project, null, 2));
    } catch (error) {
      console.error('프로젝트 저장 오류:', error);
    }
  }

  /**
   * 프로젝트 목록 조회
   */
  getProjects(filters = {}) {
    let projects = Array.from(this.projects.values());

    if (filters.status) {
      projects = projects.filter(p => p.status === filters.status);
    }

    if (filters.priority) {
      projects = projects.filter(p => p.priority === filters.priority);
    }

    if (filters.createdBy) {
      projects = projects.filter(p => p.created_by === filters.createdBy);
    }

    return projects.map(project => ({
      id: project.id,
      name: project.name,
      status: project.status,
      priority: project.priority,
      progress: project.progress.overall_completion,
      created_at: project.created_at,
      estimated_end: project.resources.timeline.end_date
    }));
  }
}

export default IntelligentProjectManager;
