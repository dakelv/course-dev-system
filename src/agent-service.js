const fs = require('fs-extra');
const path = require('path');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const config = require('./config');

class AgentService {
  constructor() {
    this.agents = new Map();
    this.llmProviders = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize LLM providers
      await this.initializeLLMProviders();
      
      // Load agent definitions
      await this.loadAgents();
      
      this.initialized = true;
      logger.info('Agent service initialized successfully', {
        agentCount: this.agents.size,
        providers: Array.from(this.llmProviders.keys())
      });
    } catch (error) {
      logger.logError(error, { operation: 'agent-service-initialization' });
      throw error;
    }
  }

  async initializeLLMProviders() {
    const apiKeys = config.get('apiKeys');
    
    // Initialize OpenAI
    if (apiKeys.openai && apiKeys.openai !== 'your_openai_key_here') {
      try {
        const openai = new OpenAI({
          apiKey: apiKeys.openai,
          timeout: config.get('llmProviders.openai.timeout') || 60000
        });
        this.llmProviders.set('openai', new OpenAIProvider(openai));
        logger.info('OpenAI provider initialized');
      } catch (error) {
        logger.logError(error, { operation: 'openai-initialization' });
      }
    }

    // Initialize Claude/Anthropic
    if (apiKeys.claude && apiKeys.claude !== 'your_claude_key_here') {
      try {
        console.log('Initializing Claude with API key:', apiKeys.claude ? 'Present' : 'Missing');
        
        // Validate API key format
        if (!apiKeys.claude.startsWith('sk-ant-')) {
          throw new Error('Invalid Claude API key format. Should start with sk-ant-');
        }
        
        const anthropic = new Anthropic({
          apiKey: apiKeys.claude
        });
        
        // Test the client by checking if it has the required methods
        if (!anthropic.messages || typeof anthropic.messages.create !== 'function') {
          throw new Error('Anthropic client not properly initialized - missing messages.create method');
        }
        
        console.log('Anthropic client created successfully');
        const claudeProvider = new ClaudeProvider(anthropic);
        console.log('Claude provider created successfully');
        this.llmProviders.set('claude', claudeProvider);
        logger.info('Claude provider initialized');
      } catch (error) {
        logger.logError(error, { operation: 'claude-initialization' });
        console.error('Claude initialization failed:', error.message);
      }
    }

    if (this.llmProviders.size === 0) {
      throw new Error('No LLM providers could be initialized. Check your API keys and ensure they are valid.');
    }
  }

  async loadAgents() {
    const agentsPath = config.get('paths.agents');
    
    if (!await fs.pathExists(agentsPath)) {
      throw new Error(`Agents directory not found: ${agentsPath}`);
    }

    const agentFiles = await fs.readdir(agentsPath);
    const markdownFiles = agentFiles.filter(file => file.endsWith('.md') && !file.startsWith('README'));

    logger.info(`Loading ${markdownFiles.length} agent definitions from ${agentsPath}`);

    for (const file of markdownFiles) {
      try {
        const agentDef = await this.parseAgentDefinition(path.join(agentsPath, file));
        if (agentDef) {
          this.agents.set(agentDef.name, agentDef);
          logger.info(`Loaded agent: ${agentDef.name}`, { model: agentDef.model });
        }
      } catch (error) {
        logger.logError(error, { agentFile: file, operation: 'load-agent' });
        // Continue loading other agents
      }
    }

    if (this.agents.size === 0) {
      throw new Error('No valid agent definitions could be loaded');
    }
  }

  async parseAgentDefinition(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const fileName = path.basename(filePath, '.md');
    
    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      logger.warn(`No frontmatter found in agent file: ${fileName}`);
      return null;
    }

    const frontmatter = this.parseFrontmatter(frontmatterMatch[1]);
    const systemPrompt = content.replace(/^---\n[\s\S]*?\n---\n/, '').trim();

    if (!frontmatter.name || !systemPrompt) {
      logger.warn(`Invalid agent definition in file: ${fileName}`);
      return null;
    }

    return {
      name: frontmatter.name,
      description: frontmatter.description || '',
      model: frontmatter.model || 'gpt-4',
      systemPrompt: systemPrompt,
      filePath: filePath,
      capabilities: this.extractCapabilities(systemPrompt),
      processingTimeout: 300000, // 5 minutes default
      qualityThresholds: {
        minimumScore: 0.85,
        validationCriteria: ['educational_alignment', 'content_completeness', 'clarity']
      }
    };
  }

  parseFrontmatter(frontmatterText) {
    const result = {};
    const lines = frontmatterText.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        result[match[1]] = match[2].trim();
      }
    }
    
    return result;
  }

  extractCapabilities(systemPrompt) {
    // Extract capabilities from system prompt
    const capabilities = [];
    const lowerPrompt = systemPrompt.toLowerCase();
    
    if (lowerPrompt.includes('learning') || lowerPrompt.includes('education')) {
      capabilities.push('educational_design');
    }
    if (lowerPrompt.includes('assessment') || lowerPrompt.includes('evaluation')) {
      capabilities.push('assessment_design');
    }
    if (lowerPrompt.includes('curriculum') || lowerPrompt.includes('course')) {
      capabilities.push('curriculum_development');
    }
    if (lowerPrompt.includes('analysis') || lowerPrompt.includes('analyze')) {
      capabilities.push('content_analysis');
    }
    
    return capabilities;
  }

  async executeAgent(agentName, context, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    try {
      const agent = this.agents.get(agentName);
      if (!agent) {
        throw new Error(`Agent not found: ${agentName}`);
      }

      logger.logProcessingStart(context.courseId, `agent-${agentName}`);

      // Determine which LLM provider to use
      const providerName = this.getProviderForAgent(agentName);
      const provider = this.llmProviders.get(providerName);
      
      if (!provider) {
        throw new Error(`LLM provider not available: ${providerName}`);
      }

      // Build the prompt
      const prompt = this.buildPrompt(agent, context);
      
      // Execute with the LLM provider
      const response = await provider.process(agent, prompt, options);
      
      // Validate the response
      const validatedOutput = await this.validateAgentOutput(response, agent, context);
      
      const duration = Date.now() - startTime;
      const cost = this.estimateCost(response, providerName);
      
      logger.logAgentExecution(agentName, context.courseId, duration, cost, validatedOutput.qualityScore);

      return {
        agent: agentName,
        output: validatedOutput.content,
        metadata: {
          model: agent.model,
          provider: providerName,
          processingTime: duration,
          estimatedCost: cost,
          qualityScore: validatedOutput.qualityScore,
          validationResults: validatedOutput.validation,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logError(error, { 
        agent: agentName, 
        courseId: context.courseId, 
        duration,
        operation: 'execute-agent' 
      });
      throw error;
    }
  }

  getProviderForAgent(agentName) {
    // Check agent-specific model mapping
    const agentModel = config.getAgentModel(agentName);
    
    if (agentModel.includes('gpt') || agentModel.includes('openai')) {
      return 'openai';
    } else if (agentModel.includes('claude')) {
      return 'claude';
    }
    
    // Default to first available provider
    return Array.from(this.llmProviders.keys())[0];
  }

  buildPrompt(agent, context) {
    // Determine if this is Phase B and build specialized prompts
    if (context.phase === 'B') {
      return this.buildPhaseBPrompt(agent, context);
    }
    
    // Default Phase A prompt
    const prompt = `
COURSE CONTEXT:
Course ID: ${context.courseId}
Phase: ${context.phase}

COURSE CONTENT:
${JSON.stringify(context.inputData, null, 2)}

PROCESSING REQUIREMENTS:
- Quality Threshold: ${context.qualityRequirements?.minimumScore || 0.85}
- Accessibility: ${context.qualityRequirements?.accessibilityCompliance || 'WCAG 2.1 AA'}
- Educational Standards: Saskatchewan Polytechnic standards

INSTRUCTIONS:
Please analyze the provided course content and generate your response according to your role as ${agent.name}.

Focus on:
1. Educational quality and alignment
2. Practical implementation
3. Clear, actionable recommendations
4. Compliance with accessibility standards

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any text before or after the JSON object.

Provide your response in this exact JSON format:
{
  "analysis": "Your detailed analysis of the course content",
  "recommendations": ["Specific recommendation 1", "Specific recommendation 2", "Specific recommendation 3"],
  "output": "Your main deliverable based on your role",
  "qualityAssessment": {
    "score": 0.85,
    "strengths": ["Identified strength 1", "Identified strength 2"],
    "improvements": ["Suggested improvement 1", "Suggested improvement 2"]
  },
  "nextSteps": ["Next step 1", "Next step 2", "Next step 3"]
}

Remember: ONLY return the JSON object, nothing else.
    `.trim();

    return prompt;
  }

  buildPhaseBPrompt(agent, context) {
    const baseContext = `
COURSE CONTEXT:
Course ID: ${context.courseId}
Phase: B (Activity Design)

COURSE CONTENT:
${JSON.stringify(context.inputData?.courseContent || {}, null, 2)}

PHASE A RESULTS:
${JSON.stringify(context.inputData?.phaseAResults || {}, null, 2)}

PROCESSING REQUIREMENTS:
- Quality Threshold: ${context.qualityRequirements?.minimumScore || 0.85}
- Accessibility: ${context.qualityRequirements?.accessibilityCompliance || 'WCAG 2.1 AA'}
- Platform: D2L Brightspace
- Subject Area: Municipal Administration
- Institution: Saskatchewan Polytechnic
`;

    switch (agent.name) {
      case 'assessment-specialist':
        return `${baseContext}

ROLE: Assessment Design Specialist for Municipal Administration Course

TASK: Design comprehensive assessment strategy based on Phase A educational foundations.

FOCUS AREAS:
1. Create authentic assessments aligned to municipal administration learning outcomes
2. Design formative and summative evaluation strategies
3. Develop rubrics with clear performance criteria
4. Ensure assessment accessibility and bias-free design
5. Plan H5P interactive assessments for D2L Brightspace

SPECIFIC REQUIREMENTS:
- Assessment types: quizzes, case studies, projects, peer evaluations
- Real municipal scenarios and case-based assessments
- Canadian municipal administration contexts
- Performance rubrics with 4-level criteria (Excellent, Good, Satisfactory, Needs Improvement)
- Accessibility compliance (screen readers, alternative formats)
- Anti-cheating measures and academic integrity

DELIVERABLES TO INCLUDE:
- Assessment blueprint with types and timing
- Sample question banks with correct answers
- Detailed rubrics for major assessments
- H5P activity specifications for Brightspace
- Accessibility accommodations plan

CRITICAL: You MUST respond with ONLY valid JSON. Use this format:
{
  "analysis": "Analysis of Phase A foundations and assessment needs",
  "recommendations": ["Assessment strategy recommendations"],
  "output": "Detailed assessment design plan and specifications",
  "qualityAssessment": {
    "score": 0.85,
    "strengths": ["Assessment strengths identified"],
    "improvements": ["Assessment improvements needed"]
  },
  "nextSteps": ["Implementation steps for assessment strategy"]
}`;

      case 'instructional-designer':
        return `${baseContext}

ROLE: Instructional Designer - Activity Design Specialist

TASK: Design engaging learning activities based on Phase A educational framework and assessment requirements.

FOCUS AREAS:
1. Apply learning theories to activity design (constructivism, adult learning)
2. Create scaffolded learning progressions
3. Design multi-modal activities for diverse learning styles
4. Ensure cognitive load management and UDL compliance
5. Connect activities to authentic municipal administration practice

SPECIFIC REQUIREMENTS:
- Activity types: readings, case studies, simulations, discussions, media creation
- Real Canadian municipal examples and scenarios
- Progressive complexity building from basic to advanced
- Collaborative and individual learning opportunities
- Integration with assessment strategy from assessment-specialist
- Accessibility and inclusive design principles

DELIVERABLES TO INCLUDE:
- Activity design framework with learning theory rationale
- Scaffolded activity progressions for each learning outcome
- Multi-modal activity templates and specifications
- Engagement strategies and motivation techniques
- UDL compliance guidelines for activities

CRITICAL: You MUST respond with ONLY valid JSON. Use this format:
{
  "analysis": "Analysis of Phase A framework and activity design needs",
  "recommendations": ["Activity design strategy recommendations"],
  "output": "Comprehensive activity design framework and specifications",
  "qualityAssessment": {
    "score": 0.85,
    "strengths": ["Activity design strengths"],
    "improvements": ["Activity design improvements needed"]
  },
  "nextSteps": ["Implementation steps for activity framework"]
}`;

      case 'lms-integrator':
        return `${baseContext}

ROLE: LMS Integration Specialist - D2L Brightspace Optimization

TASK: Optimize activities and assessments for D2L Brightspace platform based on Phase A foundations and Phase B designs.

FOCUS AREAS:
1. D2L Brightspace specific implementation strategies
2. SCORM/xAPI compliance for interactive content
3. Mobile-responsive design and accessibility optimization
4. H5P integration for interactive activities
5. Grade passback and analytics configuration

SPECIFIC REQUIREMENTS:
- D2L Brightspace Creator+ features and limitations
- WCAG 2.1 AA accessibility standards
- Mobile optimization for diverse devices
- SCORM packaging for portable content
- Learning analytics and progress tracking
- Integration with Saskatchewan Polytechnic systems

DELIVERABLES TO INCLUDE:
- D2L Brightspace implementation guide
- SCORM/H5P packaging specifications
- Accessibility compliance checklist
- Mobile optimization requirements
- Analytics and reporting configuration
- Platform-specific best practices

CRITICAL: You MUST respond with ONLY valid JSON. Use this format:
{
  "analysis": "Analysis of LMS requirements and optimization opportunities",
  "recommendations": ["Platform optimization recommendations"],
  "output": "Comprehensive LMS integration and optimization plan",
  "qualityAssessment": {
    "score": 0.85,
    "strengths": ["LMS integration strengths"],
    "improvements": ["Platform optimization improvements needed"]
  },
  "nextSteps": ["Implementation steps for LMS optimization"]
}`;

      default:
        // Fallback to generic Phase B prompt
        return `${baseContext}

ROLE: ${agent.name} - Phase B Activity Design Contributor

TASK: Contribute to activity design based on your expertise and Phase A educational foundations.

FOCUS: Apply your specialized knowledge to enhance the activity design process.

CRITICAL: You MUST respond with ONLY valid JSON. Use this format:
{
  "analysis": "Your Phase B analysis",
  "recommendations": ["Your recommendations for activity design"],
  "output": "Your specialized contribution to activity design",
  "qualityAssessment": {
    "score": 0.85,
    "strengths": ["Identified strengths"],
    "improvements": ["Suggested improvements"]
  },
  "nextSteps": ["Implementation steps"]
}`;
    }
  }

  async validateAgentOutput(response, agent, context) {
    try {
      // Parse JSON response
      let parsedOutput;
      try {
        // Clean the response content before parsing
        let cleanContent = response.content.trim();
        
        // Remove any markdown code blocks if present
        cleanContent = cleanContent.replace(/```json\s*|\s*```/g, '');
        
        // Try to extract JSON from the response if it's wrapped in other text
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanContent = jsonMatch[0];
        }
        
        parsedOutput = JSON.parse(cleanContent);
      } catch (parseError) {
        console.log('JSON parsing failed, using enhanced fallback:', parseError.message);
        console.log('Original content:', response.content.substring(0, 200) + '...');
        
        // Enhanced fallback - try to extract meaningful content
        const content = response.content;
        const lines = content.split('\n').filter(line => line.trim());
        
        parsedOutput = {
          analysis: this.extractSection(content, ['analysis', 'overview', 'summary']) || content.substring(0, 500),
          recommendations: this.extractRecommendations(content),
          output: content,
          qualityAssessment: { 
            score: 0.6, 
            strengths: this.extractStrengths(content), 
            improvements: ['Response format needs improvement', 'JSON structure not followed'] 
          },
          nextSteps: this.extractNextSteps(content)
        };
      }

      // Validate required fields
      const validation = {
        hasAnalysis: !!parsedOutput.analysis,
        hasRecommendations: Array.isArray(parsedOutput.recommendations),
        hasOutput: !!parsedOutput.output,
        hasQualityAssessment: !!parsedOutput.qualityAssessment,
        contentLength: (parsedOutput.output || '').length,
        recommendationCount: (parsedOutput.recommendations || []).length
      };

      // Calculate quality score
      let qualityScore = 0.5; // Base score
      
      if (validation.hasAnalysis) qualityScore += 0.1;
      if (validation.hasRecommendations && validation.recommendationCount > 0) qualityScore += 0.1;
      if (validation.hasOutput && validation.contentLength > 100) qualityScore += 0.2;
      if (validation.hasQualityAssessment) qualityScore += 0.1;
      
      // Use agent's self-assessment if available
      if (parsedOutput.qualityAssessment?.score) {
        qualityScore = Math.max(qualityScore, parsedOutput.qualityAssessment.score);
      }

      return {
        content: parsedOutput,
        qualityScore: Math.min(1.0, qualityScore),
        validation: validation
      };

    } catch (error) {
      logger.logError(error, { agent: agent.name, operation: 'validate-agent-output' });
      
      return {
        content: { 
          analysis: response.content,
          output: response.content,
          error: 'Validation failed'
        },
        qualityScore: 0.3,
        validation: { error: error.message }
      };
    }
  }

  estimateCost(response, providerName) {
    // Rough cost estimation based on token usage
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    
    let costPer1kTokens = 0.01; // Default estimate
    
    if (providerName === 'openai') {
      costPer1kTokens = 0.03; // GPT-4 approximate cost
    } else if (providerName === 'claude') {
      costPer1kTokens = 0.015; // Claude approximate cost
    }
    
    return ((inputTokens + outputTokens) / 1000) * costPer1kTokens;
  }

  // Phase A specific method
  async executePhaseA(courseContent, userConfig = {}) {
    const phaseAAgents = ['instructional-designer', 'curriculum-architect', 'business-analyst'];
    const results = {};
    const errors = [];

    logger.info(`Starting Phase A execution with ${phaseAAgents.length} agents`);

    // Execute agents in parallel
    const agentPromises = phaseAAgents.map(async (agentName) => {
      try {
        const context = {
          courseId: courseContent.courseId,
          phase: 'A',
          inputData: { courseContent },
          processingHistory: [],
          qualityRequirements: config.get('qualityStandards'),
          userPreferences: userConfig
        };

        const result = await this.executeAgent(agentName, context);
        results[agentName] = result;
        return result;
      } catch (error) {
        logger.logError(error, { agent: agentName, phase: 'A' });
        errors.push({ agent: agentName, error: error.message });
        return null;
      }
    });

    await Promise.all(agentPromises);

    // Validate integration
    const integration = await this.validatePhaseAIntegration(results);

    return {
      agentResults: results,
      integration: integration,
      errors: errors,
      phase: 'A',
      completedAt: new Date().toISOString(),
      qualityScore: integration.overallQualityScore
    };
  }

  // Phase B specific method - Activity Design
  async executePhaseB(courseContent, phaseAResults, userConfig = {}) {
    const phaseBAgents = ['assessment-specialist', 'instructional-designer', 'lms-integrator'];
    const results = {};
    const errors = [];

    logger.info(`Starting Phase B execution with ${phaseBAgents.length} agents`);

    // Execute agents sequentially to build on each other's outputs
    for (const agentName of phaseBAgents) {
      try {
        const context = {
          courseId: courseContent.courseId,
          phase: 'B',
          inputData: { 
            courseContent, 
            phaseAResults,
            previousPhaseBResults: results
          },
          processingHistory: [phaseAResults],
          qualityRequirements: config.get('qualityStandards'),
          userPreferences: userConfig
        };

        const result = await this.executeAgent(agentName, context);
        results[agentName] = result;
        
        logger.info(`Phase B agent ${agentName} completed`, {
          qualityScore: result.metadata.qualityScore,
          duration: result.metadata.processingTime
        });
        
      } catch (error) {
        logger.logError(error, { agent: agentName, phase: 'B' });
        errors.push({ agent: agentName, error: error.message });
        // Continue with other agents even if one fails
      }
    }

    // Validate integration
    const integration = await this.validatePhaseBIntegration(results, phaseAResults);

    return {
      agentResults: results,
      integration: integration,
      errors: errors,
      phase: 'B',
      completedAt: new Date().toISOString(),
      qualityScore: integration.overallQualityScore,
      phaseAReference: phaseAResults.phase
    };
  }

  async validatePhaseAIntegration(results) {
    const agentNames = Object.keys(results);
    const validResults = agentNames.filter(name => results[name] !== null);
    
    if (validResults.length === 0) {
      return {
        overallQualityScore: 0,
        consistency: 0,
        completeness: 0,
        issues: ['No agents completed successfully'],
        recommendations: ['Check agent configurations and API keys']
      };
    }

    // Calculate integration metrics
    const qualityScores = validResults.map(name => results[name].metadata.qualityScore);
    const averageQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    
    const completeness = validResults.length / 3; // 3 expected agents
    const consistency = this.calculateConsistency(results);

    const overallScore = (averageQuality * 0.5) + (completeness * 0.3) + (consistency * 0.2);

    return {
      overallQualityScore: Math.round(overallScore * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      completeness: Math.round(completeness * 100) / 100,
      agentQualityScores: Object.fromEntries(
        validResults.map(name => [name, results[name].metadata.qualityScore])
      ),
      issues: this.identifyIntegrationIssues(results),
      recommendations: this.generateIntegrationRecommendations(results)
    };
  }

  calculateConsistency(results) {
    // Simple consistency check based on common themes
    const validResults = Object.values(results).filter(r => r !== null);
    if (validResults.length < 2) return 1.0;

    // This is a simplified consistency check
    // In a full implementation, you'd analyze content overlap and alignment
    return 0.85; // Placeholder
  }

  identifyIntegrationIssues(results) {
    const issues = [];
    const validResults = Object.keys(results).filter(name => results[name] !== null);
    
    if (validResults.length < 3) {
      issues.push(`Only ${validResults.length}/3 agents completed successfully`);
    }

    validResults.forEach(agentName => {
      const result = results[agentName];
      if (result.metadata.qualityScore < 0.8) {
        issues.push(`${agentName} quality score below threshold: ${result.metadata.qualityScore}`);
      }
    });

    return issues;
  }

  generateIntegrationRecommendations(results) {
    const recommendations = [];
    const validResults = Object.keys(results).filter(name => results[name] !== null);
    
    if (validResults.length < 3) {
      recommendations.push('Review failed agents and retry processing');
    }

    if (validResults.length > 0) {
      const avgQuality = validResults.reduce((sum, name) => 
        sum + results[name].metadata.qualityScore, 0) / validResults.length;
      
      if (avgQuality < 0.85) {
        recommendations.push('Consider refining input content or agent prompts');
      }
    }

    recommendations.push('Review agent outputs for educational alignment');
    recommendations.push('Validate accessibility compliance in recommendations');

    return recommendations;
  }

  // Phase B Integration Validation
  async validatePhaseBIntegration(results, phaseAResults) {
    const agentNames = Object.keys(results);
    const validResults = agentNames.filter(name => results[name] !== null);
    
    if (validResults.length === 0) {
      return {
        overallQualityScore: 0,
        consistency: 0,
        completeness: 0,
        activityDesignQuality: 0,
        assessmentAlignment: 0,
        lmsOptimization: 0,
        issues: ['No Phase B agents completed successfully'],
        recommendations: ['Check agent configurations and Phase A results', 'Verify assessment-specialist and lms-integrator availability']
      };
    }

    // Calculate Phase B specific metrics
    const qualityScores = validResults.map(name => results[name].metadata.qualityScore);
    const averageQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    
    const completeness = validResults.length / 3; // 3 expected Phase B agents
    const consistency = this.calculatePhaseBConsistency(results, phaseAResults);
    
    // Phase B specific quality metrics
    const activityDesignQuality = this.assessActivityDesignQuality(results);
    const assessmentAlignment = this.assessAssessmentAlignment(results, phaseAResults);
    const lmsOptimization = this.assessLMSOptimization(results);

    const overallScore = (averageQuality * 0.4) + (activityDesignQuality * 0.25) + 
                        (assessmentAlignment * 0.2) + (lmsOptimization * 0.15);

    return {
      overallQualityScore: Math.round(overallScore * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      completeness: Math.round(completeness * 100) / 100,
      activityDesignQuality: Math.round(activityDesignQuality * 100) / 100,
      assessmentAlignment: Math.round(assessmentAlignment * 100) / 100,
      lmsOptimization: Math.round(lmsOptimization * 100) / 100,
      agentQualityScores: Object.fromEntries(
        validResults.map(name => [name, results[name].metadata.qualityScore])
      ),
      issues: this.identifyPhaseBIssues(results, phaseAResults),
      recommendations: this.generatePhaseBRecommendations(results, phaseAResults)
    };
  }

  calculatePhaseBConsistency(results, phaseAResults) {
    const validResults = Object.values(results).filter(r => r !== null);
    if (validResults.length < 2) return 1.0;
    
    // Check if Phase B builds consistently on Phase A foundations
    // This is a simplified check - in full implementation would analyze content alignment
    return 0.88; // Placeholder for Phase B consistency
  }

  assessActivityDesignQuality(results) {
    // Assess the quality of activity design from instructional-designer in Phase B context
    const instructionalResult = results['instructional-designer'];
    if (!instructionalResult) return 0.6;
    
    const output = instructionalResult.output;
    let score = 0.6; // Base score
    
    // Check for activity design elements
    if (output.recommendations && output.recommendations.length > 0) score += 0.1;
    if (output.analysis && output.analysis.includes('activity')) score += 0.1;
    if (output.output && output.output.length > 200) score += 0.2; // Substantial content
    
    return Math.min(1.0, score);
  }

  assessAssessmentAlignment(results, phaseAResults) {
    // Assess how well assessment-specialist output aligns with Phase A foundations
    const assessmentResult = results['assessment-specialist'];
    if (!assessmentResult) return 0.5;
    
    const output = assessmentResult.output;
    let score = 0.5; // Base score
    
    // Check for assessment design elements
    if (output.recommendations && output.recommendations.some(r => r.includes('assessment'))) score += 0.15;
    if (output.analysis && output.analysis.includes('learning outcome')) score += 0.15;
    if (output.qualityAssessment && output.qualityAssessment.score > 0.8) score += 0.2;
    
    return Math.min(1.0, score);
  }

  assessLMSOptimization(results) {
    // Assess LMS integration and optimization quality
    const lmsResult = results['lms-integrator'];
    if (!lmsResult) return 0.5;
    
    const output = lmsResult.output;
    let score = 0.5; // Base score
    
    // Check for LMS optimization elements
    if (output.recommendations && output.recommendations.some(r => r.includes('LMS') || r.includes('Brightspace'))) score += 0.15;
    if (output.analysis && (output.analysis.includes('accessibility') || output.analysis.includes('mobile'))) score += 0.15;
    if (output.output && output.output.includes('SCORM')) score += 0.2;
    
    return Math.min(1.0, score);
  }

  identifyPhaseBIssues(results, phaseAResults) {
    const issues = [];
    const validResults = Object.keys(results).filter(name => results[name] !== null);
    
    if (validResults.length < 3) {
      issues.push(`Only ${validResults.length}/3 Phase B agents completed successfully`);
    }

    if (!results['assessment-specialist']) {
      issues.push('Assessment-specialist failed - assessment design may be incomplete');
    }

    if (!results['lms-integrator']) {
      issues.push('LMS-integrator failed - platform optimization missing');
    }

    validResults.forEach(agentName => {
      const result = results[agentName];
      if (result.metadata.qualityScore < 0.75) {
        issues.push(`${agentName} Phase B quality score below threshold: ${result.metadata.qualityScore}`);
      }
    });

    return issues;
  }

  generatePhaseBRecommendations(results, phaseAResults) {
    const recommendations = [];
    const validResults = Object.keys(results).filter(name => results[name] !== null);
    
    if (validResults.length < 3) {
      recommendations.push('Review failed Phase B agents and verify Phase A integration');
    }

    if (!results['assessment-specialist']) {
      recommendations.push('Retry assessment-specialist with simplified context or use fallback assessment templates');
    }

    if (!results['lms-integrator']) {
      recommendations.push('Implement basic LMS optimization or manual platform configuration');
    }

    if (validResults.length > 0) {
      const avgQuality = validResults.reduce((sum, name) => 
        sum + results[name].metadata.qualityScore, 0) / validResults.length;
      
      if (avgQuality < 0.80) {
        recommendations.push('Consider enhancing Phase B agent prompts or providing more detailed Phase A context');
      }
    }

    recommendations.push('Review activity design alignment with learning outcomes');
    recommendations.push('Validate assessment strategies against course objectives');
    recommendations.push('Ensure LMS optimization meets accessibility standards');

    return recommendations;
  }

  // Helper methods for content extraction when JSON parsing fails
  extractSection(content, keywords) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (keywords.some(keyword => line.includes(keyword))) {
        // Found a section, extract the next few lines
        const sectionLines = [];
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          if (lines[j].trim() && !lines[j].match(/^[A-Z\s]+:$/)) {
            sectionLines.push(lines[j].trim());
          } else if (sectionLines.length > 0) {
            break;
          }
        }
        return sectionLines.join(' ');
      }
    }
    return null;
  }

  extractRecommendations(content) {
    const recommendations = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
        const rec = trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
        if (rec.length > 10) {
          recommendations.push(rec);
        }
      }
    }
    
    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  extractStrengths(content) {
    const strengths = [];
    const strengthKeywords = ['strength', 'good', 'excellent', 'effective', 'well', 'strong'];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (strengthKeywords.some(keyword => lower.includes(keyword))) {
        strengths.push(line.trim());
      }
    }
    
    return strengths.slice(0, 3);
  }

  extractNextSteps(content) {
    const steps = [];
    const stepKeywords = ['next', 'step', 'action', 'implement', 'proceed'];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (stepKeywords.some(keyword => lower.includes(keyword))) {
        steps.push(line.trim());
      }
    }
    
    return steps.slice(0, 3);
  }
}

