# AI Agent Service Architecture

## Overview
The AI Agent Service is the core processing engine that hosts the 11 specialized educational agents, manages LLM integrations, and generates curriculum blueprints, activities, and assessments. This service bridges the gap between n8n workflow orchestration and actual AI-powered content generation.

## Service Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                 AI Agent Service                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Agent Loader  │  │  LLM Provider   │  │  Context    │ │
│  │   & Manager     │  │   Abstraction   │  │  Manager    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Blueprint     │  │   Activity &    │  │  Quality    │ │
│  │   Generator     │  │   Assessment    │  │  Validator  │ │
│  │                 │  │   Generator     │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   API Gateway   │  │   Configuration │  │  Monitoring │ │
│  │   & Router      │  │   Manager       │  │  & Logging  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Core Service:**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with async/await support
- **Database**: PostgreSQL for configuration and state
- **Cache**: Redis for session management and LLM response caching
- **Queue**: Bull Queue for background processing

**LLM Integration:**
- **OpenAI**: GPT-4, GPT-3.5-turbo support
- **Anthropic**: Claude 3 (Opus, Sonnet, Haiku) support
- **Local Models**: Ollama integration for on-premise deployment
- **Azure OpenAI**: Enterprise-grade OpenAI access

## Agent Management System

### Agent Loader and Manager

**Agent Definition Structure:**
```typescript
interface AgentDefinition {
  name: string;
  description: string;
  model: 'gpt-4' | 'claude-3-opus' | 'claude-3-sonnet' | 'local-llama';
  systemPrompt: string;
  capabilities: string[];
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  qualityThresholds: {
    minimumScore: number;
    validationCriteria: string[];
  };
  dependencies: string[];
  processingTimeout: number;
}
```

**Agent Loading Process:**
```typescript
class AgentManager {
  private agents: Map<string, AgentDefinition> = new Map();
  
  async loadAgents(agentDirectory: string): Promise<void> {
    const agentFiles = await fs.readdir(agentDirectory);
    
    for (const file of agentFiles.filter(f => f.endsWith('.md'))) {
      const agentDef = await this.parseAgentDefinition(file);
      this.agents.set(agentDef.name, agentDef);
    }
    
    // Validate agent dependencies
    this.validateAgentDependencies();
  }
  
  async executeAgent(
    agentName: string, 
    context: AgentContext, 
    userConfig: LLMConfiguration
  ): Promise<AgentOutput> {
    const agent = this.agents.get(agentName);
    if (!agent) throw new Error(`Agent ${agentName} not found`);
    
    const llmProvider = this.getLLMProvider(agent.model, userConfig);
    const response = await llmProvider.process(agent, context);
    
    return this.validateAndFormatOutput(response, agent);
  }
}
```

### Agent Context Management

**Context Structure:**
```typescript
interface AgentContext {
  courseId: string;
  phase: 'A' | 'B' | 'C';
  inputData: {
    courseContent?: ProcessedCourseContent;
    previousPhaseResults?: PhaseResults;
    institutionalRequirements?: InstitutionalConfig;
  };
  processingHistory: ProcessingStep[];
  qualityRequirements: QualityStandards;
  userPreferences: UserPreferences;
}

interface ProcessedCourseContent {
  syllabus: SyllabusData;
  learningObjectives: LearningObjective[];
  contentModules: ContentModule[];
  assessmentRequirements: AssessmentRequirement[];
  supportingMaterials: SupportingMaterial[];
}
```

## LLM Provider Abstraction Layer

### Provider Interface

**LLM Provider Abstraction:**
```typescript
interface LLMProvider {
  name: string;
  supportedModels: string[];
  
  initialize(config: ProviderConfig): Promise<void>;
  process(agent: AgentDefinition, context: AgentContext): Promise<LLMResponse>;
  validateResponse(response: LLMResponse, schema: JSONSchema): boolean;
  estimateCost(prompt: string, model: string): number;
}

class OpenAIProvider implements LLMProvider {
  name = 'openai';
  supportedModels = ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'];
  
  async process(agent: AgentDefinition, context: AgentContext): Promise<LLMResponse> {
    const prompt = this.buildPrompt(agent, context);
    
    const response = await this.openai.chat.completions.create({
      model: agent.model,
      messages: [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });
    
    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      model: agent.model,
      timestamp: new Date().toISOString()
    };
  }
}

class ClaudeProvider implements LLMProvider {
  name = 'anthropic';
  supportedModels = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
  
  async process(agent: AgentDefinition, context: AgentContext): Promise<LLMResponse> {
    const prompt = this.buildPrompt(agent, context);
    
    const response = await this.anthropic.messages.create({
      model: agent.model,
      max_tokens: 4000,
      temperature: 0.7,
      system: agent.systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });
    
    return {
      content: response.content[0].text,
      usage: response.usage,
      model: agent.model,
      timestamp: new Date().toISOString()
    };
  }
}
```

