const logger = require('../utils/logger');
const SubjectActivityTemplates = require('./subject-activity-templates');

class ProductionBlueprintGenerator {
    constructor() {
        this.currentCourse = null;
        this.activityTemplates = new SubjectActivityTemplates();
    }

    async generateProductionReadyContent(blueprint) {
        logger.info(`Generating production-ready content for ${blueprint.courseInfo.courseId}`);
        
        this.currentCourse = blueprint.courseInfo;
        
        // Extract course context for subject-specific content generation
        if (blueprint.courseContext) {
            this.currentCourse.courseContext = blueprint.courseContext;
        }
        
        // Generate detailed, production-ready content like MATH127 format
        const learningOutcomesContent = [];
        
        for (const outcome of blueprint.learningOutcomes) {
            const formattedOutcome = await this.formatProductionLearningOutcome(outcome);
            learningOutcomesContent.push(formattedOutcome);
        }
        
        return learningOutcomesContent.join('\n\n---\n\n');
    }

    async formatProductionLearningOutcome(outcome) {
        const outcomeId = outcome.id;
        const outcomeNumber = outcomeId.split('.')[0];
        
        // Start with main learning outcome header
        let content = `# ${outcomeId} ${outcome.text}\n\n`;
        
        // Add CMP notes for production team
        content += this.generateCMPNotes(outcome);
        
        // Add interactive requests if needed
        if (this.needsInteractiveContent(outcome)) {
            content += this.generateInteractiveRequests(outcome);
        }
        
        // Add graphics requests if needed  
        if (this.needsGraphicsContent(outcome)) {
            content += this.generateGraphicsRequests(outcome);
        }
        
        // Add main outcome description
        content += `${this.generateDetailedOutcomeDescription(outcome)}\n\n`;
        
        // Add learning steps section
        if (outcome.learningSteps && outcome.learningSteps.length > 0) {
            content += `## Learning Steps\n\n`;
            content += `By the end of this learning outcome, you will:\n\n`;
            
            outcome.learningSteps.forEach((step, index) => {
                content += `${index + 1}. ${step.text}\n\n`;
            });
        }
        
        // Add evaluation section with CMP link note
        content += `## Evaluation\n\nRefer to the Evaluation Summary page for details.\n\n`;
        content += `[[style:note]]\n\nCMP: link to the evaluation summary\n\n[[/style]]\n\n`;
        
        // Add detailed learning steps with production-ready activities
        if (outcome.learningSteps && outcome.learningSteps.length > 0) {
            for (let stepIndex = 0; stepIndex < outcome.learningSteps.length; stepIndex++) {
                const step = outcome.learningSteps[stepIndex];
                const stepContent = await this.formatProductionReadyStep(outcome, step, stepIndex);
                content += `\n${stepContent}\n`;
            }
        }
        
        // Add outcome summary at the end
        content += this.generateOutcomeSummary(outcome);
        
        return content;
    }

    generateCMPNotes(outcome) {
        const courseContext = this.currentCourse?.courseContext || {};
        const subjectArea = courseContext.subjectArea || 'general';
        const programType = courseContext.programType || 'general';
        const targetAudience = courseContext.targetAudience || 'students';
        
        const subjectRequirements = this.getSubjectSpecificRequirements(subjectArea, programType);
        
        return `[[style:note]]\n\nCMP\n\nThe following learning activities include embedded production requests for graphics, interactive elements, and multimedia content. Please follow the specifications in each request table for consistent production quality.\n\nSpecial requirements for ${subjectArea} content:\n${subjectRequirements.map(req => `- ${req}`).join('\n')}\n- Include accessibility features (alt text, captions) for all media\n- Follow Saskatchewan Polytechnic visual identity guidelines\n- Ensure professional presentation suitable for ${targetAudience.toLowerCase()}\n- Reference current authoritative sources and statistics when available\n\n[[/style]]\n\n`;
    }

    getSubjectSpecificRequirements(subjectArea, programType) {
        const requirementsMap = {
            'municipal administration': [
                'Use Canadian municipal examples and data throughout',
                'Reference current government policies and regulations',
                'Include examples from various municipality sizes (urban, rural, regional)',
                'Ensure compliance with municipal governance standards'
            ],
            'business management': [
                'Use Canadian business examples and case studies',
                'Reference current market data and business statistics',
                'Include examples from various industry sectors',
                'Ensure compliance with business ethics and professional standards'
            ],
            'accounting': [
                'Use Canadian accounting standards (ASPE/IFRS) and examples',
                'Reference current tax legislation and CRA guidelines',
                'Include examples from various business types and sizes',
                'Ensure compliance with professional accounting standards'
            ],
            'computer science': [
                'Use current technology examples and best practices',
                'Reference official documentation and industry standards',
                'Include examples from various programming languages and platforms',
                'Ensure code examples follow industry best practices'
            ],
            'health sciences': [
                'Use Canadian healthcare examples and guidelines',
                'Reference current Health Canada policies and research',
                'Include examples from various healthcare settings',
                'Ensure compliance with patient privacy and safety standards'
            ],
            'engineering': [
                'Use Canadian engineering standards and examples',
                'Reference current codes and professional engineering practices',
                'Include examples from various engineering disciplines',
                'Ensure compliance with safety and regulatory standards'
            ]
        };

        return requirementsMap[subjectArea] || [
            'Use Canadian examples and current practices',
            'Reference authoritative sources and recent research',
            'Include examples from various contexts and applications',
            'Ensure compliance with professional and academic standards'
        ];
    }

    needsInteractiveContent(outcome) {
        // Check if outcome requires interactive elements (quizzes, drag-and-drop, etc.)
        return outcome.learningActivities && 
               outcome.learningActivities.some(activity => 
                   activity.type === 'quiz' || 
                   activity.type === 'assessment' || 
                   activity.type === 'interactive'
               );
    }

    needsGraphicsContent(outcome) {
        // Check if outcome requires graphics production
        return outcome.learningActivities &&
               outcome.learningActivities.some(activity =>
                   activity.type === 'infographic' ||
                   activity.type === 'graphics_request' ||
                   activity.type === 'infographic_request'
               );
    }

    generateInteractiveRequests(outcome) {
        const topicSpecificQuiz = this.getTopicSpecificQuiz(outcome);
        
        return `[[style:request]]\n\n<table>\n<colgroup>\n<col style="width: 27%" />\n<col style="width: 72%" />\n</colgroup>\n<thead>\n<tr>\n<th colspan="2"><strong>Interactive Request</strong></th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><strong>Interactive Type</strong></td>\n<td><strong>H5P -- Interactive Quiz</strong></td>\n</tr>\n<tr>\n<td><p><strong>Activity Details</strong></p>\n<p><strong>&#x2610;</strong> Details below ticket</p></td>\n<td><p><em>Create comprehensive quiz using H5P in D2L Brightspace Creator+</em></p>\n<p>${topicSpecificQuiz.description}</p></td>\n</tr>\n<tr>\n<td><strong>Graphics & Media Support</strong></td>\n<td>Yes <em>${topicSpecificQuiz.mediaSupport}</em></td>\n</tr>\n<tr>\n<td><p><strong>Text Version</strong></p>\n<p><em>Add click to reveal for accessibility?</em></p></td>\n<td><strong>Yes</strong> <em>Provide accessible alternative with screen reader compatibility</em></td>\n</tr>\n</tbody>\n</table>\n\n[[/style]]\n\n`;
    }

    async getAICuratedReadingSources(activity) {
        const activityTitle = activity.title?.toLowerCase() || '';
        const activityContent = activity.content?.toLowerCase() || '';
        const searchText = (activityTitle + ' ' + activityContent).toLowerCase();
        
        // Initialize search service for AI curation
        const SearchService = require('./search-service');
        const searchService = new SearchService();
        
        try {
            // Use AI to curate specific articles based on the topic
            const curatedSources = await this.curateSpecificSources(searchText, searchService);
            return curatedSources;
        } catch (error) {
            console.log('AI curation failed, using enhanced static sources:', error.message);
            return this.getEnhancedStaticSources(activity);
        }
    }

    async curateSpecificSources(searchText, searchService) {
        const courseContext = this.currentCourse?.courseContext || {};
        const subjectArea = courseContext.subjectArea || 'general';
        
        // Use dynamic topic detection based on course context
        const { searchQuery, topicFocus } = this.buildContextualSearchQuery(searchText, subjectArea);

        // Search for current, authoritative sources with subject-specific parameters
        const searchResults = await searchService.searchForCourseContent(searchQuery, subjectArea, {
            maxResults: 8,
            location: 'Canada',
            timeframe: '2023 2024',
            sources: this.getSubjectSources(subjectArea),
            courseContext: subjectArea
        });

        // Format the curated sources
        return this.formatCuratedSources(searchResults, topicFocus);
    }

    buildContextualSearchQuery(searchText, subjectArea) {
        // Generic topic detection that works for any subject
        const searchLower = searchText.toLowerCase();
        
        // Extract key concepts from the search text
        const concepts = this.extractKeyConcepts(searchLower, subjectArea);
        
        if (concepts.length > 0) {
            const searchQuery = `${concepts.join(' ')} ${subjectArea} Canada academic research 2023 2024`;
            const topicFocus = concepts[0]; // Use the first concept as primary focus
            return { searchQuery, topicFocus };
        }
        
        // Fallback to general search
        return {
            searchQuery: `${subjectArea} best practices Canada 2024`,
            topicFocus: `general ${subjectArea}`
        };
    }

    extractKeyConcepts(searchText, subjectArea) {
        const concepts = [];
        
        // Subject-specific concept extraction
        if (subjectArea === 'municipal administration') {
            if (searchText.includes('municipal services') || searchText.includes('service delivery')) {
                concepts.push('municipal services', 'service delivery');
            }
            if (searchText.includes('emerging issues') || searchText.includes('management challenges')) {
                concepts.push('emerging issues', 'management challenges');
            }
            if (searchText.includes('political acumen') || searchText.includes('political skills')) {
                concepts.push('political acumen', 'public sector ethics');
            }
            if (searchText.includes('citizen engagement') || searchText.includes('engaging citizens')) {
                concepts.push('citizen engagement', 'public participation');
            }
        } else if (subjectArea === 'business management') {
            if (searchText.includes('strategic planning') || searchText.includes('strategy')) {
                concepts.push('strategic planning', 'business strategy');
            }
            if (searchText.includes('leadership') || searchText.includes('management')) {
                concepts.push('leadership', 'management practices');
            }
            if (searchText.includes('marketing') || searchText.includes('promotion')) {
                concepts.push('marketing', 'business promotion');
            }
        } else if (subjectArea === 'accounting') {
            if (searchText.includes('financial') || searchText.includes('reporting')) {
                concepts.push('financial reporting', 'accounting standards');
            }
            if (searchText.includes('tax') || searchText.includes('taxation')) {
                concepts.push('taxation', 'tax compliance');
            }
            if (searchText.includes('audit') || searchText.includes('auditing')) {
                concepts.push('auditing', 'audit procedures');
            }
        }
        // Add more subject areas as needed
        
        // Generic concept extraction if no specific concepts found
        if (concepts.length === 0) {
            const words = searchText.split(' ').filter(word => word.length > 3);
            concepts.push(...words.slice(0, 3)); // Take first 3 meaningful words
        }
        
        return concepts;
    }

