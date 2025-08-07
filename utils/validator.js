const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const FileManager = require('./file-manager');

class Validator {
  constructor() {
    this.fileManager = new FileManager();
  }

  async validateCourseProcessing(courseId) {
    logger.info(`Starting validation for course: ${courseId}`);
    
    const validation = {
      courseId,
      validatedAt: new Date().toISOString(),
      overallStatus: 'unknown',
      checks: {},
      issues: [],
      recommendations: [],
      qualityScore: 0
    };

    try {
      // Check 1: Course directory structure
      validation.checks.directoryStructure = await this.validateDirectoryStructure(courseId);
      
      // Check 2: Document processing
      validation.checks.documentProcessing = await this.validateDocumentProcessing(courseId);
      
      // Check 3: Phase A results
      validation.checks.phaseAResults = await this.validatePhaseAResults(courseId);
      
      // Check 4: Blueprint generation
      validation.checks.blueprintGeneration = await this.validateBlueprintGeneration(courseId);
      
      // Calculate overall status and quality score
      this.calculateOverallValidation(validation);
      
      // Generate recommendations
      this.generateRecommendations(validation);
      
      logger.info(`Validation completed for ${courseId}`, {
        status: validation.overallStatus,
        qualityScore: validation.qualityScore,
        issueCount: validation.issues.length
      });
      
      return validation;
      
    } catch (error) {
      logger.logError(error, { courseId, operation: 'validation' });
      validation.overallStatus = 'error';
      validation.issues.push(`Validation failed: ${error.message}`);
      return validation;
    }
  }

  async validateDirectoryStructure(courseId) {
    const check = {
      name: 'Directory Structure',
      status: 'unknown',
      details: {},
      issues: []
    };

    try {
      const coursePath = this.fileManager.getCoursePath(courseId);
      const requiredDirs = ['uploads', 'processed', 'phase-a-results', 'final-output'];
      
      check.details.coursePathExists = await fs.pathExists(coursePath);
      
      if (!check.details.coursePathExists) {
        check.status = 'failed';
        check.issues.push('Course directory does not exist');
        return check;
      }

      check.details.directories = {};
      
      for (const dir of requiredDirs) {
        const dirPath = path.join(coursePath, dir);
        const exists = await fs.pathExists(dirPath);
        check.details.directories[dir] = exists;
        
        if (!exists) {
          check.issues.push(`Missing directory: ${dir}`);
        }
      }

      const missingDirs = Object.values(check.details.directories).filter(exists => !exists).length;
      
      if (missingDirs === 0) {
        check.status = 'passed';
      } else if (missingDirs <= 2) {
        check.status = 'warning';
      } else {
        check.status = 'failed';
      }

    } catch (error) {
      check.status = 'error';
      check.issues.push(`Directory validation error: ${error.message}`);
    }

    return check;
  }

  async validateDocumentProcessing(courseId) {
    const check = {
      name: 'Document Processing',
      status: 'unknown',
      details: {},
      issues: []
    };

    try {
      // Check for processed content
      const processedPath = this.fileManager.getCoursePath(courseId, 'processed/course-content.json');
      const processedContent = await this.fileManager.loadJSON(processedPath);
      
      check.details.processedContentExists = !!processedContent;
      
      if (!processedContent) {
        check.status = 'failed';
        check.issues.push('No processed content found');
        return check;
      }

      // Validate processed content structure
      check.details.documentsProcessed = processedContent.documents?.length || 0;
      check.details.totalFiles = processedContent.totalFiles || 0;
      check.details.hasSyllabus = !!processedContent.syllabus;
      check.details.hasContentModules = (processedContent.contentModules?.length || 0) > 0;
      
      // Check document quality
      if (processedContent.documents) {
        const qualityScores = processedContent.documents
          .map(doc => doc.quality?.score || 0)
          .filter(score => score > 0);
        
        check.details.averageQuality = qualityScores.length > 0 
          ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
          : 0;
      }

      // Determine status
      if (check.details.documentsProcessed === 0) {
        check.status = 'failed';
        check.issues.push('No documents were successfully processed');
      } else if (check.details.documentsProcessed < check.details.totalFiles) {
        check.status = 'warning';
        check.issues.push(`Only ${check.details.documentsProcessed}/${check.details.totalFiles} documents processed`);
      } else if (check.details.averageQuality < 0.5) {
        check.status = 'warning';
        check.issues.push('Low average document quality score');
      } else {
        check.status = 'passed';
      }

    } catch (error) {
      check.status = 'error';
      check.issues.push(`Document processing validation error: ${error.message}`);
    }

    return check;
  }

