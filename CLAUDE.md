# AI Curriculum Design System - Project Context

## Project Overview
Building an AI-powered curriculum design system for post-secondary institutions with two main phases:

### Phase 1: Blueprint Generation
- **Input**: Course materials (ebooks, PowerPoint, Word docs, approved syllabus with learning outcomes)
- **Process**: AI analysis and curriculum design using educational best practices
- **Output**: Comprehensive blueprint with learning activities, assessments, and structure

### Phase 2: Activity Generation & LMS Integration  
- **Input**: Approved blueprint + original course materials
- **Process**: Automated generation of LMS-ready learning activities
- **Output**: Complete course content ready for deployment

## Technical Assessment
- **Feasibility**: ✅ Highly feasible with current AI capabilities
- **Timeline**: MVP in 2-3 months, full system in 6-12 months
- **Approach**: Multi-modal AI + structured prompting + template engine + quality assurance

## Specialized Educational Agents Created
Located in `/home/hu/.claude/agents/`:

1. **instructional-designer.md** 🎓
   - Learning theory expert (Bloom's taxonomy, ADDIE, backward design)
   - Adult learning principles and cognitive load theory
   - Pedagogical framework specialist

2. **curriculum-architect.md** 📚
   - Course structure and learning pathway design
   - Competency mapping and standards compliance
   - Modular design and prerequisite analysis

3. **assessment-specialist.md** 📊
   - Formative/summative assessment design
   - Rubric creation and authentic assessment
   - Learning analytics and evaluation strategies

4. **lms-integrator.md** 🔗
   - Platform integration (Canvas, Moodle, D2L, Blackboard)
   - SCORM/xAPI standards and API automation
   - Accessibility compliance and mobile optimization

## Agent Workflow Strategy
Designed pipeline: instructional-designer → curriculum-architect → assessment-specialist → lms-integrator

## Next Development Areas
- System architecture planning
- Document processing pipeline design
- Blueprint template creation
- LMS integration testing

## Project Status
✅ Educational agents designed and implemented
✅ Sample documents analyzed (MUNI-201 course package)
✅ Process understanding complete (SME → ID → Media → Course Production workflow)
✅ Technical architecture designed and documented
⏳ Ready for component-level detailed design

## Discovery Questions Prepared
**Input Materials & Processing:**
1. Document formats and typical volumes
2. Syllabus structure and learning outcomes format
3. Course material characteristics and subject coverage
4. Institutional standards and accreditation requirements

## Context Notes
- Project located at: `/home/hu/projects/my-project/course-dev-system/`
- Educational domain expertise now available via specialized agents
- Sample documents analyzed: MUNI-201 complete course package
- System architecture documented in `system-architecture.md`
- Technical stack: IIS frontend + n8n backend + Python document processing
- Processing volume: 1 syllabus + 5-10 PowerPoint/PDFs + 10 Word docs per course

## Current Session Progress (2025-08-06)
✅ **Option 3 Selected**: Technical Architecture Planning
✅ **Requirements Gathered**: 
  - Single-course processing focus
  - Sequential + parallel AI agent workflow
  - Human review checkpoints between phases
  - Dual output format (JSON + Markdown)
  - IIS server frontend with n8n processing backend
✅ **Architecture Document Created**: Complete system design with 5 core components
✅ **Component Design Completed**:
  - Context Manager Implementation (orchestration backbone)
  - Document Processing Pipeline (16-21 files per course)
  - Educational Agent Integration - Phase A (foundation agents)
  - Human Review Interface Design (3 checkpoint validation system)
  - Content & Design Agent Integration - Phase B (content/UX agents)
  - Technical Integration - Phase C (simplified HTML output approach)
  - n8n Workflow Specifications (complete orchestration workflows)
  - AI Agent Service Architecture (LLM integration and processing engine)
  - Implementation Roadmap (24-week development plan)

✅ **Key Design Decisions**:
  - 11 specialized agents working in coordinated phases
  - Simplified Phase C: HTML output + cmp-doc-converter integration (no direct Brightspace APIs)
  - Multi-LLM support with user-configurable API keys (OpenAI, Claude, local models)
  - Preview/download interface for generated learning objects
  - WCAG 2.1 AA compliance throughout
  - n8n webhook integration: https://learningtechnologies.app.n8n.cloud/webhook-test/course-dev-system

✅ **Architecture Complete**: Full system design from document upload to HTML learning object generation

✅ **Implementation Ready**: 
  - MVP definition (8 weeks): Single course processing with Phase A agents
  - 3-phase development plan (24 weeks total)
  - Technology stack decisions (Node.js, TypeScript, PostgreSQL, Redis, Docker)
  - Resource requirements and cost estimates
  - Risk management and success metrics

✅ **Simplified Implementation Started**: 
  - Decision made: File-based approach without Docker/databases for proof-of-concept
  - 3-week timeline: Week 1 (foundation) → Week 2 (AI agents) → Week 3 (HTML generation)
  - Clean project organization: /docs folder for all specs, agents and course-data preserved

✅ **Week 1 Implementation Complete**:
  - Complete project structure with package.json, configuration, and CLI
  - Document processing system (PDF, Word, PowerPoint extraction)
  - File management and logging systems
  - Test environment setup with MUNI-201 sample course
  - Configuration management with .env and JSON config
  - CLI interface: `node process-course.js MUNI-201`

⏳ **Current Status**: Week 1 foundation complete, ready for Week 2 AI agent integration
⏳ **Next Phase**: AI Agent Service implementation with LLM integration (OpenAI, Claude)

## ⚠️ Development Protocol
**IMPORTANT**: When performing todos, do one at a time. Ask for permission to move to next before taking any actions. Long sessions are risky as they have the potential of losing all work previously done.

**Process**: Complete → Validate → Request Permission → Proceed