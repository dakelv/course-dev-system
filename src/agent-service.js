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