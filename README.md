# AI Curriculum Design System - Simplified Implementation

A proof-of-concept AI-powered curriculum design system that transforms course materials into structured educational blueprints and HTML learning objects.

## 🎯 Project Goals

- **Automate curriculum design** using AI agents with educational expertise
- **Process course materials** (PDFs, Word docs, PowerPoints) into structured content
- **Generate HTML learning objects** ready for LMS deployment via cmp-doc-converter
- **Maintain educational quality** with built-in validation and review processes

## 🏗️ Architecture Overview

This simplified implementation uses a **file-based approach** without Docker or databases:

```
/curriculum-system/
├── /agents/                    # 11 specialized AI agents
├── /course-data/               # File-based data storage
│   └── /MUNI-201/             # Sample course for testing
├── /src/                      # Core application code
├── /utils/                    # Helper utilities
├── /docs/                     # Complete system documentation
└── process-course.js          # Main entry point
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Clone and setup
git clone <repository>
cd curriculum-system

# Install dependencies
npm install

# Setup test environment
node setup-test.js

# Configure API keys
cp .env.example .env
# Edit .env and add your OpenAI and Claude API keys
```

### 2. Prepare Course Materials

```bash
# Add your course files to the uploads directory
cp your-course-files/* course-data/MUNI-201/uploads/

# Supported formats: PDF, DOCX, DOC, PPTX, PPT
# Expected: 16-21 documents (1 syllabus + 5-10 presentations + 10 word docs)
```

### 3. Process Course

```bash
# Basic processing
node process-course.js MUNI-201

# With verbose logging
node process-course.js MUNI-201 --verbose

# Validate results
node validate-course.js MUNI-201

# View results
ls course-data/MUNI-201/final-output/
```

## 📋 Current Implementation Status

### ✅ Completed (Week 1)
- **Project Structure**: Complete file-based architecture
- **Configuration Management**: Environment variables and JSON config
- **Document Processing**: PDF, Word, PowerPoint content extraction
- **Logging System**: Comprehensive logging with Winston
- **File Management**: Organized course data handling
- **CLI Interface**: Command-line processing with options

### ✅ Completed (Week 2)
- **AI Agent Service**: Multi-LLM integration (OpenAI, Claude)
- **Phase A Agents**: Instructional Designer, Curriculum Architect, Business Analyst
- **Blueprint Generator**: Complete course blueprint creation
- **Quality Validation**: Educational alignment and content quality checks
- **Validation System**: Comprehensive course processing validation

### 📅 Planned (Week 3)
- **HTML Generation**: Learning object creation with WCAG 2.1 AA compliance
- **CMP-Doc-Converter Integration**: Output formatting for Brightspace
- **End-to-End Testing**: Complete MUNI-201 processing validation

## 🔧 Configuration

### Environment Variables (.env)
```bash
# LLM API Keys
OPENAI_API_KEY=your_openai_key_here
CLAUDE_API_KEY=your_claude_key_here

# Processing Settings
DEFAULT_LLM_PROVIDER=openai
QUALITY_THRESHOLD=0.85
MAX_PROCESSING_TIME=300000

# Paths
COURSE_DATA_PATH=./course-data
AGENTS_PATH=./agents
```

### Agent Model Mapping (config.json)
```json
{
  "agentModelMapping": {
    "instructional-designer": "gpt-4",
    "curriculum-architect": "claude-3-sonnet-20240229",
    "business-analyst": "gpt-4"
  }
}
```

## 📊 Expected Output

After processing, you'll find:

```
course-data/MUNI-201/
├── processed/
│   └── course-content.json     # Extracted and structured content
├── phase-a-results/
│   ├── instructional-designer.json
│   ├── curriculum-architect.json
│   └── business-analyst.json
└── final-output/
    ├── learning-objects/       # HTML files ready for CMP
    ├── course-blueprint.json   # Complete course design
    └── course-blueprint.md     # Human-readable summary
```

## 🎓 Educational Agents

The system uses 11 specialized AI agents (Phase A implemented first):

### Phase A - Educational Foundation
- **Instructional Designer**: Pedagogical frameworks, learning theory application
- **Curriculum Architect**: Course structure, competency mapping, standards compliance  
- **Business Analyst**: Resource planning, timeline analysis, feasibility assessment

### Phase B - Content & Design (Future)
- **Assessment Specialist**: Evaluation strategies, rubric design
- **UI/UX Designer**: Learning experience design, accessibility
- **Content Marketer**: Engagement optimization, learner motivation

### Phase C - Technical Integration (Future)
- **LMS Integrator**: HTML generation, CMP-doc-converter formatting
- **API Documenter**: Technical specifications, integration guides
- **Docs Architect**: Comprehensive documentation creation

## 🧪 Testing

```bash
# Run with sample data
node process-course.js MUNI-201 --verbose

# Validate results
node validate-course.js MUNI-201

# Run tests (when implemented)
npm test
```

## 📈 Success Criteria

### MVP Goals (3 weeks)
- ✅ Process MUNI-201 course materials (16-21 documents)
- 🚧 Execute Phase A agents successfully  
- 📅 Generate 5+ HTML learning objects
- 📅 Achieve 85%+ quality validation score
- 📅 Complete processing in < 10 minutes
- 📅 Stay under $10 LLM API costs

## 🔄 Migration Path

Once proven, this system can be upgraded to:

1. **Database Integration**: Replace file storage with PostgreSQL
2. **Docker Containerization**: Package for consistent deployment  
3. **Phase B & C Agents**: Add remaining agent phases
4. **Human Review Interface**: Build web-based review system
5. **Concurrent Processing**: Support multiple courses
6. **Production Deployment**: Scale for institutional use

## 📚 Documentation

Complete system documentation is available in the `/docs` folder:

- **[Simplified Implementation Plan](docs/simplified-implementation-plan.md)** - Current approach
- **[System Architecture](docs/system-architecture.md)** - Overall design
- **[AI Agent Service](docs/ai-agent-service-architecture.md)** - LLM integration details
- **[Implementation Roadmap](docs/implementation-roadmap.md)** - Full system development plan

## 🤝 Contributing

This is a proof-of-concept for Saskatchewan Polytechnic. For questions or issues:

1. Check the logs: `./logs/combined.log`
2. Review documentation in `/docs`
3. Test with sample data first
4. Validate API keys and configuration

## 📄 License

MIT License - See LICENSE file for details.

---

**Status**: Week 1 Complete - Document processing and project structure ready  
**Next**: Week 2 - AI agent integration and LLM processing