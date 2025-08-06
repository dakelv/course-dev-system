# n8n Workflow Specifications

## Overview
This document defines the complete n8n workflow architecture for the AI Curriculum Design System, providing executable specifications for orchestrating the 11-agent curriculum design process from document intake to HTML learning object generation.

## Master Orchestration Workflow

### Main Workflow: Course Development Pipeline

**Workflow Name:** `course-development-master`
**Trigger:** HTTP Request from IIS frontend
**Description:** Orchestrates the complete 3-phase curriculum development process

```json
{
  "workflow_structure": {
    "trigger": {
      "type": "webhook",
      "method": "POST",
      "path": "/course-development/start",
      "authentication": "api_key"
    },
    "nodes": [
      {
        "name": "Initialize Course Project",
        "type": "function",
        "parameters": {
          "course_id": "{{ $json.course_id }}",
          "course_title": "{{ $json.course_title }}",
          "uploaded_files": "{{ $json.files }}"
        }
      },
      {
        "name": "Document Processing Workflow",
        "type": "execute_workflow",
        "workflow": "document-processing-pipeline",
        "wait_for_completion": true
      },
      {
        "name": "Phase A - Educational Foundation",
        "type": "execute_workflow", 
        "workflow": "phase-a-educational-agents",
        "wait_for_completion": true
      },
      {
        "name": "Human Review Checkpoint 1",
        "type": "execute_workflow",
        "workflow": "human-review-checkpoint",
        "parameters": {
          "checkpoint_phase": "A",
          "review_type": "educational_foundation"
        }
      },
      {
        "name": "Phase B - Content & Design",
        "type": "execute_workflow",
        "workflow": "phase-b-content-design-agents",
        "wait_for_completion": true,
        "condition": "{{ $node['Human Review Checkpoint 1'].json.status === 'approved' }}"
      },
      {
        "name": "Human Review Checkpoint 2", 
        "type": "execute_workflow",
        "workflow": "human-review-checkpoint",
        "parameters": {
          "checkpoint_phase": "B",
          "review_type": "content_experience"
        }
      },
      {
        "name": "Phase C - Technical Integration",
        "type": "execute_workflow",
        "workflow": "phase-c-technical-integration",
        "wait_for_completion": true,
        "condition": "{{ $node['Human Review Checkpoint 2'].json.status === 'approved' }}"
      },
      {
        "name": "Human Review Checkpoint 3",
        "type": "execute_workflow", 
        "workflow": "human-review-checkpoint",
        "parameters": {
          "checkpoint_phase": "C",
          "review_type": "technical_implementation"
        }
      },
      {
        "name": "Generate Final Package",
        "type": "execute_workflow",
        "workflow": "final-package-generation",
        "condition": "{{ $node['Human Review Checkpoint 3'].json.status === 'approved' }}"
      }
    ]
  }
}
```

## Document Processing Workflow

### Workflow: Document Processing Pipeline

**Workflow Name:** `document-processing-pipeline`
**Purpose:** Process 16-21 course documents and extract structured content

```json
{
  "workflow_structure": {
    "trigger": {
      "type": "workflow_trigger",
      "parameters": {
        "course_id": "string",
        "file_list": "array"
      }
    },
    "nodes": [
      {
        "name": "Validate Documents",
        "type": "function",
        "code": "// Validate file formats, sizes, and security\nconst validFiles = [];\nconst invalidFiles = [];\n\nfor (const file of $input.all()[0].json.file_list) {\n  if (validateFile(file)) {\n    validFiles.push(file);\n  } else {\n    invalidFiles.push(file);\n  }\n}\n\nreturn [{\n  json: {\n    valid_files: validFiles,\n    invalid_files: invalidFiles,\n    validation_status: invalidFiles.length === 0 ? 'passed' : 'failed'\n  }\n}];"
      },
      {
        "name": "Extract PDF Content",
        "type": "http_request",
        "method": "POST",
        "url": "http://document-processor:3000/extract/pdf",
        "body": {
          "files": "{{ $node['Validate Documents'].json.valid_files.filter(f => f.type === 'pdf') }}"
        },
        "condition": "{{ $node['Validate Documents'].json.validation_status === 'passed' }}"
      },
      {
        "name": "Extract Word Content",
        "type": "http_request", 
        "method": "POST",
        "url": "http://document-processor:3000/extract/word",
        "body": {
          "files": "{{ $node['Validate Documents'].json.valid_files.filter(f => ['docx', 'doc'].includes(f.type)) }}"
        }
      },
      {
        "name": "Extract PowerPoint Content",
        "type": "http_request",
        "method": "POST", 
        "url": "http://document-processor:3000/extract/powerpoint",
        "body": {
          "files": "{{ $node['Validate Documents'].json.valid_files.filter(f => ['pptx', 'ppt'].includes(f.type)) }}"
        }
      },
      {
        "name": "Merge Extracted Content",
        "type": "function",
        "code": "// Combine all extracted content into structured format\nconst pdfContent = $node['Extract PDF Content'].json;\nconst wordContent = $node['Extract Word Content'].json;\nconst pptContent = $node['Extract PowerPoint Content'].json;\n\nconst structuredContent = {\n  course_package: {\n    metadata: {\n      course_id: $input.all()[0].json.course_id,\n      processing_timestamp: new Date().toISOString(),\n      document_count: pdfContent.length + wordContent.length + pptContent.length\n    },\n    syllabus: extractSyllabus(pdfContent, wordContent),\n    content_modules: extractModules(pdfContent, wordContent, pptContent),\n    supporting_materials: extractSupportingMaterials(pdfContent, wordContent, pptContent)\n  }\n};\n\nreturn [{ json: structuredContent }];"
      },
      {
        "name": "Store in Context Manager",
        "type": "http_request",
        "method": "POST",
        "url": "http://context-manager:3000/context/store",
        "body": {
          "course_id": "{{ $input.all()[0].json.course_id }}",
          "phase": "document_processing",
          "content": "{{ $node['Merge Extracted Content'].json }}"
        }
      },
      {
        "name": "Notify Processing Complete",
        "type": "http_request",
        "method": "POST", 
        "url": "http://iis-frontend:80/api/processing-status",
        "body": {
          "course_id": "{{ $input.all()[0].json.course_id }}",
          "status": "document_processing_complete",
          "next_phase": "phase_a_ready"
        }
      }
    ]
  }
}
```

