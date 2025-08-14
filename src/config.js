const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

class ConfigManager {
  constructor() {
    this.config = null;
    this.loadConfig();
  }

  loadConfig() {
    try {
      // Load base configuration
      const configPath = path.join(process.cwd(), 'config.json');
      this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Override with environment variables
      this.config.apiKeys = {
        openai: process.env.OPENAI_API_KEY,
        claude: process.env.CLAUDE_API_KEY
      };

      this.config.paths = {
        courseData: process.env.COURSE_DATA_PATH || './course-data',
        agents: process.env.AGENTS_PATH || './agents',
        logs: './logs'
      };

      this.config.processing.qualityThreshold = parseFloat(process.env.QUALITY_THRESHOLD) || 0.85;
      this.config.processing.maxProcessingTime = parseInt(process.env.MAX_PROCESSING_TIME) || 300000;

      // Web search configuration
      this.config.search = {
        enabled: !!process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY !== 'your_tavily_api_key_here',
        provider: 'tavily',
        apiKey: process.env.TAVILY_API_KEY,
        defaultOptions: {
          maxResults: 5,
          depth: 'basic',
          includeDomains: ['canada.ca', 'gc.ca', 'cbc.ca', 'ctv.ca', 'fcm.ca', 'ipac.ca']
        }
      };

      console.log('Configuration loaded successfully');
    } catch (error) {
      console.error('Failed to load configuration:', error.message);
      throw new Error('Configuration loading failed');
    }
  }

  get(key) {
    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  validateApiKeys() {
    const errors = [];

    if (!this.config.apiKeys.openai) {
      errors.push('OPENAI_API_KEY is required');
    }

    if (!this.config.apiKeys.claude) {
      errors.push('CLAUDE_API_KEY is required');
    }

    if (errors.length > 0) {
      throw new Error(`API key validation failed: ${errors.join(', ')}`);
    }

    return true;
  }

  getAgentModel(agentName) {
    return this.config.agentModelMapping[agentName] || this.config.llmProviders.openai.defaultModel;
  }

  getLLMConfig(provider) {
    return this.config.llmProviders[provider];
  }
}

module.exports = new ConfigManager();