### Configuration Management

**User LLM Configuration:**
```typescript
interface LLMConfiguration {
  providers: {
    openai?: {
      apiKey: string;
      organization?: string;
      baseURL?: string;
      defaultModel: string;
      maxTokens: number;
      temperature: number;
    };
    anthropic?: {
      apiKey: string;
      defaultModel: string;
      maxTokens: number;
      temperature: number;
    };
    azure?: {
      apiKey: string;
      endpoint: string;
      deploymentName: string;
      apiVersion: string;
    };
    local?: {
      endpoint: string;
      model: string;
      timeout: number;
    };
  };
  agentModelMapping: {
    [agentName: string]: {
      primaryProvider: string;
      fallbackProvider?: string;
      customSettings?: Partial<ProviderConfig>;
    };
  };
  costLimits: {
    dailyLimit: number;
    perCourseLimit: number;
    alertThreshold: number;
  };
}
```

**Configuration API:**
```typescript
class ConfigurationManager {
  async saveUserConfiguration(userId: string, config: LLMConfiguration): Promise<void> {
    // Encrypt API keys before storage
    const encryptedConfig = await this.encryptSensitiveData(config);
    
    await this.db.query(
      'INSERT INTO user_llm_configs (user_id, config, updated_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET config = $2, updated_at = $3',
      [userId, JSON.stringify(encryptedConfig), new Date()]
    );
  }
  
  async getUserConfiguration(userId: string): Promise<LLMConfiguration> {
    const result = await this.db.query(
      'SELECT config FROM user_llm_configs WHERE user_id = $1',
      [userId]
    );
    
    if (!result.rows[0]) {
      return this.getDefaultConfiguration();
    }
    
    return this.decryptSensitiveData(JSON.parse(result.rows[0].config));
  }
}
```

## Blueprint Generation Engine

### Course Analysis and Blueprint Creation

**Blueprint Generation Process:**
```typescript
class BlueprintGenerator {
  async generateCourseBlueprint(
    courseContent: ProcessedCourseContent,
    userConfig: LLMConfiguration
  ): Promise<CourseBlueprint> {
    
    // Phase A: Educational Foundation
    const phaseAResults = await this.executePhaseA(courseContent, userConfig);
    
    // Human Review Checkpoint 1
    await this.triggerHumanReview('A', phaseAResults);
    const phaseAApproved = await this.waitForApproval('A');
    
    if (!phaseAApproved) {
      throw new Error('Phase A not approved');
    }
    
    // Phase B: Content & Design
    const phaseBResults = await this.executePhaseB(phaseAResults, userConfig);
    
    // Human Review Checkpoint 2
    await this.triggerHumanReview('B', phaseBResults);
    const phaseBApproved = await this.waitForApproval('B');
    
    if (!phaseBApproved) {
      throw new Error('Phase B not approved');
    }
    
    // Phase C: Technical Implementation
    const phaseCResults = await this.executePhaseC(phaseBResults, userConfig);
    
    // Generate final blueprint
    return this.compileFinalBlueprint(phaseAResults, phaseBResults, phaseCResults);
  }
  
  private async executePhaseA(
    courseContent: ProcessedCourseContent,
    userConfig: LLMConfiguration
  ): Promise<PhaseAResults> {
    
    const agents = ['instructional-designer', 'curriculum-architect', 'business-analyst'];
    const results = await Promise.all(
      agents.map(agent => this.agentManager.executeAgent(agent, {
        courseId: courseContent.courseId,
        phase: 'A',
        inputData: { courseContent },
        processingHistory: [],
        qualityRequirements: this.getQualityStandards(),
        userPreferences: userConfig
      }, userConfig))
    );
    
    return this.validatePhaseAIntegration(results);
  }
}
```

### Activity and Assessment Generation

