const logger = require('../utils/logger');

class CourseContextExtractor {
    constructor() {
        this.programTypeMap = {
            'business': ['business', 'commerce', 'management', 'administration', 'accounting', 'finance', 'marketing'],
            'engineering': ['engineering', 'technology', 'technical', 'applied science', 'computer science'],
            'health': ['health', 'nursing', 'medical', 'healthcare', 'wellness', 'therapy'],
            'arts': ['arts', 'liberal arts', 'humanities', 'social science', 'psychology', 'sociology'],
            'trades': ['trades', 'skilled trades', 'apprenticeship', 'construction', 'automotive'],
            'education': ['education', 'teaching', 'early childhood', 'adult education'],
            'science': ['science', 'biology', 'chemistry', 'physics', 'mathematics', 'environmental']
        };

        this.subjectAreaMap = {
            'municipal administration': ['municipal', 'government', 'public administration', 'local government'],
            'business management': ['management', 'business', 'operations', 'leadership', 'organizational'],
            'accounting': ['accounting', 'financial', 'bookkeeping', 'taxation', 'audit'],
            'marketing': ['marketing', 'advertising', 'promotion', 'sales', 'digital marketing'],
            'computer science': ['computer', 'programming', 'software', 'information technology', 'web'],
            'engineering': ['engineering', 'mechanical', 'electrical', 'civil', 'structural'],
            'health sciences': ['health', 'medical', 'nursing', 'anatomy', 'physiology'],
            'social sciences': ['psychology', 'sociology', 'anthropology', 'social work'],
            'mathematics': ['mathematics', 'statistics', 'calculus', 'algebra', 'geometry'],
            'english': ['english', 'literature', 'writing', 'communication', 'composition'],
            'history': ['history', 'historical', 'civilization', 'culture', 'heritage'],
            'environmental': ['environmental', 'ecology', 'sustainability', 'climate', 'conservation']
        };
    }

    extractCourseContext(courseContent) {
        const context = {
            courseId: courseContent.courseId,
            title: this.extractCourseTitle(courseContent),
            program: this.extractProgram(courseContent),
            programType: null,
            subject: this.extractSubject(courseContent),
            subjectArea: null,
            credits: this.extractCredits(courseContent),
            duration: this.extractDuration(courseContent),
            level: this.extractLevel(courseContent),
            targetAudience: null,
            institution: 'Saskatchewan Polytechnic'
        };

        // Classify program type
        context.programType = this.classifyProgramType(context.program);
        
        // Classify subject area
        context.subjectArea = this.classifySubjectArea(context.subject, context.title);
        
        // Determine target audience
        context.targetAudience = this.determineTargetAudience(context.program, context.level);

        logger.info(`Extracted course context for ${context.courseId}:`, {
            program: context.program,
            programType: context.programType,
            subject: context.subject,
            subjectArea: context.subjectArea
        });

        return context;
    }

    extractProgram(courseContent) {
        // Look for Program row in syllabus
        const syllabusDoc = courseContent.documents.find(doc => 
            doc.fileName.toLowerCase().includes('syllabus') && 
            doc.fileName.toLowerCase().includes('outline')
        );

        if (syllabusDoc && syllabusDoc.content.text) {
            const programMatch = syllabusDoc.content.text.match(/Program:\s*\n\s*([^\n]+)/i);
            if (programMatch) {
                return programMatch[1].trim();
            }
        }

        // Fallback: try to extract from any document
        for (const doc of courseContent.documents) {
            if (doc.content.text) {
                const programMatch = doc.content.text.match(/Program:\s*([^\n]+)/i);
                if (programMatch) {
                    return programMatch[1].trim();
                }
            }
        }

        return 'General Program';
    }

    extractSubject(courseContent) {
        // Look for Course row in syllabus
        const syllabusDoc = courseContent.documents.find(doc => 
            doc.fileName.toLowerCase().includes('syllabus') && 
            doc.fileName.toLowerCase().includes('outline')
        );

        if (syllabusDoc && syllabusDoc.content.text) {
            const courseMatch = syllabusDoc.content.text.match(/Course:\s*\n\s*([^\n]+)/i);
            if (courseMatch) {
                return courseMatch[1].trim();
            }
        }

        // Fallback: try to extract from any document
        for (const doc of courseContent.documents) {
            if (doc.content.text) {
                const courseMatch = doc.content.text.match(/Course:\s*([^\n]+)/i);
                if (courseMatch) {
                    return courseMatch[1].trim();
                }
            }
        }

        // Final fallback: use course title
        return this.extractCourseTitle(courseContent);
    }