## Phase A: Educational Foundation Workflow

### Workflow: Phase A Educational Agents

**Workflow Name:** `phase-a-educational-agents`
**Purpose:** Parallel processing by Instructional Designer, Curriculum Architect, and Business Analyst

```json
{
  "workflow_structure": {
    "trigger": {
      "type": "workflow_trigger",
      "parameters": {
        "course_id": "string"
      }
    },
    "nodes": [
      {
        "name": "Get Course Context",
        "type": "http_request",
        "method": "GET",
        "url": "http://context-manager:3000/context/{{ $json.course_id }}/document_processing"
      },
      {
        "name": "Prepare Agent Contexts",
        "type": "function",
        "code": "// Generate agent-specific context packages\nconst courseContent = $node['Get Course Context'].json;\n\nconst instructionalDesignerContext = {\n  agent: 'instructional_designer',\n  context_package: {\n    course_materials: courseContent.course_package,\n    institutional_context: {\n      institution: 'Saskatchewan Polytechnic',\n      course_level: 'post_secondary',\n      delivery_mode: 'online',\n      target_audience: 'adult_learners'\n    },\n    pedagogical_constraints: {\n      credit_hours: 3,\n      course_duration: '15_weeks',\n      accessibility_requirements: 'WCAG_2.1_AA'\n    }\n  }\n};\n\nconst curriculumArchitectContext = {\n  agent: 'curriculum_architect',\n  context_package: {\n    course_structure: courseContent.course_package,\n    institutional_standards: {\n      accreditation_requirements: [],\n      quality_standards: {},\n      program_level_outcomes: []\n    }\n  }\n};\n\nconst businessAnalystContext = {\n  agent: 'business_analyst', \n  context_package: {\n    project_parameters: {\n      development_timeline: {},\n      resource_constraints: {},\n      stakeholder_requirements: []\n    }\n  }\n};\n\nreturn [{\n  json: {\n    instructional_designer: instructionalDesignerContext,\n    curriculum_architect: curriculumArchitectContext,\n    business_analyst: businessAnalystContext\n  }\n}];"
      },
      {
        "name": "Instructional Designer Agent",
        "type": "http_request",
        "method": "POST",
        "url": "http://ai-agents:3000/agents/instructional-designer/process",
        "body": "{{ $node['Prepare Agent Contexts'].json.instructional_designer }}"
      },
      {
        "name": "Curriculum Architect Agent", 
        "type": "http_request",
        "method": "POST",
        "url": "http://ai-agents:3000/agents/curriculum-architect/process", 
        "body": "{{ $node['Prepare Agent Contexts'].json.curriculum_architect }}"
      },
      {
        "name": "Business Analyst Agent",
        "type": "http_request",
        "method": "POST",
        "url": "http://ai-agents:3000/agents/business-analyst/process",
        "body": "{{ $node['Prepare Agent Contexts'].json.business_analyst }}"
      },
      {
        "name": "Validate Agent Outputs",
        "type": "function",
        "code": "// Validate consistency between agent outputs\nconst instructionalOutput = $node['Instructional Designer Agent'].json;\nconst curriculumOutput = $node['Curriculum Architect Agent'].json;\nconst businessOutput = $node['Business Analyst Agent'].json;\n\nconst validation = {\n  consistency_analysis: {\n    pedagogical_alignment: validatePedagogicalAlignment(instructionalOutput, curriculumOutput),\n    structural_compatibility: validateStructuralCompatibility(curriculumOutput, businessOutput),\n    resource_feasibility: validateResourceFeasibility(businessOutput, instructionalOutput)\n  },\n  overall_quality_score: calculateOverallQuality(instructionalOutput, curriculumOutput, businessOutput)\n};\n\nreturn [{\n  json: {\n    agent_outputs: {\n      instructional_designer: instructionalOutput,\n      curriculum_architect: curriculumOutput, \n      business_analyst: businessOutput\n    },\n    validation_results: validation,\n    phase_a_status: validation.overall_quality_score > 0.85 ? 'ready_for_review' : 'needs_revision'\n  }\n}];"
      },
      {
        "name": "Store Phase A Results",
        "type": "http_request",
        "method": "POST",
        "url": "http://context-manager:3000/context/store",
        "body": {
          "course_id": "{{ $input.all()[0].json.course_id }}",
          "phase": "phase_a",
          "content": "{{ $node['Validate Agent Outputs'].json }}"
        }
      }
    ]
  }
}
```

