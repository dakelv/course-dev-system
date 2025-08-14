#!/usr/bin/env node

const path = require('path');
const logger = require('./utils/logger');
const config = require('./src/config');
const DocumentProcessor = require('./src/document-processor');

// Main processing function
async function processCourse(courseId, options = {}) {
  const startTime = Date.now();
  
  try {
    logger.info(`Starting curriculum design process for course: ${courseId}`);
    
    // Validate configuration
    config.validateApiKeys();
    
    // Initialize processors
    const documentProcessor = new DocumentProcessor();
    
    // Phase 1: Document Processing
    logger.info('Phase 1: Processing course documents...');
    const courseContent = await documentProcessor.processUploadedFiles(courseId);
    
    if (!courseContent || courseContent.documents.length === 0) {
      throw new Error('No documents were successfully processed');
    }
    
    logger.info(`Successfully processed ${courseContent.documents.length} documents`);
    
    // Phase 2: AI Agent Processing (Phase A)
    logger.info('Phase 2: Executing AI agents for educational foundation...');
    const BlueprintGenerator = require('./src/blueprint-generator');
    const blueprintGenerator = new BlueprintGenerator();
    
    const blueprintResult = await blueprintGenerator.generateCourseBlueprint(courseId, options);
    
    if (!blueprintResult.success) {
      throw new Error(`Blueprint generation failed: ${blueprintResult.error}`);
    }
    
    logger.info(`Phase A completed with quality score: ${Math.round(blueprintResult.qualityScore * 100)}%`);
    
    // TODO: Phase 3: HTML Generation
    logger.info('Phase 3: HTML Generation - Coming in Week 3...');
    
    const totalDuration = Date.now() - startTime;
    
    logger.info(`Course processing completed successfully in ${totalDuration}ms`, {
      courseId,
      duration: totalDuration,
      documentsProcessed: courseContent.documents.length
    });
    
    return {
      success: true,
      courseId,
      duration: totalDuration,
      documentsProcessed: courseContent.documents.length,
      qualityScore: blueprintResult.qualityScore,
      phaseAResults: blueprintResult.phaseAResults,
      blueprint: blueprintResult.blueprint
    };
    
  } catch (error) {
    logger.logError(error, { courseId, phase: 'main-process' });
    
    return {
      success: false,
      courseId,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node process-course.js <courseId> [options]

Examples:
  node process-course.js MUNI-201
  node process-course.js MUNI-201 --verbose
  node process-course.js MUNI-201 --phase A

Options:
  --verbose    Enable verbose logging
  --phase      Process only specific phase (A, B, C)
  --config     Use custom configuration file
  --help       Show this help message
    `);
    process.exit(1);
  }
  
  const courseId = args[0];
  const options = {};
  
  // Parse command line options
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
        options.verbose = true;
        process.env.LOG_LEVEL = 'debug';
        break;
      case '--phase':
        options.phase = args[++i];
        break;
      case '--config':
        options.configFile = args[++i];
        break;
      case '--help':
        console.log('Help message shown above');
        process.exit(0);
        break;
    }
  }
  
  // Validate course ID
  if (!courseId || courseId.length === 0) {
    console.error('Error: Course ID is required');
    process.exit(1);
  }
  
  console.log(`🚀 Starting AI Curriculum Design System`);
  console.log(`📚 Course: ${courseId}`);
  console.log(`⚙️  Configuration loaded`);
  console.log(`📝 Logs: ./logs/combined.log`);
  console.log('');
  
  // Process the course
  const result = await processCourse(courseId, options);
  
  if (result.success) {
    console.log(`✅ Success! Course ${courseId} processed in ${result.duration}ms`);
    console.log(`📄 Documents processed: ${result.documentsProcessed}`);
    console.log(`🎯 Quality score: ${Math.round(result.qualityScore * 100)}%`);
    console.log(`🤖 AI agents executed: ${Object.keys(result.phaseAResults.agentResults).length}`);
    console.log(`📁 Results saved to: ./course-data/${courseId}/`);
    console.log(`📋 Blueprint: ./course-data/${courseId}/final-output/${courseId}-course-blueprint.md`);
    process.exit(0);
  } else {
    console.error(`❌ Failed to process course ${courseId}`);
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.logError(error, { context: 'uncaughtException' });
  console.error('Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.logError(new Error(reason), { context: 'unhandledRejection' });
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { processCourse };