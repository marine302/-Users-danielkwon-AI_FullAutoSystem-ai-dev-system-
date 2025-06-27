/**
 * 지능형 프로젝트 관리 API 라우터
 * AI 기반 프로젝트 계획, 추적, 최적화 엔드포인트
 */

import express from 'express';
import { IntelligentProjectManager } from '../modules/project/IntelligentProjectManager.js';

const router = express.Router();
const projectManager = new IntelligentProjectManager();

/**
 * GET /api/intelligent-project/health
 * 시스템 상태 확인
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'active',
    service: 'Intelligent Project Manager',
    timestamp: new Date().toISOString(),
    features: [
      'AI-powered project planning',
      'Real-time progress tracking',
      'Risk assessment',
      'Team collaboration',
      'Quality gates',
      'Performance analytics'
    ]
  });
});

/**
 * POST /api/intelligent-project/create
 * 새로운 지능형 프로젝트 생성
 */
router.post('/create', async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      complexity,
      teamSize,
      budget,
      targetDuration,
      startDate,
      createdBy,
      priority,
      autoUpdate,
      aiMonitoring,
      notificationLevel
    } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        error: '프로젝트명과 설명은 필수입니다.'
      });
    }

    const projectInfo = {
      name,
      description,
      type,
      complexity,
      teamSize,
      budget,
      targetDuration,
      startDate,
      createdBy,
      priority,
      autoUpdate,
      aiMonitoring,
      notificationLevel
    };

    const project = await projectManager.createIntelligentProject(projectInfo);

    res.json({
      success: true,
      message: '지능형 프로젝트가 성공적으로 생성되었습니다.',
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        estimated_duration: project.estimated_duration,
        complexity: project.estimated_complexity,
        team_size: project.recommended_team_size,
        phases: project.phases,
        milestones: project.milestones,
        tech_stack: project.tech_stack,
        ai_analysis: project.ai_analysis
      }
    });
  } catch (error) {
    console.error('프로젝트 생성 오류:', error);
    res.status(500).json({
      error: '프로젝트 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/intelligent-project/list
 * 모든 프로젝트 목록 조회
 */
router.get('/list', (req, res) => {
  try {
    const { status, priority, complexity } = req.query;
    
    let projects = Array.from(projectManager.projects.values());

    // 필터링
    if (status) {
      projects = projects.filter(p => p.status === status);
    }
    if (priority) {
      projects = projects.filter(p => p.priority === priority);
    }
    if (complexity) {
      projects = projects.filter(p => p.estimated_complexity === complexity);
    }

    // 요약 정보만 반환
    const projectList = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      progress: project.progress.overall_completion,
      created_at: project.created_at,
      estimated_completion: project.resources.timeline.end_date,
      team_size: project.recommended_team_size,
      complexity: project.estimated_complexity
    }));

    res.json({
      success: true,
      count: projectList.length,
      projects: projectList
    });
  } catch (error) {
    console.error('프로젝트 목록 조회 오류:', error);
    res.status(500).json({
      error: '프로젝트 목록 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/intelligent-project/templates
 * 프로젝트 템플릿 목록
 */
router.get('/templates', (req, res) => {
  try {
    const templates = Array.from(projectManager.projectTemplates.values());

    res.json({
      success: true,
      count: templates.length,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        tech_stack: template.tech_stack,
        estimated_duration: template.estimated_duration
      }))
    });
  } catch (error) {
    console.error('템플릿 목록 조회 오류:', error);
    res.status(500).json({
      error: '템플릿 목록 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/intelligent-project/dashboard
 * 프로젝트 대시보드 데이터
 */
router.get('/dashboard', (req, res) => {
  try {
    const projects = Array.from(projectManager.projects.values());
    
    const dashboard = {
      total_projects: projects.length,
      active_projects: projects.filter(p => p.status === 'active').length,
      completed_projects: projects.filter(p => p.status === 'completed').length,
      at_risk_projects: projects.filter(p => 
        p.ai_insights?.status === 'AT_RISK' || p.ai_insights?.status === 'DELAYED'
      ).length,
      
      average_completion: projects.length > 0 
        ? Math.round(projects.reduce((sum, p) => sum + p.progress.overall_completion, 0) / projects.length)
        : 0,
      
      upcoming_milestones: projects.flatMap(project => 
        project.milestones?.filter(milestone => {
          const status = project.progress.milestone_status?.[milestone.name];
          return status !== 'completed';
        }).map(milestone => ({
          project_id: project.id,
          project_name: project.name,
          milestone: milestone.name,
          target_date: milestone.target_date
        })) || []
      ).slice(0, 10),
      
      recent_activity: projects
        .filter(p => p.updated_at)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 5)
        .map(project => ({
          project_id: project.id,
          project_name: project.name,
          last_update: project.updated_at,
          status: project.status,
          progress: project.progress.overall_completion
        }))
    };

    res.json({
      success: true,
      dashboard,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('대시보드 데이터 조회 오류:', error);
    res.status(500).json({
      error: '대시보드 데이터 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/intelligent-project/:id
 * 특정 프로젝트 상세 정보 조회
 */
router.get('/:id', (req, res) => {
  try {
    const project = projectManager.projects.get(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        error: '프로젝트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('프로젝트 조회 오류:', error);
    res.status(500).json({
      error: '프로젝트 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * PUT /api/intelligent-project/:id/progress
 * 프로젝트 진행 상황 업데이트
 */
router.put('/:id/progress', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { taskCompletion, milestoneStatus, notes } = req.body;

    const updates = {
      taskCompletion,
      milestoneStatus,
      notes
    };

    const result = await projectManager.updateProjectProgress(projectId, updates);

    res.json({
      success: true,
      message: '프로젝트 진행 상황이 업데이트되었습니다.',
      result
    });
  } catch (error) {
    console.error('진행 상황 업데이트 오류:', error);
    res.status(500).json({
      error: '진행 상황 업데이트 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/intelligent-project/:id/analytics
 * 프로젝트 분석 및 인사이트
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const project = projectManager.projects.get(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        error: '프로젝트를 찾을 수 없습니다.'
      });
    }

    const analytics = await projectManager.getProjectAnalytics(req.params.id);

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('프로젝트 분석 오류:', error);
    res.status(500).json({
      error: '프로젝트 분석 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/intelligent-project/:id/team/add
 * 팀 멤버 추가
 */
router.post('/:id/team/add', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { memberName, role, skills, availability } = req.body;

    if (!memberName || !role) {
      return res.status(400).json({
        error: '멤버명과 역할은 필수입니다.'
      });
    }

    const result = await projectManager.addTeamMember(projectId, {
      name: memberName,
      role,
      skills: skills || [],
      availability: availability || 'full-time',
      joined_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: '팀 멤버가 추가되었습니다.',
      team_member: result
    });
  } catch (error) {
    console.error('팀 멤버 추가 오류:', error);
    res.status(500).json({
      error: '팀 멤버 추가 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/intelligent-project/:id/tasks/add
 * 새 작업 추가
 */
router.post('/:id/tasks/add', async (req, res) => {
  try {
    const projectId = req.params.id;
    const {
      name,
      description,
      assignee,
      priority,
      estimatedHours,
      phase,
      dependencies
    } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        error: '작업명과 설명은 필수입니다.'
      });
    }

    const taskData = {
      name,
      description,
      assignee,
      priority: priority || 'medium',
      estimated_hours: estimatedHours || 8,
      phase,
      dependencies: dependencies || [],
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const result = await projectManager.addTask(projectId, taskData);

    res.json({
      success: true,
      message: '작업이 추가되었습니다.',
      task: result
    });
  } catch (error) {
    console.error('작업 추가 오류:', error);
    res.status(500).json({
      error: '작업 추가 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * PUT /api/intelligent-project/:id/tasks/:taskId/status
 * 작업 상태 업데이트
 */
router.put('/:id/tasks/:taskId/status', async (req, res) => {
  try {
    const { id: projectId, taskId } = req.params;
    const { status, notes, completion_percentage } = req.body;

    if (!status) {
      return res.status(400).json({
        error: '상태는 필수입니다.'
      });
    }

    const result = await projectManager.updateTaskStatus(projectId, taskId, {
      status,
      notes,
      completion_percentage,
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: '작업 상태가 업데이트되었습니다.',
      task: result
    });
  } catch (error) {
    console.error('작업 상태 업데이트 오류:', error);
    res.status(500).json({
      error: '작업 상태 업데이트 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/intelligent-project/:id/risks
 * 프로젝트 위험 요소 조회
 */
router.get('/:id/risks', (req, res) => {
  try {
    const project = projectManager.projects.get(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        error: '프로젝트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      risks: project.risk_assessment || [],
      mitigation_strategies: project.mitigation_strategies || []
    });
  } catch (error) {
    console.error('위험 요소 조회 오류:', error);
    res.status(500).json({
      error: '위험 요소 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/intelligent-project/:id/recommendations
 * AI 기반 프로젝트 개선 권장사항 생성
 */
router.post('/:id/recommendations', async (req, res) => {
  try {
    const project = projectManager.projects.get(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        error: '프로젝트를 찾을 수 없습니다.'
      });
    }

    const recommendations = await projectManager.generateProgressRecommendations(project);

    res.json({
      success: true,
      recommendations,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('권장사항 생성 오류:', error);
    res.status(500).json({
      error: '권장사항 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/intelligent-project/from-template
 * 템플릿으로부터 프로젝트 생성
 */
router.post('/from-template', async (req, res) => {
  try {
    const { templateId, projectName, customizations } = req.body;

    if (!templateId || !projectName) {
      return res.status(400).json({
        error: '템플릿 ID와 프로젝트명은 필수입니다.'
      });
    }

    const project = await projectManager.createProjectFromTemplate(
      templateId,
      projectName,
      customizations || {}
    );

    res.json({
      success: true,
      message: '템플릿으로부터 프로젝트가 생성되었습니다.',
      project: {
        id: project.id,
        name: project.name,
        template_used: templateId,
        phases: project.phases,
        estimated_duration: project.estimated_duration
      }
    });
  } catch (error) {
    console.error('템플릿 프로젝트 생성 오류:', error);
    res.status(500).json({
      error: '템플릿 프로젝트 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

export default router;