## Human Review Checkpoint Workflow

### Workflow: Human Review Checkpoint

**Workflow Name:** `human-review-checkpoint`
**Purpose:** Manage human review process with notifications and approval tracking

```json
{
  "workflow_structure": {
    "trigger": {
      "type": "workflow_trigger",
      "parameters": {
        "course_id": "string",
        "checkpoint_phase": "A|B|C",
        "review_type": "string"
      }
    },
    "nodes": [
      {
        "name": "Get Phase Results",
        "type": "http_request",
        "method": "GET", 
        "url": "http://context-manager:3000/context/{{ $json.course_id }}/{{ $json.checkpoint_phase.toLowerCase() }}"
      },
      {
        "name": "Prepare Review Package",
        "type": "function",
        "code": "// Generate review package for human reviewers\nconst phaseResults = $node['Get Phase Results'].json;\nconst reviewPhase = $input.all()[0].json.checkpoint_phase;\n\nconst reviewPackage = {\n  review_checkpoint: `phase_${reviewPhase.toLowerCase()}`,\n  course_id: $input.all()[0].json.course_id,\n  review_type: $input.all()[0].json.review_type,\n  agent_outputs: phaseResults.agent_outputs,\n  validation_results: phaseResults.validation_results,\n  review_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours\n  review_status: 'pending'\n};\n\nreturn [{ json: reviewPackage }];"
      },
      {
        "name": "Create Review Record",
        "type": "http_request",
        "method": "POST",
        "url": "http://review-system:3000/reviews/create",
        "body": "{{ $node['Prepare Review Package'].json }}"
      },
      {
        "name": "Notify Reviewers",
        "type": "http_request",
        "method": "POST",
        "url": "http://notification-service:3000/notify/reviewers",
        "body": {
          "review_id": "{{ $node['Create Review Record'].json.review_id }}",
          "course_title": "{{ $node['Get Phase Results'].json.course_info.title }}",
          "phase": "{{ $json.checkpoint_phase }}",
          "deadline": "{{ $node['Prepare Review Package'].json.review_deadline }}"
        }
      },
      {
        "name": "Wait for Review Decision",
        "type": "wait",
        "resume_webhook": "http://n8n:5678/webhook/review-decision/{{ $node['Create Review Record'].json.review_id }}",
        "timeout": "48h"
      },
      {
        "name": "Process Review Decision",
        "type": "function",
        "code": "// Process the review decision and determine next steps\nconst reviewDecision = $node['Wait for Review Decision'].json;\n\nlet nextAction;\nswitch(reviewDecision.decision) {\n  case 'approved':\n    nextAction = 'proceed_to_next_phase';\n    break;\n  case 'revision_required':\n    nextAction = 'return_for_revision';\n    break;\n  case 'rejected':\n    nextAction = 'halt_process';\n    break;\n  default:\n    nextAction = 'escalate_review';\n}\n\nreturn [{\n  json: {\n    review_id: reviewDecision.review_id,\n    decision: reviewDecision.decision,\n    reviewer_comments: reviewDecision.comments,\n    required_changes: reviewDecision.required_changes || [],\n    next_action: nextAction,\n    status: reviewDecision.decision\n  }\n}];"
      },
      {
        "name": "Update Context Manager",
        "type": "http_request",
        "method": "POST",
        "url": "http://context-manager:3000/context/update-review",
        "body": {
          "course_id": "{{ $input.all()[0].json.course_id }}",
          "phase": "{{ $json.checkpoint_phase }}",
          "review_result": "{{ $node['Process Review Decision'].json }}"
        }
      }
    ]
  }
}
```

