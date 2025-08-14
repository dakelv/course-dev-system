const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const yauzl = require('yauzl');
const logger = require('../utils/logger');
const FileManager = require('../utils/file-manager');

class DocumentProcessor {
  constructor() {
    this.fileManager = new FileManager();
    this.supportedFormats = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt'];
  }

  async processUploadedFiles(courseId) {
    logger.logProcessingStart(courseId, 'document-processing');
    const startTime = Date.now();

    try {
      // Ensure course structure exists
      await this.fileManager.ensureCourseStructure(courseId);
      
      // Get uploaded files
      const uploadsPath = this.fileManager.getCoursePath(courseId, 'uploads');
      const files = await this.fileManager.listFiles(uploadsPath);
      
      if (files.length === 0) {
        throw new Error(`No files found in uploads directory: ${uploadsPath}`);
      }

      logger.info(`Found ${files.length} files to process for course ${courseId}`);

      // Process each file
      const processedContent = {
        courseId,
        processedAt: new Date().toISOString(),
        totalFiles: files.length,
        documents: [],
        syllabus: null,
        contentModules: [],
        supportingMaterials: []
      };

      for (const file of files) {
        try {
          const content = await this.processFile(file);
          if (content) {
            processedContent.documents.push(content);
            
            // Categorize content
            this.categorizeContent(content, processedContent);
          }
        } catch (error) {
          logger.logError(error, { courseId, fileName: file.name });
          // Continue processing other files
        }
      }

      // Save processed content
      const processedPath = this.fileManager.getCoursePath(courseId, 'processed/course-content.json');
      await this.fileManager.saveJSON(processedPath, processedContent);

      const duration = Date.now() - startTime;
      logger.logProcessingComplete(courseId, 'document-processing', duration, {
        filesProcessed: processedContent.documents.length,
        totalFiles: files.length
      });

      return processedContent;

    } catch (error) {
      logger.logError(error, { courseId, phase: 'document-processing' });
      throw error;
    }
  }

  async processFile(file) {
    const extension = file.extension.toLowerCase();
    
    logger.info(`Processing file: ${file.name} (${extension})`);

    switch (extension) {
      case '.pdf':
        return await this.extractPDFContent(file);
      case '.docx':
      case '.doc':
        return await this.extractWordContent(file);
      case '.pptx':
      case '.ppt':
        return await this.extractPowerPointContent(file);
      case '.txt':
        return await this.extractTextContent(file);
      default:
        logger.warn(`Unsupported file format: ${extension}`);
        return null;
    }
  }

  async extractPDFContent(file) {
    try {
      const buffer = await fs.readFile(file.path);
      const data = await pdfParse(buffer);
      
      return {
        fileName: file.name,
        fileType: 'pdf',
        extractedAt: new Date().toISOString(),
        content: {
          text: data.text,
          pages: data.numpages,
          metadata: data.info || {},
          structure: this.extractStructureFromText(data.text)
        },
        wordCount: this.countWords(data.text),
        quality: this.assessContentQuality(data.text)
      };
    } catch (error) {
      logger.logError(error, { fileName: file.name, operation: 'extractPDFContent' });
      throw new Error(`Failed to extract PDF content from ${file.name}: ${error.message}`);
    }
  }

  async extractWordContent(file) {
    try {
      const buffer = await fs.readFile(file.path);
      const result = await mammoth.extractRawText({ buffer });
      
      // Also extract with styling for better structure detection
      const htmlResult = await mammoth.convertToHtml({ buffer });
      
      return {
        fileName: file.name,
        fileType: 'word',
        extractedAt: new Date().toISOString(),
        content: {
          text: result.value,
          html: htmlResult.value,
          structure: this.extractStructureFromHTML(htmlResult.value),
          warnings: result.messages
        },
        wordCount: this.countWords(result.value),
        quality: this.assessContentQuality(result.value)
      };
    } catch (error) {
      logger.logError(error, { fileName: file.name, operation: 'extractWordContent' });
      throw new Error(`Failed to extract Word content from ${file.name}: ${error.message}`);
    }
  }

  async extractPowerPointContent(file) {
    try {
      // For now, we'll use a simplified approach
      // In a full implementation, you'd use a proper PPTX parser
      const stats = await this.fileManager.getFileStats(file.path);
      
      return {
        fileName: file.name,
        fileType: 'powerpoint',
        extractedAt: new Date().toISOString(),
        content: {
          text: `PowerPoint presentation: ${file.name}`,
          slides: [], // Would be populated by proper PPTX parser
          structure: {
            type: 'presentation',
            estimatedSlides: Math.floor(stats.size / 50000) // Rough estimate
          }
        },
        wordCount: 0, // Would be calculated from actual content
        quality: { score: 0.5, issues: ['PowerPoint parsing not fully implemented'] }
      };
    } catch (error) {
      logger.logError(error, { fileName: file.name, operation: 'extractPowerPointContent' });
      throw new Error(`Failed to extract PowerPoint content from ${file.name}: ${error.message}`);
    }
  }

