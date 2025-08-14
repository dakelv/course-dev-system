const winston = require('winston');
const fs = require('fs-extra');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
fs.ensureDirSync(logsDir);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'curriculum-design-system' },
  transports: [
    // Write all logs to file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log') 
    }),
  ],
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    )
  }));
}

// Helper methods for common logging patterns
logger.logProcessingStart = (courseId, phase) => {
  logger.info('Processing started', { courseId, phase, timestamp: new Date().toISOString() });
};

logger.logProcessingComplete = (courseId, phase, duration, results) => {
  logger.info('Processing completed', { 
    courseId, 
    phase, 
    duration, 
    qualityScore: results?.qualityScore,
    timestamp: new Date().toISOString() 
  });
};

logger.logAgentExecution = (agentName, courseId, duration, cost, qualityScore) => {
  logger.info('Agent execution completed', {
    agent: agentName,
    courseId,
    duration,
    cost,
    qualityScore,
    timestamp: new Date().toISOString()
  });
};

logger.logError = (error, context = {}) => {
  logger.error('System error occurred', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;