## Phase B: Content & Design Workflow

### Workflow: Phase B Content & Design Agents

**Workflow Name:** `phase-b-content-design-agents`
**Purpose:** Parallel processing by Assessment Specialist, UI/UX Designer, and Content Marketer

```json
{
  "workflow_structure": {
    "trigger": {
      "type": "workflow_trigger",
      "parameters": {
        "course_id": "string"
      }
    },
    "nodes": [
      {
        "name": "Get Phase A Results",
        "type": "http_request",
        "method": "GET",
        "url": "http://context-manager:3000/context/{{ $json.course_id }}/phase_a"
      },
      {
        "name": "Prepare Phase B Contexts",
        "type": "function",
        "code": "// Generate Phase B agent contexts from Phase A results\nconst phaseAResults = $node['Get Phase A Results'].json;\n\nconst assessmentSpecialistContext = {\n  agent: 'assessment_specialist',\n  context_package: {\n    educational_foundation: phaseAResults.agent_outputs.instructional_designer.output.pedagogical_framework,\n    course_structure: phaseAResults.agent_outputs.curriculum_architect.output.course_blueprint,\n    assessment_requirements: {\n      formative_percentage: '60%',\n      summative_percentage: '40%',\n      accessibility_requirements: 'WCAG_2.1_AA'\n    }\n  }\n};\n\nconst uiUxDesignerContext = {\n  agent: 'ui_ux_designer',\n  context_package: {\n    learning_framework: phaseAResults.agent_outputs.instructional_designer.output.learning_design,\n    course_structure: phaseAResults.agent_outputs.curriculum_architect.output.course_blueprint,\n    design_constraints: {\n      lms_platform: 'brightspace',\n      responsive_design_requirements: true,\n      accessibility_requirements: 'WCAG_2.1_AA'\n    }\n  }\n};\n\nconst contentMarketerContext = {\n  agent: 'content_marketer',\n  context_package: {\n    educational_context: phaseAResults.agent_outputs.instructional_designer.output,\n    audience_analysis: phaseAResults.agent_outputs.business_analyst.output.resource_analysis,\n    engagement_objectives: {\n      completion_rate_target: 0.85,\n      satisfaction_target: 0.90\n    }\n  }\n};\n\nreturn [{\n  json: {\n    assessment_specialist: assessmentSpecialistContext,\n    ui_ux_designer: uiUxDesignerContext,\n    content_marketer: contentMarketerContext\n  }\n}];"
      },
      {
        "name": "Assessment Specialist Agent",
        "type": "http_request",
        "method": "POST",
        "url": "http://ai-agents:3000/agents/assessment-specialist/process",
        "body": "{{ $node['Prepare Phase B Contexts'].json.assessment_specialist }}"
      },
      {
        "name": "UI/UX Designer Agent",
        "type": "http_request", 
        "method": "POST",
        "url": "http://ai-agents:3000/agents/ui-ux-designer/process",
        "body": "{{ $node['Prepare Phase B Contexts'].json.ui_ux_designer }}"
      },
      {
        "name": "Content Marketer Agent",
        "type": "http_request",
        "method": "POST", 
        "url": "http://ai-agents:3000/agents/content-marketer/process",
        "body": "{{ $node['Prepare Phase B Contexts'].json.content_marketer }}"
      },
      {
        "name": "Validate Phase B Integration",
        "type": "function",
        "code": "// Validate cross-agent alignment for Phase B\nconst assessmentOutput = $node['Assessment Specialist Agent'].json;\nconst uxOutput = $node['UI/UX Designer Agent'].json;\nconst marketingOutput = $node['Content Marketer Agent'].json;\n\nconst integration = {\n  content_alignment: validateContentAlignment(assessmentOutput, uxOutput, marketingOutput),\n  ux_consistency: validateUXConsistency(assessmentOutput, uxOutput, marketingOutput),\n  engagement_coherence: validateEngagementCoherence(uxOutput, marketingOutput),\n  overall_integration_score: calculateIntegrationScore(assessmentOutput, uxOutput, marketingOutput)\n};\n\nreturn [{\n  json: {\n    agent_outputs: {\n      assessment_specialist: assessmentOutput,\n      ui_ux_designer: uxOutput,\n      content_marketer: marketingOutput\n    },\n    integration_validation: integration,\n    phase_b_status: integration.overall_integration_score > 0.90 ? 'ready_for_review' : 'needs_revision'\n  }\n}];"
      },
      {
        "name": "Store Phase B Results",
        "type": "http_request",
        "method": "POST",
        "url": "http://context-manager:3000/context/store",
        "body": {
          "course_id": "{{ $input.all()[0].json.course_id }}",
          "phase": "phase_b",
          "content": "{{ $node['Validate Phase B Integration'].json }}"
        }
      }
    ]
  }
}
```