**Activity Generator:**
```typescript
class ActivityAssessmentGenerator {
  async generateLearningActivities(
    blueprint: CourseBlueprint,
    learningObjectives: LearningObjective[]
  ): Promise<LearningActivity[]> {
    
    const activities: LearningActivity[] = [];
    
    for (const objective of learningObjectives) {
      const activityContext = {
        learningObjective: objective,
        pedagogicalFramework: blueprint.educationalFoundation.pedagogicalFramework,
        assessmentStrategy: blueprint.contentDesign.assessmentFramework,
        engagementStrategy: blueprint.contentDesign.engagementStrategy
      };
      
      const activityAgent = await this.agentManager.executeAgent(
        'activity-generator',
        activityContext,
        this.userConfig
      );
      
      activities.push(...this.parseActivities(activityAgent.output));
    }
    
    return this.validateActivityAlignment(activities, learningObjectives);
  }
  
  async generateAssessments(
    blueprint: CourseBlueprint,
    activities: LearningActivity[]
  ): Promise<Assessment[]> {
    
    const assessmentContext = {
      courseBlueprint: blueprint,
      learningActivities: activities,
      assessmentFramework: blueprint.contentDesign.assessmentFramework,
      qualityStandards: this.getAssessmentQualityStandards()
    };
    
    const assessmentAgent = await this.agentManager.executeAgent(
      'assessment-specialist',
      assessmentContext,
      this.userConfig
    );
    
    return this.validateAssessments(assessmentAgent.output);
  }
}
```

## API Gateway and Routing

### REST API Endpoints

**Core API Structure:**
```typescript
// Agent Processing Endpoints
app.post('/api/v1/agents/:agentName/process', async (req, res) => {
  try {
    const { agentName } = req.params;
    const { context, userConfig } = req.body;
    
    const result = await agentManager.executeAgent(agentName, context, userConfig);
    
    res.json({
      success: true,
      agent: agentName,
      result: result,
      processingTime: result.processingTime,
      cost: result.estimatedCost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      agent: agentName
    });
  }
});

// Blueprint Generation
app.post('/api/v1/blueprint/generate', async (req, res) => {
  try {
    const { courseContent, userConfig } = req.body;
    
    // Start async blueprint generation
    const jobId = await blueprintQueue.add('generate-blueprint', {
      courseContent,
      userConfig,
      userId: req.user.id
    });
    
    res.json({
      success: true,
      jobId: jobId.id,
      status: 'processing',
      estimatedCompletion: new Date(Date.now() + 45 * 60 * 1000) // 45 minutes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Configuration Management
app.post('/api/v1/config/llm', async (req, res) => {
  try {
    const { config } = req.body;
    await configManager.saveUserConfiguration(req.user.id, config);
    
    res.json({
      success: true,
      message: 'LLM configuration saved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Status and Monitoring
app.get('/api/v1/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await blueprintQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      jobId: jobId,
      status: await job.getState(),
      progress: job.progress(),
      result: job.returnvalue,
      error: job.failedReason
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### n8n Integration Endpoints

**Webhook Integration with n8n:**
```typescript
// n8n Webhook Integration
app.post('/api/v1/n8n/course-processing', async (req, res) => {
  try {
    const { courseId, phase, action, data } = req.body;
    
    switch (action) {
      case 'start_phase_a':
        await this.startPhaseA(courseId, data);
        break;
      case 'start_phase_b':
        await this.startPhaseB(courseId, data);
        break;
      case 'start_phase_c':
        await this.startPhaseC(courseId, data);
        break;
      case 'generate_final_package':
        await this.generateFinalPackage(courseId, data);
        break;
    }
    
    // Notify n8n of completion
    await this.notifyN8N(courseId, phase, 'completed');
    
    res.json({ success: true, courseId, phase, action });
  } catch (error) {
    // Notify n8n of failure
    await this.notifyN8N(courseId, phase, 'failed', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

private async notifyN8N(courseId: string, phase: string, status: string, error?: string) {
  const webhookUrl = 'https://learningtechnologies.app.n8n.cloud/webhook-test/course-dev-system';
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseId,
      phase,
      status,
      error,
      timestamp: new Date().toISOString(),
      source: 'ai-agent-service'
    })
  });
}
```

## Quality Validation System

### Output Validation

**Quality Validator:**
```typescript
class QualityValidator {
  async validateAgentOutput(
    output: AgentOutput,
    agent: AgentDefinition,
    context: AgentContext
  ): Promise<ValidationResult> {
    
    const validations = await Promise.all([
      this.validateSchema(output, agent.outputSchema),
      this.validateContent(output, agent.qualityThresholds),
      this.validateEducationalAlignment(output, context),
      this.validateAccessibility(output),
      this.validateCompleteness(output, agent.capabilities)
    ]);
    
    const overallScore = this.calculateOverallScore(validations);
    
    return {
      isValid: overallScore >= agent.qualityThresholds.minimumScore,
      score: overallScore,
      validations: validations,
      recommendations: this.generateRecommendations(validations)
    };
  }
  