    extractCourseTitle(courseContent) {
        // Try to extract from syllabus first
        if (courseContent.syllabus?.content?.text) {
            const titleMatch = courseContent.syllabus.content.text.match(/^([A-Z]{2,4}[-\s]\d{3}[:\s]+.+?)$/m);
            if (titleMatch) {
                return titleMatch[1].trim();
            }
        }

        // Try from subject extraction
        const subject = this.extractSubject(courseContent);
        if (subject && subject !== 'General Program') {
            return subject;
        }

        // Fallback to course ID
        return courseContent.courseId || 'Unknown Course';
    }

    extractCredits(courseContent) {
        for (const doc of courseContent.documents) {
            if (doc.content.text) {
                const creditMatch = doc.content.text.match(/(\d+)\s*credit/i);
                if (creditMatch) {
                    return parseInt(creditMatch[1]);
                }
            }
        }
        return 3; // Default
    }

    extractDuration(courseContent) {
        for (const doc of courseContent.documents) {
            if (doc.content.text) {
                const durationMatch = doc.content.text.match(/(\d+)\s*week/i);
                if (durationMatch) {
                    return `${durationMatch[1]} weeks`;
                }
            }
        }
        return '15 weeks'; // Default
    }

    extractLevel(courseContent) {
        const courseId = courseContent.courseId || '';
        
        // Extract level from course number
        const numberMatch = courseId.match(/(\d+)/);
        if (numberMatch) {
            const number = parseInt(numberMatch[1]);
            if (number < 200) return 'introductory';
            if (number < 300) return 'intermediate';
            if (number < 400) return 'advanced';
            return 'senior';
        }

        return 'intermediate'; // Default
    }

    classifyProgramType(program) {
        if (!program) return 'general';
        
        const programLower = program.toLowerCase();
        
        for (const [type, keywords] of Object.entries(this.programTypeMap)) {
            if (keywords.some(keyword => programLower.includes(keyword))) {
                return type;
            }
        }
        
        return 'general';
    }

    classifySubjectArea(subject, title = '') {
        if (!subject && !title) return 'general';
        
        const searchText = `${subject} ${title}`.toLowerCase();
        
        for (const [area, keywords] of Object.entries(this.subjectAreaMap)) {
            if (keywords.some(keyword => searchText.includes(keyword))) {
                return area;
            }
        }
        
        return 'general';
    }

    determineTargetAudience(program, level) {
        const programLower = (program || '').toLowerCase();
        
        if (programLower.includes('diploma')) {
            return level === 'introductory' ? 'First-year diploma students' : 'Diploma students';
        }
        
        if (programLower.includes('certificate')) {
            return 'Certificate program students';
        }
        
        if (programLower.includes('degree') || programLower.includes('bachelor')) {
            return level === 'introductory' ? 'First-year university students' : 'University students';
        }
        
        if (programLower.includes('apprentice') || programLower.includes('trades')) {
            return 'Apprentices and trades students';
        }
        
        return 'Students';
    }

    // Get subject-specific search domains
    getSubjectSearchDomains(subjectArea) {
        const domainMap = {
            'municipal administration': [
                'canada.ca', 'gc.ca', 'fcm.ca', 'ipac.ca', 'toronto.ca', 'vancouver.ca', 'calgary.ca'
            ],
            'business management': [
                'canada.ca', 'cbc.ca', 'bdc.ca', 'ic.gc.ca', 'statcan.gc.ca'
            ],
            'accounting': [
                'cpacanada.ca', 'canada.ca', 'cra-arc.gc.ca', 'statcan.gc.ca'
            ],
            'computer science': [
                'github.com', 'stackoverflow.com', 'developer.mozilla.org', 'w3schools.com'
            ],
            'health sciences': [
                'canada.ca', 'phac-aspc.gc.ca', 'cihr-irsc.gc.ca', 'healthcanada.gc.ca'
            ],
            'engineering': [
                'engineerscanada.ca', 'nrc-cnrc.gc.ca', 'canada.ca'
            ]
        };

        return domainMap[subjectArea] || [
            'canada.ca', 'gc.ca', 'cbc.ca', 'ctv.ca', 'statcan.gc.ca'
        ];
    }

    // Get subject-specific source types
    getSubjectSourceTypes(subjectArea) {
        const sourceMap = {
            'municipal administration': 'government municipal education academic',
            'business management': 'business government statistics education',
            'accounting': 'professional government regulatory education',
            'computer science': 'technical documentation tutorial education',
            'health sciences': 'medical government research education',
            'engineering': 'professional technical government education',
            'social sciences': 'academic research government education',
            'mathematics': 'academic educational tutorial reference',
            'english': 'academic literary educational reference',
            'history': 'academic historical government educational'
        };

        return sourceMap[subjectArea] || 'government education academic';
    }
}

module.exports = CourseContextExtractor;