// LLM Provider Classes
class OpenAIProvider {
  constructor(client) {
    this.client = client;
    this.name = 'openai';
  }

  async process(agent, prompt, options = {}) {
    const model = agent.model || 'gpt-4';
    const temperature = options.temperature || config.get('llmProviders.openai.temperature') || 0.7;
    const maxTokens = options.maxTokens || config.get('llmProviders.openai.maxTokens') || 4000;

    try {
      const response = await this.client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: agent.systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      });

      return {
        content: response.choices[0].message.content,
        usage: response.usage,
        model: model,
        provider: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.logError(error, { provider: this.name, model, operation: 'llm-request' });
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}

class ClaudeProvider {
  constructor(client) {
    this.client = client;
    this.name = 'claude';
  }

  async process(agent, prompt, options = {}) {
    const model = agent.model || 'claude-3-sonnet-20240229';
    const temperature = options.temperature || config.get('llmProviders.claude.temperature') || 0.7;
    const maxTokens = options.maxTokens || config.get('llmProviders.claude.maxTokens') || 4000;

    console.log('Claude process called with client:', this.client ? 'Present' : 'Missing');
    console.log('Client messages property:', this.client && this.client.messages ? 'Present' : 'Missing');

    try {
      if (!this.client) {
        throw new Error('Claude client is not initialized');
      }

      if (!this.client.messages || typeof this.client.messages.create !== 'function') {
        throw new Error('Claude client messages.create method is not available');
      }

      const response = await this.client.messages.create({
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        system: agent.systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      // Handle different response formats
      let content = '';
      if (response.content && Array.isArray(response.content)) {
        content = response.content[0]?.text || '';
      } else if (response.content && typeof response.content === 'string') {
        content = response.content;
      } else {
        throw new Error('Unexpected response format from Claude API');
      }

      return {
        content: content,
        usage: response.usage || { input_tokens: 0, output_tokens: 0 },
        model: model,
        provider: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Claude API error details:', error);
      logger.logError(error, { provider: this.name, model, operation: 'llm-request' });
      throw new Error(`Claude API error: ${error.message}`);
    }
  }
}

module.exports = AgentService;