  async validatePhaseAResults(courseId) {
    const check = {
      name: 'Phase A Results',
      status: 'unknown',
      details: {},
      issues: []
    };

    try {
      // Check for Phase A results
      const resultsPath = this.fileManager.getCoursePath(courseId, 'phase-a-results/results.json');
      const phaseAResults = await this.fileManager.loadJSON(resultsPath);
      
      check.details.phaseAResultsExist = !!phaseAResults;
      
      if (!phaseAResults) {
        check.status = 'failed';
        check.issues.push('No Phase A results found');
        return check;
      }

      // Validate agent results
      const expectedAgents = ['instructional-designer', 'curriculum-architect', 'business-analyst'];
      check.details.agentResults = {};
      
      for (const agentName of expectedAgents) {
        const agentResult = phaseAResults.agentResults?.[agentName];
        check.details.agentResults[agentName] = {
          exists: !!agentResult,
          qualityScore: agentResult?.metadata?.qualityScore || 0,
          hasOutput: !!(agentResult?.output)
        };
      }

      // Check overall Phase A quality
      check.details.overallQualityScore = phaseAResults.qualityScore || 0;
      check.details.integrationScore = phaseAResults.integration?.overallQualityScore || 0;
      check.details.errorCount = phaseAResults.errors?.length || 0;

      // Determine status
      const successfulAgents = Object.values(check.details.agentResults)
        .filter(result => result.exists && result.hasOutput).length;
      
      if (successfulAgents === 0) {
        check.status = 'failed';
        check.issues.push('No agents completed successfully');
      } else if (successfulAgents < 3) {
        check.status = 'warning';
        check.issues.push(`Only ${successfulAgents}/3 agents completed successfully`);
      } else if (check.details.overallQualityScore < 0.7) {
        check.status = 'warning';
        check.issues.push('Low overall quality score for Phase A');
      } else {
        check.status = 'passed';
      }

    } catch (error) {
      check.status = 'error';
      check.issues.push(`Phase A validation error: ${error.message}`);
    }

    return check;
  }

  async validateBlueprintGeneration(courseId) {
    const check = {
      name: 'Blueprint Generation',
      status: 'unknown',
      details: {},
      issues: []
    };

    try {
      // Check for blueprint files
      const jsonPath = this.fileManager.getCoursePath(courseId, 'final-output/course-blueprint.json');
      const mdPath = this.fileManager.getCoursePath(courseId, 'final-output/course-blueprint.md');
      
      const jsonBlueprint = await this.fileManager.loadJSON(jsonPath);
      const mdBlueprint = await this.fileManager.loadText(mdPath);
      
      check.details.jsonBlueprintExists = !!jsonBlueprint;
      check.details.mdBlueprintExists = !!mdBlueprint;
      
      if (!jsonBlueprint) {
        check.status = 'failed';
        check.issues.push('No JSON blueprint found');
        return check;
      }

      // Validate blueprint structure
      check.details.hasCourseInfo = !!jsonBlueprint.courseInfo;
      check.details.hasLearningOutcomes = (jsonBlueprint.learningOutcomes?.length || 0) > 0;
      check.details.hasCourseStructure = !!jsonBlueprint.courseStructure;
      check.details.hasQualityMetrics = !!jsonBlueprint.qualityMetrics;
      
      check.details.learningOutcomeCount = jsonBlueprint.learningOutcomes?.length || 0;
      check.details.moduleCount = jsonBlueprint.courseStructure?.modules?.length || 0;
      check.details.overallQualityScore = jsonBlueprint.qualityMetrics?.overallScore || 0;

      // Determine status
      const requiredSections = [
        check.details.hasCourseInfo,
        check.details.hasLearningOutcomes,
        check.details.hasCourseStructure,
        check.details.hasQualityMetrics
      ];
      
      const completeSections = requiredSections.filter(Boolean).length;
      
      if (completeSections === 4 && check.details.overallQualityScore >= 0.8) {
        check.status = 'passed';
      } else if (completeSections >= 3) {
        check.status = 'warning';
        if (check.details.overallQualityScore < 0.8) {
          check.issues.push('Blueprint quality score below recommended threshold');
        }
      } else {
        check.status = 'failed';
        check.issues.push('Blueprint missing required sections');
      }

    } catch (error) {
      check.status = 'error';
      check.issues.push(`Blueprint validation error: ${error.message}`);
    }

    return check;
  }

