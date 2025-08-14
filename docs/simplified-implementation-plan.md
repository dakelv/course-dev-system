# Simplified Implementation Plan - Proof of Concept

## Overview
This simplified approach focuses on proving the core AI curriculum design concept without Docker or databases. The goal is to validate that AI agents can successfully transform course materials into quality educational blueprints and HTML learning objects.

## Architecture - File-Based System

### Project Structure
```
/curriculum-system/
├── /agents/                    # Existing agent definitions (unchanged)
├── /docs/                      # All implementation specifications
├── /course-data/               # File-based data storage
│   └── /MUNI-201/             # Sample course for testing
│       ├── /uploads/          # Original documents (16-21 files)
│       ├── /processed/        # Extracted content (JSON files)
│       ├── /phase-a-results/  # Agent outputs from Phase A
│       └── /final-output/     # Generated HTML learning objects
├── /src/                      # Core application code
│   ├── document-processor.js  # Extract content from PDF/Word/PPT
│   ├── agent-service.js       # Load agents and execute with LLMs
│   ├── blueprint-generator.js # Orchestrate the complete process
│   ├── html-generator.js      # Create HTML learning objects
│   └── config.js             # Configuration management
├── /utils/                    # Helper utilities
│   ├── file-manager.js        # File operations and organization
│   ├── logger.js             # Simple logging system
│   └── validator.js          # Quality validation functions
├── package.json               # Node.js dependencies
├── .env.example              # Environment variable template
├── process-course.js         # Main entry point script
└── CLAUDE.md                 # Project context (stays in root)
```

## Core Components

### 1. Document Processor (`src/document-processor.js`)

**Purpose**: Extract structured content from uploaded course materials

**Key Functions:**
```javascript
class DocumentProcessor {
  async processUploadedFiles(courseId, uploadsPath) {
    // 1. Scan uploads folder for PDF, DOCX, PPTX files
    // 2. Extract content using appropriate parsers
    // 3. Structure content for AI processing
    // 4. Save processed content as JSON files
    // 5. Return structured course content
  }
  
  async extractPDFContent(filePath) {
    // Use pdf-parse or similar library
    // Extract text, structure, metadata
  }
  
  async extractWordContent(filePath) {
    // Use mammoth.js for DOCX files
    // Extract text, headings, tables
  }
  
  async extractPowerPointContent(filePath) {
    // Use officegen or similar for PPTX
    // Extract slide content, notes, structure
  }
}
```

**Dependencies:**
- `pdf-parse` for PDF extraction
- `mammoth` for Word document processing
- `yauzl` for PowerPoint extraction
- `fs-extra` for file operations

### 2. Agent Service (`src/agent-service.js`)

**Purpose**: Load educational agents and execute them with LLM APIs

**Key Functions:**
```javascript
class AgentService {
  constructor() {
    this.agents = new Map();
    this.llmProviders = {
      openai: new OpenAIProvider(),
      claude: new ClaudeProvider()
    };
  }
  
  async loadAgents(agentsPath) {
    // Load agent definitions from /agents folder
    // Parse markdown files and extract system prompts
    // Store agent configurations
  }
  
  async executeAgent(agentName, context, userConfig) {
    // 1. Get agent definition
    // 2. Prepare context and prompt
    // 3. Call appropriate LLM provider
    // 4. Validate output quality
    // 5. Save results to file
    // 6. Return structured output
  }
  
  async executePhaseA(courseContent, userConfig) {
    // Execute 3 agents in parallel:
    // - instructional-designer
    // - curriculum-architect  
    // - business-analyst
    // Validate integration and return combined results
  }
}
```

**LLM Provider Integration:**
```javascript
class OpenAIProvider {
  async process(agent, context) {
    const response = await openai.chat.completions.create({
      model: agent.model || 'gpt-4',
      messages: [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: this.buildPrompt(context) }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });
    return this.parseResponse(response);
  }
}
```

### 3. Blueprint Generator (`src/blueprint-generator.js`)

**Purpose**: Orchestrate the complete curriculum design process

**Key Functions:**
```javascript
class BlueprintGenerator {
  async generateCourseBlueprint(courseId) {
    // 1. Process uploaded documents
    const courseContent = await this.documentProcessor.processUploadedFiles(courseId);
    
    // 2. Execute Phase A agents
    const phaseAResults = await this.agentService.executePhaseA(courseContent, this.config);
    
    // 3. Validate Phase A integration
    const validation = await this.validatePhaseA(phaseAResults);
    
    // 4. Generate HTML learning objects
    const htmlObjects = await this.htmlGenerator.generateLearningObjects(phaseAResults);
    
    // 5. Create final blueprint package
    return this.createFinalPackage(courseContent, phaseAResults, htmlObjects);
  }
  
  async validatePhaseA(results) {
    // Check consistency between agent outputs
    // Validate educational alignment
    // Calculate overall quality score
  }
}
```

### 4. HTML Generator (`src/html-generator.js`)

**Purpose**: Create HTML learning objects ready for cmp-doc-converter

**Key Functions:**
```javascript
class HTMLGenerator {
  async generateLearningObjects(phaseAResults) {
    // 1. Extract learning objectives from curriculum architect output
    // 2. Create HTML structure for each learning objective
    // 3. Apply instructional design framework
    // 4. Ensure WCAG 2.1 AA compliance
    // 5. Generate cmp-doc-converter compatible format
  }
  
  createLearningObjectHTML(objective, content, framework) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title data-lo-id="${objective.id}">${objective.title}</title>
        <meta name="lo-estimated-time" content="${objective.estimatedTime}">
        <meta name="lo-difficulty" content="${objective.difficulty}">
        <style>
            /* WCAG 2.1 AA compliant CSS */
            /* Responsive design */
            /* CMP-doc-converter optimized styles */
        </style>
    </head>
    <body class="learning-object">
        <!-- Structured content ready for CMP processing -->
    </body>
    </html>`;
  }
}
```

## Configuration Management

### Environment Variables (`.env`)
```bash
# LLM API Configuration
OPENAI_API_KEY=your_openai_key_here
CLAUDE_API_KEY=your_claude_key_here