    getSubjectSources(subjectArea) {
        const sourcesMap = {
            'municipal administration': 'government municipal education academic',
            'business management': 'business government statistics education',
            'accounting': 'professional government regulatory education',
            'computer science': 'technical documentation tutorial education',
            'health sciences': 'medical government research education',
            'engineering': 'professional technical government education'
        };
        
        return sourcesMap[subjectArea] || 'government education academic';
    }

    formatCuratedSources(searchResults, topicFocus) {
        // The search service returns a formatted string, not a structured object
        if (!searchResults || typeof searchResults !== 'string') {
            return this.getEnhancedStaticSources({ title: topicFocus });
        }

        // Extract the search summary and enhance it for educational use
        let formattedSources = `**AI-Curated Current Sources on ${this.getTopicDisplayName(topicFocus)}:**\n\n`;
        
        // Add the search results content
        formattedSources += searchResults;
        
        // Add educational focus areas
        formattedSources += `\n\n**Educational Focus Areas**: ${this.getTopicFocusAreas(topicFocus)}`;
        
        // Add reading guidance
        const courseContext = this.currentCourse?.courseContext || {};
        const subjectArea = courseContext.subjectArea || 'general';
        formattedSources += `\n\n**Reading Strategy**: Focus on Canadian examples, current challenges, and evidence-based practices. Look for specific data, case studies, and implementation strategies that apply to ${subjectArea} contexts.`;

        return { primarySources: formattedSources };
    }

    getTopicDisplayName(topicFocus) {
        const displayNames = {
            'municipal services': 'Municipal Service Delivery',
            'emerging issues': 'Municipal Challenges and Emerging Issues',
            'service delivery strategies': 'Service Delivery Strategies',
            'political acumen': 'Political Acumen in Municipal Administration',
            'government planning': 'Municipal Planning and Sustainability',
            'citizen engagement': 'Citizen Engagement in Municipal Government',
            'community planning': 'Community Planning Processes',
            'general municipal': 'Municipal Administration'
        };
        const courseContext = this.currentCourse?.courseContext || {};
        const subjectArea = courseContext.subjectArea || 'general';
        return displayNames[topicFocus] || this.capitalizeSubject(subjectArea);
    }

    getTopicFocusAreas(topicFocus) {
        const focusAreas = {
            'municipal services': 'Service categorization, delivery models, public vs. private provision, cost-effectiveness analysis',
            'emerging issues': 'Climate adaptation, fiscal sustainability, demographic changes, technology integration, governance innovation',
            'service delivery strategies': 'Public-private partnerships, shared services, regionalization, digital transformation, performance measurement',
            'political acumen': 'Political-administrative interface, ethical decision-making, stakeholder management, communication strategies',
            'government planning': 'Integrated planning approaches, climate adaptation, sustainable development, environmental assessment',
            'citizen engagement': 'Participation methods, digital platforms, inclusive engagement, consultation design, feedback integration',
            'community planning': 'Participatory planning, consensus building, implementation strategies, monitoring and evaluation',
            'general municipal': 'Municipal governance, public administration principles, Canadian municipal context'
        };
        const courseContext = this.currentCourse?.courseContext || {};
        const subjectArea = courseContext.subjectArea || 'general';
        return focusAreas[topicFocus] || `${this.capitalizeSubject(subjectArea)} principles and practices`;
    }

    getEnhancedStaticSources(activity) {
        const courseContext = this.currentCourse?.courseContext || {};
        const subjectArea = courseContext.subjectArea || 'general';
        
        // Use subject-specific templates for source generation
        const SubjectActivityTemplates = require('./subject-activity-templates');
        const templates = new SubjectActivityTemplates();
        const template = templates.getActivityTemplate(subjectArea, 'reading');
        
        return {
            primarySources: `**Essential Readings for ${this.capitalizeSubject(subjectArea)}:**

1. **Academic Foundation**:
   ${template.sources.map(source => `- ${source}`).join('\n   ')}

2. **Professional Resources**:
   ${template.examples.map(example => `- ${example}`).join('\n   ')}

3. **Current Practice**:
   - Recent industry reports and case studies
   - Professional association publications
   - Government and regulatory resources

**Focus Areas**: ${template.instructions.join(', ')}`
        };
        
        // Keep the old logic as fallback for municipal administration
        const activityTitle = activity.title?.toLowerCase() || '';
        const activityContent = activity.content?.toLowerCase() || '';
        const searchText = (activityTitle + ' ' + activityContent).toLowerCase();
        
        // Only use hardcoded content for municipal administration
        if (subjectArea === 'municipal administration' && (searchText.includes('municipal services') || searchText.includes('service delivery') || searchText.includes('summarize municipal'))) {
            return {
                primarySources: `**Essential Readings on Municipal Services:**

1. **Academic Foundation**:
   - Sancton, A. (2015). *Canadian Local Government: An Urban Perspective* (2nd ed.), Chapter 8: "Service Delivery", Oxford University Press
   - Kitchen, H. & Slack, E. (2006). "Providing Public Services in Remote Areas: Challenges for Canada's Small Towns" in *Canadian Public Policy*, Vol. 32, No. 2

2. **Government Reports**:
   - [FCM Municipal Infrastructure Report 2024](https://fcm.ca/en/resources/corporate-resources/municipal-infrastructure-report-2024)
   - [Statistics Canada: Municipal Government Revenue and Expenditures](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1010001401)
   - [Infrastructure Canada: Investing in Canada Plan](https://www.infrastructure.gc.ca/plan/about-invest-apropos-eng.html)

3. **Professional Resources**:
   - [IPAC Case Studies in Municipal Service Delivery](https://www.ipac.ca/iPAC_EN/Programs_and_Services/Case_Studies/iPAC_EN/Programs_and_Services/Case_Studies.aspx)
   - [Municipal World Magazine: Service Delivery Archives](https://www.municipalworld.com/category/service-delivery/)

**Focus Areas**: Service categorization, delivery models, public vs. private provision, cost-effectiveness analysis`
            };
        }
        
        // Emerging Issues readings
        if (searchText.includes('emerging issues') || searchText.includes('management challenges') || searchText.includes('local government structure')) {
            return {
                primarySources: `**Essential Readings on Municipal Challenges:**

1. **Current Research**:
   - Tindal, C.R. & Tindal, S.N. (2021). *Local Government in Canada* (9th ed.), Chapter 12: "Current Issues and Future Challenges", Nelson Education
   - Sancton, A. (2019). "Canadian Municipalities and COVID-19: Challenges and Innovations" in *Canadian Public Administration*, Vol. 63, No. 2

2. **Government Analysis**:
   - [FCM: Big City Mayors' Caucus Report on Urban Challenges](https://fcm.ca/en/focus-areas/big-city-mayors-caucus)
   - [Parliamentary Budget Officer: Municipal Infrastructure in Canada](https://www.pbo-dpb.gc.ca/en/blog/news/municipal-infrastructure-canada)
   - [Statistics Canada: Impact of COVID-19 on Municipal Finances](https://www150.statcan.gc.ca/n1/pub/68-001-x/2021001/article/00002-eng.htm)

3. **Policy Research**:
   - [Conference Board of Canada: Municipal Finance Reports](https://www.conferenceboard.ca/focus-areas/canadian-economics/municipal-finance)
   - [Canadian Urban Institute: Municipal Innovation Reports](https://www.canurb.org/publications)

**Focus Areas**: Climate change adaptation, fiscal sustainability, demographic shifts, technology integration, governance challenges`
            };
        }
        
        // Service Delivery Strategies readings
        if (searchText.includes('service delivery strategies') || searchText.includes('policy frameworks') || searchText.includes('delivery strategies')) {
            return {
                primarySources: `**Essential Readings on Service Delivery Strategies:**

1. **Strategic Frameworks**:
   - Kitchen, H. (2019). "Municipal Service Delivery: Alternatives and Their Implementation" in *Canadian Tax Journal*, Vol. 67, No. 2
   - Slack, E. & Bird, R. (2013). "Does Municipal Amalgamation Strengthen the Financial Capacity of Local Government?" in *Environment and Planning C*, Vol. 31, No. 4

2. **Best Practices Documentation**:
   - [FCM: Sustainable Service Delivery Guide](https://fcm.ca/en/resources/fcm/sustainable-service-delivery-guide)
   - [ICMA: Alternative Service Delivery Methods](https://icma.org/documents/alternative-service-delivery-methods)
   - [Municipal Finance Officers Association: Service Delivery Models](https://www.mfoa.on.ca/MFOA/Resources/Research_Reports/MFOA/Resources/Research_Reports.aspx)

3. **Case Studies**:
   - [Institute on Governance: Municipal Service Delivery Case Studies](https://iog.ca/research-publications/?_research_categories=municipal-governance)
   - [Canada West Foundation: Municipal Service Innovation](https://cwf.ca/research/?_research_categories=municipal-governance)

**Focus Areas**: Public-private partnerships, shared services, regionalization, digital transformation, performance measurement`
            };
        }
        
        // Political Acumen readings
        if (searchText.includes('political acumen') || searchText.includes('define political') || searchText.includes('political skills')) {
            return {
                primarySources: `**Essential Readings on Political Acumen in Municipal Administration:**

1. **Academic Sources**:
   - Siegel, D. (2015). "Politics and Public Administration in Canadian Municipalities" in *Leaders and Leadership in Canada* (2nd ed.), Chapter 15, University of Toronto Press
   - Pal, L.A. (2021). *Beyond Policy Analysis* (6th ed.), Chapter 3: "The Policy Process and Political Environment", Nelson Education

2. **Professional Development**:
   - [ICMA: Political Skills for Local Government Managers](https://icma.org/articles/article/political-skills-local-government-managers)
   - [IPAC: Ethics and Political Neutrality in Public Administration](https://www.ipac.ca/iPAC_EN/About_Us/Ethics/iPAC_EN/About_Us/Ethics.aspx)
   - [Municipal Management Institute: Political Acumen Workshop Materials](https://www.mmi.on.ca/professional-development)

3. **Government Resources**:
   - [Treasury Board Secretariat: Values and Ethics Code for Public Sector](https://www.tbs-sct.gc.ca/pol/doc-eng.aspx?id=25049)
   - [Ontario Municipal Affairs: Roles and Responsibilities Guide](https://www.ontario.ca/page/roles-and-responsibilities-municipal-government)

**Focus Areas**: Political-administrative interface, ethical decision-making, stakeholder management, communication strategies, boundary management`
            };
        }
        
        // Government Planning and Sustainability readings
        if (searchText.includes('government planning') || searchText.includes('sustainability') || searchText.includes('planning elements')) {
            return {
                primarySources: `**Essential Readings on Municipal Planning and Sustainability:**

1. **Planning Theory and Practice**:
   - Grant, J. (2020). *Planning the Good Community* (2nd ed.), Chapters 8-9: "Sustainable Communities" and "Climate Change Planning", University of Toronto Press
   - Seasons, M. (2019). "Municipal Planning in Canada: Challenges and Opportunities" in *Plan Canada*, Vol. 59, No. 2

2. **Sustainability Integration**:
   - [FCM: Sustainable Communities Conference Proceedings](https://fcm.ca/en/events-training/conferences/sustainable-communities-conference)
   - [Natural Resources Canada: Municipal Energy Planning](https://www.nrcan.gc.ca/energy/efficiency/communities-infrastructure/municipal-energy-planning/5133)
   - [Environment and Climate Change Canada: Municipal Climate Action](https://www.canada.ca/en/environment-climate-change/services/climate-change/municipalities.html)

3. **Best Practices**:
   - [ICLEI Canada: Local Government Sustainability Resources](https://icleicanada.org/resources/)
   - [Canadian Institute of Planners: Planning Practice Resources](https://www.cip-icu.ca/Resources/Planning-Practice)

**Focus Areas**: Integrated planning approaches, climate adaptation, sustainable development, environmental assessment, community engagement in planning`
            };
        }
        
        // Citizen Engagement readings
        if (searchText.includes('citizen engagement') || searchText.includes('engaging citizens') || searchText.includes('engagement methods')) {
            return {
                primarySources: `**Essential Readings on Citizen Engagement:**

1. **Engagement Theory and Methods**:
   - Phillips, S.D. & Orsini, M. (2019). *Mapping the Links: Citizen Engagement, Non-profits and Local Government*, Chapter 4: "Municipal Engagement Strategies", University of Toronto Press
   - Lowndes, V. & Sullivan, H. (2018). "How Low Can You Go? Rationales and Challenges for Neighbourhood Governance" in *Public Administration*, Vol. 86, No. 1

2. **Canadian Practice**:
   - [FCM: Citizen Engagement Toolkit](https://fcm.ca/en/resources/fcm/citizen-engagement-toolkit)
   - [Institute on Governance: Public Engagement Guide](https://iog.ca/docs/Engagement_Guide_Final.pdf)
   - [Samara Centre for Democracy: Municipal Engagement Research](https://www.samaracanada.com/research/political-leadership/municipal-politics)

3. **Digital Engagement**:
   - [Canadian Digital Government: Municipal Digital Engagement](https://digital.canada.ca/2019/10/15/municipal-digital-services/)
   - [Code for Canada: Civic Technology Resources](https://codefor.ca/resources/)

**Focus Areas**: Participation methods, digital platforms, inclusive engagement, consultation design, feedback integration, community building`
            };
        }
        
        // Community Planning readings
        if (searchText.includes('community planning') || searchText.includes('planning process') || searchText.includes('stakeholder involvement')) {
            return {
                primarySources: `**Essential Readings on Community Planning:**

1. **Planning Process and Methods**:
   - Hodge, G. & Gordon, D. (2021). *Planning Canadian Communities* (7th ed.), Chapters 12-13: "Community Planning Process" and "Implementation", Nelson Education
   - Forester, J. (2020). "Planning in the Face of Conflict: Negotiation and Mediation Strategies" in *Journal of Planning Education and Research*, Vol. 40, No. 2

2. **Stakeholder Engagement**:
   - [Canadian Institute of Planners: Public Participation Guidelines](https://www.cip-icu.ca/Files/Resources/PUBLIC-PARTICIPATION-GUIDELINES)
   - [Planning Institute of British Columbia: Community Engagement Best Practices](https://www.pibc.bc.ca/community-engagement-best-practices)
   - [Ontario Professional Planners Institute: Consultation Toolkit](https://ontarioplanners.ca/Knowledge-Centre/Consultation-Toolkit)

3. **Implementation Strategies**:
   - [Municipal Research and Services Center: Community Planning Implementation](https://mrsc.org/Home/Explore-Topics/Planning/General-Planning-and-Growth-Management/Comprehensive-Planning-Growth-Management.aspx)
   - [Lincoln Institute of Land Policy: Community Planning Resources](https://www.lincolninst.edu/publications?field_publication_topics_target_id=1156)

**Focus Areas**: Participatory planning, consensus building, implementation strategies, monitoring and evaluation, adaptive planning`
            };
        }
        
        // Generic fallback for other topics
        return {
            primarySources: `**General Municipal Administration Resources:**

1. **Core Textbooks**:
   - Sancton, A. (2015). *Canadian Local Government: An Urban Perspective* (2nd ed.), Oxford University Press
   - Tindal, C.R. & Tindal, S.N. (2021). *Local Government in Canada* (9th ed.), Nelson Education

2. **Government Resources**:
   - [Federation of Canadian Municipalities Resource Library](https://fcm.ca/en/resources)
   - [Statistics Canada: Government Statistics](https://www.statcan.gc.ca/en/subjects-start/government)

3. **Professional Development**:
   - [Institute of Public Administration of Canada](https://www.ipac.ca/)
   - [International City/County Management Association](https://icma.org/)

**Focus Areas**: Municipal governance, public administration principles, Canadian municipal context`
        };
    }

