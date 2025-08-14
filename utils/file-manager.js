const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

class FileManager {
  constructor(basePath = './course-data') {
    this.basePath = basePath;
  }

  // Ensure course directory structure exists
  async ensureCourseStructure(courseId) {
    const coursePath = path.join(this.basePath, courseId);
    const directories = [
      'uploads',
      'processed',
      'phase-a-results',
      'phase-b-results',
      'phase-c-results',
      'final-output'
    ];

    try {
      await fs.ensureDir(coursePath);
      
      for (const dir of directories) {
        await fs.ensureDir(path.join(coursePath, dir));
      }
      
      logger.info(`Course directory structure created for ${courseId}`);
      return coursePath;
    } catch (error) {
      logger.logError(error, { courseId, operation: 'ensureCourseStructure' });
      throw error;
    }
  }

  // Get course path
  getCoursePath(courseId, subPath = '') {
    return path.join(this.basePath, courseId, subPath);
  }

  // Save JSON data
  async saveJSON(filePath, data) {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeJSON(filePath, data, { spaces: 2 });
      logger.info(`JSON data saved to ${filePath}`);
    } catch (error) {
      logger.logError(error, { filePath, operation: 'saveJSON' });
      throw error;
    }
  }

  // Load JSON data
  async loadJSON(filePath) {
    try {
      const data = await fs.readJSON(filePath);
      logger.info(`JSON data loaded from ${filePath}`);
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`File not found: ${filePath}`);
        return null;
      }
      logger.logError(error, { filePath, operation: 'loadJSON' });
      throw error;
    }
  }

  // Save text file
  async saveText(filePath, content) {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
      logger.info(`Text file saved to ${filePath}`);
    } catch (error) {
      logger.logError(error, { filePath, operation: 'saveText' });
      throw error;
    }
  }

  // Load text file
  async loadText(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      logger.info(`Text file loaded from ${filePath}`);
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`File not found: ${filePath}`);
        return null;
      }
      logger.logError(error, { filePath, operation: 'loadText' });
      throw error;
    }
  }

  // List files in directory
  async listFiles(dirPath, extension = null) {
    try {
      const files = await fs.readdir(dirPath);
      const filteredFiles = extension 
        ? files.filter(file => path.extname(file).toLowerCase() === extension.toLowerCase())
        : files;
      
      return filteredFiles.map(file => ({
        name: file,
        path: path.join(dirPath, file),
        extension: path.extname(file)
      }));
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`Directory not found: ${dirPath}`);
        return [];
      }
      logger.logError(error, { dirPath, operation: 'listFiles' });
      throw error;
    }
  }

  // Get file stats
  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      logger.logError(error, { filePath, operation: 'getFileStats' });
      throw error;
    }
  }

  // Clean up temporary files
  async cleanup(courseId, olderThanHours = 24) {
    const coursePath = this.getCoursePath(courseId);
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    try {
      const tempDirs = ['processed', 'phase-a-results'];
      
      for (const dir of tempDirs) {
        const dirPath = path.join(coursePath, dir);
        const files = await this.listFiles(dirPath);
        
        for (const file of files) {
          const stats = await this.getFileStats(file.path);
          if (stats.modified < cutoffTime) {
            await fs.remove(file.path);
            logger.info(`Cleaned up old file: ${file.path}`);
          }
        }
      }
    } catch (error) {
      logger.logError(error, { courseId, operation: 'cleanup' });
      // Don't throw - cleanup failures shouldn't stop processing
    }
  }
}

module.exports = FileManager;