## Phase C: Technical Integration Workflow

### Workflow: Phase C Technical Integration

**Workflow Name:** `phase-c-technical-integration`
**Purpose:** Sequential processing for HTML generation, documentation, and package creation

```json
{
  "workflow_structure": {
    "trigger": {
      "type": "workflow_trigger",
      "parameters": {
        "course_id": "string"
      }
    },
    "nodes": [
      {
        "name": "Get Phase B Results",
        "type": "http_request",
        "method": "GET",
        "url": "http://context-manager:3000/context/{{ $json.course_id }}/phase_b"
      },
      {
        "name": "LMS Content Generator",
        "type": "http_request",
        "method": "POST",
        "url": "http://ai-agents:3000/agents/lms-content-generator/process",
        "body": {
          "agent": "lms_content_generator",
          "context_package": {
            "content_specifications": "{{ $node['Get Phase B Results'].json.agent_outputs }}",
            "output_requirements": {
              "html_structure_standards": {},
              "cmp_doc_converter_compatibility": true,
              "accessibility_requirements": "WCAG_2.1_AA"
            }
          }
        }
      },
      {
        "name": "Generate HTML Learning Objects",
        "type": "http_request",
        "method": "POST",
        "url": "http://html-generator:3000/generate/learning-objects",
        "body": {
          "course_id": "{{ $json.course_id }}",
          "content_specifications": "{{ $node['LMS Content Generator'].json.output }}",
          "format": "cmp_doc_converter_ready"
        }
      },
      {
        "name": "API Documenter Agent",
        "type": "http_request",
        "method": "POST",
        "url": "http://ai-agents:3000/agents/api-documenter/process",
        "body": {
          "agent": "api_documenter",
          "context_package": {
            "html_structure": "{{ $node['Generate HTML Learning Objects'].json.html_structure }}",
            "integration_requirements": {
              "cmp_doc_converter_specs": {},
              "file_naming_conventions": {},
              "metadata_requirements": {}
            }
          }
        }
      },
      {
        "name": "Docs Architect Agent",
        "type": "http_request",
        "method": "POST",
        "url": "http://ai-agents:3000/agents/docs-architect/process",
        "body": {
          "agent": "docs_architect",
          "context_package": {
            "complete_system_context": {
              "phase_a_results": "{{ $node['Get Phase B Results'].json.phase_a_foundation }}",
              "phase_b_results": "{{ $node['Get Phase B Results'].json }}",
              "phase_c_results": "{{ $node['LMS Content Generator'].json }}"
            },
            "technical_documentation": "{{ $node['API Documenter Agent'].json.output }}"
          }
        }
      },
      {
        "name": "Create Preview Interface",
        "type": "http_request",
        "method": "POST",
        "url": "http://preview-service:3000/create-preview",
        "body": {
          "course_id": "{{ $json.course_id }}",
          "learning_objects": "{{ $node['Generate HTML Learning Objects'].json.learning_objects }}",
          "preview_options": ["desktop", "tablet", "mobile", "accessibility"]
        }
      },
      {
        "name": "Generate Download Packages",
        "type": "http_request",
        "method": "POST",
        "url": "http://package-service:3000/create-packages",
        "body": {
          "course_id": "{{ $json.course_id }}",
          "learning_objects": "{{ $node['Generate HTML Learning Objects'].json.learning_objects }}",
          "documentation": "{{ $node['Docs Architect Agent'].json.output }}",
          "package_types": ["individual_los", "complete_course", "cmp_converter_ready"]
        }
      },
      {
        "name": "Validate Phase C Output",
        "type": "function",
        "code": "// Validate final output quality and completeness\nconst htmlObjects = $node['Generate HTML Learning Objects'].json;\nconst documentation = $node['Docs Architect Agent'].json;\nconst packages = $node['Generate Download Packages'].json;\n\nconst validation = {\n  html_quality: {\n    wcag_compliance: validateWCAGCompliance(htmlObjects.learning_objects),\n    performance_score: validatePerformance(htmlObjects.learning_objects),\n    cmp_compatibility: validateCMPCompatibility(htmlObjects.learning_objects)\n  },\n  documentation_completeness: validateDocumentationCompleteness(documentation),\n  package_integrity: validatePackageIntegrity(packages),\n  overall_quality_score: calculateOverallQuality(htmlObjects, documentation, packages)\n};\n\nreturn [{\n  json: {\n    phase_c_outputs: {\n      html_learning_objects: htmlObjects,\n      technical_documentation: documentation,\n      download_packages: packages,\n      preview_interface: $node['Create Preview Interface'].json\n    },\n    validation_results: validation,\n    phase_c_status: validation.overall_quality_score > 0.95 ? 'ready_for_review' : 'needs_revision'\n  }\n}];"
      },
      {
        "name": "Store Phase C Results",
        "type": "http_request",
        "method": "POST",
        "url": "http://context-manager:3000/context/store",
        "body": {
          "course_id": "{{ $json.course_id }}",
          "phase": "phase_c",
          "content": "{{ $node['Validate Phase C Output'].json }}"
        }
      }
    ]
  }
}
```