    getTopicSpecificReflectionQuestions(activity) {
        const activityTitle = activity.title?.toLowerCase() || '';
        const activityContent = activity.content?.toLowerCase() || '';
        const searchText = (activityTitle + ' ' + activityContent).toLowerCase();
        
        if (searchText.includes('municipal services') || searchText.includes('service delivery') || searchText.includes('summarize municipal')) {
            return `Before reading, reflect on the following questions:

1. **Service Inventory**: What municipal services do you and your family use regularly? How would your daily life change without them?
2. **Service Quality**: Which municipal services in your community work well? Which ones need improvement?
3. **Service Delivery**: Have you noticed different ways municipalities deliver services (direct, contracted, partnerships)?
4. **Career Connection**: How does understanding municipal services connect to your career goals in public administration?

Compose answers in your head or notes, then proceed with the assigned readings.`;
        }
        
        if (searchText.includes('emerging issues') || searchText.includes('management challenges') || searchText.includes('local government structure')) {
            return `Before reading, reflect on the following questions:

1. **Current Challenges**: What major challenges is your local municipality currently facing (budget, infrastructure, growth, etc.)?
2. **News Awareness**: What recent news stories about municipal government have caught your attention?
3. **Change Observation**: How has your municipality changed in the past 5-10 years? What drove those changes?
4. **Future Thinking**: What challenges do you think municipalities will face in the next decade?

Compose answers in your head or notes, then proceed with the assigned readings.`;
        }
        
        if (searchText.includes('service delivery strategies') || searchText.includes('policy frameworks') || searchText.includes('delivery strategies')) {
            return `Before reading, reflect on the following questions:

1. **Delivery Models**: Can you think of examples where your municipality uses different approaches (in-house, contracted, partnerships) for different services?
2. **Effectiveness**: Which municipal services seem most efficiently delivered? What makes them effective?
3. **Innovation**: Have you seen examples of municipalities trying new approaches to service delivery?
4. **Policy Impact**: How do provincial or federal policies affect how your municipality delivers services?

Compose answers in your head or notes, then proceed with the assigned readings.`;
        }
        
        if (searchText.includes('political acumen') || searchText.includes('define political') || searchText.includes('political skills')) {
            return `Before reading, reflect on the following questions:

1. **Political Awareness**: How do you see politics influencing municipal administration in your community?
2. **Professional Boundaries**: What's the difference between being politically aware and being political as a municipal employee?
3. **Stakeholder Dynamics**: Who are the key stakeholders that municipal administrators must work with effectively?
4. **Ethical Considerations**: How can municipal staff support elected officials while maintaining professional integrity?

Compose answers in your head or notes, then proceed with the assigned readings.`;
        }
        
        if (searchText.includes('government planning') || searchText.includes('sustainability') || searchText.includes('planning elements')) {
            return `Before reading, reflect on the following questions:

1. **Planning Examples**: What examples of municipal planning do you see in your community (land use, transportation, environmental)?
2. **Sustainability Integration**: How does your municipality incorporate environmental considerations into its planning?
3. **Long-term Thinking**: What long-term challenges should municipal planning address in your region?
4. **Planning Participation**: Have you or your family ever participated in municipal planning processes? What was the experience like?

Compose answers in your head or notes, then proceed with the assigned readings.`;
        }
        
        if (searchText.includes('citizen engagement') || searchText.includes('engaging citizens') || searchText.includes('engagement methods')) {
            return `Before reading, reflect on the following questions:

1. **Engagement Experience**: Have you ever participated in municipal consultations, town halls, or public meetings? What was effective or ineffective?
2. **Communication Channels**: How does your municipality communicate with residents? Which methods work best for different groups?
3. **Participation Barriers**: What prevents people from participating in municipal decision-making? How could these be addressed?
4. **Digital Engagement**: How is technology changing how municipalities engage with citizens?

Compose answers in your head or notes, then proceed with the assigned readings.`;
        }
        
        if (searchText.includes('community planning') || searchText.includes('planning process') || searchText.includes('stakeholder involvement')) {
            return `Before reading, reflect on the following questions:

1. **Planning Participation**: Have you observed community planning processes in your area? Who was involved and how?
2. **Stakeholder Diversity**: Who should be involved in community planning? How can municipalities ensure diverse participation?
3. **Planning Outcomes**: Can you think of examples where community planning led to positive changes in your area?
4. **Implementation Challenges**: What makes it difficult to implement community plans? How can these challenges be addressed?

Compose answers in your head or notes, then proceed with the assigned readings.`;
        }
        
        // Generic fallback
        return `Before reading, reflect on the following questions:

1. **Personal Experience**: How does this topic relate to your experience with municipal government?
2. **Community Observation**: What have you observed in your community related to this topic?
3. **Professional Interest**: How does this topic connect to your career goals in municipal administration?
4. **Current Awareness**: What recent developments related to this topic have you noticed?

Compose answers in your head or notes, then proceed with the assigned readings.`;
    }

    getTopicSpecificQuiz(outcome) {
        const outcomeText = outcome.text.toLowerCase();
        
        if (outcomeText.includes('municipal services')) {
            return {
                description: 'Municipal services quiz with multiple choice, true/false, and scenario-based questions. Focus on service categorization, importance, and challenges facing Canadian municipalities. Include immediate feedback and explanations for all questions.',
                mediaSupport: 'Include service delivery charts and municipal organizational diagrams to support questions'
            };
        } else if (outcomeText.includes('emerging issues') || outcomeText.includes('management challenges')) {
            return {
                description: 'Emerging issues and management challenges quiz with multiple choice, true/false, and scenario-based questions. Focus on current challenges facing Canadian municipalities and management responses. Include immediate feedback and explanations for all questions.',
                mediaSupport: 'Include trend charts and challenge analysis infographics to support questions'
            };
        } else if (outcomeText.includes('service delivery strategies')) {
            return {
                description: 'Service delivery strategies quiz with multiple choice, true/false, and scenario-based questions. Focus on different delivery models, policy frameworks, and strategic approaches used by Canadian municipalities. Include immediate feedback and explanations for all questions.',
                mediaSupport: 'Include service delivery model diagrams and strategy comparison charts to support questions'
            };
        } else if (outcomeText.includes('government planning') || outcomeText.includes('sustainability')) {
            return {
                description: 'Government planning and sustainability quiz with multiple choice, true/false, and scenario-based questions. Focus on planning elements, sustainability integration, and planning processes in Canadian municipalities. Include immediate feedback and explanations for all questions.',
                mediaSupport: 'Include planning process flowcharts and sustainability framework diagrams to support questions'
            };
        } else if (outcomeText.includes('citizen engagement') || outcomeText.includes('engaging citizens')) {
            return {
                description: 'Citizen engagement quiz with multiple choice, true/false, and scenario-based questions. Focus on engagement methods, importance, and best practices in Canadian municipal contexts. Include immediate feedback and explanations for all questions.',
                mediaSupport: 'Include engagement method comparisons and participation level charts to support questions'
            };
        } else if (outcomeText.includes('community planning')) {
            return {
                description: 'Community planning quiz with multiple choice, true/false, and scenario-based questions. Focus on planning elements, stakeholder involvement, and planning processes in Canadian municipalities. Include immediate feedback and explanations for all questions.',
                mediaSupport: 'Include planning process diagrams and stakeholder mapping visuals to support questions'
            };
        } else if (outcomeText.includes('political acumen')) {
            return {
                description: 'Political acumen quiz with multiple choice, true/false, and scenario-based questions. Focus on political skills, importance in municipal administration, and ethical considerations. Include immediate feedback and explanations for all questions.',
                mediaSupport: 'Include political skills frameworks and municipal governance structure diagrams to support questions'
            };
        } else {
            return {
                description: 'Municipal administration quiz with multiple choice, true/false, and scenario-based questions. Focus on Canadian municipal examples and practical applications. Include immediate feedback and explanations for all questions.',
                mediaSupport: 'Include relevant charts and infographics to support questions'
            };
        }
    }