  calculateOverallValidation(validation) {
    const checks = Object.values(validation.checks);
    const statusCounts = {
      passed: 0,
      warning: 0,
      failed: 0,
      error: 0
    };

    checks.forEach(check => {
      statusCounts[check.status] = (statusCounts[check.status] || 0) + 1;
      validation.issues.push(...check.issues);
    });

    // Determine overall status
    if (statusCounts.error > 0) {
      validation.overallStatus = 'error';
    } else if (statusCounts.failed > 0) {
      validation.overallStatus = 'failed';
    } else if (statusCounts.warning > 0) {
      validation.overallStatus = 'warning';
    } else {
      validation.overallStatus = 'passed';
    }

    // Calculate quality score
    const weights = { passed: 1.0, warning: 0.7, failed: 0.3, error: 0.1 };
    const totalWeight = checks.length;
    const weightedScore = checks.reduce((sum, check) => sum + weights[check.status], 0);
    
    validation.qualityScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  generateRecommendations(validation) {
    const recommendations = [];

    // General recommendations based on status
    switch (validation.overallStatus) {
      case 'error':
        recommendations.push('Fix critical errors before proceeding');
        recommendations.push('Check system configuration and API keys');
        break;
      case 'failed':
        recommendations.push('Address failed validation checks');
        recommendations.push('Review input documents and processing configuration');
        break;
      case 'warning':
        recommendations.push('Review warnings and consider improvements');
        recommendations.push('System is functional but could be optimized');
        break;
      case 'passed':
        recommendations.push('System validation successful');
        recommendations.push('Ready to proceed to next development phase');
        break;
    }

    // Specific recommendations based on check results
    if (validation.checks.documentProcessing?.status === 'warning') {
      recommendations.push('Consider improving document quality or adding more source materials');
    }

    if (validation.checks.phaseAResults?.status === 'warning') {
      recommendations.push('Review agent configurations and consider adjusting prompts');
    }

    if (validation.checks.blueprintGeneration?.details?.overallQualityScore < 0.8) {
      recommendations.push('Blueprint quality could be improved with better source materials');
    }

    validation.recommendations = recommendations;
  }

  async generateValidationReport(courseId) {
    const validation = await this.validateCourseProcessing(courseId);
    
    const report = `# Validation Report: ${courseId}

**Generated**: ${new Date(validation.validatedAt).toLocaleString()}
**Overall Status**: ${validation.overallStatus.toUpperCase()}
**Quality Score**: ${Math.round(validation.qualityScore * 100)}%

## Validation Checks

${Object.entries(validation.checks).map(([checkName, check]) => `
### ${check.name}
**Status**: ${check.status.toUpperCase()}
${check.issues.length > 0 ? `**Issues**: ${check.issues.join(', ')}` : '**Issues**: None'}

**Details**:
${Object.entries(check.details).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
`).join('\n')}

## Issues Found
${validation.issues.length > 0 ? validation.issues.map(issue => `- ${issue}`).join('\n') : 'No issues found'}

## Recommendations
${validation.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*Generated by AI Curriculum Design System Validator*
    `;

    // Save report
    const reportPath = this.fileManager.getCoursePath(courseId, 'final-output/validation-report.md');
    await this.fileManager.saveText(reportPath, report);

    return { validation, report };
  }
}

module.exports = Validator;