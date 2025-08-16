class SubjectActivityTemplates {
    constructor() {
        this.templates = {
            'municipal administration': {
                reading: {
                    sources: [
                        'Canadian municipal administration textbooks',
                        'Government reports and policy documents',
                        'Municipal case studies and best practices',
                        'Academic journals on public administration'
                    ],
                    examples: [
                        'Chapter readings from "Municipal Administration in Canada" by Andrew Sancton',
                        'Federation of Canadian Municipalities reports',
                        'Statistics Canada municipal data and reports',
                        'Provincial municipal affairs department publications'
                    ]
                },
                activities: [
                    'Municipal service analysis and comparison',
                    'Budget simulation exercises',
                    'Policy framework evaluation',
                    'Stakeholder engagement planning',
                    'Municipal governance case studies'
                ],
                assessments: [
                    'Municipal service delivery analysis',
                    'Budget allocation simulation',
                    'Policy recommendation reports',
                    'Municipal planning projects'
                ]
            },
            'business management': {
                reading: {
                    sources: [
                        'Business management textbooks and journals',
                        'Industry reports and market analysis',
                        'Case studies from Canadian businesses',
                        'Government business statistics and data'
                    ],
                    examples: [
                        'Harvard Business Review case studies',
                        'Statistics Canada business data',
                        'Industry Canada reports',
                        'Canadian business success stories'
                    ]
                },
                activities: [
                    'Business case analysis',
                    'Strategic planning exercises',
                    'Market research projects',
                    'Leadership simulation activities',
                    'Financial analysis and budgeting'
                ],
                assessments: [
                    'Business plan development',
                    'Case study analysis reports',
                    'Strategic planning presentations',
                    'Financial performance analysis'
                ]
            },
            'accounting': {
                reading: {
                    sources: [
                        'Canadian accounting standards and principles',
                        'CPA Canada resources and guidelines',
                        'Financial reporting examples and cases',
                        'Tax legislation and regulations'
                    ],
                    examples: [
                        'CPA Canada handbook sections',
                        'Canada Revenue Agency publications',
                        'Financial statement analysis cases',
                        'Auditing standards documentation'
                    ]
                },
                activities: [
                    'Financial statement preparation',
                    'Tax calculation exercises',
                    'Audit procedure simulations',
                    'Cost accounting analysis',
                    'Budgeting and forecasting projects'
                ],
                assessments: [
                    'Financial statement analysis',
                    'Tax return preparation',
                    'Audit report writing',
                    'Cost analysis projects'
                ]
            },
            'computer science': {
                reading: {
                    sources: [
                        'Programming language documentation',
                        'Software development best practices',
                        'Technology trend analysis',
                        'Computer science research papers'
                    ],
                    examples: [
                        'Official language documentation (Python, Java, etc.)',
                        'GitHub repositories and code examples',
                        'Stack Overflow discussions and solutions',
                        'Technology blog posts and tutorials'
                    ]
                },
                activities: [
                    'Programming assignments and projects',
                    'Code review and debugging exercises',
                    'System design challenges',
                    'Algorithm implementation tasks',
                    'Software testing and quality assurance'
                ],
                assessments: [
                    'Programming project portfolios',
                    'Code quality and documentation',
                    'System design presentations',
                    'Technical problem-solving exams'
                ]
            },
            'health sciences': {
                reading: {
                    sources: [
                        'Medical and health science textbooks',
                        'Health Canada guidelines and policies',
                        'Medical research journals and studies',
                        'Professional health organization resources'
                    ],
                    examples: [
                        'Health Canada clinical practice guidelines',
                        'Canadian Medical Association resources',
                        'Provincial health authority publications',
                        'Peer-reviewed medical journal articles'
                    ]
                },
                activities: [
                    'Case study analysis and diagnosis',
                    'Health assessment simulations',
                    'Treatment planning exercises',
                    'Health promotion campaign development',
                    'Evidence-based practice research'
                ],
                assessments: [
                    'Clinical case presentations',
                    'Health assessment reports',
                    'Evidence-based practice papers',
                    'Health education material development'
                ]
            },
            'engineering': {
                reading: {
                    sources: [
                        'Engineering textbooks and handbooks',
                        'Technical standards and codes',
                        'Engineering case studies and projects',
                        'Professional engineering publications'
                    ],
                    examples: [
                        'Engineers Canada professional standards',
                        'National Research Council publications',
                        'Canadian Standards Association documents',
                        'Engineering project case studies'
                    ]
                },
                activities: [
                    'Design projects and calculations',
                    'Technical drawing and modeling',
                    'Problem-solving and analysis',
                    'Safety assessment exercises',
                    'Project management simulations'
                ],
                assessments: [
                    'Engineering design projects',
                    'Technical report writing',
                    'Problem-solving examinations',
                    'Professional presentation delivery'
                ]
            },
            'general': {
                reading: {
                    sources: [
                        'Academic textbooks and journals',
                        'Government reports and statistics',
                        'Professional publications and resources',
                        'Current events and news analysis'
                    ],
                    examples: [
                        'Course-specific textbook chapters',
                        'Government of Canada publications',
                        'Statistics Canada data and reports',
                        'Professional association resources'
                    ]
                },
                activities: [
                    'Research and analysis projects',
                    'Case study examinations',
                    'Discussion and debate exercises',
                    'Presentation and communication tasks',
                    'Critical thinking and problem-solving'
                ],
                assessments: [
                    'Research papers and reports',
                    'Case study analysis',
                    'Oral presentations',
                    'Critical thinking examinations'
                ]
            }
        };
    }

    getActivityTemplate(subjectArea, activityType) {
        const subject = this.templates[subjectArea] || this.templates['general'];
        
        switch (activityType.toLowerCase()) {
            case 'reading':
                return this.generateReadingTemplate(subject);
            case 'case-study':
                return this.generateCaseStudyTemplate(subject, subjectArea);
            case 'research':
                return this.generateResearchTemplate(subject, subjectArea);
            case 'discussion':
                return this.generateDiscussionTemplate(subject, subjectArea);
            case 'infographic':
                return this.generateInfographicTemplate(subject, subjectArea);
            case 'presentation':
                return this.generatePresentationTemplate(subject, subjectArea);
            case 'simulation':
                return this.generateSimulationTemplate(subject, subjectArea);
            default:
                return this.generateGenericTemplate(subject, subjectArea);
        }
    }

    generateReadingTemplate(subject) {
        return {
            type: 'reading',
            sources: subject.reading.sources,
            examples: subject.reading.examples,
            instructions: [
                'Read assigned materials focusing on key concepts and practical applications',
                'Take notes on main ideas, supporting evidence, and real-world examples',
                'Identify connections between theoretical concepts and practical implementation',
                'Prepare questions for class discussion or further research'
            ]
        };
    }

    generateCaseStudyTemplate(subject, subjectArea) {
        const contextMap = {
            'municipal administration': 'Canadian municipal government scenarios',
            'business management': 'Canadian business and organizational challenges',
            'accounting': 'Financial reporting and compliance scenarios',
            'computer science': 'Software development and technical challenges',
            'health sciences': 'Patient care and health system scenarios',
            'engineering': 'Design and technical problem-solving scenarios',
            'general': 'Real-world professional scenarios'
        };

        return {
            type: 'case-study',
            context: contextMap[subjectArea] || contextMap['general'],
            structure: [
                'Background and context analysis',
                'Problem identification and stakeholder analysis',
                'Alternative solution development',
                'Recommendation with supporting rationale',
                'Implementation considerations and potential challenges'
            ],
            requirements: [
                'Use current, relevant examples from Canadian context',
                'Apply course concepts and theoretical frameworks',
                'Include data and evidence to support analysis',
                'Consider multiple stakeholder perspectives'
            ]
        };
    }

    generateResearchTemplate(subject, subjectArea) {
        return {
            type: 'research',
            focus: subject.activities[2] || 'Research and analysis project',
            methodology: [
                'Literature review of current sources and best practices',
                'Data collection from reliable, authoritative sources',
                'Analysis using appropriate frameworks and methodologies',
                'Synthesis of findings with practical recommendations'
            ],
            sources: subject.reading.sources
        };
    }

    generateDiscussionTemplate(subject, subjectArea) {
        return {
            type: 'discussion',
            format: 'Structured online or in-class discussion',
            preparation: [
                'Complete assigned readings and research',
                'Develop initial position with supporting evidence',
                'Prepare thoughtful questions for peers',
                'Consider alternative perspectives and counter-arguments'
            ],
            participation: [
                'Share initial insights and analysis',
                'Respond constructively to peer contributions',
                'Ask clarifying questions and build on ideas',
                'Synthesize learning and identify key takeaways'
            ]
        };
    }

    generateInfographicTemplate(subject, subjectArea) {
        return {
            type: 'infographic',
            purpose: 'Visual communication of complex information',
            requirements: [
                'Professional design using tools like Canva or Adobe Creative Suite',
                'Clear visual hierarchy and information flow',
                'Accurate data representation with proper citations',
                'Accessibility features including alt text and high contrast',
                'Export in high-resolution format suitable for digital and print use'
            ],
            content: [
                'Key statistics and data points',
                'Process flows or relationship diagrams',
                'Comparative analysis or trend visualization',
                'Actionable insights or recommendations'
            ]
        };
    }

    generatePresentationTemplate(subject, subjectArea) {
        return {
            type: 'presentation',
            format: 'Professional presentation with visual aids',
            structure: [
                'Introduction and context setting',
                'Main content with supporting evidence',
                'Analysis and key insights',
                'Recommendations and next steps',
                'Conclusion and questions'
            ],
            requirements: [
                'Clear, professional slide design',
                'Appropriate use of visuals and data',
                'Engaging delivery with audience interaction',
                'Time management and pacing',
                'Preparation for questions and discussion'
            ]
        };
    }

    generateSimulationTemplate(subject, subjectArea) {
        const simulationMap = {
            'municipal administration': 'Municipal budget allocation or service delivery simulation',
            'business management': 'Business strategy or market competition simulation',
            'accounting': 'Financial reporting or audit process simulation',
            'computer science': 'System design or debugging simulation',
            'health sciences': 'Patient care or health system management simulation',
            'engineering': 'Design process or safety assessment simulation',
            'general': 'Professional decision-making simulation'
        };

        return {
            type: 'simulation',
            scenario: simulationMap[subjectArea] || simulationMap['general'],
            components: [
                'Role assignment and context briefing',
                'Decision-making phases with time constraints',
                'Resource allocation and constraint management',
                'Outcome evaluation and performance feedback',
                'Reflection on learning and real-world application'
            ],
            learning_objectives: [
                'Apply theoretical knowledge in practical scenarios',
                'Develop decision-making and problem-solving skills',
                'Experience consequences of choices in safe environment',
                'Practice collaboration and communication skills'
            ]
        };
    }

    generateGenericTemplate(subject, subjectArea) {
        return {
            type: 'activity',
            description: 'Engaging learning activity appropriate for the subject area',
            components: subject.activities,
            assessment_focus: subject.assessments[0] || 'Knowledge application and analysis'
        };
    }

    // Get subject-specific assessment criteria
    getAssessmentCriteria(subjectArea) {
        const criteriaMap = {
            'municipal administration': [
                'Understanding of municipal governance principles',
                'Application of policy frameworks and regulations',
                'Analysis of service delivery models and effectiveness',
                'Communication of recommendations to stakeholders'
            ],
            'business management': [
                'Strategic thinking and business analysis',
                'Application of management theories and frameworks',
                'Financial analysis and decision-making',
                'Leadership and communication skills'
            ],
            'accounting': [
                'Accuracy of financial calculations and reporting',
                'Understanding of accounting principles and standards',
                'Compliance with regulations and professional standards',
                'Clear communication of financial information'
            ],
            'computer science': [
                'Code quality, efficiency, and documentation',
                'Problem-solving and algorithmic thinking',
                'Understanding of technical concepts and principles',
                'Ability to debug and optimize solutions'
            ],
            'health sciences': [
                'Clinical knowledge and evidence-based practice',
                'Patient safety and ethical considerations',
                'Communication and interpersonal skills',
                'Critical thinking and problem-solving in healthcare contexts'
            ],
            'engineering': [
                'Technical accuracy and adherence to standards',
                'Problem-solving and design thinking',
                'Safety considerations and risk assessment',
                'Professional communication and documentation'
            ],
            'general': [
                'Comprehension of key concepts and principles',
                'Critical thinking and analysis',
                'Application of knowledge to practical situations',
                'Clear communication and presentation of ideas'
            ]
        };

        return criteriaMap[subjectArea] || criteriaMap['general'];
    }
}

module.exports = SubjectActivityTemplates;