    generateGraphicsRequests(outcome) {
        const topicSpecificGraphics = this.getTopicSpecificGraphics(outcome);
        
        return `[[style:request]]\n\n<table>\n<colgroup>\n<col style="width: 24%" />\n<col style="width: 75%" />\n</colgroup>\n<thead>\n<tr>\n<th colspan="2"><strong>Graphics Request</strong></th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><strong>Image Size</strong></td>\n<td><p><em>width for landscape orientation and height for portrait orientation</em></p>\n<p>11x17 inches for professional infographic, optimized for both print and digital use</p></td>\n</tr>\n<tr>\n<td><strong>GDA Instructions</strong></td>\n<td><p>${topicSpecificGraphics.instructions}</p>\n<p>Requirements: Canadian municipal data, professional color scheme, accessibility compliant design, clear visual hierarchy, Saskatchewan Polytechnic branding</p></td>\n</tr>\n<tr>\n<td><strong>Special Use</strong></td>\n<td>Educational resource for student learning and analysis</td>\n</tr>\n<tr>\n<td><strong>Image Sample</strong></td>\n<td>${topicSpecificGraphics.imageSample}</td>\n</tr>\n<tr>\n<td><strong>Completed Filename</strong></td>\n<td>${topicSpecificGraphics.filename}</td>\n</tr>\n<tr>\n<td><strong>Alignment</strong></td>\n<td>Center alignment for maximum impact</td>\n</tr>\n<tr>\n<td><p><strong>Alt Tag (&lt; 125 char)</strong></p>\n<p><strong>&#x2610;</strong> Decorative</p></td>\n<td>${topicSpecificGraphics.altTag}</td>\n</tr>\n<tr>\n<td><strong>Citation</strong></td>\n<td><p>Original work</p>\n<p>Saskatchewan Polytechnic - Municipal Administration Program</p></td>\n</tr>\n<tr>\n<td><strong>Caption</strong></td>\n<td>${topicSpecificGraphics.caption}</td>\n</tr>\n<tr>\n<td><strong>Comments for CMP</strong></td>\n<td>${topicSpecificGraphics.comments}</td>\n</tr>\n</tbody>\n</table>\n\n[[/style]]\n\n`;
    }

    getTopicSpecificGraphics(outcome) {
        const outcomeText = outcome.text.toLowerCase();
        
        if (outcomeText.includes('municipal services')) {
            return {
                instructions: 'Create professional infographic showing municipal service categories, types, and their interconnected impacts on community development.',
                imageSample: '[Reference examples from FCM service delivery reports and municipal annual reports]',
                filename: 'municipal_services_framework.jpg',
                altTag: 'Professional infographic showing municipal service categories and their interconnected impacts on community development',
                caption: 'Municipal Services Framework',
                comments: 'This infographic should support learning by clearly showing how different municipal services interconnect and impact community outcomes'
            };
        } else if (outcomeText.includes('emerging issues') || outcomeText.includes('management challenges')) {
            return {
                instructions: 'Create professional infographic showing current emerging issues and management challenges facing Canadian municipalities.',
                imageSample: '[Reference examples from FCM trend reports and municipal challenge studies]',
                filename: 'municipal_challenges_framework.jpg',
                altTag: 'Professional infographic showing emerging issues and management challenges facing Canadian municipalities',
                caption: 'Municipal Management Challenges Framework',
                comments: 'This infographic should illustrate current challenges municipalities face and potential management approaches'
            };
        } else if (outcomeText.includes('service delivery strategies')) {
            return {
                instructions: 'Create professional infographic showing different municipal service delivery strategies and models used across Canada.',
                imageSample: '[Reference examples from service delivery best practice reports and municipal innovation studies]',
                filename: 'service_delivery_strategies.jpg',
                altTag: 'Professional infographic showing municipal service delivery strategies and implementation models',
                caption: 'Municipal Service Delivery Strategies',
                comments: 'This infographic should compare different service delivery approaches and their effectiveness'
            };
        } else if (outcomeText.includes('government planning') || outcomeText.includes('sustainability')) {
            return {
                instructions: 'Create professional infographic showing government planning elements and their relationship to sustainability principles.',
                imageSample: '[Reference examples from municipal sustainability plans and government planning frameworks]',
                filename: 'government_planning_sustainability.jpg',
                altTag: 'Professional infographic showing government planning elements and sustainability integration',
                caption: 'Government Planning and Sustainability Framework',
                comments: 'This infographic should demonstrate how planning processes integrate sustainability considerations'
            };
        } else if (outcomeText.includes('citizen engagement') || outcomeText.includes('engaging citizens')) {
            return {
                instructions: 'Create professional infographic showing citizen engagement methods and their importance in municipal governance.',
                imageSample: '[Reference examples from citizen engagement best practices and municipal consultation reports]',
                filename: 'citizen_engagement_methods.jpg',
                altTag: 'Professional infographic showing citizen engagement methods and importance in municipal governance',
                caption: 'Citizen Engagement Methods and Importance',
                comments: 'This infographic should illustrate various citizen engagement approaches and their benefits'
            };
        } else if (outcomeText.includes('community planning')) {
            return {
                instructions: 'Create professional infographic showing key elements of community planning in municipal administration.',
                imageSample: '[Reference examples from community planning guides and municipal development frameworks]',
                filename: 'community_planning_elements.jpg',
                altTag: 'Professional infographic showing key elements of community planning in municipal administration',
                caption: 'Community Planning Elements Framework',
                comments: 'This infographic should outline the essential components of effective community planning'
            };
        } else if (outcomeText.includes('political acumen')) {
            return {
                instructions: 'Create professional infographic showing the importance of political acumen in municipal administration and key skills required.',
                imageSample: '[Reference examples from municipal leadership guides and political skills frameworks]',
                filename: 'political_acumen_framework.jpg',
                altTag: 'Professional infographic showing political acumen importance and key skills in municipal administration',
                caption: 'Political Acumen in Municipal Administration',
                comments: 'This infographic should demonstrate why political acumen matters and what skills are essential'
            };
        } else {
            // Generic fallback
            return {
                instructions: 'Create professional infographic related to municipal administration concepts.',
                imageSample: '[Reference examples from government infographics and municipal reports]',
                filename: 'municipal_administration_concept.jpg',
                altTag: 'Professional infographic illustrating municipal administration concepts',
                caption: 'Municipal Administration Framework',
                comments: 'This infographic should support the learning objective with relevant visual information'
            };
        }
    }

    generateDetailedOutcomeDescription(outcome) {
        const courseContext = this.currentCourse?.courseContext || {};
        const subjectArea = courseContext.subjectArea || 'general';
        const outcomeText = outcome.text.toLowerCase();
        
        // Generate subject-specific descriptions
        if (subjectArea === 'computer science') {
            return this.generateComputerScienceDescription(outcome, outcomeText);
        } else if (subjectArea === 'municipal administration') {
            return this.generateMunicipalAdminDescription(outcome, outcomeText);
        } else if (subjectArea === 'business management') {
            return this.generateBusinessDescription(outcome, outcomeText);
        } else if (subjectArea === 'accounting') {
            return this.generateAccountingDescription(outcome, outcomeText);
        } else {
            return this.generateGenericDescription(outcome, outcomeText);
        }
    }

    generateComputerScienceDescription(outcome, outcomeText) {
        if (outcomeText.includes('programming terminology') || outcomeText.includes('explain')) {
            return `Programming terminology forms the foundation of effective communication in software development. This learning outcome develops your understanding of essential programming concepts, vocabulary, and technical language used in Java programming and software development generally.

You'll master key terms related to variables, data types, control structures, methods, and object-oriented programming concepts. Through hands-on examples and practical applications, you'll learn to use programming terminology accurately and communicate technical concepts clearly with other developers.

This learning outcome prepares you for professional software development by establishing the vocabulary and conceptual framework necessary for advanced programming topics and effective collaboration in development teams.`;
        } else if (outcomeText.includes('elementary programming') || outcomeText.includes('perform')) {
            return `Elementary programming skills are the building blocks of software development. This learning outcome focuses on developing your ability to write basic Java programs that demonstrate fundamental programming concepts including variables, input/output operations, and simple calculations.

You'll practice creating programs that solve real-world problems using proper Java syntax, coding conventions, and development tools. Through progressive exercises, you'll build confidence in writing, testing, and debugging simple programs while establishing good programming habits.

This learning outcome provides the practical foundation for more advanced programming concepts by ensuring you can implement basic algorithms and understand how programs execute.`;
        } else if (outcomeText.includes('debugging') || outcomeText.includes('troubleshoot')) {
            return `Debugging and troubleshooting are essential skills for every programmer. This learning outcome develops your ability to identify, analyze, and resolve programming errors using systematic debugging techniques and development tools.

You'll learn to use debugging tools effectively, interpret error messages, trace program execution, and apply logical problem-solving approaches to fix code issues. Through hands-on practice with common programming errors, you'll develop the analytical skills necessary for efficient troubleshooting.

This learning outcome prepares you for professional software development by building the problem-solving skills and debugging techniques that are essential for maintaining and improving software systems.`;
        } else if (outcomeText.includes('strings') || outcomeText.includes('mathematical')) {
            return `String manipulation and mathematical operations are fundamental programming skills used in countless applications. This learning outcome develops your ability to create programs that process text data and perform mathematical calculations using Java's built-in libraries and methods.

You'll explore string methods for text processing, mathematical functions for calculations, and learn to combine these capabilities to solve practical programming problems. Through project-based learning, you'll apply these skills to create useful programs that demonstrate real-world applications.

This learning outcome builds essential programming capabilities that form the foundation for more complex applications involving data processing, user interfaces, and business logic.`;
        } else if (outcomeText.includes('operators') || outcomeText.includes('decision')) {
            return `Operators and decision statements enable programs to make choices and respond to different conditions. This learning outcome develops your understanding of comparison operators, logical operators, and conditional statements that control program flow.

You'll learn to implement if-else statements, switch statements, and complex conditional logic to create programs that respond appropriately to user input and changing conditions. Through practical exercises, you'll master the logic and syntax needed for effective decision-making in programs.

This learning outcome provides essential skills for creating interactive and responsive programs that can handle multiple scenarios and user requirements.`;
        } else if (outcomeText.includes('repetition') || outcomeText.includes('loops')) {
            return `Repetition structures (loops) are powerful programming constructs that enable efficient processing of data and automation of repetitive tasks. This learning outcome develops your ability to implement and control various types of loops in Java programs.

You'll master for loops, while loops, and do-while loops, learning when to use each type and how to control loop execution effectively. Through hands-on programming exercises, you'll create programs that process arrays, validate input, and perform iterative calculations.

This learning outcome builds essential programming skills for data processing, user interaction, and algorithm implementation that are fundamental to most software applications.`;
        } else if (outcomeText.includes('methods') || outcomeText.includes('create')) {
            return `Methods are the building blocks of well-organized, reusable code. This learning outcome develops your ability to design, implement, and use methods to create modular, maintainable Java programs.

You'll learn method syntax, parameter passing, return values, and method overloading while practicing good software design principles. Through progressive projects, you'll create programs that demonstrate effective use of methods for code organization and reusability.

This learning outcome establishes fundamental software design skills that are essential for creating professional-quality programs and collaborating effectively in development teams.`;
        }
        
        return this.generateGenericDescription(outcome, outcomeText);
    }