  async extractTextContent(file) {
    try {
      const content = await fs.readFile(file.path, 'utf8');
      
      return {
        fileName: file.name,
        fileType: 'text',
        extractedAt: new Date().toISOString(),
        content: {
          text: content,
          structure: this.extractStructureFromText(content)
        },
        wordCount: this.countWords(content),
        quality: this.assessContentQuality(content)
      };
    } catch (error) {
      logger.logError(error, { fileName: file.name, operation: 'extractTextContent' });
      throw new Error(`Failed to extract text content from ${file.name}: ${error.message}`);
    }
  }

  extractStructureFromText(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const structure = {
      headings: [],
      sections: [],
      learningObjectives: [],
      assessments: []
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect headings (simple heuristic)
      if (this.isHeading(line)) {
        structure.headings.push({
          text: line,
          level: this.getHeadingLevel(line),
          lineNumber: i
        });
      }

      // Detect learning objectives
      if (this.isLearningObjective(line)) {
        structure.learningObjectives.push({
          text: line,
          lineNumber: i
        });
      }

      // Detect assessments
      if (this.isAssessment(line)) {
        structure.assessments.push({
          text: line,
          lineNumber: i
        });
      }
    }

    return structure;
  }

  extractStructureFromHTML(html) {
    // Simple HTML structure extraction
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    const listRegex = /<li[^>]*>(.*?)<\/li>/gi;
    
    const structure = {
      headings: [],
      lists: [],
      learningObjectives: [],
      assessments: []
    };

    let match;
    
    // Extract headings
    while ((match = headingRegex.exec(html)) !== null) {
      structure.headings.push({
        level: parseInt(match[1]),
        text: match[2].replace(/<[^>]*>/g, '').trim()
      });
    }

    // Extract list items
    while ((match = listRegex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]*>/g, '').trim();
      structure.lists.push(text);
      
      // Check if it's a learning objective or assessment
      if (this.isLearningObjective(text)) {
        structure.learningObjectives.push(text);
      } else if (this.isAssessment(text)) {
        structure.assessments.push(text);
      }
    }

    return structure;
  }

  categorizeContent(content, processedContent) {
    const fileName = content.fileName.toLowerCase();
    
    // Identify syllabus
    if (fileName.includes('syllabus') || fileName.includes('outline')) {
      processedContent.syllabus = content;
    }
    // Identify content modules
    else if (fileName.includes('module') || fileName.includes('chapter') || fileName.includes('unit')) {
      processedContent.contentModules.push(content);
    }
    // Everything else is supporting material
    else {
      processedContent.supportingMaterials.push(content);
    }
  }

  // Helper methods for content analysis
  isHeading(line) {
    // Simple heuristics for heading detection
    return line.length < 100 && 
           (line.match(/^[A-Z][^.!?]*$/) || 
            line.match(/^\d+\.?\s+[A-Z]/) ||
            line.match(/^Chapter|Module|Unit|Section/i));
  }

  getHeadingLevel(line) {
    if (line.match(/^Chapter|Module/i)) return 1;
    if (line.match(/^\d+\.\s/)) return 2;
    if (line.match(/^\d+\.\d+\s/)) return 3;
    return 2; // default
  }

  isLearningObjective(line) {
    const objectiveKeywords = [
      'objective', 'outcome', 'goal', 'student will', 'learner will',
      'by the end', 'upon completion', 'demonstrate', 'identify', 'analyze', 'evaluate'
    ];
    
    const lowerLine = line.toLowerCase();
    return objectiveKeywords.some(keyword => lowerLine.includes(keyword));
  }

  isAssessment(line) {
    const assessmentKeywords = [
      'assessment', 'assignment', 'quiz', 'test', 'exam', 'project',
      'evaluation', 'grade', 'mark', 'rubric', 'criteria'
    ];
    
    const lowerLine = line.toLowerCase();
    return assessmentKeywords.some(keyword => lowerLine.includes(keyword));
  }

  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  assessContentQuality(text) {
    const wordCount = this.countWords(text);
    const issues = [];
    
    if (wordCount < 100) {
      issues.push('Content appears to be very short');
    }
    
    if (text.includes('�') || text.includes('???')) {
      issues.push('Possible encoding issues detected');
    }
    
    if (text.trim().length === 0) {
      issues.push('No readable content extracted');
    }
    
    const score = Math.max(0, Math.min(1, (wordCount / 1000) * 0.8 + (issues.length === 0 ? 0.2 : 0)));
    
    return {
      score,
      wordCount,
      issues,
      readabilityEstimate: this.estimateReadability(text)
    };
  }

  estimateReadability(text) {
    // Simple readability estimate based on sentence and word length
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.trim().split(/\s+/);
    
    if (sentences.length === 0 || words.length === 0) {
      return { level: 'unknown', score: 0 };
    }
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgCharsPerWord = text.replace(/\s/g, '').length / words.length;
    
    // Simplified readability score
    const score = Math.max(0, Math.min(100, 100 - (avgWordsPerSentence * 2) - (avgCharsPerWord * 5)));
    
    let level = 'college';
    if (score > 80) level = 'elementary';
    else if (score > 60) level = 'middle-school';
    else if (score > 40) level = 'high-school';
    
    return { level, score: Math.round(score) };
  }
}

module.exports = DocumentProcessor;