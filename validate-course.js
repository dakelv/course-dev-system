#!/usr/bin/env node

const logger = require('./utils/logger');
const Validator = require('./utils/validator');

async function validateCourse(courseId) {
  try {
    console.log(`🔍 Validating course: ${courseId}`);
    console.log('');

    const validator = new Validator();
    const { validation, report } = await validator.generateValidationReport(courseId);

    // Display results
    console.log(`📊 Validation Results:`);
    console.log(`   Overall Status: ${getStatusEmoji(validation.overallStatus)} ${validation.overallStatus.toUpperCase()}`);
    console.log(`   Quality Score: ${Math.round(validation.qualityScore * 100)}%`);
    console.log('');

    // Display check results
    console.log(`🔍 Check Results:`);
    Object.entries(validation.checks).forEach(([checkName, check]) => {
      console.log(`   ${getStatusEmoji(check.status)} ${check.name}: ${check.status.toUpperCase()}`);
      if (check.issues.length > 0) {
        check.issues.forEach(issue => {
          console.log(`      ⚠️  ${issue}`);
        });
      }
    });
    console.log('');

    // Display issues
    if (validation.issues.length > 0) {
      console.log(`❌ Issues Found (${validation.issues.length}):`);
      validation.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
      console.log('');
    }

    // Display recommendations
    if (validation.recommendations.length > 0) {
      console.log(`💡 Recommendations:`);
      validation.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
      console.log('');
    }

    console.log(`📄 Detailed report saved to: ./course-data/${courseId}/final-output/validation-report.md`);

    return validation.overallStatus === 'passed' || validation.overallStatus === 'warning';

  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    logger.logError(error, { courseId, operation: 'validation' });
    return false;
  }
}

function getStatusEmoji(status) {
  const emojis = {
    passed: '✅',
    warning: '⚠️',
    failed: '❌',
    error: '💥',
    unknown: '❓'
  };
  return emojis[status] || '❓';
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node validate-course.js <courseId>

Examples:
  node validate-course.js MUNI-201
  node validate-course.js MUNI-201 --verbose

Options:
  --verbose    Enable verbose logging
  --help       Show this help message
    `);
    process.exit(1);
  }
  
  const courseId = args[0];
  
  // Parse options
  if (args.includes('--verbose')) {
    process.env.LOG_LEVEL = 'debug';
  }
  
  if (args.includes('--help')) {
    console.log('Help message shown above');
    process.exit(0);
  }
  
  // Validate course ID
  if (!courseId || courseId.length === 0) {
    console.error('Error: Course ID is required');
    process.exit(1);
  }
  
  console.log(`🔍 AI Curriculum Design System - Course Validator`);
  console.log(`📚 Course: ${courseId}`);
  console.log('');
  
  const success = await validateCourse(courseId);
  
  if (success) {
    console.log(`✅ Validation completed successfully`);
    process.exit(0);
  } else {
    console.log(`❌ Validation found issues that need attention`);
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

module.exports = { validateCourse };