    generateBusinessDescription(outcome, outcomeText) {
        return `This learning outcome focuses on developing both theoretical understanding and practical skills in business management. Through a combination of research, analysis, and hands-on activities, you'll build competencies that are essential for effective business operations and strategic decision-making.

The content emphasizes real-world application, current Canadian business examples, and practical skills that directly prepare you for business management careers. Each activity is designed to connect academic concepts with professional practice, ensuring you develop both knowledge and applied capabilities.`;
    }

    generateAccountingDescription(outcome, outcomeText) {
        return `This learning outcome focuses on developing both theoretical understanding and practical skills in accounting and financial management. Through a combination of research, analysis, and hands-on activities, you'll build competencies that are essential for accurate financial reporting and compliance with Canadian accounting standards.

The content emphasizes real-world application, current Canadian accounting practices, and practical skills that directly prepare you for accounting careers. Each activity is designed to connect academic concepts with professional practice, ensuring you develop both knowledge and applied capabilities.`;
    }

    generateGenericDescription(outcome, outcomeText) {
        const courseContext = this.currentCourse?.courseContext || {};
        const subjectArea = courseContext.subjectArea || 'general';
        const targetAudience = courseContext.targetAudience || 'students';
        
        return `This learning outcome focuses on developing both theoretical understanding and practical skills in ${subjectArea}. Through a combination of research, analysis, and hands-on activities, you'll build competencies that are essential for effective professional practice in your field.

The content emphasizes real-world application, current Canadian examples, and practical skills that directly prepare you for careers in ${subjectArea}. Each activity is designed to connect academic concepts with professional practice, ensuring you develop both knowledge and applied capabilities.`;
    }

    generateMunicipalAdminDescription(outcome, outcomeText) {
        if (outcomeText.includes('municipal services')) {
            return `Municipal services are the foundation of community life in Canada, encompassing everything from essential utilities to quality-of-life programs. This learning outcome will develop your expertise in categorizing and understanding the full spectrum of services that municipalities provide to their residents and businesses. You'll explore essential services (those legally required for public health and safety), infrastructure services (the physical systems supporting community function), and enhanced services (programs that improve quality of life).

Through real-world Canadian examples and hands-on activities, you'll analyze service delivery models, understand their critical importance to community well-being, and examine the complex challenges municipal administrators face in the 21st century. By completion, you'll be able to categorize services effectively, articulate their community impact, and critically evaluate municipal service delivery strategies used across Canada.

This learning outcome prepares you for the practical realities of municipal administration by connecting theoretical knowledge with current Canadian municipal practices and challenges.`;
        } else if (outcomeText.includes('emerging issues') || outcomeText.includes('management challenges')) {
            return `Municipal governments today operate in an increasingly complex and rapidly changing environment. This learning outcome examines the contemporary challenges confronting local governments across Canada, from technological disruption and climate change impacts to demographic shifts, fiscal constraints, and evolving citizen expectations.

You'll develop critical analytical skills to evaluate these multi-faceted challenges and explore innovative management approaches that municipalities are adopting to address them. Through case studies, current events analysis, and interactive discussions, you'll examine how Canadian municipalities are adapting their operations, service delivery, and governance approaches to meet 21st-century challenges.

The focus throughout will be on practical problem-solving and strategic thinking, preparing you to contribute meaningfully to municipal organizations that must balance competing demands while serving diverse community needs within constrained resources.`;
        } else if (outcomeText.includes('service delivery strategies')) {
            return `Effective service delivery is at the heart of successful municipal administration. This learning outcome explores the diverse strategies and models that Canadian municipalities use to deliver services to their communities, from traditional in-house delivery to innovative partnerships, shared services arrangements, and digital transformation initiatives.

You'll examine different approaches through the lens of effectiveness, efficiency, and community satisfaction, learning to evaluate which strategies work best in different contexts. Real examples from Canadian municipalities will illustrate successful implementations, challenges overcome, and lessons learned.

This hands-on analysis will prepare you to make informed recommendations about service delivery options, understand the trade-offs involved in different approaches, and contribute to strategic planning processes in municipal organizations.`;
        } else if (outcomeText.includes('government planning') || outcomeText.includes('sustainability')) {
            return `Government planning is the strategic foundation that guides municipal decision-making and resource allocation. This learning outcome explores how municipalities develop comprehensive plans that balance community needs, environmental stewardship, and economic development while ensuring long-term sustainability.

You'll examine the essential elements of government planning including land use planning, infrastructure development, environmental protection, and community engagement. Through Canadian case studies and planning frameworks, you'll understand how sustainability principles are integrated into municipal planning processes and how these plans guide day-to-day municipal operations.

This learning outcome prepares you to contribute to municipal planning processes, understand the relationship between planning and sustainability, and evaluate planning decisions through multiple lenses including environmental, social, and economic impacts.`;
        } else if (outcomeText.includes('citizen engagement') || outcomeText.includes('engaging citizens')) {
            return `Citizen engagement is fundamental to effective democratic governance and successful municipal administration. This learning outcome explores why citizen participation matters, how it strengthens municipal decision-making, and the various methods municipalities use to involve residents in governance processes.

You'll examine traditional engagement methods like public meetings and consultations alongside innovative approaches including digital platforms, citizen panels, and participatory budgeting. Through Canadian examples, you'll analyze what makes engagement effective, how to reach diverse community voices, and how to integrate citizen input into municipal decision-making.

This learning outcome prepares you to design and implement citizen engagement strategies, understand the benefits and challenges of public participation, and contribute to building stronger relationships between municipalities and the communities they serve.`;
        } else if (outcomeText.includes('community planning')) {
            return `Community planning is the collaborative process through which municipalities work with residents, businesses, and stakeholders to shape their community's future. This learning outcome explores the key elements of effective community planning including visioning, stakeholder engagement, implementation strategies, and ongoing evaluation.

You'll examine how successful community planning integrates diverse perspectives, balances competing interests, and creates actionable plans that guide municipal development. Through Canadian case studies, you'll analyze planning processes, understand the roles of different stakeholders, and learn how to facilitate collaborative planning initiatives.

This learning outcome prepares you to participate in and lead community planning processes, understand the essential components of effective planning, and contribute to creating plans that reflect community values and priorities while being realistic and implementable.`;
        } else if (outcomeText.includes('best practices') && outcomeText.includes('community planning')) {
            return `Applying best practices in community planning requires understanding what works, why it works, and how to adapt successful approaches to different community contexts. This learning outcome focuses on identifying, evaluating, and implementing proven community planning strategies used by successful Canadian municipalities.

You'll examine award-winning planning initiatives, analyze their key success factors, and learn how to adapt best practices to different community sizes, demographics, and challenges. Through practical exercises, you'll develop skills in evaluating planning approaches, identifying transferable elements, and implementing improvements in real municipal contexts.

This learning outcome prepares you to be an effective practitioner who can learn from others' successes, avoid common pitfalls, and contribute to continuous improvement in municipal planning practices.`;
        } else if (outcomeText.includes('political acumen')) {
            return `Political acumen is the ability to understand and navigate the political dimensions of municipal administration effectively. This learning outcome explores why political awareness and skills are essential for municipal administrators, how political dynamics influence municipal operations, and the key competencies needed to work effectively in political environments.

You'll examine the relationship between elected officials and municipal staff, understand how political considerations affect administrative decisions, and develop skills in stakeholder management, communication, and strategic thinking. Through Canadian municipal examples, you'll analyze how successful administrators balance political awareness with professional integrity.

This learning outcome prepares you to work effectively in the political environment of municipal government, understand the importance of political sensitivity in administrative roles, and develop the skills needed to support elected officials while maintaining professional standards and serving the public interest.`;
        } else {
            // Generic fallback with professional focus
            return `This learning outcome focuses on developing both theoretical understanding and practical skills in municipal administration. Through a combination of research, analysis, and hands-on activities, you'll build competencies that are essential for effective public service delivery in Canadian municipalities.

The content emphasizes real-world application, current Canadian examples, and practical skills that directly prepare you for municipal administration careers. Each activity is designed to connect academic concepts with professional practice, ensuring you develop both knowledge and applied capabilities.`;
        }
    }

    async formatProductionReadyStep(outcome, step, stepIndex) {
        const outcomeNumber = outcome.id.split('.')[0];
        const stepNumber = stepIndex + 1;
        const stepId = `${outcomeNumber}.${stepNumber}.0`;
        
        let content = `# ${stepId} ${step.text}\n\n`;
        
        // Add step introduction with municipal context
        content += `${this.generateDetailedStepDescription(step, outcome)}\n\n`;
        
        // Add production-ready activities for this step
        if (outcome.learningActivities) {
            const stepActivities = outcome.learningActivities.filter(
                activity => activity.stepId === stepId
            );
            
            for (let activityIndex = 0; activityIndex < stepActivities.length; activityIndex++) {
                const activity = stepActivities[activityIndex];
                const activityContent = await this.formatProductionReadyActivity(
                    activity, 
                    outcomeNumber, 
                    stepNumber, 
                    activityIndex + 1
                );
                content += `${activityContent}\n\n`;
            }
        }
        
        return content;
    }