# Processing Configuration
DEFAULT_LLM_PROVIDER=openai
MAX_PROCESSING_TIME=300000
QUALITY_THRESHOLD=0.85

# File Paths
COURSE_DATA_PATH=./course-data
AGENTS_PATH=./agents
OUTPUT_PATH=./course-data/{courseId}/final-output

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/curriculum-system.log
```

### User Configuration (`config.json`)
```json
{
  "llmProviders": {
    "openai": {
      "defaultModel": "gpt-4",
      "temperature": 0.7,
      "maxTokens": 4000
    },
    "claude": {
      "defaultModel": "claude-3-sonnet",
      "temperature": 0.7,
      "maxTokens": 4000
    }
  },
  "agentModelMapping": {
    "instructional-designer": "gpt-4",
    "curriculum-architect": "claude-3-sonnet",
    "business-analyst": "gpt-4"
  },
  "qualityStandards": {
    "minimumScore": 0.85,
    "accessibilityCompliance": "WCAG_2.1_AA"
  },
  "outputFormat": {
    "htmlTemplate": "cmp-doc-converter-ready",
    "includeMetadata": true,
    "generatePreview": true
  }
}
```

## Implementation Timeline

### Week 1: Core Infrastructure
**Days 1-2: Project Setup**
- Initialize Node.js project with dependencies
- Create folder structure
- Set up environment configuration
- Create sample MUNI-201 data structure

**Days 3-5: Document Processing**
- Implement PDF content extraction
- Implement Word document processing
- Implement PowerPoint content extraction
- Test with MUNI-201 sample documents

**Days 6-7: Agent Loading System**
- Parse agent definitions from `/agents` folder
- Create agent execution framework
- Test agent loading with existing agents

### Week 2: AI Integration & Processing
**Days 8-10: LLM Provider Integration**
- Implement OpenAI API integration
- Implement Claude API integration
- Create provider abstraction layer
- Test with simple agent execution

**Days 11-12: Phase A Agent Execution**
- Implement instructional-designer agent execution
- Implement curriculum-architect agent execution
- Implement business-analyst agent execution
- Create parallel processing coordination

**Days 13-14: Output Validation & Integration**
- Implement quality validation system
- Create agent output integration logic
- Test Phase A end-to-end processing

### Week 3: HTML Generation & Testing
**Days 15-17: HTML Learning Object Generation**
- Create HTML template system
- Implement WCAG 2.1 AA compliance
- Generate cmp-doc-converter compatible format
- Test HTML output quality

**Days 18-19: End-to-End Testing**
- Process complete MUNI-201 course
- Validate output quality and structure
- Performance testing and optimization
- Error handling and logging

**Days 20-21: Integration & Documentation**
- Create simple n8n webhook integration
- Document usage and configuration
- Create demo and validation materials
- Prepare for stakeholder review

## Usage Instructions

### Basic Usage
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Prepare course materials
mkdir -p course-data/MUNI-201/uploads
# Copy course documents to uploads folder

# 4. Process course
node process-course.js MUNI-201

# 5. Review results
ls course-data/MUNI-201/final-output/
```

### Advanced Usage
```bash
# Process with specific configuration
node process-course.js MUNI-201 --config custom-config.json

# Process only Phase A
node process-course.js MUNI-201 --phase A

# Generate detailed logs
node process-course.js MUNI-201 --verbose

# Validate existing results
node validate-course.js MUNI-201
```

## Success Criteria

### Functional Requirements
- ✅ Process MUNI-201 course materials (16-21 documents)
- ✅ Execute Phase A agents successfully
- ✅ Generate 5+ HTML learning objects
- ✅ Achieve 85%+ quality validation score
- ✅ Complete processing in < 10 minutes
- ✅ Stay under $10 LLM API costs

### Technical Requirements
- ✅ WCAG 2.1 AA compliant HTML output
- ✅ CMP-doc-converter compatible format
- ✅ Error handling and recovery
- ✅ Comprehensive logging
- ✅ Configuration flexibility

### Quality Requirements
- ✅ Educational alignment validation
- ✅ Content completeness verification
- ✅ Accessibility compliance checking
- ✅ Performance benchmarking

## Migration Path to Full System

Once the simplified system is proven:

1. **Database Integration**: Replace file storage with PostgreSQL
2. **Docker Containerization**: Package for consistent deployment
3. **Phase B & C Agents**: Add remaining agent phases
4. **Human Review Interface**: Build web-based review system
5. **Concurrent Processing**: Support multiple courses
6. **Advanced Monitoring**: Add performance analytics
7. **Production Deployment**: Scale for institutional use

## Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    "yauzl": "^2.10.0",
    "openai": "^4.20.1",
    "@anthropic-ai/sdk": "^0.9.1",
    "fs-extra": "^11.1.1",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0",
    "joi": "^17.11.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.0.1",
    "eslint": "^8.54.0"
  }
}
```

### System Requirements
- **Node.js**: 18+ (for modern JavaScript features)
- **Memory**: 4GB RAM (for document processing and LLM responses)
- **Storage**: 10GB (for course materials and outputs)
- **Network**: Stable internet (for LLM API calls)

---
**Implementation Status**: ✅ Simplified plan ready for development  
**Next Phase**: Week 1 development kickoff with MUNI-201 testing