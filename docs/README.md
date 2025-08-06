# AI Curriculum Design System - Documentation

This folder contains all implementation specifications and design documents for the AI Curriculum Design System.

## Document Organization

### Core Architecture
- **[system-architecture.md](system-architecture.md)** - Overall system design with 11 agents and 3 phases
- **[context-manager-implementation.md](context-manager-implementation.md)** - Orchestration backbone and memory management
- **[ai-agent-service-architecture.md](ai-agent-service-architecture.md)** - LLM integration and AI processing engine

### Processing Pipeline
- **[document-processing-pipeline.md](document-processing-pipeline.md)** - 16-21 file processing system
- **[educational-agent-integration.md](educational-agent-integration.md)** - Phase A: Foundation agents workflow
- **[content-design-agent-integration.md](content-design-agent-integration.md)** - Phase B: Content/UX agents workflow
- **[technical-integration-phase-c.md](technical-integration-phase-c.md)** - Phase C: HTML output generation

### User Interface & Integration
- **[human-review-interface-design.md](human-review-interface-design.md)** - 3-checkpoint validation system
- **[n8n-workflow-specifications.md](n8n-workflow-specifications.md)** - Complete orchestration workflows

### Implementation Plans
- **[implementation-roadmap.md](implementation-roadmap.md)** - 24-week full system development plan
- **[simplified-implementation-plan.md](simplified-implementation-plan.md)** - 3-week proof-of-concept plan (recommended)

## Implementation Approach

**Current Recommendation**: Start with the **Simplified Implementation Plan** for a 3-week proof-of-concept that validates the core AI curriculum design process without infrastructure complexity.

**Migration Path**: Once proven, upgrade to the full system using the comprehensive Implementation Roadmap.

## Key Features

- **11 Specialized AI Agents** working in coordinated phases
- **Multi-LLM Support** (OpenAI, Claude, local models)
- **Human Review Checkpoints** for quality assurance
- **HTML Learning Object Generation** ready for cmp-doc-converter
- **WCAG 2.1 AA Compliance** throughout the system

## Quick Start

For immediate development, see:
1. **[simplified-implementation-plan.md](simplified-implementation-plan.md)** - File-based proof-of-concept
2. **[ai-agent-service-architecture.md](ai-agent-service-architecture.md)** - LLM integration details

---
**Status**: Complete system design ready for implementation  
**Next Phase**: Development kickoff with simplified approach