    generateDetailedStepDescription(step, outcome) {
        const stepText = step.text.toLowerCase();
        const outcomeText = outcome.text.toLowerCase();
        
        // Topic-specific step descriptions based on both step and outcome context
        if (stepText.includes('summarize municipal services')) {
            return `Municipal services form the invisible infrastructure that makes community life possible. From the moment residents turn on a tap for clean water to walking on maintained sidewalks to accessing recreation programs, municipal services surround and support every aspect of daily life.

In this step, you'll develop expertise in categorizing and summarizing the full spectrum of services that Canadian municipalities provide. You'll learn to distinguish between essential services (those legally required for public health and safety), infrastructure services (the physical systems supporting community function), and enhanced services (programs that improve quality of life).

Understanding service categorization is crucial for municipal administrators who must allocate limited resources, plan budgets, and communicate with citizens about service priorities. This foundation will prepare you to analyze service delivery decisions and understand the complex trade-offs municipal leaders face.`;
        } else if (stepText.includes('explain the importance of municipal services')) {
            return `Beyond simply cataloging what municipalities do, understanding WHY these services matter is crucial for effective public administration. Municipal services are the foundation of community prosperity, public health, economic development, and social equity.

In this step, you'll explore the complex web of connections between service quality and community outcomes. You'll examine how water treatment impacts economic development, how public transit affects social mobility, how recreation programs contribute to community cohesion, and how efficient service delivery attracts businesses and residents.

This analytical framework will prepare you to articulate service value to diverse stakeholders—from budget-conscious taxpayers to economic development boards to community advocacy groups. You'll develop the skills to make compelling cases for municipal service investment and improvement.`;
        } else if (stepText.includes('identify challenges faced by municipal services')) {
            return `Understanding municipal services is incomplete without recognizing the complex challenges that threaten their effectiveness and sustainability. Canadian municipalities face unprecedented pressures: aging infrastructure requiring $170+ billion in repairs, climate change creating new service demands, demographic shifts changing service needs, and constrained fiscal capacity limiting response options.

In this step, you'll analyze contemporary challenges through multiple lenses—financial constraints, infrastructure deficits, technological disruption, citizen expectations, and regulatory pressures. You'll examine how municipalities innovate to address these challenges while maintaining service quality and fiscal responsibility.

This analysis prepares you for the strategic thinking required in municipal administration careers, where you'll need to balance competing demands and find creative solutions within significant constraints.`;
        } else if (stepText.includes('review local government structure')) {
            return `Understanding local government structure is fundamental to analyzing emerging issues and management challenges. Canadian municipalities operate within a complex framework of federal, provincial, and local jurisdictions, each with distinct roles, responsibilities, and constraints.

In this step, you'll examine how municipal government structure influences decision-making capacity, service delivery options, and response to emerging challenges. You'll analyze different municipal structures across Canada, understand the roles of councils, mayors, and administrative staff, and explore how governance structures affect municipal effectiveness.

This foundational knowledge prepares you to understand why certain challenges emerge and how structural factors influence municipal responses to contemporary issues.`;
        } else if (stepText.includes('identify emerging issues')) {
            return `Canadian municipalities face rapidly evolving challenges that require innovative responses and adaptive management. From climate change impacts to technological disruption, demographic shifts to changing citizen expectations, emerging issues test traditional municipal approaches and demand new solutions.

In this step, you'll identify and analyze current emerging issues affecting Canadian municipalities. You'll examine trends in urbanization, aging populations, digital transformation, environmental pressures, and fiscal constraints. Through current examples and case studies, you'll understand how these issues manifest differently across various municipal contexts.

This analysis develops your ability to recognize emerging trends early, understand their implications for municipal operations, and contribute to proactive rather than reactive municipal management.`;
        } else if (stepText.includes('interpret policy frameworks')) {
            return `Policy frameworks provide the foundation for municipal service delivery strategies, establishing the legal, regulatory, and strategic context within which municipalities operate. Understanding these frameworks is essential for developing effective service delivery approaches.

In this step, you'll examine federal, provincial, and municipal policy frameworks that influence service delivery decisions. You'll analyze how policies create opportunities and constraints, understand the relationship between different levels of government, and explore how policy interpretation affects municipal operations.

This knowledge prepares you to work effectively within policy frameworks, understand the rationale behind service delivery requirements, and contribute to policy implementation and development processes.`;
        } else if (stepText.includes('describe service delivery strategies')) {
            return `Municipal service delivery strategies determine how communities receive essential services, from traditional in-house delivery to innovative partnerships and digital solutions. Understanding different strategies and their applications is crucial for effective municipal administration.

In this step, you'll examine various service delivery models used by Canadian municipalities, including direct delivery, contracting, partnerships, shared services, and hybrid approaches. You'll analyze the advantages and challenges of each strategy, understand when different approaches are most effective, and explore emerging trends in service delivery.

This analysis prepares you to evaluate service delivery options, make informed recommendations about service delivery strategies, and contribute to strategic planning processes in municipal organizations.`;
        } else if (stepText.includes('define political acumen')) {
            return `Political acumen in municipal administration refers to the ability to understand, navigate, and work effectively within the political dimensions of local government. It's a critical skill that enables municipal administrators to support elected officials while maintaining professional integrity and serving the public interest.

In this step, you'll explore what political acumen means in the municipal context, understand why it's essential for administrative effectiveness, and examine how political awareness differs from political involvement. You'll analyze the relationship between political and administrative roles and understand the boundaries that maintain professional integrity.

This foundation prepares you to work effectively in the political environment of municipal government while maintaining the professional standards essential for effective public administration.`;
        } else if (stepText.includes('describe the importance of political acumen')) {
            return `Political acumen is not about playing politics—it's about understanding the political environment in which municipal administration operates and developing the skills to work effectively within that environment. For municipal administrators, political awareness is essential for successful policy implementation, stakeholder management, and public service delivery.

In this step, you'll examine why political acumen matters for municipal administrators, how political dynamics affect administrative decisions, and the consequences of political naivety in municipal roles. Through Canadian examples, you'll analyze situations where political acumen made the difference between successful and unsuccessful municipal initiatives.

This understanding prepares you to recognize the political dimensions of administrative work and develop the sensitivity needed to navigate complex stakeholder relationships effectively.`;
        } else if (stepText.includes('identify the key skills of political acumen')) {
            return `Political acumen encompasses a range of specific skills that enable municipal administrators to work effectively in political environments. These skills can be developed through practice, observation, and conscious effort to understand political dynamics and stakeholder relationships.

In this step, you'll identify and examine the key skills that comprise political acumen, including stakeholder analysis, strategic communication, relationship building, timing and positioning, and ethical decision-making. You'll explore how these skills apply in municipal contexts and analyze examples of their effective use.

This practical focus prepares you to develop your own political acumen skills and apply them effectively in municipal administration roles while maintaining professional integrity and serving the public interest.`;
        } else {
            // Generate contextual description based on step text and outcome
            return `This step focuses on building specific knowledge and skills related to "${step.text}". Through practical exercises and real-world Canadian municipal examples, you'll develop understanding that applies directly to municipal administration practice in the context of ${outcomeText}.

The activities in this step are designed to connect theoretical concepts with practical application, ensuring you develop both knowledge and skills needed for effective municipal administration careers. Each activity builds progressively toward mastery of this learning step while contributing to the broader learning outcome.`;
        }
    }

    async formatProductionReadyActivity(activity, outcomeNumber, stepNumber, activityNumber) {
        const activityId = `${outcomeNumber}.${stepNumber}.${activityNumber}`;
        const activityType = this.formatActivityType(activity.type);
        
        let content = `# ${activityId} ${activityType}: ${activity.title}\n\n`;
        
        // Format based on activity type with production specifications
        switch (activity.type.toLowerCase()) {
            case 'reading':
                content += await this.formatProductionReadingActivity(activity);
                break;
            case 'infographic':
            case 'infographic_request':
            case 'graphics_request':
                content += this.formatProductionGraphicsActivity(activity);
                break;
            case 'assessment':
            case 'quiz':
                content += this.formatProductionQuizActivity(activity);
                break;
            case 'video':
            case 'youtube_curation':
            case 'video_request':
                content += this.formatProductionVideoActivity(activity);
                break;
            case 'discussion':
                content += this.formatProductionDiscussionActivity(activity);
                break;
            case 'research':
            case 'analysis':
                content += this.formatProductionResearchActivity(activity);
                break;
            default:
                content += this.formatProductionGenericActivity(activity);
        }
        
        return content;
    }

    formatActivityType(type) {
        const typeMap = {
            'research': 'Research',
            'case_study': 'Case Study',
            'discussion': 'Discussion',
            'reflection': 'Reflection', 
            'interview': 'Interview',
            'analysis': 'Analysis',
            'news_analysis': 'Analysis',
            'problem_solving': 'Problem Solving',
            'simulation': 'Simulation',
            'reading': 'Reading',
            'video_request': 'Video',
            'infographic_request': 'Infographic',
            'graphics_request': 'Graphics',
            'youtube_curation': 'Video',
            'assessment': 'Activity',
            'quiz': 'Activity', 
            'infographic': 'Infographic',
            'video': 'Video'
        };
        return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
    }

    async formatProductionReadingActivity(activity) {
        // Get AI-curated, topic-specific reading sources with verified links
        const topicSpecificSources = await this.getAICuratedReadingSources(activity);
        
        return `Why read?

[[style:read]]

${topicSpecificSources.primarySources}

[[/style]]

**What are your current experiences and observations?**

[[style:instruction]]

**Instructions**

${this.getTopicSpecificReflectionQuestions(activity)}

[[/style]]

**Reading Assignment Structure**

[[style:calloutRight]]

**Professional Reading Approach**: Focus on how these sources inform evidence-based municipal administration practice. Look for concrete examples, data, and proven strategies.

[[/style]]

**Phase 1: Government Policy Context**
- Read current Infrastructure Canada reports on municipal funding and priorities
- Review Statistics Canada data on municipal finance trends
- Examine provincial legislation relevant to your region

**Phase 2: Professional Analysis**
- Study recent Canadian Public Administration articles on municipal governance
- Review IPAC resources on best practices and professional development
- Analyze case studies from Federation of Canadian Municipalities

**Phase 3: Local Application**
- Research your local municipality's annual report and strategic plan
- Review current council meeting minutes and policy decisions
- Examine recent local news coverage of municipal issues

**Critical Reading Questions**

As you read each source, consider:

1. **Evidence Quality**: What data supports the claims made? How current and reliable is the information?
2. **Canadian Context**: How do approaches reflect uniquely Canadian municipal governance structures?
3. **Practical Application**: What specific strategies or policies could be implemented locally?
4. **Professional Relevance**: How does this information prepare you for municipal administration careers?
5. **Comparative Analysis**: How do approaches vary across different Canadian jurisdictions?
6. **Future Implications**: What trends or challenges are emerging for Canadian municipalities?

**Post-Reading Synthesis**

[[style:transcript]]

**Sample Reflection Structure**

**Integration Analysis**: After completing all readings, write a 400-500 word reflection addressing:

1. **Theme Identification**: What common themes emerge across government, academic, and professional sources?
2. **Evidence Assessment**: Which sources provide the most compelling evidence for effective municipal practices?
3. **Local Relevance**: How do these concepts apply to your local municipal context?
4. **Professional Preparation**: What insights are most valuable for municipal administration career preparation?
5. **Future Focus**: Based on current trends, what challenges and opportunities do you anticipate?

[[/style]]

${activity.content || ''}`;
    }