## Final Package Generation Workflow

### Workflow: Final Package Generation

**Workflow Name:** `final-package-generation`
**Purpose:** Create final deliverable package after all approvals

```json
{
  "workflow_structure": {
    "trigger": {
      "type": "workflow_trigger",
      "parameters": {
        "course_id": "string"
      }
    },
    "nodes": [
      {
        "name": "Get Complete Course Context",
        "type": "http_request",
        "method": "GET",
        "url": "http://context-manager:3000/context/{{ $json.course_id }}/complete"
      },
      {
        "name": "Generate Course Blueprint",
        "type": "function",
        "code": "// Generate final course blueprint in JSON and Markdown formats\nconst completeContext = $node['Get Complete Course Context'].json;\n\nconst courseBlueprint = {\n  course_info: completeContext.course_info,\n  educational_foundation: completeContext.phase_a.agent_outputs,\n  content_design: completeContext.phase_b.agent_outputs,\n  technical_implementation: completeContext.phase_c.phase_c_outputs,\n  quality_metrics: {\n    overall_quality_score: calculateOverallQuality(completeContext),\n    accessibility_compliance: completeContext.phase_c.validation_results.html_quality.wcag_compliance,\n    educational_alignment: completeContext.phase_b.integration_validation.content_alignment\n  },\n  deployment_ready: true\n};\n\nreturn [{ json: { course_blueprint: courseBlueprint } }];"
      },
      {
        "name": "Create Markdown Blueprint",
        "type": "http_request",
        "method": "POST",
        "url": "http://document-generator:3000/generate/markdown",
        "body": {
          "course_blueprint": "{{ $node['Generate Course Blueprint'].json.course_blueprint }}",\n          "format": "human_readable"\n        }\n      },\n      {\n        "name": "Package All Deliverables",\n        "type": "http_request",\n        "method": "POST",\n        "url": "http://package-service:3000/create-final-package",\n        "body": {\n          "course_id": "{{ $json.course_id }}",\n          "course_blueprint_json": "{{ $node['Generate Course Blueprint'].json.course_blueprint }}",\n          "course_blueprint_markdown": "{{ $node['Create Markdown Blueprint'].json.markdown_content }}",\n          "html_learning_objects": "{{ $node['Get Complete Course Context'].json.phase_c.phase_c_outputs.html_learning_objects }}",\n          "technical_documentation": "{{ $node['Get Complete Course Context'].json.phase_c.phase_c_outputs.technical_documentation }}",\n          "preview_interface": "{{ $node['Get Complete Course Context'].json.phase_c.phase_c_outputs.preview_interface }}"\n        }\n      },\n      {\n        "name": "Update IIS Frontend",\n        "type": "http_request",\n        "method": "POST",\n        "url": "http://iis-frontend:80/api/course-completion",\n        "body": {\n          "course_id": "{{ $json.course_id }}",\n          "status": "completed",\n          "final_package_url": "{{ $node['Package All Deliverables'].json.package_url }}",\n          "preview_url": "{{ $node['Get Complete Course Context'].json.phase_c.phase_c_outputs.preview_interface.preview_url }}",\n          "download_options": "{{ $node['Package All Deliverables'].json.download_options }}"\n        }\n      },\n      {\n        "name": "Send Completion Notification",\n        "type": "http_request",\n        "method": "POST",\n        "url": "http://notification-service:3000/notify/completion",\n        "body": {\n          "course_id": "{{ $json.course_id }}",\n          "course_title": "{{ $node['Get Complete Course Context'].json.course_info.title }}",\n          "completion_time": "{{ new Date().toISOString() }}",\n          "package_url": "{{ $node['Package All Deliverables'].json.package_url }}",\n          "quality_score": "{{ $node['Generate Course Blueprint'].json.course_blueprint.quality_metrics.overall_quality_score }}"\n        }\n      }\n    ]\n  }\n}\n```\n\n## Error Handling and Recovery Workflows\n\n### Workflow: Error Recovery\n\n**Workflow Name:** `error-recovery-handler`\n**Purpose:** Handle failures and implement recovery strategies\n\n```json\n{\n  "workflow_structure": {\n    "trigger": {\n      "type": "error_trigger",\n      "parameters": {\n        "source_workflow": "string",\n        "error_type": "string",\n        "course_id": "string"\n      }\n    },\n    "nodes": [\n      {\n        "name": "Analyze Error",\n        "type": "function",\n        "code": "// Analyze error type and determine recovery strategy\nconst errorInfo = $input.all()[0].json;\n\nlet recoveryStrategy;\nswitch(errorInfo.error_type) {\n  case 'agent_timeout':\n    recoveryStrategy = 'retry_with_extended_timeout';\n    break;\n  case 'context_corruption':\n    recoveryStrategy = 'restore_from_backup';\n    break;\n  case 'validation_failure':\n    recoveryStrategy = 'manual_intervention_required';\n    break;\n  case 'resource_unavailable':\n    recoveryStrategy = 'queue_for_retry';\n    break;\n  default:\n    recoveryStrategy = 'escalate_to_admin';\n}\n\nreturn [{\n  json: {\n    error_analysis: errorInfo,\n    recovery_strategy: recoveryStrategy,\n    retry_count: errorInfo.retry_count || 0\n  }\n}];"\n      },\n      {\n        "name": "Execute Recovery Strategy",\n        "type": "switch",\n        "rules": [\n          {\n            "condition": "{{ $node['Analyze Error'].json.recovery_strategy === 'retry_with_extended_timeout' }}",\n            "output": 0\n          },\n          {\n            "condition": "{{ $node['Analyze Error'].json.recovery_strategy === 'restore_from_backup' }}",\n            "output": 1\n          },\n          {\n            "condition": "{{ $node['Analyze Error'].json.recovery_strategy === 'manual_intervention_required' }}",\n            "output": 2\n          }\n        ]\n      },\n      {\n        "name": "Retry with Extended Timeout",\n        "type": "execute_workflow",\n        "workflow": "{{ $input.all()[0].json.source_workflow }}",\n        "parameters": {\n          "course_id": "{{ $input.all()[0].json.course_id }}",\n          "retry_attempt": true,\n          "extended_timeout": true\n        }\n      },\n      {\n        "name": "Restore from Backup",\n        "type": "http_request",\n        "method": "POST",\n        "url": "http://context-manager:3000/context/restore",\n        "body": {\n          "course_id": "{{ $input.all()[0].json.course_id }}",\n          "restore_point": "last_known_good"\n        }\n      },\n      {\n        "name": "Request Manual Intervention",\n        "type": "http_request",\n        "method": "POST",\n        "url": "http://notification-service:3000/notify/admin",\n        "body": {\n          "alert_type": "manual_intervention_required",\n          "course_id": "{{ $input.all()[0].json.course_id }}",\n          "error_details": "{{ $node['Analyze Error'].json.error_analysis }}",\n          "priority": "high"\n        }\n      }\n    ]\n  }\n}\n```\n\n## Performance Monitoring Workflow\n\n### Workflow: Performance Monitor\n\n**Workflow Name:** `performance-monitor`\n**Purpose:** Monitor system performance and generate analytics\n\n```json\n{\n  "workflow_structure": {\n    "trigger": {\n      "type": "schedule",\n      "cron": "0 */15 * * * *"\n    },\n    "nodes": [\n      {\n        "name": "Collect Performance Metrics",\n        "type": "http_request",\n        "method": "GET",\n        "url": "http://context-manager:3000/metrics/performance"\n      },\n      {\n        "name": "Analyze System Health",\n        "type": "function",\n        "code": "// Analyze system performance and identify issues\nconst metrics = $node['Collect Performance Metrics'].json;\n\nconst analysis = {\n  processing_times: {\n    average_document_processing: calculateAverage(metrics.document_processing_times),\n    average_phase_a_time: calculateAverage(metrics.phase_a_times),\n    average_phase_b_time: calculateAverage(metrics.phase_b_times),\n    average_phase_c_time: calculateAverage(metrics.phase_c_times)\n  },\n  quality_metrics: {\n    average_quality_score: calculateAverage(metrics.quality_scores),\n    accessibility_compliance_rate: calculateComplianceRate(metrics.accessibility_scores),\n    human_review_approval_rate: calculateApprovalRate(metrics.review_decisions)\n  },\n  system_health: {\n    error_rate: calculateErrorRate(metrics.errors),\n    resource_utilization: metrics.resource_usage,\n    bottlenecks: identifyBottlenecks(metrics)\n  }\n};\n\nreturn [{ json: analysis }];"\n      },\n      {\n        "name": "Generate Performance Report",\n        "type": "http_request",\n        "method": "POST",\n        "url": "http://reporting-service:3000/generate/performance-report",\n        "body": "{{ $node['Analyze System Health'].json }}"\n      },\n      {\n        "name": "Check for Alerts",\n        "type": "function",\n        "code": "// Check if any metrics exceed alert thresholds\nconst analysis = $node['Analyze System Health'].json;\nconst alerts = [];\n\nif (analysis.processing_times.average_document_processing > 300) {\n  alerts.push({\n    type: 'performance_degradation',\n    metric: 'document_processing_time',\n    value: analysis.processing_times.average_document_processing,\n    threshold: 300\n  });\n}\n\nif (analysis.quality_metrics.average_quality_score < 0.85) {\n  alerts.push({\n    type: 'quality_degradation',\n    metric: 'average_quality_score',\n    value: analysis.quality_metrics.average_quality_score,\n    threshold: 0.85\n  });\n}\n\nif (analysis.system_health.error_rate > 0.05) {\n  alerts.push({\n    type: 'high_error_rate',\n    metric: 'error_rate',\n    value: analysis.system_health.error_rate,\n    threshold: 0.05\n  });\n}\n\nreturn [{ json: { alerts: alerts, alert_count: alerts.length } }];"\n      },\n      {\n        "name": "Send Alerts",\n        "type": "http_request",\n        "method": "POST",\n        "url": "http://notification-service:3000/notify/alerts",\n        "body": "{{ $node['Check for Alerts'].json }}",\n        "condition": "{{ $node['Check for Alerts'].json.alert_count > 0 }}"\n      }\n    ]\n  }\n}\n```\n\n## Deployment Configuration\n\n### n8n Environment Setup\n\n**Docker Compose Configuration:**\n```yaml\nversion: '3.8'\nservices:\n  n8n:\n    image: n8nio/n8n:latest\n    ports:\n      - "5678:5678"\n    environment:\n      - N8N_BASIC_AUTH_ACTIVE=true\n      - N8N_BASIC_AUTH_USER=admin\n      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}\n      - N8N_HOST=n8n.curriculum-system.local\n      - N8N_PROTOCOL=https\n      - NODE_ENV=production\n    volumes:\n      - n8n_data:/home/node/.n8n\n      - ./workflows:/home/node/.n8n/workflows\n    networks:\n      - curriculum-network\n\n  context-manager:\n    image: curriculum-system/context-manager:latest\n    ports:\n      - "3000:3000"\n    environment:\n      - DATABASE_URL=${CONTEXT_DB_URL}\n      - REDIS_URL=${REDIS_URL}\n    networks:\n      - curriculum-network\n\n  ai-agents:\n    image: curriculum-system/ai-agents:latest\n    ports:\n      - "3001:3000"\n    environment:\n      - OPENAI_API_KEY=${OPENAI_API_KEY}\n      - CLAUDE_API_KEY=${CLAUDE_API_KEY}\n    networks:\n      - curriculum-network\n\nvolumes:\n  n8n_data:\n\nnetworks:\n  curriculum-network:\n    driver: bridge\n```\n\n### Workflow Import Scripts\n\n**Workflow Deployment Script:**\n```bash\n#!/bin/bash\n# deploy-workflows.sh\n\nN8N_API_URL="http://localhost:5678/api/v1"\nN8N_AUTH="admin:${N8N_PASSWORD}"\n\n# Import all workflow files\nfor workflow_file in workflows/*.json; do\n  echo "Importing $(basename $workflow_file)..."\n  curl -X POST \\\n    -H "Content-Type: application/json" \\\n    -u "$N8N_AUTH" \\\n    -d @"$workflow_file" \\\n    "$N8N_API_URL/workflows/import"\ndone\n\necho "All workflows imported successfully!"\n```\n\n## Performance Specifications\n\n**Workflow Performance Targets:**\n- Document Processing Workflow: < 5 minutes\n- Phase A Educational Agents: < 15 minutes\n- Phase B Content & Design: < 20 minutes  \n- Phase C Technical Integration: < 30 minutes\n- Human Review Checkpoints: < 48 hours (with notifications)\n- Total End-to-End Process: < 72 hours (including human reviews)\n\n**System Resource Requirements:**\n- n8n Instance: 4 CPU cores, 8GB RAM\n- Context Manager: 2 CPU cores, 4GB RAM\n- AI Agents Service: 8 CPU cores, 16GB RAM\n- Document Processor: 4 CPU cores, 8GB RAM\n- Total System: 18 CPU cores, 36GB RAM\n\n**Scalability Targets:**\n- Concurrent Course Processing: 10 courses\n- Daily Course Throughput: 50 courses\n- Peak Load Handling: 20 concurrent workflows\n- Error Recovery Time: < 5 minutes\n\n---\n**Implementation Status**: ✅ Complete n8n workflow specifications\n**Next Phase**: System deployment and testing