  private async validateEducationalAlignment(
    output: AgentOutput,
    context: AgentContext
  ): Promise<ValidationCheck> {
    // Use a specialized validation agent to check educational alignment
    const validationAgent = await this.agentManager.executeAgent(
      'quality-validator',
      {
        outputToValidate: output,
        originalContext: context,
        validationCriteria: this.getEducationalValidationCriteria()
      },
      this.systemConfig
    );
    
    return {
      name: 'educational_alignment',
      passed: validationAgent.output.alignmentScore >= 0.85,
      score: validationAgent.output.alignmentScore,
      details: validationAgent.output.details
    };
  }
}
```

## Monitoring and Logging

### Performance Monitoring

**Monitoring System:**
```typescript
class MonitoringService {
  async trackAgentPerformance(
    agentName: string,
    processingTime: number,
    cost: number,
    qualityScore: number
  ): Promise<void> {
    
    await this.metricsDB.query(`
      INSERT INTO agent_performance_metrics 
      (agent_name, processing_time, cost, quality_score, timestamp)
      VALUES ($1, $2, $3, $4, $5)
    `, [agentName, processingTime, cost, qualityScore, new Date()]);
    
    // Check for performance alerts
    await this.checkPerformanceAlerts(agentName, processingTime, qualityScore);
  }
  
  async generatePerformanceReport(): Promise<PerformanceReport> {
    const metrics = await this.metricsDB.query(`
      SELECT 
        agent_name,
        AVG(processing_time) as avg_processing_time,
        AVG(cost) as avg_cost,
        AVG(quality_score) as avg_quality_score,
        COUNT(*) as execution_count
      FROM agent_performance_metrics 
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY agent_name
    `);
    
    return {
      reportPeriod: '24h',
      agentMetrics: metrics.rows,
      systemHealth: await this.calculateSystemHealth(),
      recommendations: await this.generateOptimizationRecommendations()
    };
  }
}
```

## Deployment Configuration

### Docker Configuration

**AI Agent Service Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/
COPY agents/ ./agents/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S aiagent -u 1001
USER aiagent

EXPOSE 3000

CMD ["npm", "start"]
```

**Docker Compose Integration:**
```yaml
version: '3.8'
services:
  ai-agent-service:
    build: ./ai-agent-service
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${AI_AGENT_DB_URL}
      - REDIS_URL=${REDIS_URL}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    volumes:
      - ./agents:/app/agents:ro
      - ai_agent_logs:/app/logs
    networks:
      - curriculum-network
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=curriculum_system
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - curriculum-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - curriculum-network

volumes:
  ai_agent_logs:
  postgres_data:
  redis_data:

networks:
  curriculum-network:
    driver: bridge
```

## Performance Specifications

**Service Performance Targets:**
- **Agent Processing Time**: < 2 minutes per agent
- **Blueprint Generation**: < 45 minutes total
- **API Response Time**: < 500ms for status endpoints
- **Concurrent Processing**: 10 courses simultaneously
- **Memory Usage**: < 4GB per service instance
- **CPU Usage**: < 80% under normal load

**Quality Targets:**
- **Agent Output Quality**: > 85% validation score
- **Educational Alignment**: > 90% alignment score
- **Accessibility Compliance**: 100% WCAG 2.1 AA
- **Content Completeness**: > 95% requirement coverage

**Cost Management:**
- **Daily Cost Limits**: Configurable per user
- **Cost Tracking**: Real-time cost monitoring
- **Provider Optimization**: Automatic fallback to cost-effective providers
- **Usage Analytics**: Detailed cost breakdown and optimization recommendations

---
**Implementation Status**: ✅ AI Agent Service Architecture complete  
**Next Phase**: Integration testing and deployment