    formatProductionGraphicsActivity(activity) {
        return `[[style:request]]

<table>
<colgroup>
<col style="width: 24%" />
<col style="width: 75%" />
</colgroup>
<thead>
<tr>
<th colspan="2"><strong>Graphics Request</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Image Size</strong></td>
<td><p><em>width for landscape orientation and height for portrait orientation</em></p>
<p>11x17 inches for professional presentation, optimized for both print and digital use</p></td>
</tr>
<tr>
<td><strong>GDA Instructions</strong></td>
<td><p>Create professional ${activity.title.toLowerCase()} showing municipal administration concepts with Canadian examples.</p>
<p>Requirements: Use current Canadian municipal data, ensure high contrast for accessibility, include clear visual hierarchy, apply Saskatchewan Polytechnic branding guidelines, create both color and black/white versions</p></td>
</tr>
<tr>
<td><strong>Special Use</strong></td>
<td>Educational resource for student learning and classroom display</td>
</tr>
<tr>
<td><strong>Image Sample</strong></td>
<td>Reference: Government of Canada infographic standards, FCM visual reports, municipal annual report graphics</td>
</tr>
<tr>
<td><strong>Completed Filename</strong></td>
<td>${activity.title.toLowerCase().replace(/\s+/g, '_')}.jpg</td>
</tr>
<tr>
<td><strong>Alignment</strong></td>
<td>Center alignment for maximum educational impact</td>
</tr>
<tr>
<td><p><strong>Alt Tag (&lt; 125 char)</strong></p>
<p><strong>&#x2610;</strong> Decorative</p></td>
<td>Professional ${activity.title.toLowerCase()} illustrating municipal concepts with Canadian examples and data</td>
</tr>
<tr>
<td><strong>Citation</strong></td>
<td><p>Original work based on Canadian municipal data</p>
<p>Saskatchewan Polytechnic</p></td>
</tr>
<tr>
<td><strong>Caption</strong></td>
<td>${activity.title}</td>
</tr>
<tr>
<td><strong>Comments for CMP</strong></td>
<td>This graphic supports learning by providing visual representation of complex municipal concepts. Should be sized for classroom display and individual student reference.</td>
</tr>
</tbody>
</table>

[[/style]]

**[GRAPHIC PLACEHOLDER: ${activity.title}]**

*Professional graphic showing ${activity.title.toLowerCase()} with Canadian municipal examples and current data*

### Viewing Instructions

Study the graphic carefully, paying attention to the relationships between different elements and how they connect to create a comprehensive understanding of the topic.

### Key Elements to Examine

- **Main Categories**: Notice how information is organized into primary sections
- **Connections**: Follow lines and arrows showing relationships between elements  
- **Data Points**: Review statistics and examples from Canadian municipalities
- **Visual Hierarchy**: Observe how design elements guide your attention to most important concepts

### Analysis Questions

Consider these questions while examining the graphic:

1. **Primary Analysis**: What are the main elements or relationships shown in this visual?
2. **Decision Making**: How would this information inform municipal administration decisions?
3. **Risk/Benefit Assessment**: What advantages or challenges are highlighted?
4. **Local Application**: How does this framework apply to your local community context?
5. **Strategic Planning**: How would you use this information for municipal planning or prioritizing?
6. **Implementation**: What factors would influence successful application of these concepts?

${activity.content || ''}`;
    }

    formatProductionQuizActivity(activity) {
        return `[[style:instruction]]

## Instructions

Complete this comprehensive assessment to demonstrate your understanding of municipal administration concepts. The quiz includes multiple question types and focuses on practical application of knowledge.

[[/style]]

[[style:request]]

<table>
<colgroup>
<col style="width: 27%" />
<col style="width: 72%" />
</colgroup>
<thead>
<tr>
<th colspan="2"><strong>Interactive Request</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Interactive Type</strong></td>
<td><strong>H5P -- Comprehensive Quiz</strong></td>
</tr>
<tr>
<td><p><strong>Activity Details</strong></p>
<p><strong>&#x2610;</strong> Details below ticket</p></td>
<td><p><em>Create comprehensive quiz using H5P in D2L Brightspace Creator+</em></p>
<p>Municipal administration assessment with multiple question types: multiple choice, true/false with explanations, and scenario-based questions. Focus on Canadian examples and practical applications with immediate feedback.</p></td>
</tr>
<tr>
<td><strong>Graphics &amp; Media Support</strong></td>
<td>Yes <em>Include charts, infographics, and municipal data to support questions</em></td>
</tr>
<tr>
<td><p><strong>Text Version</strong></p>
<p><em>Add click to reveal for accessibility?</em></p></td>
<td><strong>Yes</strong> <em>Provide fully accessible alternative with screen reader compatibility and keyboard navigation</em></td>
</tr>
</tbody>
</table>

[[/style]]

### Assessment Structure

**Question Distribution:**
- Multiple Choice: 60% (focus on concepts and Canadian examples)
- True/False with Explanations: 25% (address common misconceptions)
- Scenario-Based Analysis: 15% (apply knowledge to realistic situations)

**Sample Questions:**

**Question 1**: Which of the following is considered an essential municipal service under Canadian provincial legislation?
   a) Recreation centers and sports facilities
   b) Art galleries and cultural programming
   *c) Water treatment and distribution systems
   d) Convention centers and tourism promotion

*Feedback: Water treatment is legally mandated under provincial health acts for public safety. While recreation and cultural services enhance quality of life, they are typically considered enhanced or discretionary services.*

**Question 2**: True or False: Municipal governments in Canada have the same revenue-generating powers as provincial governments.
   a) True
   *b) False

*Explanation: Municipalities are "creatures of the province" with limited revenue tools defined by provincial legislation. While provinces can implement income taxes and sales taxes, municipalities primarily rely on property taxes, user fees, and limited other tools as permitted by their province.*

**Question 3**: **Scenario Analysis** - A mid-sized Canadian municipality faces simultaneous challenges: 30% of water infrastructure is over 50 years old, population is growing 3% annually, and provincial funding has been reduced by 10%. What should be the priority response strategy?

   a) Delay all infrastructure investment until provincial funding is restored
   *b) Develop strategic asset management plan balancing infrastructure renewal with growth management
   c) Focus exclusively on economic development to increase tax base
   d) Implement across-the-board service cuts to balance the budget

*Analysis: Strategic asset management allows municipalities to prioritize infrastructure investments based on risk assessment, service levels, and available funding while accommodating growth pressures. This balanced approach addresses long-term sustainability while managing immediate constraints.*

### Interactive Features

- **Progress Tracking**: Visual progress indicator showing completion status
- **Immediate Feedback**: Detailed explanations provided after each question
- **Performance Summary**: Final score with personalized recommendations for review
- **Accessibility**: Full keyboard navigation and screen reader support
- **Mobile Optimized**: Responsive design for various devices

### Assessment Criteria

- **Knowledge Application**: 40% - Demonstrate understanding of municipal concepts
- **Canadian Context**: 30% - Apply knowledge to Canadian municipal examples
- **Critical Thinking**: 20% - Analyze scenarios and make reasoned decisions
- **Professional Readiness**: 10% - Show understanding relevant to career preparation

${activity.content || ''}`;
    }

    formatProductionVideoActivity(activity) {
        return `[[style:note]]

CMP: Video content requires instructor curation and verification before implementation

[[/style]]

## Video Resource Curation

**Topic**: ${activity.title}

### Curated Video Content

**📹 Video Selection Required**

**Instructions for Content Team**: Please locate and embed appropriate video content following these specifications:

**Content Requirements:**
- **Duration**: 8-15 minutes optimal for classroom use
- **Focus**: Canadian municipalities and examples preferred
- **Quality**: Professional production with clear audio/video
- **Currency**: Recent content (2020-2024) reflecting current practices
- **Accessibility**: Closed captions available or can be added

**Recommended Sources:**
- **Government**: National Film Board (nfb.ca), municipal government channels
- **News Organizations**: CBC News, CTV News, Global News municipal coverage
- **Educational**: TVO, Knowledge Network, university channels
- **Professional**: Federation of Canadian Municipalities, IPAC, provincial associations

**Search Strategy:**
Visit YouTube and search for: "${activity.title} Canada" or "Canadian municipal ${activity.title.toLowerCase()}"

**Alternative Terms:**
- "local government ${activity.title.toLowerCase()}"
- "municipality ${activity.title.toLowerCase()} Canada"  
- "city ${activity.title.toLowerCase()} Canadian"

### Implementation Format

Once video is selected, replace this section with:

\`\`\`
**[Video Title]** by [Channel Name] ([Duration])

<iframe width="560" height="315" src="https://www.youtube.com/embed/[VIDEO_ID]" title="[Video Title]" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
\`\`\`

### Discussion Framework

**Post-Viewing Analysis Questions:**

1. **Content Analysis**: What are the key concepts about municipal administration presented in the video?
2. **Canadian Context**: How do the examples shown reflect uniquely Canadian approaches to municipal governance?
3. **Practical Application**: What challenges or opportunities are highlighted that could apply to your local municipality?
4. **Professional Relevance**: How does this content connect to municipal administration career preparation?
5. **Critical Evaluation**: What questions does the video raise that warrant further investigation?
6. **Comparative Analysis**: How do the approaches shown compare to practices in other jurisdictions you've studied?

### Learning Integration

**Individual Preparation:**
- Take notes on key concepts and Canadian examples
- Identify connections to course readings and previous activities
- Prepare 2-3 discussion points for class engagement
- Consider applications to your local community context

**Collaborative Discussion:**
- Share insights with classmates through structured discussion
- Compare observations and interpretations
- Build on others' perspectives to deepen understanding
- Connect video content to broader course learning objectives

${activity.content || ''}`;
    }

    formatProductionDiscussionActivity(activity) {
        return `## Professional Discussion Forum

**Objective**: Engage in collaborative analysis of municipal administration concepts through structured online discussion that mirrors professional consultation processes.

### Discussion Framework

**Preparation Phase** (Individual Work):
1. **Background Research**: Complete all assigned readings and review relevant course materials
2. **Current Examples**: Research 2-3 recent examples from Canadian municipalities related to the topic
3. **Position Development**: Prepare evidence-based discussion points with supporting citations
4. **Professional Perspective**: Consider how this topic relates to municipal administration career preparation

### Discussion Structure

**Initial Post Requirements** (300-400 words):
- **Opening Statement**: Clear position or analysis based on evidence
- **Canadian Examples**: Specific examples from 2-3 Canadian municipalities 
- **Evidence Base**: Reference to course readings, government reports, or credible sources
- **Professional Application**: Connection to municipal administration practice
- **Discussion Questions**: 2-3 thoughtful questions for peer consideration

**Peer Engagement Requirements**:
- **Substantive Responses**: Reply to at least 3 classmates with 150+ word responses
- **Evidence-Based Discussion**: Support positions with credible sources and examples
- **Professional Dialogue**: Maintain respectful, constructive communication throughout
- **Collaborative Analysis**: Build on others' ideas to deepen collective understanding

### Discussion Prompts

**Primary Analysis Questions:**
1. **Local Application**: How does this topic manifest in your local municipality? Provide specific examples and analysis.

2. **Comparative Analysis**: What differences do you observe in approaches used by municipalities of different sizes or regions? What factors might explain these variations?

3. **Best Practices**: What innovative or effective approaches can you identify from Canadian municipalities? What makes them successful?

4. **Future Challenges**: Based on current trends, what challenges or opportunities do you anticipate in this area over the next 5-10 years?

5. **Professional Implications**: How does this topic connect to municipal administration career preparation? What competencies are most important?

### Assessment Criteria

**Discussion Quality (40%)**:
- Depth of analysis and critical thinking
- Integration of course concepts with current examples
- Quality of evidence and source credibility

**Professional Communication (25%)**:
- Clear, well-organized writing appropriate for professional context
- Respectful, constructive engagement with diverse perspectives
- Proper citation of sources and examples

**Collaborative Engagement (25%)**:
- Meaningful responses that advance discussion
- Building on others' ideas to create deeper insights
- Active participation throughout discussion period

**Canadian Municipal Focus (10%)**:
- Use of relevant Canadian examples and context
- Understanding of Canadian municipal governance frameworks
- Connection to current Canadian municipal challenges and opportunities

### Professional Development Integration

This discussion format mirrors the collaborative consultation processes common in municipal administration, where professionals must:
- Analyze complex issues from multiple perspectives
- Communicate effectively with diverse stakeholders  
- Build consensus through evidence-based dialogue
- Apply theoretical knowledge to practical challenges

${activity.content || ''}`;
    }

    formatProductionResearchActivity(activity) {
        return `## Research Project

**Objective**: Conduct independent research on municipal administration topics using professional research methodologies and Canadian sources.

### Research Framework

**Phase 1: Research Design** (Week 1)
1. **Topic Refinement**: Select specific aspect of the research focus area
2. **Research Question**: Develop focused, answerable research question
3. **Scope Definition**: Determine geographic focus (specific municipality or regional comparison)
4. **Methodology Planning**: Design systematic approach to data collection and analysis

**Phase 2: Source Development** (Week 1-2)
1. **Academic Sources** (minimum 5): Recent journal articles, books, research reports
2. **Government Sources** (minimum 3): Municipal reports, policy documents, statistical data
3. **Professional Sources** (minimum 2): Industry reports, professional association publications
4. **Current Sources** (minimum 2): News articles, recent developments (within 2 years)

**Phase 3: Data Collection and Analysis** (Week 2-3)
1. **Systematic Collection**: Gather information using consistent framework
2. **Pattern Analysis**: Identify trends, themes, and relationships in data
3. **Comparative Analysis**: Compare approaches across municipalities or time periods
4. **Critical Evaluation**: Assess effectiveness and applicability of findings

### Required Research Components

**Literature Review**:
- Comprehensive review of academic and professional sources
- Synthesis of current knowledge and identification of gaps
- Theoretical framework for understanding the topic

**Primary Research** (Encouraged):
- Municipal website analysis and document review
- Interview with municipal administrator (if possible)
- Survey or observational data collection
- Case study development from direct sources

**Canadian Municipal Context**:
- Focus on Canadian municipalities and governance frameworks
- Provincial and federal policy implications
- Comparison across provinces or municipality types
- Current challenges and opportunities specific to Canadian context

### Deliverable Requirements

**Research Report** (2,500-3,000 words):

**Executive Summary** (250 words):
- Research question and methodology overview
- Key findings and implications
- Primary recommendations

**Introduction** (400 words):
- Background and context
- Research question and objectives
- Methodology and scope
- Report organization

**Literature Review** (600-800 words):
- Current knowledge synthesis
- Theoretical framework
- Research gaps identified
- Contribution of current research

**Findings and Analysis** (1,000-1,200 words):
- Systematic presentation of findings
- Analysis of patterns and relationships
- Comparison with existing literature
- Discussion of implications

**Recommendations and Conclusions** (400-500 words):
- Evidence-based recommendations
- Implementation considerations
- Areas for further research
- Professional practice implications

**References and Appendices**:
- Complete bibliography in APA format
- Supporting documents and data tables
- Interview transcripts or survey instruments (if applicable)

### Assessment Criteria

**Research Methodology (25%)**:
- Systematic approach to data collection
- Appropriate use of multiple source types
- Clear research design and scope

**Analysis and Critical Thinking (30%)**:
- Sophisticated analysis of findings
- Integration of multiple perspectives
- Evidence-based conclusions and recommendations

**Canadian Municipal Focus (25%)**:
- Relevant Canadian examples and context
- Understanding of Canadian municipal governance
- Application to current Canadian municipal challenges

**Professional Presentation (20%)**:
- Clear, well-organized writing
- Professional formatting and presentation
- Proper citation and source documentation

### Professional Development Outcomes

This research project develops core competencies for municipal administration careers:
- **Research and Analysis**: Systematic investigation of complex issues
- **Policy Analysis**: Evaluation of governmental approaches and effectiveness
- **Professional Communication**: Clear presentation of findings and recommendations
- **Evidence-Based Decision Making**: Using research to inform professional practice

${activity.content || ''}`;
    }

    formatProductionGenericActivity(activity) {
        return `## Learning Activity

**Objective**: ${activity.description || 'Engage with municipal administration concepts through active learning and practical application'}

### Activity Overview

${activity.content || 'This activity is designed to deepen your understanding of municipal administration through hands-on engagement with real-world scenarios and current Canadian examples.'}

### Instructions

**Preparation**:
1. **Review Materials**: Complete all assigned readings and review relevant course content
2. **Research Context**: Investigate current examples from Canadian municipalities
3. **Professional Perspective**: Consider how this activity relates to municipal administration careers
4. **Documentation**: Prepare to document your learning process and key insights

**Implementation**:
1. **Apply Concepts**: Connect theoretical knowledge to practical municipal scenarios
2. **Canadian Focus**: Use Canadian municipal examples and current data where possible
3. **Critical Analysis**: Evaluate approaches, identifying strengths and limitations
4. **Professional Standards**: Maintain quality appropriate for professional presentation

### Deliverable Requirements

**Format**: Professional document with clear structure and appropriate formatting
**Length**: As specified in activity description or 800-1200 words if not specified
**Sources**: Minimum 3 credible sources with proper APA citation
**Context**: Canadian municipal focus with current, relevant examples

### Assessment Criteria

**Content Quality (35%)**:
- Demonstration of understanding of key concepts
- Accurate application of course materials
- Depth of analysis and critical thinking

**Canadian Municipal Context (25%)**:
- Effective use of Canadian examples
- Understanding of Canadian municipal governance frameworks
- Connection to current Canadian municipal challenges

**Professional Presentation (25%)**:
- Clear, well-organized structure
- Professional writing quality
- Proper formatting and citation

**Practical Application (15%)**:
- Connection between theory and practice
- Relevance to municipal administration careers
- Actionable insights and recommendations

### Professional Development Integration

This activity develops competencies essential for municipal administration careers:
- **Analytical Thinking**: Systematic analysis of complex municipal issues
- **Professional Communication**: Clear presentation of ideas and recommendations
- **Applied Knowledge**: Connection between academic concepts and professional practice
- **Canadian Context**: Understanding of Canadian municipal governance and challenges

**Learning Support**:
- Reference course readings and lecture materials
- Utilize library databases for additional research
- Consult instructor during office hours for clarification
- Engage with classmates for collaborative learning and peer review`;
    }

    generateOutcomeSummary(outcome) {
        const outcomeNumber = outcome.id.split('.')[0];
        const courseContext = this.currentCourse?.courseContext || {};
        const subjectArea = courseContext.subjectArea || 'general';
        const targetAudience = courseContext.targetAudience || 'students';
        const subjectDisplay = this.capitalizeSubject(subjectArea);
        
        // Generate subject-specific competencies and applications
        const competencies = this.getSubjectSpecificCompetencies(subjectArea);
        const professionalApplication = this.getSubjectSpecificApplication(subjectArea, outcome.text);
        const lookingAhead = this.getSubjectSpecificLookingAhead(subjectArea);
        
        return `\n## LO${outcomeNumber} Summary\n\nIn this learning outcome, you explored the essential concepts related to ${outcome.text.toLowerCase()}. Through a combination of readings, analysis, interactive activities, and practical applications, you have developed both theoretical understanding and practical skills relevant to ${subjectArea} careers.\n\n**Key Competencies Developed**:\n${competencies.map(comp => `- ${comp}`).join('\n')}\n\n**Professional Application**: ${professionalApplication}\n\n**Looking Ahead**: ${lookingAhead}\n\n`;
    }

    capitalizeSubject(subjectArea) {
        return subjectArea.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    getSubjectSpecificCompetencies(subjectArea) {
        const competencyMap = {
            'computer science': [
                'Programming fundamentals and software development principles',
                'Problem-solving and algorithmic thinking skills',
                'Technical communication and code documentation abilities',
                'Debugging and troubleshooting capabilities',
                'Understanding of software development best practices'
            ],
            'business management': [
                'Strategic thinking and business analysis skills',
                'Leadership and team management capabilities',
                'Financial analysis and decision-making abilities',
                'Communication and stakeholder management skills',
                'Understanding of business operations and market dynamics'
            ],
            'accounting': [
                'Financial reporting and analysis expertise',
                'Understanding of accounting principles and standards',
                'Compliance and regulatory knowledge',
                'Attention to detail and accuracy in financial calculations',
                'Professional communication of financial information'
            ],
            'municipal administration': [
                'Understanding of fundamental concepts and Canadian municipal context',
                'Analytical skills for evaluating municipal policies and practices',
                'Professional communication abilities for municipal administration settings',
                'Critical thinking skills for addressing complex municipal challenges',
                'Research and investigation capabilities using credible sources'
            ]
        };
        
        return competencyMap[subjectArea] || [
            `Understanding of fundamental concepts and principles in ${subjectArea}`,
            `Analytical and critical thinking skills relevant to ${subjectArea}`,
            `Professional communication abilities for ${subjectArea} contexts`,
            `Problem-solving skills for addressing ${subjectArea} challenges`,
            'Research and investigation capabilities using credible sources'
        ];
    }

    getSubjectSpecificApplication(subjectArea, outcomeText) {
        const applicationMap = {
            'computer science': `The programming skills and technical knowledge developed in this learning outcome directly prepare you for software development careers by providing hands-on experience with coding, debugging, and problem-solving techniques essential for professional programming work.`,
            'business management': `The strategic thinking and analytical skills developed in this learning outcome directly prepare you for business management careers by providing practical understanding of business operations, decision-making processes, and leadership strategies.`,
            'accounting': `The financial analysis and reporting skills developed in this learning outcome directly prepare you for accounting careers by providing practical understanding of accounting principles, compliance requirements, and professional financial communication.`,
            'municipal administration': `The knowledge and skills developed in this learning outcome directly prepare you for municipal administration careers by providing practical understanding of how Canadian municipalities operate, the challenges they face, and the strategies they use to serve their communities effectively.`
        };
        
        return applicationMap[subjectArea] || `The knowledge and skills developed in this learning outcome directly prepare you for ${subjectArea} careers by providing practical understanding of professional practices, challenges, and strategies used in the field.`;
    }

    getSubjectSpecificLookingAhead(subjectArea) {
        const lookingAheadMap = {
            'computer science': `The programming concepts and problem-solving skills developed in this learning outcome provide the foundation for more advanced programming topics, software design patterns, and professional development practices in subsequent learning outcomes.`,
            'business management': `The strategic thinking and analytical skills developed in this learning outcome provide the foundation for more advanced business strategy, organizational leadership, and management practices in subsequent learning outcomes.`,
            'accounting': `The financial analysis and reporting skills developed in this learning outcome provide the foundation for more advanced accounting topics, auditing practices, and professional accounting standards in subsequent learning outcomes.`,
            'municipal administration': `The concepts and analytical skills developed in this learning outcome provide the foundation for more advanced study of municipal governance, policy implementation, and strategic management in subsequent learning outcomes.`
        };
        
        return lookingAheadMap[subjectArea] || `The concepts and skills developed in this learning outcome provide the foundation for more advanced study of ${subjectArea} principles, professional practices, and specialized applications in subsequent learning outcomes.`;
    }
}

module.exports = ProductionBlueprintGenerator;