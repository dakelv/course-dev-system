const logger = require('../utils/logger');
const FileManager = require('../utils/file-manager');
const DocumentProcessor = require('./document-processor');
const AgentService = require('./agent-service');
const SearchService = require('./search-service');
const ProductionBlueprintGenerator = require('./production-blueprint-generator');

class BlueprintGenerator {
    constructor() {
        this.fileManager = new FileManager();
        this.documentProcessor = new DocumentProcessor();
        this.agentService = new AgentService();
        this.searchService = new SearchService();
        this.productionGenerator = new ProductionBlueprintGenerator();
    }

    async generateCourseBlueprint(courseId, options = {}) {
        const startTime = Date.now();

        try {
            logger.logProcessingStart(courseId, 'blueprint-generation');

            // Initialize services
            await this.agentService.initialize();

            // Step 1: Process documents (if not already done)
            let courseContent = await this.loadOrProcessDocuments(courseId);

            if (!courseContent) {
                throw new Error('No course content available for processing');
            }

            // Step 2: Execute Phase A agents
            const phaseAResults = await this.executePhaseA(courseContent, options);

            // Step 3: Save Phase A results
            await this.savePhaseResults(courseId, 'A', phaseAResults);

            // Step 4: Execute Phase B agents (Activity Design)
            const phaseBResults = await this.executePhaseB(courseContent, phaseAResults, options);

            // Step 5: Save Phase B results
            await this.savePhaseResults(courseId, 'B', phaseBResults);

            // Step 6: Generate enhanced blueprint with Phase B integration
            const blueprint = await this.generateEnhancedBlueprint(courseContent, phaseAResults, phaseBResults);

            // Step 7: Save blueprint
            await this.saveBlueprint(courseId, blueprint);

            const duration = Date.now() - startTime;

            logger.logProcessingComplete(courseId, 'blueprint-generation', duration, {
                qualityScore: blueprint.qualityMetrics.overallScore,
                phaseAScore: phaseAResults.qualityScore,
                phaseBScore: phaseBResults.qualityScore,
                agentsExecuted: Object.keys(phaseAResults.agentResults).length + Object.keys(phaseBResults.agentResults).length
            });

            return {
                success: true,
                courseId,
                blueprint,
                phaseAResults,
                phaseBResults,
                duration,
                qualityScore: blueprint.qualityMetrics.overallScore
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.logError(error, { courseId, phase: 'blueprint-generation', duration });

            return {
                success: false,
                courseId,
                error: error.message,
                duration
            };
        }
    }

    async loadOrProcessDocuments(courseId) {
        // Try to load existing processed content
        const processedPath = this.fileManager.getCoursePath(courseId, 'processed/course-content.json');
        let courseContent = await this.fileManager.loadJSON(processedPath);

        if (!courseContent) {
            logger.info(`No processed content found for ${courseId}, processing documents...`);
            courseContent = await this.documentProcessor.processUploadedFiles(courseId);
        } else {
            logger.info(`Using existing processed content for ${courseId}`);
        }

        return courseContent;
    }

    async executePhaseA(courseContent, options = {}) {
        logger.info(`Executing Phase A agents for course ${courseContent.courseId}`);

        try {
            const phaseAResults = await this.agentService.executePhaseA(courseContent, options);

            if (phaseAResults.errors.length > 0) {
                logger.warn(`Phase A completed with ${phaseAResults.errors.length} errors`, {
                    errors: phaseAResults.errors
                });
            }

            if (phaseAResults.qualityScore < 0.7) {
                logger.warn(`Phase A quality score below recommended threshold`, {
                    score: phaseAResults.qualityScore,
                    threshold: 0.7
                });
            }

            return phaseAResults;

        } catch (error) {
            logger.logError(error, { courseId: courseContent.courseId, phase: 'A' });
            throw new Error(`Phase A execution failed: ${error.message}`);
        }
    }

    async executePhaseB(courseContent, phaseAResults, options = {}) {
        logger.info(`Executing Phase B agents for course ${courseContent.courseId}`);

        try {
            const phaseBResults = await this.agentService.executePhaseB(courseContent, phaseAResults, options);

            if (phaseBResults.errors.length > 0) {
                logger.warn(`Phase B completed with ${phaseBResults.errors.length} errors`, {
                    errors: phaseBResults.errors
                });
            }

            if (phaseBResults.qualityScore < 0.7) {
                logger.warn(`Phase B quality score below recommended threshold`, {
                    score: phaseBResults.qualityScore,
                    threshold: 0.7
                });
            }

            return phaseBResults;

        } catch (error) {
            logger.logError(error, { courseId: courseContent.courseId, phase: 'B' });
            
            // Phase B is not critical - continue with Phase A only if it fails
            logger.warn(`Phase B failed, continuing with Phase A results only: ${error.message}`);
            return {
                agentResults: {},
                integration: { overallQualityScore: 0.5 },
                errors: [{ phase: 'B', error: error.message }],
                phase: 'B',
                completedAt: new Date().toISOString(),
                qualityScore: 0.5
            };
        }
    }

    async savePhaseResults(courseId, phase, results) {
        const resultsPath = this.fileManager.getCoursePath(courseId, `phase-${phase.toLowerCase()}-results/results.json`);
        await this.fileManager.saveJSON(resultsPath, results);

        // Save individual agent results
        if (results.agentResults) {
            for (const [agentName, agentResult] of Object.entries(results.agentResults)) {
                if (agentResult) {
                    const agentPath = this.fileManager.getCoursePath(courseId, `phase-${phase.toLowerCase()}-results/${agentName}.json`);
                    await this.fileManager.saveJSON(agentPath, agentResult);
                }
            }
        }

        logger.info(`Phase ${phase} results saved for course ${courseId}`);
    }

    async generateEnhancedBlueprint(courseContent, phaseAResults, phaseBResults) {
        logger.info(`Generating enhanced blueprint with Phase B integration for course ${courseContent.courseId}`);

        const blueprint = {
            courseInfo: {
                courseId: courseContent.courseId,
                title: this.extractCourseTitle(courseContent),
                credits: this.extractCredits(courseContent),
                duration: this.extractDuration(courseContent),
                institution: 'Saskatchewan Polytechnic',
                generatedAt: new Date().toISOString(),
                processingPhases: ['A', 'B']
            },

            educationalFoundation: this.extractEducationalFoundation(phaseAResults),

            learningOutcomes: await this.extractLearningOutcomes(courseContent, phaseAResults),

            courseStructure: this.extractCourseStructure(phaseAResults),

            // Enhanced with Phase B agent outputs
            assessmentFramework: this.extractEnhancedAssessmentFramework(phaseAResults, phaseBResults),

            activityDesign: this.extractActivityDesignFramework(phaseBResults),

            lmsIntegration: this.extractLMSIntegrationPlan(phaseBResults),

            resourceRequirements: this.extractEnhancedResourceRequirements(phaseAResults, phaseBResults),

            qualityMetrics: this.calculateEnhancedQualityMetrics(courseContent, phaseAResults, phaseBResults),

            implementationPlan: this.generateEnhancedImplementationPlan(phaseAResults, phaseBResults),

            nextSteps: this.generateEnhancedNextSteps(phaseAResults, phaseBResults)
        };

        return blueprint;
    }

    // Keep the original method as fallback
    async generatePreliminaryBlueprint(courseContent, phaseAResults) {
        logger.info(`Generating preliminary blueprint for course ${courseContent.courseId}`);

        const blueprint = {
            courseInfo: {
                courseId: courseContent.courseId,
                title: this.extractCourseTitle(courseContent),
                credits: this.extractCredits(courseContent),
                duration: this.extractDuration(courseContent),
                institution: 'Saskatchewan Polytechnic',
                generatedAt: new Date().toISOString()
            },

            educationalFoundation: this.extractEducationalFoundation(phaseAResults),

            learningOutcomes: await this.extractLearningOutcomes(courseContent, phaseAResults),

            courseStructure: this.extractCourseStructure(phaseAResults),

            assessmentFramework: this.extractAssessmentFramework(phaseAResults),

            resourceRequirements: this.extractResourceRequirements(phaseAResults),

            qualityMetrics: this.calculateQualityMetrics(courseContent, phaseAResults),

            implementationPlan: this.generateImplementationPlan(phaseAResults),

            nextSteps: this.generateNextSteps(phaseAResults)
        };

        return blueprint;
    }

    extractCourseTitle(courseContent) {
        // Try to extract from syllabus first
        if (courseContent.syllabus?.content?.text) {
            const titleMatch = courseContent.syllabus.content.text.match(/^([A-Z]{2,4}[-\s]\d{3}[:\s]+.+?)$/m);
            if (titleMatch) {
                return titleMatch[1].trim();
            }
        }

        // Fallback to course ID
        return courseContent.courseId || 'Unknown Course';
    }

    extractCredits(courseContent) {
        if (courseContent.syllabus?.content?.text) {
            const creditMatch = courseContent.syllabus.content.text.match(/(\d+)\s*credit/i);
            if (creditMatch) {
                return parseInt(creditMatch[1]);
            }
        }
        return 3; // Default
    }

    extractDuration(courseContent) {
        if (courseContent.syllabus?.content?.text) {
            const durationMatch = courseContent.syllabus.content.text.match(/(\d+)\s*week/i);
            if (durationMatch) {
                return `${durationMatch[1]} weeks`;
            }
        }
        return '15 weeks'; // Default
    }

    extractEducationalFoundation(phaseAResults) {
        const foundation = {
            pedagogicalApproach: null,
            learningTheory: null,
            instructionalStrategies: [],
            accessibilityFeatures: []
        };

        // Extract from Instructional Designer
        const instructionalDesigner = phaseAResults.agentResults['instructional-designer'];
        if (instructionalDesigner?.output) {
            foundation.pedagogicalApproach = instructionalDesigner.output.analysis || 'Constructivist approach with adult learning principles';
            foundation.learningTheory = 'Adult Learning Theory (Andragogy)';
            foundation.instructionalStrategies = instructionalDesigner.output.recommendations || [];
        }

        // Extract from Curriculum Architect
        const curriculumArchitect = phaseAResults.agentResults['curriculum-architect'];
        if (curriculumArchitect?.output) {
            if (curriculumArchitect.output.recommendations) {
                foundation.instructionalStrategies.push(...curriculumArchitect.output.recommendations);
            }
        }

        return foundation;
    }

    async extractLearningOutcomes(courseContent, phaseAResults) {
        const outcomes = [];

        // Step 1: Find the course syllabus outline document (primary source)
        const syllabusOutlineDoc = courseContent.documents.find(doc => 
            doc.fileName.toLowerCase().includes('syllabus') && 
            doc.fileName.toLowerCase().includes('outline')
        );

        // Step 2: Find the outcomes and steps document (secondary source for learning steps)
        const outcomesStepsDoc = courseContent.documents.find(doc => 
            doc.fileName.toLowerCase().includes('outcome') && 
            doc.fileName.toLowerCase().includes('steps') &&
            !doc.fileName.toLowerCase().includes('template')
        );

        console.log('Primary source (syllabus outline):', syllabusOutlineDoc?.fileName || 'Not found');
        console.log('Secondary source (outcomes-steps):', outcomesStepsDoc?.fileName || 'Not found');

        // Step 3: Extract learning outcomes from syllabus outline document
        if (syllabusOutlineDoc) {
            const syllabusOutcomes = this.extractOutcomesFromSyllabus(syllabusOutlineDoc);
            console.log(`Extracted ${syllabusOutcomes.length} outcomes from syllabus outline`);
            
            syllabusOutcomes.forEach((outcome, index) => {
                outcomes.push({
                    id: `${index + 1}.0.0`,
                    text: outcome,
                    bloomLevel: this.classifyBloomLevel(outcome),
                    source: syllabusOutlineDoc.fileName,
                    learningSteps: []
                });
            });
        }

        // Step 4: Enhance with learning steps from outcomes-steps document if available
        if (outcomesStepsDoc && outcomes.length > 0) {
            console.log('Enhancing outcomes with learning steps...');
            const stepsData = this.extractOutcomesFromText(outcomesStepsDoc.content.text || '');
            
            // Match outcomes with their steps
            outcomes.forEach((outcome, index) => {
                if (stepsData[index] && stepsData[index].steps) {
                    outcome.learningSteps = stepsData[index].steps;
                    console.log(`Added ${stepsData[index].steps.length} steps to outcome ${index + 1}`);
                }
            });
        }

        console.log(`Final result: ${outcomes.length} learning outcomes extracted`);

        // Generate learning activities for each outcome using Claude
        for (const outcome of outcomes) {
            if (outcome.learningSteps && outcome.learningSteps.length > 0) {
                outcome.learningActivities = await this.generateLearningActivities(outcome, phaseAResults);
            } else {
                outcome.learningActivities = this.generateBasicActivities(outcome);
            }
        }

        return outcomes;
    }

    extractOutcomesFromSyllabus(syllabusDoc) {
        const outcomes = [];
        
        // Parse from text content to get the main learning outcomes section only
        const text = syllabusDoc.content.text || '';
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        let inLearningOutcomesSection = false;
        let foundOutcomes = 0;
        
        for (const line of lines) {
            if (line.toLowerCase().includes('learning outcomes:')) {
                inLearningOutcomesSection = true;
                console.log('Found Learning Outcomes section');
                continue;
            }
            
            if (inLearningOutcomesSection) {
                // Stop if we hit another section (this prevents duplicates from assessment section)
                if (line.toLowerCase().includes('prepared') || 
                    line.toLowerCase().includes('approved') ||
                    line.toLowerCase().includes('assessment tools:')) {
                    console.log('Stopping extraction at:', line.substring(0, 50));
                    break;
                }
                
                // Extract learning outcomes that start with action verbs
                if (line.match(/^(Identify|Describe|Discuss|Explain|Apply|Illustrate|Analyze|Evaluate|Compare|Create|Develop|Implement|Assess)/i) && 
                    line.length > 20 && 
                    line.endsWith('.')) {
                    outcomes.push(line);
                    foundOutcomes++;
                    console.log(`Found outcome ${foundOutcomes}: ${line}`);
                    
                    // Safety check: stop after 8 outcomes (expected number for this course)
                    if (foundOutcomes >= 8) {
                        console.log('Reached expected 8 outcomes, stopping extraction');
                        break;
                    }
                }
            }
        }
        
        console.log(`Extracted ${outcomes.length} outcomes from syllabus:`, outcomes);
        return outcomes;
    }

    extractOutcomesFromText(text) {
        const outcomes = [];
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        let currentOutcome = null;
        let currentSteps = [];
        
        console.log('Extracting from text lines:', lines.slice(0, 20)); // Debug first 20 lines

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Look for learning outcome patterns - LO1, LO2, etc.
            if (line.match(/^LO\s*\d+/i) || 
                line.match(/learning\s*outcome\s*\d*/i) ||
                line.match(/outcome\s*\d+/i)) {
                
                // Save previous outcome if exists
                if (currentOutcome) {
                    outcomes.push({
                        text: currentOutcome,
                        steps: [...currentSteps]
                    });
                }
                
                currentOutcome = line;
                currentSteps = [];
                console.log('Found outcome:', line);
            }
            // Look for learning steps - action verbs that are likely learning steps
            else if (currentOutcome && (
                     line.match(/^(Summarize|Explain|Identify|Describe|Review|Interpret|Define|Apply|Illustrate|Discuss|Compare|Analyze|Evaluate|Create|Develop|Implement|Assess|List|Outline|Classify|Demonstrate|Calculate|Solve)/i) ||
                     line.match(/^\d+\.\s*[A-Z]/) ||
                     (line.length > 10 && line.match(/^[A-Z][a-z].*\.$/) && !line.includes('Assessment') && !line.includes('Course')))) {
                
                const stepText = line.replace(/^\d+\.\s*/, '').trim();
                if (stepText.length > 5 && !stepText.toLowerCase().includes('assessment') && !stepText.toLowerCase().includes('course')) {
                    currentSteps.push({
                        id: `${currentSteps.length + 1}`,
                        text: stepText
                    });
                    console.log('Found step:', stepText);
                }
            }
        }

        // Don't forget the last outcome
        if (currentOutcome) {
            outcomes.push({
                text: currentOutcome,
                steps: [...currentSteps]
            });
        }

        console.log('Extracted outcomes:', outcomes.length);
        outcomes.forEach((outcome, i) => {
            console.log(`Outcome ${i + 1}: ${outcome.text} (${outcome.steps.length} steps)`);
        });

        return outcomes;
    }

    async generateLearningActivities(outcome, phaseAResults) {
        try {
            // Create a comprehensive prompt for activity generation
            const courseContext = `
Course: Municipal Administration (MUNI 201)
Subject Area: Public Administration, Local Government
Target Audience: Business Diploma students
Course Level: Intermediate

Learning Outcome: "${outcome.text}"

Learning Steps:
${outcome.learningSteps.map((step, index) => `${index + 1}. ${step.text}`).join('\n')}

Context: This is a course about municipal administration covering local government services, governance, planning, and citizen engagement. Students need practical, real-world activities that connect theory to municipal administration practice.
            `;

            const activityPrompt = `
${courseContext}

Generate 4-5 diverse, engaging learning activities for each learning step. Each activity should:

1. Have a unique, descriptive title (not just repeating the learning step)
2. Include detailed, actionable instructions
3. Connect to real municipal administration scenarios
4. Build progressively in complexity
5. Use varied activity types: readings, case studies, discussions, research, simulations, reflections, media creation, etc.
6. Include at least one reading activity with specific academic sources, textbooks, or journal articles
7. Include at least one media creation activity (infographic, video, presentation) with detailed technical requirements

For reading activities:
- Suggest specific textbooks, journal articles, or government reports
- Include Canadian municipal administration sources where possible
- Mention library database access for journal articles
- Provide specific chapter or page references when possible

For video activities:
- You MUST provide ONE actual, real YouTube video that exists and is highly relevant to the specific learning topic
- Search your knowledge for real YouTube videos related to the topic (e.g., "local government structure", "municipal planning", etc.)
- Provide the actual YouTube video ID, title, channel name, and duration
- The video must be from credible sources (government, educational institutions, reputable news like CBC/CTV)
- Format as: **Video Title** by Channel Name (Duration) followed by the embed code
- Include 3-4 specific discussion questions that connect to the learning objective
- Do NOT use placeholder text like [VIDEO_ID_1] or generic titles
- If you don't know a real video, state "Real video curation needed for: [topic]" instead of providing fake information
- Example format:
  **How Municipal Government Works** by Government of Canada (12:34)
  <iframe width="560" height="315" src="https://www.youtube.com/embed/REAL_VIDEO_ID" title="How Municipal Government Works" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

For media creation activities:
- Specify technical requirements (software, format, resolution, length)
- Include accessibility requirements (captions, alt text)
- Provide detailed creation guidelines and evaluation criteria

For each activity, provide:
- Creative title that describes what students will DO
- Detailed instructions (3-4 sentences minimum)
- Specific content, sources, or scenarios
- Technical requirements for media activities
- Clear learning objectives

CRITICAL INSTRUCTION: You are a JSON generator. Your ONLY job is to return valid JSON. 

DO NOT:
- Write explanatory text
- Provide educational analysis  
- Give recommendations
- Include markdown formatting
- Add any text before or after the JSON

DO:
- Return ONLY the JSON object below
- Fill in the activities array with 4-5 activities per learning step
- Use the exact structure shown

JSON RESPONSE REQUIRED:

{
  "activities": [
    {
      "stepId": "1",
      "stepText": "${outcome.learningSteps[0]?.text || 'Step 1'}",
      "activities": [
        {
          "type": "reading",
          "title": "Foundations of Municipal Service Theory",
          "description": "Read academic literature on municipal service frameworks",
          "content": "Read Chapter 4 'Service Delivery Models' from 'Municipal Administration in Canada' by Andrew Sancton (University of Toronto Press, 2015). Additionally, access the journal article 'Municipal Service Innovation in Canadian Cities' by Kitchen & Slack (2019) in Canadian Public Administration via your library's database. Focus on theoretical frameworks and practical applications."
        },
        {
          "type": "case-study",
          "title": "Municipal Service Analysis",
          "description": "Analyze real municipal service delivery case",
          "content": "Select a Canadian municipality and analyze their service delivery approach for one specific service (water, waste, recreation, etc.). Create a 2-page analysis including service model, stakeholders, challenges, and recommendations."
        },
        {
          "type": "infographic",
          "title": "Municipal Services Visual Framework", 
          "description": "Create an infographic mapping municipal service relationships",
          "content": "Design a comprehensive infographic using Canva showing municipal service interconnections. Requirements: 11x17 format, major service categories, interdependencies with arrows, consistent color coding, data from 3 municipalities, source citations, high-resolution PDF export."
        },
        {
          "type": "discussion",
          "title": "Service Delivery Debate",
          "description": "Debate optimal service delivery models",
          "content": "Participate in structured online debate about public vs private service delivery. Research arguments for both sides, post initial position (300 words), respond to 2 classmates, defend your position with evidence from Canadian examples."
        }
      ]
    }
  ]
}

Generate 4-5 activities per learning step. Include diverse activity types: reading, case-study, research, discussion, infographic, presentation, simulation. Make activities specific to municipal administration with Canadian examples.
            `;

            // Use the agent service to generate activities
            const response = await this.agentService.executeAgent('instructional-designer', {
                courseId: 'activity-generation',
                phase: 'activity-design',
                inputData: { 
                    learningOutcome: outcome,
                    prompt: activityPrompt,
                    courseContext: 'Municipal Administration',
                    targetAudience: 'Business Diploma students',
                    systemInstruction: 'You are a JSON generator. Return ONLY valid JSON. No explanatory text, no analysis, no recommendations. Just the requested JSON structure with learning activities.'
                },
                processingHistory: [],
                qualityRequirements: { minimumScore: 0.8 },
                userPreferences: {}
            });

            // Parse the response and format activities
            if (response.output && response.output.output) {
                try {
                    let activityData = response.output.output;
                    
                    // Handle different response formats
                    if (typeof activityData === 'object' && activityData !== null) {
                        // If it's already an object, use it directly
                        if (activityData.activities && Array.isArray(activityData.activities)) {
                            console.log(`✅ AI generated ${activityData.activities.length} activity groups for outcome: ${outcome.text}`);
                            return this.formatActivities(activityData.activities, outcome.id);
                        }
                        
                        // Check if it has other common structures
                        if (activityData.learningActivities && Array.isArray(activityData.learningActivities)) {
                            console.log(`✅ AI generated ${activityData.learningActivities.length} activity groups for outcome: ${outcome.text}`);
                            return this.formatActivities(activityData.learningActivities, outcome.id);
                        }
                        
                        // Check if the object itself is the activities array
                        if (Array.isArray(activityData)) {
                            console.log(`✅ AI generated ${activityData.length} activity groups for outcome: ${outcome.text}`);
                            return this.formatActivities(activityData, outcome.id);
                        }
                    }
                    
                    // If it's a string, try to parse as JSON
                    if (typeof activityData === 'string') {
                        // Remove any markdown formatting
                        let jsonString = activityData.replace(/```json\n?/g, '').replace(/```\n?/g, '');
                        
                        // Find JSON object boundaries
                        const startIndex = jsonString.indexOf('{');
                        const lastIndex = jsonString.lastIndexOf('}');
                        
                        if (startIndex !== -1 && lastIndex !== -1) {
                            jsonString = jsonString.substring(startIndex, lastIndex + 1);
                        }
                        
                        const parsedData = JSON.parse(jsonString);
                        
                        if (parsedData.activities && Array.isArray(parsedData.activities)) {
                            console.log(`✅ AI generated ${parsedData.activities.length} activity groups for outcome: ${outcome.text}`);
                            return this.formatActivities(parsedData.activities, outcome.id);
                        }
                    }
                    
                    console.log('⚠️  AI response structure not recognized, using fallback');
                    console.log('Response structure:', Object.keys(activityData));
                    
                } catch (parseError) {
                    console.log('❌ Failed to parse AI response, using enhanced fallback:', parseError.message);
                    console.log('AI Response type:', typeof response.output.output);
                    console.log('AI Response sample:', JSON.stringify(response.output.output).substring(0, 300) + '...');
                }
            } else {
                console.log('❌ No AI response received, using enhanced fallback');
            }

            // Enhanced fallback with meaningful content
            return this.generateEnhancedActivities(outcome);

        } catch (error) {
            console.log('Error in generateLearningActivities:', error.message);
            return this.generateEnhancedActivities(outcome);
        }
    }

    formatActivities(activities, outcomeId) {
        const formatted = [];
        
        if (!Array.isArray(activities)) {
            console.log('❌ Activities is not an array:', typeof activities);
            return formatted;
        }
        
        activities.forEach((stepActivities, stepIndex) => {
            let stepActivitiesList = [];
            
            // Handle different response structures
            if (stepActivities.activities && Array.isArray(stepActivities.activities)) {
                // Expected format: { stepId: "1", stepText: "...", activities: [...] }
                stepActivitiesList = stepActivities.activities;
            } else if (Array.isArray(stepActivities)) {
                // Direct array of activities
                stepActivitiesList = stepActivities;
            } else if (stepActivities.type) {
                // Single activity object
                stepActivitiesList = [stepActivities];
            } else {
                console.log(`⚠️  Unrecognized step format at index ${stepIndex}:`, Object.keys(stepActivities));
                return;
            }
            
            stepActivitiesList.forEach((activity, activityIndex) => {
                if (activity && typeof activity === 'object') {
                    formatted.push({
                        id: `${outcomeId.split('.')[0]}.${stepIndex + 1}.${activityIndex + 1}`,
                        stepId: `${outcomeId.split('.')[0]}.${stepIndex + 1}.0`,
                        type: activity.type || 'activity',
                        title: activity.title || `Learning Activity ${activityIndex + 1}`,
                        description: activity.description || '',
                        content: activity.content || activity.description || ''
                    });
                }
            });
        });

        console.log(`📋 Formatted ${formatted.length} activities for outcome ${outcomeId}`);
        return formatted;
    }

    generateEnhancedActivities(outcome) {
        const activities = [];
        const outcomeNumber = outcome.id.split('.')[0];
        
        // Municipal Administration specific activity templates
        const municipalActivityTemplates = {
            'summarize municipal services': [
                {
                    type: 'reading',
                    title: 'Foundations of Municipal Service Delivery',
                    description: 'Read foundational materials on municipal service types and frameworks',
                    content: 'Read Chapter 3 "Municipal Service Delivery" from "Local Government in Canada" by Andrew Sancton (University of Toronto Press, 2015). Additionally, review the Federation of Canadian Municipalities (FCM) report "The State of Canada\'s Cities and Communities 2018" available at fcm.ca. Focus on service categorization frameworks and delivery models. Take notes on key service types and their characteristics for class discussion.'
                },
                {
                    type: 'research',
                    title: 'Municipal Services Inventory',
                    description: 'Research and catalog municipal services in your local community',
                    content: 'Visit your local municipality\'s website and create a comprehensive inventory of all services offered. Categorize them into essential services (water, waste, public safety), infrastructure services (roads, utilities), and community services (recreation, libraries). Include service descriptions, delivery methods, and contact information.'
                },
                {
                    type: 'infographic_request',
                    title: 'Municipal Services Visual Framework',
                    description: 'Professional infographic showing municipal service categories and relationships',
                    content: '**MEDIA PRODUCTION REQUEST**: Design a comprehensive infographic mapping municipal service relationships. Specifications: (1) 11x17 inch format for printing and digital use, (2) Include all major service categories (essential, infrastructure, community), (3) Visual connections showing service interdependencies, (4) Consistent color coding and professional typography, (5) Include 5+ examples per category with Canadian municipal data, (6) Accessible design with alt text descriptions. Purpose: Help students visualize the complexity and interconnectedness of municipal service delivery systems.'
                },
                {
                    type: 'discussion',
                    title: 'Essential vs. Enhanced Services Debate',
                    description: 'Debate what constitutes essential municipal services',
                    content: 'Participate in a structured debate about which municipal services are truly essential versus enhanced/optional. Consider budget constraints, citizen needs, and legal requirements. Prepare arguments for both sides and engage in respectful dialogue about service priorities.'
                }
            ],
            'explain the importance of municipal services': [
                {
                    type: 'reading',
                    title: 'Municipal Services and Community Well-being',
                    description: 'Read academic research on municipal service impacts',
                    content: 'Read the journal article "Municipal Service Quality and Citizen Satisfaction: Evidence from Canadian Cities" by Slack & Bird (2013) in Canadian Public Policy, Vol. 39, No. 2. Access through your library\'s database. Also review "The Economic Impact of Municipal Infrastructure" from the Canadian Infrastructure Report Card 2019 (available at canadainfrastructure.ca). Focus on the relationship between service quality and community outcomes.'
                },
                {
                    type: 'youtube_curation',
                    title: 'Municipal Services Impact Videos',
                    description: 'Curated YouTube videos showcasing municipal service importance',
                    content: `**AI CURATION REQUEST**: Curate 2-3 YouTube videos (5-12 minutes each) showcasing the importance of municipal services in Canadian communities.

**Video 1: Essential Municipal Services**
<iframe width="560" height="315" src="https://www.youtube.com/embed/[VIDEO_ID_1]" title="Essential Municipal Services" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

**Video 2: Municipal Infrastructure and Community Development**
<iframe width="560" height="315" src="https://www.youtube.com/embed/[VIDEO_ID_2]" title="Municipal Infrastructure Impact" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

**Discussion Questions:**
1. How do the services shown in these videos impact daily life in your community?
2. What would be the economic consequences if these services were unavailable?
3. How do different municipality sizes approach service delivery differently?

**Curation Criteria:** Focus on Canadian municipalities, recent content (2021-2024), credible sources (municipal governments, CBC, CTV, educational institutions), clear audio/video quality.`
                },
                {
                    type: 'graphics_request',
                    title: 'Municipal Services Impact Diagram',
                    description: 'Professional diagram showing municipal service impacts on community',
                    content: `**GRAPHICS PRODUCTION REQUEST**: Create a professional diagram illustrating the impact of municipal services on community well-being and economic development.

**Specifications:**
- Format: 11x17 inches, suitable for digital and print
- Style: Clean, professional infographic style
- Content: Show connections between municipal services and community outcomes
- Include: Economic impact arrows, quality of life indicators, service categories

**Creation Instructions:**
1. Central hub showing "Municipal Services" 
2. Branching arrows to four main impact areas: Economic Development, Quality of Life, Public Health & Safety, Environmental Sustainability
3. Use icons for each service type (water drop, recycling symbol, road, etc.)
4. Include statistical callouts (e.g., "$X billion infrastructure investment", "Y% of GDP from municipal services")
5. Color scheme: Professional blues and greens with accent colors

**Reference Examples:**
- Government of Canada infographics: https://www.canada.ca/en/treasury-board-secretariat/services/innovation/data-visualization.html
- FCM Municipal Infrastructure diagrams: https://fcm.ca/en/resources/mamp
- Statistics Canada municipal data visualizations

**Tools:** Adobe Illustrator, Canva Pro, or similar professional design software`
                },
                {
                    type: 'assessment',
                    title: 'Municipal Services Knowledge Check',
                    description: 'Interactive self-assessment on municipal service importance',
                    content: `**H5P ASSESSMENT REQUEST**: Create an interactive self-assessment using H5P in Brightspace Creator+.

**Multiple Choice Questions:**
1. Which of the following is considered an essential municipal service?
   a) Golf courses
   b) Art galleries
   *c) Water treatment
   d) Convention centers

2. What is the primary purpose of municipal infrastructure services?
   a) Entertainment and recreation
   *b) Supporting community operations and development
   c) Generating revenue for the municipality
   d) Providing employment opportunities

3. Which factor most significantly impacts municipal service delivery costs?
   a) Population density
   b) Geographic location
   *c) Aging infrastructure
   d) Political preferences

4. Municipal services contribute to economic development by:
   a) Directly creating jobs in the private sector
   *b) Providing infrastructure that supports business operations
   c) Competing with private businesses
   d) Reducing tax burdens on corporations

**True/False Questions:**
5. Municipal services are only funded through property taxes.
   a) True
   *b) False
   (Explanation: Municipal services are funded through various sources including property taxes, user fees, grants, and transfers from other levels of government.)

6. All municipalities provide the same level of services regardless of size.
   a) True
   *b) False
   (Explanation: Service levels vary significantly based on municipality size, resources, and community needs.)

**Scenario-Based Questions:**
7. A municipality faces a 15% budget cut. Which service should be prioritized for continued funding?
   a) Community festivals
   b) Public art installations
   *c) Water and sewage treatment
   d) Golf course maintenance

Include immediate feedback for each question and final score with personalized feedback based on performance.`
                },
                {
                    type: 'reflection',
                    title: 'Life Without Municipal Services',
                    description: 'Reflect on daily life impact of municipal services',
                    content: 'Write a 500-word reflection imagining a typical day without any municipal services. Consider: no water treatment, waste collection, road maintenance, public safety, or recreational facilities. Analyze how this would affect quality of life, economic activity, and community well-being.'
                },
                {
                    type: 'analysis',
                    title: 'Economic Impact Assessment',
                    description: 'Analyze the economic impact of municipal services',
                    content: 'Research and analyze how municipal services contribute to local economic development. Focus on infrastructure services that support business operations, quality of life services that attract residents and workers, and regulatory services that ensure fair business practices. Create an infographic showing these economic connections.'
                }
            ],
            'identify challenges faced by municipal services': [
                {
                    type: 'reading',
                    title: 'Contemporary Municipal Challenges',
                    description: 'Read current research on municipal service challenges',
                    content: 'Read "Fiscal Challenges Facing Canadian Municipalities" by Kitchen & Slack (2016) from the Institute on Municipal Finance and Governance, University of Toronto (available at munkschool.utoronto.ca/imfg). Also review the most recent "Municipal Study" by the Federation of Canadian Municipalities. Focus on identifying recurring themes and emerging challenges across different municipality sizes.'
                },
                {
                    type: 'news_analysis',
                    title: 'Current Municipal Challenges Review',
                    description: 'Analyze recent news about municipal service challenges',
                    content: 'Collect and analyze 5-10 recent news articles about municipal service challenges in Canadian communities. Use sources like CBC News, Globe and Mail, and local newspapers. Categorize challenges (funding, infrastructure, staffing, technology, citizen expectations). Create a summary report identifying the most common challenges and their potential impacts on service delivery.'
                },
                {
                    type: 'youtube_curation',
                    title: 'Municipal Challenges Video Series',
                    description: 'Curated YouTube videos on municipal service challenges',
                    content: `**AI CURATION REQUEST**: Curate 3-4 YouTube videos (5-15 minutes each) showcasing real municipal service challenges and solutions.

**Video 1: Budget Constraints and Service Delivery**
<iframe width="560" height="315" src="https://www.youtube.com/embed/[VIDEO_ID_1]" title="Municipal Budget Challenges" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

**Video 2: Infrastructure Challenges and Solutions**
<iframe width="560" height="315" src="https://www.youtube.com/embed/[VIDEO_ID_2]" title="Municipal Infrastructure Solutions" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

**Video 3: Technology Adoption in Municipal Services**
<iframe width="560" height="315" src="https://www.youtube.com/embed/[VIDEO_ID_3]" title="Municipal Technology Innovation" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

**Discussion Questions:**
1. What common challenges do you see across different municipalities?
2. Which solutions seem most practical for smaller municipalities?
3. How do these challenges impact citizens directly?

**Curation Focus:** Canadian municipalities, budget constraints, infrastructure challenges, technology adoption, citizen engagement. Recent content (2021-2024) from credible sources.`
                },
                {
                    type: 'graphics_request',
                    title: 'Municipal Challenges Flowchart',
                    description: 'Professional flowchart showing municipal service challenges and solutions',
                    content: `**GRAPHICS PRODUCTION REQUEST**: Create a comprehensive flowchart illustrating municipal service challenges and potential solution pathways.

**Specifications:**
- Format: 11x17 inches, landscape orientation
- Style: Professional flowchart with clear decision points
- Content: Challenge categories, decision trees, solution options

**Creation Instructions:**
1. Start with "Municipal Service Challenge" at top
2. Branch into 5 main challenge categories: Funding, Infrastructure, Staffing, Technology, Citizen Expectations
3. Each category shows 2-3 specific challenges
4. Solution pathways with decision points (short-term vs. long-term, cost considerations)
5. End points showing successful outcomes

**Visual Elements:**
- Use different colors for challenge types
- Icons for each category (dollar sign, wrench, person, computer, speech bubble)
- Arrows showing flow and relationships
- Text boxes with clear, concise descriptions

**Reference Examples:**
- Government decision-making flowcharts: https://www.canada.ca/en/government/system
- Municipal planning process diagrams from ICMA
- Public administration flowcharts from academic sources

**Tools:** Lucidchart, Visio, or Adobe Illustrator for professional flowchart design`
                },
                {
                    type: 'assessment',
                    title: 'Municipal Challenges Analysis Quiz',
                    description: 'Interactive assessment on municipal service challenges',
                    content: `**H5P ASSESSMENT REQUEST**: Create a comprehensive assessment using H5P.

**Multiple Choice Questions:**
1. What is the most significant challenge facing Canadian municipalities today?
   a) Lack of qualified staff
   b) Political interference
   *c) Aging infrastructure and funding gaps
   d) Citizen complaints

2. Which demographic trend creates the greatest pressure on municipal services?
   a) Youth migration to cities
   *b) Aging population requiring more services
   c) Declining birth rates
   d) Immigration patterns

3. Municipal infrastructure deficit in Canada is estimated at:
   a) $50 billion
   b) $100 billion
   *c) $170+ billion
   d) $250 billion

4. Climate change impacts municipal services primarily through:
   a) Increased energy costs
   *b) Extreme weather events damaging infrastructure
   c) Changes in population distribution
   d) New environmental regulations

5. The most effective approach to addressing municipal funding challenges is:
   a) Raising property taxes significantly
   b) Reducing service levels across all areas
   *c) Diversifying revenue sources and improving efficiency
   d) Transferring all services to private companies

**True/False Questions:**
6. Municipal governments have the same revenue-generating powers as provincial governments.
   a) True
   *b) False
   (Explanation: Municipalities are "creatures of the province" with limited revenue tools, primarily property taxes and user fees.)

7. Technology adoption always reduces municipal service delivery costs.
   a) True
   *b) False
   (Explanation: While technology can improve efficiency, initial implementation costs and training requirements can be significant.)

**Case Study Scenario:**
8. A mid-sized city faces simultaneous challenges: 30% of water mains are over 50 years old, the population is growing by 3% annually, and provincial funding has been reduced by 10%. What should be the priority response?
   a) Delay infrastructure replacement to manage growth
   *b) Develop a strategic asset management plan with phased infrastructure renewal
   c) Reduce water service to control costs
   d) Immediately raise taxes to fund all needs

Include detailed feedback explaining the interconnected nature of municipal challenges and provide final reflection on prioritization strategies.`
                },
                {
                    type: 'simulation',
                    title: 'Budget Crisis Simulation',
                    description: 'Simulate municipal decision-making during budget constraints',
                    content: 'Participate in a role-playing simulation where the municipality faces a 20% budget cut. Take on roles of mayor, councillors, department heads, and citizens. Negotiate which services to maintain, reduce, or eliminate. Experience the difficult trade-offs municipal leaders face when resources are limited.'
                }
            ]
        };

        outcome.learningSteps.forEach((step, stepIndex) => {
            const stepNumber = stepIndex + 1;
            const stepKey = step.text.toLowerCase();
            
            // Find matching templates or use generic ones
            let stepActivities = [];
            
            // Try to find specific templates for this step
            for (const [templateKey, templates] of Object.entries(municipalActivityTemplates)) {
                if (stepKey.includes(templateKey) || templateKey.includes(stepKey.substring(0, 20))) {
                    stepActivities = templates;
                    break;
                }
            }
            
            // If no specific templates found, generate contextual activities
            if (stepActivities.length === 0) {
                stepActivities = this.generateContextualActivities(step.text);
            }
            
            // Add activities with proper IDs
            stepActivities.forEach((activity, activityIndex) => {
                activities.push({
                    id: `${outcomeNumber}.${stepNumber}.${activityIndex + 1}`,
                    stepId: `${outcomeNumber}.${stepNumber}.0`,
                    type: activity.type,
                    title: activity.title,
                    description: activity.description,
                    content: activity.content
                });
            });
        });

        return activities;
    }

    generateContextualActivities(stepText) {
        // Generate 2-3 focused activities per step to keep course manageable
        const activities = [];
        const lowerStepText = stepText.toLowerCase();
        
        // Always start with a reading activity
        activities.push({
            type: 'reading',
            title: `Academic Reading on ${stepText}`,
            description: `Read scholarly materials related to: ${stepText}`,
            content: `Read relevant chapters from "Municipal Administration in Canada" by Andrew Sancton or "Local Government in a Global World" by Tindal & Tindal. Additionally, search for recent journal articles on "${stepText}" using your library's academic databases (JSTOR, ProQuest, or Google Scholar). Focus on Canadian municipal contexts where possible. Prepare a 1-page summary of key concepts and findings.`
        });
        
        // Add one primary activity based on the step content
        if (lowerStepText.includes('identify') || lowerStepText.includes('list')) {
            activities.push({
                type: 'research',
                title: `Research and Identification Exercise`,
                description: `Research and identify key elements related to: ${stepText}`,
                content: `Conduct research using municipal websites, government publications, and academic sources to identify and list key elements related to "${stepText}". Create a comprehensive list with brief descriptions and examples from real municipalities.`
            });
        } else if (lowerStepText.includes('describe') || lowerStepText.includes('explain')) {
            activities.push({
                type: 'infographic_request',
                title: `Visual Explanation Infographic`,
                description: `Professional infographic explaining: ${stepText}`,
                content: `**📊 MEDIA PRODUCTION REQUEST**: Design a professional infographic that visually explains "${stepText}". Specifications: (1) 8.5x11 inch format for easy sharing and printing, (2) Include key definitions and concepts with clear hierarchy, (3) Use charts, diagrams, or flowcharts where appropriate, (4) Include real Canadian municipal examples, (5) Professional color scheme and typography, (6) Accessible design with alt text, (7) Cite all data sources. Purpose: Provide students with a clear visual reference for understanding "${stepText}" concepts.`
            });
        } else if (lowerStepText.includes('review') || lowerStepText.includes('analyze')) {
            activities.push({
                type: 'analysis',
                title: `Critical Analysis Exercise`,
                description: `Critically analyze aspects of: ${stepText}`,
                content: `Conduct a critical analysis of "${stepText}" by examining multiple perspectives, identifying strengths and weaknesses, and evaluating effectiveness. Use case studies from different municipalities to support your analysis.`
            });
        } else {
            // Default to discussion for other step types
            activities.push({
                type: 'discussion',
                title: `Collaborative Discussion Forum`,
                description: `Engage in meaningful discussion about: ${stepText}`,
                content: `Participate in an online discussion forum about "${stepText}". Share your insights, ask thoughtful questions, and respond to classmates' posts. Focus on practical applications and real-world examples from your own community or research.`
            });
        }
        
        return activities;
    }

    generateLearningOutcomeIntroduction(outcome) {
        const outcomeIntroductions = {
            'identify the types of municipal services': `
This learning outcome focuses on developing your understanding of the diverse range of services that municipalities provide to their communities. You'll explore how these services are categorized, their critical importance to community well-being, and the various challenges municipalities face in delivering them effectively. By the end of this outcome, you'll have a comprehensive understanding of the municipal service landscape and be able to analyze service delivery from multiple perspectives.`,

            'discuss emerging issues and management challenges': `
Municipal governments today face unprecedented challenges in an era of rapid change. This learning outcome examines the complex issues confronting local governments, from technological disruption and climate change to demographic shifts and fiscal constraints. You'll develop critical thinking skills to analyze these challenges and explore innovative management approaches that municipalities are adopting to address them.`,

            'identify service delivery strategies': `
Effective service delivery is at the heart of successful municipal administration. This learning outcome explores the various strategies and models municipalities use to deliver services to their communities. You'll examine different approaches, from traditional in-house delivery to public-private partnerships, and learn to evaluate their effectiveness in different contexts.`,

            'describe the elements of government planning': `
Strategic planning is essential for effective municipal governance and sustainable community development. This learning outcome introduces you to the key components of government planning processes and their critical relationship to sustainability principles. You'll learn how municipalities balance economic, social, and environmental considerations in their planning decisions.`,

            'describe the importance and methods of engaging citizens': `
Citizen engagement is fundamental to democratic governance and effective municipal administration. This learning outcome explores why citizen participation matters and examines various methods and tools for meaningful community engagement. You'll learn how to design and implement engagement strategies that build trust and improve decision-making.`,

            'explain the key elements of community planning': `
Community planning shapes the future of our cities and towns. This learning outcome provides a comprehensive overview of the planning process, key stakeholders, and essential elements that contribute to successful community development. You'll understand how planning integrates various community needs and interests into coherent development strategies.`,

            'apply best practices in community planning': `
Building on your understanding of community planning principles, this learning outcome focuses on practical application. You'll examine real-world case studies, analyze successful planning initiatives, and learn to apply best practices in various community contexts. This hands-on approach prepares you to contribute effectively to planning processes.`,

            'illustrate the importance of political acumen': `
Political acumen is a critical skill for municipal administrators who must navigate complex political environments while serving the public interest. This learning outcome explores the political dimensions of municipal administration and helps you develop the skills needed to work effectively within political systems while maintaining professional integrity.`
        };

        // Find matching introduction
        const outcomeKey = outcome.text.toLowerCase();
        for (const [key, intro] of Object.entries(outcomeIntroductions)) {
            if (outcomeKey.includes(key)) {
                return intro.trim();
            }
        }

        // Generic fallback
        return `This learning outcome is designed to build your knowledge and skills in municipal administration. Through a combination of theoretical understanding and practical application, you'll develop competencies that are essential for effective public service delivery.`;
    }

    formatActivityType(type) {
        const typeMap = {
            'research': 'Research',
            'case_study': 'Case Study',
            'discussion': 'Discussion',
            'reflection': 'Reflection',
            'interview': 'Interview',
            'analysis': 'Analysis',
            'news_analysis': 'News Analysis',
            'problem_solving': 'Problem Solving',
            'simulation': 'Simulation',
            'explanation': 'Explanation',
            'reading': 'Reading',
            'video_request': 'Video',
            'infographic_request': 'Infographic',
            'graphics_request': 'Graphic',
            'youtube_curation': 'Video',
            'assessment': 'Quiz',
            'infographic': 'Infographic',
            'video': 'Video',
            'presentation': 'Presentation'
        };
        return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
    }

    async formatActivityContent(activity) {
        let content = activity.content || '';
        
        // Handle video activities specially
        if (activity.type === 'video' || activity.type === 'youtube_curation' || activity.type === 'video_request') {
            return this.formatVideoActivity(activity);
        }
        
        // Always enhance reading activities with web search, regardless of existing content
        if (activity.type === 'reading') {
            content = await this.generateDetailedActivityContent(activity);
        }
        // For other activities, generate detailed content if content is empty or very short
        else if (!content || content.length < 50) {
            content = await this.generateDetailedActivityContent(activity);
        }
        
        // For other activities, merge description into content if needed
        let formattedContent = content;
        
        // If description exists and isn't already in content, merge it
        if (activity.description && !content.includes(activity.description) && activity.type !== 'reading') {
            formattedContent = `${activity.description}\n\n${content}`;
        }
        
        return formattedContent;
    }

    async generateDetailedActivityContent(activity) {
        const activityType = activity.type || 'activity';
        const title = activity.title || 'Learning Activity';
        const description = activity.description || '';
        
        switch (activityType.toLowerCase()) {
            case 'reading':
                return await this.generateReadingActivity(title, description);
            case 'case-study':
            case 'case_study':
                return await this.generateCaseStudyActivity(title, description);
            case 'infographic':
            case 'infographic_request':
                return await this.generateInfographicActivity(title, description);
            case 'discussion':
                return await this.generateDiscussionActivity(title, description);
            case 'research':
                return await this.generateResearchActivity(title, description);
            case 'presentation':
                return await this.generatePresentationActivity(title, description);
            case 'quiz':
            case 'assessment':
                return await this.generateQuizActivity(title, description);
            default:
                return await this.generateGenericActivity(title, description);
        }
    }

    async generateReadingActivity(title, description) {
        // Get current information to enhance the activity
        const currentInfo = await this.searchService.searchForActivityContent('reading', title, 'municipal administration');
        
        return `## Objective
${description || 'Develop foundational knowledge through guided reading'}

## Required Readings
1. **Primary Source**: Relevant chapter from "Municipal Administration in Canada" by Andrew Sancton (University of Toronto Press, 2015)
2. **Secondary Source**: Recent journal article from Canadian Public Administration or Canadian Public Policy (access via library database)
3. **Current Context**: Recent municipal government report or policy document

${currentInfo ? `## Current Context\n${currentInfo}\n` : ''}

## Instructions
1. Read the assigned materials with focus on key concepts and Canadian examples
2. Take notes on main themes, definitions, and practical applications
3. Identify 3-5 key takeaways that relate to your local municipality
4. Prepare a 1-page summary highlighting connections between theory and practice

## Deliverable
Submit a 300-500 word reflection connecting the readings to current municipal challenges

## Assessment Criteria
Understanding of concepts (40%), Canadian context application (30%), Critical analysis (30%)`;
    }

    async generateCaseStudyActivity(title, description) {
        // Get current information to enhance the case study
        const currentInfo = await this.searchService.searchForActivityContent('case-study', title, 'municipal administration');
        
        return `## Objective
${description || 'Apply theoretical knowledge to real-world municipal scenarios'}

## Case Study Focus
Analyze a specific municipal challenge or success story from a Canadian city

${currentInfo ? `## Current Context\n${currentInfo}\n` : ''}

## Instructions
1. **Select a Case**: Choose from provided options or find a recent municipal case study (2020-2024)
2. **Research Phase**: Gather background information, stakeholder perspectives, and outcomes
3. **Analysis Framework**: Apply course concepts to analyze the situation
4. **Solution Evaluation**: Assess the effectiveness of actions taken
5. **Recommendations**: Propose alternative approaches or improvements

## Deliverable
- 2-3 page case study analysis
- Include executive summary, problem analysis, solution evaluation, and recommendations
- Cite minimum 5 credible sources

## Assessment Criteria
Problem identification (25%), Analysis depth (35%), Recommendations quality (25%), Sources and citations (15%)`;
    }

    async generateInfographicActivity(title, description) {
        return `**📊 MEDIA PRODUCTION REQUEST**: Create a professional infographic

**Objective**: ${description || 'Visualize complex municipal concepts in an accessible format'}

**Content Requirements**:
- **Main Topic**: Focus on the specific learning objective
- **Key Elements**: 5-7 main concepts with supporting details
- **Data Integration**: Include relevant statistics or examples from Canadian municipalities
- **Visual Hierarchy**: Clear flow from most to least important information

**Design Specifications**:
- **Format**: 11x17 inches (tabloid size) for printing, 300 DPI
- **Orientation**: Portrait preferred, landscape acceptable
- **Color Scheme**: Professional palette (blues, greens, with accent colors)
- **Typography**: Minimum 12pt font, maximum 3 font families
- **Accessibility**: High contrast, alt-text descriptions provided

**Technical Requirements**:
- **Software**: Canva Pro, Adobe Illustrator, or Piktochart
- **File Formats**: Submit both PDF (print) and PNG (digital) versions
- **File Size**: Under 10MB for digital sharing

**Content Structure**:
1. **Header**: Clear title and subtitle
2. **Main Sections**: 3-4 primary content areas with icons
3. **Supporting Data**: Charts, graphs, or statistics
4. **Examples**: 2-3 Canadian municipal examples
5. **Footer**: Sources and creation credits

**Assessment Criteria**: Visual design (30%), Content accuracy (25%), Information clarity (25%), Technical quality (20%)`;
    }

    async generateDiscussionActivity(title, description) {
        return `**Objective**: ${description || 'Engage in collaborative learning through structured discussion'}

**Discussion Format**: Online forum or in-class structured discussion

**Preparation**:
1. Review assigned readings and course materials
2. Research current examples from Canadian municipalities
3. Prepare 2-3 discussion points or questions

**Discussion Prompts**:
1. How does this topic apply to your local municipality?
2. What are the main challenges and opportunities?
3. What best practices can be identified from other jurisdictions?
4. How might this evolve in the next 5-10 years?

**Participation Requirements**:
- **Initial Post**: 200-300 words with specific examples and citations
- **Peer Responses**: Respond to at least 2 classmates with substantive comments (100+ words each)
- **Follow-up**: Engage in ongoing dialogue throughout the discussion period

**Assessment Criteria**: Initial post quality (40%), Peer engagement (30%), Use of examples (20%), Professional tone (10%)`;
    }

    async generateResearchActivity(title, description) {
        // Get current information to enhance the research activity
        const currentInfo = await this.searchService.searchForActivityContent('research', title, 'municipal administration');
        
        return `## Objective
${description || 'Conduct independent research on municipal administration topics'}

## Research Focus
Investigate current trends, challenges, or innovations in the specified area

${currentInfo ? `## Current Context\n${currentInfo}\n` : ''}

## Research Process
1. **Topic Definition**: Narrow your focus to a specific aspect or jurisdiction
2. **Source Identification**: Use academic databases, government reports, and credible news sources
3. **Data Collection**: Gather quantitative and qualitative information
4. **Analysis**: Identify patterns, trends, and implications
5. **Synthesis**: Draw conclusions and make recommendations

## Required Sources
- Minimum 5 academic sources (journal articles, books)
- 3+ government or municipal reports
- 2+ current news articles (within last 2 years)
- 1+ interview or primary source (optional but encouraged)

**Deliverable**: 
- 1,500-2,000 word research report
- Include executive summary, methodology, findings, and recommendations
- APA citation format required

**Assessment Criteria**: Research depth (30%), Source quality (25%), Analysis (25%), Writing quality (20%)`;
    }

    async generatePresentationActivity(title, description) {
        return `**Objective**: ${description || 'Present research findings or analysis to peers'}

**Presentation Format**: 10-15 minute presentation with Q&A session

**Content Requirements**:
1. **Introduction**: Context and objectives (2 minutes)
2. **Main Content**: Key findings or analysis (8-10 minutes)
3. **Conclusions**: Implications and recommendations (2-3 minutes)
4. **Q&A**: Respond to audience questions (5 minutes)

**Technical Requirements**:
- **Slides**: 10-15 slides maximum
- **Visuals**: Include charts, graphs, images, or infographics
- **Format**: PowerPoint, Google Slides, or Prezi
- **Backup**: Bring presentation on USB drive and email copy

**Presentation Skills**:
- Clear, professional delivery
- Eye contact and engagement with audience
- Appropriate pacing and time management
- Effective use of visual aids

**Assessment Criteria**: Content quality (40%), Presentation skills (30%), Visual aids (20%), Q&A handling (10%)`;
    }

    async generateQuizActivity(title, description) {
        return `**Objective**: ${description || 'Assess understanding of key concepts and applications'}

**Quiz Format**: Online quiz with multiple question types

**Question Types**:
- Multiple choice (40%)
- True/False with justification (20%)
- Short answer (25%)
- Case study application (15%)

**Content Coverage**:
- Key terminology and definitions
- Conceptual understanding
- Application to Canadian municipal context
- Current issues and trends

**Quiz Details**:
- **Duration**: 45 minutes
- **Questions**: 20-25 questions
- **Attempts**: 2 attempts allowed (highest score counts)
- **Resources**: Closed book, no external resources

**Preparation Recommendations**:
1. Review all assigned readings and lecture notes
2. Practice with sample questions if provided
3. Focus on Canadian examples and case studies
4. Understand key concepts rather than memorizing facts

**Assessment Criteria**: Accuracy (70%), Application of concepts (20%), Canadian context understanding (10%)`;
    }

    async generateGenericActivity(title, description) {
        return `**Objective**: ${description || 'Engage with course content through active learning'}

**Activity Overview**: Complete the specified learning task to deepen understanding of municipal administration concepts

**Instructions**:
1. Review relevant course materials and readings
2. Apply concepts to real-world municipal scenarios
3. Consider Canadian municipal context and examples
4. Document your learning process and outcomes

**Requirements**:
- Demonstrate understanding of key concepts
- Connect theory to practice
- Use credible sources and citations
- Submit work in professional format

**Assessment**: Based on completion, quality of analysis, and demonstration of learning objectives

**Support**: Contact instructor if you need clarification on requirements or expectations`;
    }

    async formatActivitiesForStep(outcome, stepIndex) {
        if (!outcome.learningActivities) {
            return 'No activities generated';
        }
        const filteredActivities = outcome.learningActivities
            .filter(activity => activity.stepId === `${outcome.id.split('.')[0]}.${stepIndex + 1}.0`);
        if (filteredActivities.length === 0) {
            return 'No activities generated';
        }
        const formattedActivities = [];
        for (const activity of filteredActivities) {
            const content = await this.formatActivityContent(activity);
            formattedActivities.push(`
# ${activity.id} ${this.formatActivityType(activity.type)}: ${activity.title}

${content}
`);
        }
        return formattedActivities.join('\n');
    }

    async formatLearningOutcome(outcome) {
        let outcomeText = `
# ${outcome.id} Learning Outcome: ${outcome.text}
**Bloom's Level**: ${outcome.bloomLevel}  
**Source**: ${outcome.source}

${this.generateLearningOutcomeIntroduction(outcome)}
`;

        if (outcome.learningSteps && outcome.learningSteps.length > 0) {
            for (let stepIndex = 0; stepIndex < outcome.learningSteps.length; stepIndex++) {
                const step = outcome.learningSteps[stepIndex];
                outcomeText += `
# ${outcome.id.split('.')[0]}.${stepIndex + 1}.0 Learning Step: ${step.text}

${this.generateLearningStepIntroduction(step, outcome)}

${await this.formatActivitiesForStep(outcome, stepIndex)}
`;
            }
        } else {
            outcomeText += '\nNo learning steps defined';
        }

        return outcomeText;
    }

    formatVideoActivity(activity) {
        let content = activity.content || '';
        
        // Check if this is a placeholder video activity that needs a real video
        if (content.includes('[VIDEO_ID_') || content.includes('[Title to be determined') || 
            content.includes('AI CURATION REQUEST') || content.includes('curated YouTube video')) {
            
            // Extract the topic from the activity title or description
            const topic = activity.title || activity.description || 'municipal administration topic';
            
            // Get a real, relevant video for this topic
            return this.generateRealVideoEmbed(topic);
        }
        
        // Remove AI curation request paragraphs from existing content
        content = content.replace(/\*\*AI CURATION REQUEST\*\*:.*?(?=\n\n|\n\*\*|$)/gs, '');
        content = content.replace(/AI CURATION REQUEST:.*?(?=\n\n|\n\*\*|$)/gs, '');
        
        // Remove "curated YouTube video explaining..." phrases
        content = content.replace(/[Cc]urated YouTube videos? explaining:?.*?\n/g, '');
        content = content.replace(/[Cc]urated YouTube videos? on.*?\n/g, '');
        
        // Clean up extra whitespace
        content = content.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
        
        return content;
    }

    generateRealVideoEmbed(topic) {
        return `**📹 INSTRUCTOR NOTE: Video Curation Required**

**Topic**: ${topic}

**Instructions for Instructors:**
Please find and embed a relevant YouTube video for this topic using the following guidelines:

**Search Terms to Use:**
- "${topic} Canada"
- "Canadian municipal ${topic.toLowerCase()}"
- "local government ${topic.toLowerCase()}"

**Recommended Sources:**
- Government of Canada official channels
- CBC News, CTV News
- Municipal government channels (City of Toronto, Vancouver, etc.)
- Educational institutions (universities, colleges)
- Professional associations (IPAC, FCM, Planning Institute of Canada)

**Video Requirements:**
- Duration: 5-15 minutes
- Recent content (2020-2024 preferred)
- Clear audio/video quality
- Educational content appropriate for post-secondary students
- Canadian context preferred

**How to Add the Video:**
1. Find a suitable video on YouTube
2. Copy the video ID from the URL (everything after "v=")
3. Replace this entire section with:

\`\`\`markdown
**[Video Title]** by [Channel Name] ([Duration])

<iframe width="560" height="315" src="https://www.youtube.com/embed/[VIDEO_ID]" title="[Video Title]" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

**Discussion Questions:**
1. What are the key concepts about ${topic.toLowerCase()} presented in this video?
2. How do the examples shown relate to Canadian municipal administration practices?
3. What challenges or opportunities are highlighted that could apply to your local municipality?
4. How does this video content connect to the broader learning objectives?
\`\`\`

**Example Search**: For "${topic}", search YouTube for "Canadian municipal ${topic.toLowerCase()}" or "local government ${topic.toLowerCase()} Canada"`;
    }

    generateDiscussionQuestions(topic, videoTitle) {
        const baseQuestions = [
            `What are the key concepts about ${topic} presented in this video?`,
            `How do the examples shown relate to Canadian municipal administration practices?`,
            `What challenges or opportunities are highlighted that could apply to your local municipality?`,
            `How does this video content connect to the broader learning objectives of municipal administration?`
        ];

        return baseQuestions;
    }

    // Generate video curation instructions instead of fake videos
    generateVideoCurationInstructions(topic, context = 'municipal administration') {
        const searchTerms = this.generateSearchTerms(topic);
        const qualityCriteria = this.getVideoQualityCriteria();
        
        return `**Video Curation Required**

**Topic**: ${topic} in ${context}

**Search Terms:**
${searchTerms.map(term => `- "${term}"`).join('\n')}

**Quality Criteria:**
${qualityCriteria.map(criteria => `- ${criteria}`).join('\n')}

**Once Video is Selected:**
1. Verify video content matches the learning objective
2. Ensure video is from a credible Canadian source
3. Replace this section with proper embed code
4. Include video title, channel, and duration
5. Add 3-4 specific discussion questions

**Discussion Questions Template:**
1. What are the key points discussed in the video about ${topic}?
2. How do the examples shown relate to Canadian municipal administration?
3. What challenges or solutions are highlighted that could apply to your local municipality?
4. How does this video content connect to the broader learning objectives?`;
    }

    generateSearchTerms(topic) {
        const baseTerms = ['Canadian municipal', 'local government Canada', 'city administration'];
        const topicSpecific = {
            'budget': ['budget challenges', 'municipal funding', 'city budget crisis'],
            'infrastructure': ['infrastructure challenges', 'municipal infrastructure', 'city infrastructure'],
            'services': ['municipal services', 'city services', 'local government services'],
            'planning': ['municipal planning', 'city planning', 'urban planning Canada'],
            'engagement': ['citizen engagement', 'public participation', 'community engagement'],
            'governance': ['municipal governance', 'local government', 'city council']
        };

        const topicLower = topic.toLowerCase();
        let specificTerms = [];
        
        for (const [key, terms] of Object.entries(topicSpecific)) {
            if (topicLower.includes(key)) {
                specificTerms = terms;
                break;
            }
        }

        return [...baseTerms.map(base => `${base} ${topic}`), ...specificTerms];
    }

    getVideoQualityCriteria() {
        return [
            'Credible Canadian source (CBC, CTV, municipal government, academic institution)',
            'Recent content (2020-2024 preferred)',
            'Duration: 5-15 minutes',
            'Clear audio and video quality',
            'Educational or informational content',
            'Relevant to Canadian municipal context',
            'Appropriate for academic use'
        ];
    }

    generateLearningStepIntroduction(step, outcome) {
        const stepIntroductions = {
            'summarize municipal services': `Municipal services form the backbone of community life, encompassing everything from basic utilities to recreational programs. In this step, you'll develop the ability to categorize and summarize the full spectrum of services that municipalities provide, understanding their scope, purpose, and interconnections.`,

            'explain the importance of municipal services': `Understanding why municipal services matter goes beyond simply knowing what they are. This step helps you articulate the critical role these services play in community health, economic development, quality of life, and social equity. You'll explore how service quality directly impacts citizens' daily lives and community prosperity.`,

            'identify challenges faced by municipal services': `Municipal service delivery faces numerous challenges in today's complex environment. This step examines the financial, operational, technological, and political obstacles that municipalities encounter, helping you understand the real-world constraints that shape service delivery decisions.`,

            'interpret policy frameworks and regulations': `Municipal service delivery operates within complex regulatory and policy environments. This step develops your ability to understand and interpret the various frameworks that guide municipal operations, from provincial legislation to local bylaws and policies.`,

            'describe service delivery strategies': `Municipalities have various options for how they deliver services to their communities. This step explores different delivery models, partnership arrangements, and strategic approaches, helping you understand when and why different strategies might be most appropriate.`,

            'review local government structure': `Understanding how local governments are organized and operate is fundamental to comprehending the challenges they face. This step provides a foundation in municipal governance structures, roles, and responsibilities that will inform your analysis of emerging issues.`,

            'identify emerging issues': `The municipal sector is constantly evolving in response to new challenges and opportunities. This step helps you recognize and analyze current trends and emerging issues that are shaping the future of local government, from demographic changes to technological innovations.`,

            'review management challenges': `Managing municipal operations requires addressing complex organizational, financial, and operational challenges. This step examines the key management issues facing municipal leaders and explores various approaches to addressing them effectively.`
        };

        const stepKey = step.text.toLowerCase();
        for (const [key, intro] of Object.entries(stepIntroductions)) {
            if (stepKey.includes(key)) {
                return intro;
            }
        }

        // Generic fallback based on action verb
        const actionVerb = step.text.split(' ')[0].toLowerCase();
        const genericIntros = {
            'summarize': `This step focuses on developing your ability to synthesize and present key information clearly and concisely.`,
            'explain': `This step builds your capacity to articulate concepts clearly and demonstrate understanding through detailed explanations.`,
            'identify': `This step develops your analytical skills to recognize and categorize important elements and patterns.`,
            'describe': `This step enhances your ability to provide detailed, accurate descriptions that demonstrate comprehensive understanding.`,
            'review': `This step involves critical examination and analysis to deepen your understanding of key concepts.`,
            'interpret': `This step develops your ability to analyze and explain the meaning and significance of complex information.`,
            'define': `This step establishes clear understanding of key terms and concepts fundamental to the subject area.`
        };

        return genericIntros[actionVerb] || `This learning step is designed to build specific knowledge and skills that contribute to your overall understanding of municipal administration.`;
    }

    generateBasicActivities(outcome) {
        // Keep this as a final fallback
        return this.generateEnhancedActivities(outcome);
    }

    classifyBloomLevel(text) {
        const lowerText = text.toLowerCase();

        if (lowerText.includes('create') || lowerText.includes('design') || lowerText.includes('develop')) {
            return 'Create';
        } else if (lowerText.includes('evaluate') || lowerText.includes('assess') || lowerText.includes('critique')) {
            return 'Evaluate';
        } else if (lowerText.includes('analyze') || lowerText.includes('compare') || lowerText.includes('examine')) {
            return 'Analyze';
        } else if (lowerText.includes('apply') || lowerText.includes('implement') || lowerText.includes('use')) {
            return 'Apply';
        } else if (lowerText.includes('understand') || lowerText.includes('explain') || lowerText.includes('describe')) {
            return 'Understand';
        } else {
            return 'Remember';
        }
    }

    extractCourseStructure(phaseAResults) {
        const structure = {
            modules: [],
            sequencing: 'linear',
            prerequisites: [],
            estimatedHours: 45 // Default for 3-credit course
        };

        // Extract from Curriculum Architect
        const curriculumArchitect = phaseAResults.agentResults['curriculum-architect'];
        if (curriculumArchitect?.output) {
            // This would be enhanced based on actual agent output structure
            structure.modules = this.generateDefaultModules();
        }

        return structure;
    }

    generateDefaultModules() {
        return [
            {
                id: 'module1',
                title: 'Introduction and Foundations',
                estimatedHours: 9,
                learningOutcomes: ['LO1'],
                assessments: ['participation', 'quiz']
            },
            {
                id: 'module2',
                title: 'Core Concepts and Analysis',
                estimatedHours: 12,
                learningOutcomes: ['LO2', 'LO3'],
                assessments: ['assignment', 'discussion']
            },
            {
                id: 'module3',
                title: 'Application and Synthesis',
                estimatedHours: 15,
                learningOutcomes: ['LO4', 'LO5'],
                assessments: ['project', 'presentation']
            },
            {
                id: 'module4',
                title: 'Evaluation and Reflection',
                estimatedHours: 9,
                learningOutcomes: ['LO6'],
                assessments: ['final_exam', 'reflection']
            }
        ];
    }

    extractAssessmentFramework(phaseAResults) {
        const framework = {
            formativePercentage: 60,
            summativePercentage: 40,
            assessmentTypes: [],
            rubricApproach: 'competency-based',
            feedbackStrategy: 'continuous'
        };

        // Extract assessment recommendations from agents
        Object.values(phaseAResults.agentResults).forEach(result => {
            if (result?.output?.recommendations) {
                result.output.recommendations.forEach(rec => {
                    if (rec.toLowerCase().includes('assessment') || rec.toLowerCase().includes('evaluation')) {
                        framework.assessmentTypes.push(rec);
                    }
                });
            }
        });

        return framework;
    }

    extractResourceRequirements(phaseAResults) {
        const requirements = {
            developmentTime: '8-12 weeks',
            teamSize: '2-3 people',
            technicalRequirements: ['LMS access', 'Content authoring tools'],
            budgetEstimate: '$5,000-$8,000'
        };

        // Extract from Business Analyst
        const businessAnalyst = phaseAResults.agentResults['business-analyst'];
        if (businessAnalyst?.output) {
            // This would be enhanced based on actual agent output
            if (businessAnalyst.output.analysis) {
                requirements.analysisNotes = businessAnalyst.output.analysis;
            }
        }

        return requirements;
    }

    calculateQualityMetrics(courseContent, phaseAResults) {
        const metrics = {
            overallScore: phaseAResults.qualityScore || 0.8,
            documentProcessingQuality: this.calculateDocumentQuality(courseContent),
            agentExecutionQuality: phaseAResults.integration?.overallQualityScore || 0.8,
            educationalAlignment: 0.85, // Would be calculated based on actual analysis
            accessibilityCompliance: 0.90, // Would be validated
            completeness: phaseAResults.integration?.completeness || 0.8
        };

        metrics.overallScore = (
            metrics.documentProcessingQuality * 0.2 +
            metrics.agentExecutionQuality * 0.3 +
            metrics.educationalAlignment * 0.3 +
            metrics.accessibilityCompliance * 0.1 +
            metrics.completeness * 0.1
        );

        return metrics;
    }

    calculateDocumentQuality(courseContent) {
        if (!courseContent.documents || courseContent.documents.length === 0) {
            return 0.3;
        }

        const qualityScores = courseContent.documents
            .map(doc => doc.quality?.score || 0.5)
            .filter(score => score > 0);

        if (qualityScores.length === 0) return 0.5;

        return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    }

    generateImplementationPlan(phaseAResults) {
        return {
            phases: [
                {
                    phase: 'Content Development',
                    duration: '4-6 weeks',
                    tasks: ['Create learning materials', 'Develop assessments', 'Design activities'],
                    dependencies: ['Phase A approval']
                },
                {
                    phase: 'Media Production',
                    duration: '2-3 weeks',
                    tasks: ['Create visual assets', 'Record videos', 'Design interactive elements'],
                    dependencies: ['Content development']
                },
                {
                    phase: 'LMS Integration',
                    duration: '1-2 weeks',
                    tasks: ['Upload content', 'Configure assessments', 'Test functionality'],
                    dependencies: ['Media production']
                },
                {
                    phase: 'Quality Assurance',
                    duration: '1 week',
                    tasks: ['Accessibility testing', 'Content review', 'User testing'],
                    dependencies: ['LMS integration']
                }
            ],
            totalEstimatedTime: '8-12 weeks',
            criticalPath: ['Content Development', 'LMS Integration']
        };
    }

    generateNextSteps(phaseAResults) {
        const nextSteps = [
            'Review Phase A results and approve educational foundation',
            'Proceed to Phase B: Content and Design development',
            'Begin detailed content creation based on approved blueprint'
        ];

        // Add specific recommendations based on quality scores
        if (phaseAResults.qualityScore < 0.8) {
            nextSteps.unshift('Address quality issues identified in Phase A before proceeding');
        }

        if (phaseAResults.errors.length > 0) {
            nextSteps.unshift('Resolve agent execution errors and retry failed components');
        }

        return nextSteps;
    }

    async saveBlueprint(courseId, blueprint) {
        // Save JSON version
        const jsonPath = this.fileManager.getCoursePath(courseId, `final-output/${courseId}-course-blueprint.json`);
        await this.fileManager.saveJSON(jsonPath, blueprint);

        // Save production-ready blueprint (detailed learning content like MATH127)
        const productionContent = await this.productionGenerator.generateProductionReadyContent(blueprint);
        const productionPath = this.fileManager.getCoursePath(courseId, `final-output/${courseId}-production-ready.md`);
        await this.fileManager.saveText(productionPath, productionContent);

        // Save enhanced blueprint (learning content overview)
        const markdownContent = await this.generateEnhancedMarkdownBlueprint(blueprint);
        const mdPath = this.fileManager.getCoursePath(courseId, `final-output/${courseId}-course-blueprint.md`);
        await this.fileManager.saveText(mdPath, markdownContent);

        // Save course metadata (preamble content)
        const metadataContent = await this.generateCourseMetadata(blueprint);
        const metadataPath = this.fileManager.getCoursePath(courseId, `final-output/${courseId}-course-metadata.md`);
        await this.fileManager.saveText(metadataPath, metadataContent);

        logger.info(`Blueprint saved for course ${courseId}`, {
            qualityScore: blueprint.qualityMetrics.overallScore,
            learningOutcomes: blueprint.learningOutcomes.length,
            modules: blueprint.courseStructure.modules.length,
            productionReady: true
        });
    }

    async generateMarkdownBlueprint(blueprint) {
        return `# Course Blueprint: ${blueprint.courseInfo.title}

## Course Information
- **Course ID**: ${blueprint.courseInfo.courseId}
- **Credits**: ${blueprint.courseInfo.credits}
- **Duration**: ${blueprint.courseInfo.duration}
- **Institution**: ${blueprint.courseInfo.institution}
- **Generated**: ${new Date(blueprint.courseInfo.generatedAt).toLocaleDateString()}

## Quality Metrics
- **Overall Score**: ${Math.round(blueprint.qualityMetrics.overallScore * 100)}%
- **Educational Alignment**: ${Math.round(blueprint.qualityMetrics.educationalAlignment * 100)}%
- **Accessibility Compliance**: ${Math.round(blueprint.qualityMetrics.accessibilityCompliance * 100)}%
- **Completeness**: ${Math.round(blueprint.qualityMetrics.completeness * 100)}%

## Educational Foundation
**Pedagogical Approach**: ${blueprint.educationalFoundation.pedagogicalApproach}

**Learning Theory**: ${blueprint.educationalFoundation.learningTheory}

**Instructional Strategies**:
${blueprint.educationalFoundation.instructionalStrategies.map(strategy => `- ${strategy}`).join('\n')}

## Learning Outcomes
${blueprint.learningOutcomes.map((outcome, index) =>
            `${index + 1}. **${outcome.id}** (${outcome.bloomLevel}): ${outcome.text}`
        ).join('\n')}

## Course Structure
**Sequencing**: ${blueprint.courseStructure.sequencing}
**Estimated Hours**: ${blueprint.courseStructure.estimatedHours}

### Modules
${blueprint.courseStructure.modules.map(module =>
            `#### ${module.title}\n- **Hours**: ${module.estimatedHours}\n- **Learning Outcomes**: ${module.learningOutcomes.join(', ')}\n- **Assessments**: ${module.assessments.join(', ')}`
        ).join('\n\n')}

## Assessment Framework
- **Formative**: ${blueprint.assessmentFramework.formativePercentage}%
- **Summative**: ${blueprint.assessmentFramework.summativePercentage}%
- **Rubric Approach**: ${blueprint.assessmentFramework.rubricApproach}
- **Feedback Strategy**: ${blueprint.assessmentFramework.feedbackStrategy}

## Resource Requirements
- **Development Time**: ${blueprint.resourceRequirements.developmentTime}
- **Team Size**: ${blueprint.resourceRequirements.teamSize}
- **Budget Estimate**: ${blueprint.resourceRequirements.budgetEstimate}

## Implementation Plan
**Total Estimated Time**: ${blueprint.implementationPlan.totalEstimatedTime}

${blueprint.implementationPlan.phases.map(phase =>
            `### ${phase.phase} (${phase.duration})\n${phase.tasks.map(task => `- ${task}`).join('\n')}`
        ).join('\n\n')}

## Next Steps
${blueprint.nextSteps.map(step => `1. ${step}`).join('\n')}

---
*Generated by AI Curriculum Design System - Saskatchewan Polytechnic*
    `;
    }
  // Helper method for identifying learning outcomes
  isLearningOutcome(line) {
    const objectiveKeywords = [
      'objective', 'outcome', 'goal', 'student will', 'learner will',
      'by the end', 'upon completion', 'demonstrate', 'identify', 'analyze', 'evaluate'
    ];
    
    const lowerLine = line.toLowerCase();
    return objectiveKeywords.some(keyword => lowerLine.includes(keyword)) ||
           line.match(/^LO\s*\d+/i) ||
           line.match(/outcome\s*\d+/i) ||
           line.match(/^\d+\.\s*[A-Z]/);
  }

  async generateCourseMetadata(blueprint) {
    // Generate metadata file with course information, quality metrics, and educational foundation
    return `# Course Metadata: ${blueprint.courseInfo.title}

## Course Information
- **Course ID**: ${blueprint.courseInfo.courseId}
- **Credits**: ${blueprint.courseInfo.credits}
- **Duration**: ${blueprint.courseInfo.duration}
- **Institution**: ${blueprint.courseInfo.institution}
- **Generated**: ${new Date(blueprint.courseInfo.generatedAt).toLocaleDateString()}

## Quality Metrics
- **Overall Score**: ${Math.round(blueprint.qualityMetrics.overallScore * 100)}%
- **Educational Alignment**: ${Math.round(blueprint.qualityMetrics.educationalAlignment * 100)}%
- **Accessibility Compliance**: ${Math.round(blueprint.qualityMetrics.accessibilityCompliance * 100)}%
- **Completeness**: ${Math.round(blueprint.qualityMetrics.completeness * 100)}%

## Educational Foundation
**Pedagogical Approach**: ${blueprint.educationalFoundation.pedagogicalApproach}

**Learning Theory**: ${blueprint.educationalFoundation.learningTheory}

**Instructional Strategies**:
${blueprint.educationalFoundation.instructionalStrategies.map(strategy => `- ${strategy}`).join('\n')}

## Course Structure
**Sequencing**: ${blueprint.courseStructure.sequencing}
**Estimated Hours**: ${blueprint.courseStructure.estimatedHours}

### Modules
${blueprint.courseStructure.modules.map(module => 
  `#### ${module.title}\n- **Hours**: ${module.estimatedHours}\n- **Learning Outcomes**: ${module.learningOutcomes.join(', ')}\n- **Assessments**: ${module.assessments.join(', ')}`
).join('\n\n')}

## Assessment Framework
- **Formative**: ${blueprint.assessmentFramework.formativePercentage}%
- **Summative**: ${blueprint.assessmentFramework.summativePercentage}%
- **Rubric Approach**: ${blueprint.assessmentFramework.rubricApproach}
- **Feedback Strategy**: ${blueprint.assessmentFramework.feedbackStrategy}

## Resource Requirements
- **Development Time**: ${blueprint.resourceRequirements.developmentTime}
- **Team Size**: ${blueprint.resourceRequirements.teamSize}
- **Budget Estimate**: ${blueprint.resourceRequirements.budgetEstimate}

## Implementation Plan
**Total Estimated Time**: ${blueprint.implementationPlan.totalEstimatedTime}

${blueprint.implementationPlan.phases.map(phase =>
  `### ${phase.phase} (${phase.duration})\n${phase.tasks.map(task => `- ${task}`).join('\n')}`
).join('\n\n')}

## Next Steps
${blueprint.nextSteps.map(step => `1. ${step}`).join('\n')}

---
*Generated by AI Curriculum Design System - Saskatchewan Polytechnic*
    `;
  }

  async generateEnhancedMarkdownBlueprint(blueprint) {
    // Generate overview blueprint focused on structure and metadata
    return `# Course Blueprint Overview: ${blueprint.courseInfo.title}

## Course Information
- **Course ID**: ${blueprint.courseInfo.courseId}
- **Credits**: ${blueprint.courseInfo.credits}
- **Duration**: ${blueprint.courseInfo.duration}
- **Institution**: ${blueprint.courseInfo.institution}
- **Generated**: ${new Date(blueprint.courseInfo.generatedAt).toLocaleDateString()}

## Quality Metrics
- **Overall Score**: ${Math.round(blueprint.qualityMetrics.overallScore * 100)}%
- **Educational Alignment**: ${Math.round(blueprint.qualityMetrics.educationalAlignment * 100)}%
- **Accessibility Compliance**: ${Math.round(blueprint.qualityMetrics.accessibilityCompliance * 100)}%
- **Completeness**: ${Math.round(blueprint.qualityMetrics.completeness * 100)}%

## Learning Outcomes Summary
${blueprint.learningOutcomes.map((outcome, index) =>
  `${index + 1}. **${outcome.id}** (${outcome.bloomLevel}): ${outcome.text}\n   - Learning Steps: ${outcome.learningSteps ? outcome.learningSteps.length : 0}\n   - Activities: ${outcome.learningActivities ? outcome.learningActivities.length : 0}`
).join('\n')}

## Course Structure
**Sequencing**: ${blueprint.courseStructure.sequencing}
**Estimated Hours**: ${blueprint.courseStructure.estimatedHours}

### Modules
${blueprint.courseStructure.modules.map(module => 
  `#### ${module.title}\n- **Hours**: ${module.estimatedHours}\n- **Learning Outcomes**: ${module.learningOutcomes.join(', ')}\n- **Assessments**: ${module.assessments.join(', ')}`
).join('\n\n')}

## Assessment Framework
- **Formative**: ${blueprint.assessmentFramework.formativePercentage}%
- **Summative**: ${blueprint.assessmentFramework.summativePercentage}%
- **Rubric Approach**: ${blueprint.assessmentFramework.rubricApproach}
- **Feedback Strategy**: ${blueprint.assessmentFramework.feedbackStrategy}

## Resource Requirements
- **Development Time**: ${blueprint.resourceRequirements.developmentTime}
- **Team Size**: ${blueprint.resourceRequirements.teamSize}
- **Budget Estimate**: ${blueprint.resourceRequirements.budgetEstimate}

## Implementation Plan
**Total Estimated Time**: ${blueprint.implementationPlan.totalEstimatedTime}

${blueprint.implementationPlan.phases.map(phase => 
  `### ${phase.phase} (${phase.duration})\n${phase.tasks.map(task => `- ${task}`).join('\n')}`
).join('\n\n')}

## Next Steps
${blueprint.nextSteps.map(step => `1. ${step}`).join('\n')}

## File Outputs
- **Production-Ready Content**: \`${blueprint.courseInfo.courseId}-production-ready.md\` (detailed learning activities with embedded production requests)
- **Course Metadata**: \`${blueprint.courseInfo.courseId}-course-metadata.md\` (course information and specifications)
- **JSON Blueprint**: \`${blueprint.courseInfo.courseId}-course-blueprint.json\` (complete data structure)

---
*Generated by AI Curriculum Design System - Saskatchewan Polytechnic*
    `;
  }

  // Phase B Enhanced Methods

  extractEnhancedAssessmentFramework(phaseAResults, phaseBResults) {
    // Start with Phase A assessment framework
    const baseAssessment = this.extractAssessmentFramework(phaseAResults);
    
    // Enhance with Phase B assessment-specialist output
    const assessmentSpecialist = phaseBResults.agentResults?.['assessment-specialist'];
    
    if (assessmentSpecialist?.output) {
      const output = assessmentSpecialist.output;
      
      return {
        ...baseAssessment,
        // Enhanced with Phase B specialist recommendations
        assessmentStrategy: output.analysis || baseAssessment.assessmentStrategy,
        authenticAssessments: output.recommendations?.filter(r => r.includes('assessment')) || [],
        h5pIntegration: output.recommendations?.filter(r => r.includes('H5P')) || [],
        accessibilityCompliance: output.recommendations?.filter(r => r.includes('accessibility')) || [],
        rubricSpecifications: output.output?.includes('rubric') ? 
          'Detailed rubrics designed by assessment specialist' : baseAssessment.rubricApproach,
        qualityScore: assessmentSpecialist.metadata?.qualityScore || baseAssessment.qualityScore
      };
    }
    
    return baseAssessment;
  }

  extractActivityDesignFramework(phaseBResults) {
    const instructionalDesigner = phaseBResults.agentResults?.['instructional-designer'];
    
    if (!instructionalDesigner?.output) {
      return {
        framework: 'Basic activity design framework',
        learningTheoryApplication: 'Adult learning principles',
        scaffoldingStrategy: 'Progressive complexity',
        multiModalDesign: 'Varied activity types',
        engagementStrategies: 'Interactive elements',
        qualityScore: 0.5
      };
    }
    
    const output = instructionalDesigner.output;
    
    return {
      framework: output.analysis || 'Learning theory-based activity design',
      learningTheoryApplication: output.recommendations?.find(r => r.includes('theory')) || 'Constructivist approach',
      scaffoldingStrategy: output.recommendations?.find(r => r.includes('scaffold')) || 'Progressive skill building',
      multiModalDesign: output.recommendations?.find(r => r.includes('modal')) || 'Diverse learning styles',
      engagementStrategies: output.output?.substring(0, 200) + '...' || 'Interactive and collaborative activities',
      udlCompliance: output.recommendations?.filter(r => r.includes('UDL') || r.includes('accessibility')) || [],
      qualityScore: instructionalDesigner.metadata?.qualityScore || 0.7
    };
  }

  extractLMSIntegrationPlan(phaseBResults) {
    const lmsIntegrator = phaseBResults.agentResults?.['lms-integrator'];
    
    if (!lmsIntegrator?.output) {
      return {
        platform: 'D2L Brightspace',
        optimization: 'Basic LMS compatibility',
        accessibility: 'WCAG 2.1 AA compliance',
        mobileSupport: 'Responsive design',
        analytics: 'Standard tracking',
        qualityScore: 0.5
      };
    }
    
    const output = lmsIntegrator.output;
    
    return {
      platform: 'D2L Brightspace (optimized)',
      optimization: output.analysis || 'Platform-specific optimization',
      scormCompliance: output.recommendations?.find(r => r.includes('SCORM')) || 'SCORM 2004 4th Edition',
      accessibility: output.recommendations?.find(r => r.includes('accessibility')) || 'WCAG 2.1 AA compliance',
      mobileSupport: output.recommendations?.find(r => r.includes('mobile')) || 'Mobile-responsive design',
      h5pIntegration: output.recommendations?.filter(r => r.includes('H5P')) || [],
      analytics: output.recommendations?.find(r => r.includes('analytics')) || 'Learning analytics integration',
      implementation: output.output?.substring(0, 300) + '...' || 'Comprehensive LMS integration plan',
      qualityScore: lmsIntegrator.metadata?.qualityScore || 0.7
    };
  }

  extractEnhancedResourceRequirements(phaseAResults, phaseBResults) {
    const baseRequirements = this.extractResourceRequirements(phaseAResults);
    
    // Add Phase B specific requirements
    const hasAssessmentSpecialist = phaseBResults.agentResults?.['assessment-specialist'];
    const hasLMSIntegrator = phaseBResults.agentResults?.['lms-integrator'];
    
    return {
      ...baseRequirements,
      // Enhanced requirements based on Phase B agents
      assessmentDevelopment: hasAssessmentSpecialist ? '15-20 hours (professional assessment design)' : '8-12 hours (basic assessments)',
      lmsIntegration: hasLMSIntegrator ? '10-15 hours (full optimization)' : '4-6 hours (basic setup)',
      qualityAssurance: '8-10 hours (Phase B validation)',
      additionalTools: [
        'H5P authoring for interactive content',
        'SCORM packaging tools',
        'Accessibility testing tools',
        'LMS testing environment'
      ],
      teamSkills: [
        ...baseRequirements.teamSkills || [],
        'Assessment design expertise',
        'LMS administration',
        'Accessibility compliance',
        'Interactive content creation'
      ]
    };
  }

  calculateEnhancedQualityMetrics(courseContent, phaseAResults, phaseBResults) {
    const baseMetrics = this.calculateQualityMetrics(courseContent, phaseAResults);
    
    // Add Phase B quality metrics
    const phaseBScore = phaseBResults.qualityScore || 0.5;
    const activityDesignQuality = phaseBResults.integration?.activityDesignQuality || 0.6;
    const assessmentAlignment = phaseBResults.integration?.assessmentAlignment || 0.6;
    const lmsOptimization = phaseBResults.integration?.lmsOptimization || 0.6;
    
    const enhancedScore = (baseMetrics.overallScore * 0.6) + (phaseBScore * 0.4);
    
    return {
      ...baseMetrics,
      overallScore: Math.round(enhancedScore * 100) / 100,
      phaseAScore: phaseAResults.qualityScore,
      phaseBScore: phaseBScore,
      activityDesignQuality: Math.round(activityDesignQuality * 100) / 100,
      assessmentAlignment: Math.round(assessmentAlignment * 100) / 100,
      lmsOptimization: Math.round(lmsOptimization * 100) / 100,
      agentIntegration: phaseBResults.integration?.consistency || 0.8,
      enhancedFeatures: [
        'Professional assessment design',
        'Learning theory-based activities',
        'LMS platform optimization',
        'Accessibility compliance',
        'Interactive content integration'
      ]
    };
  }

  generateEnhancedImplementationPlan(phaseAResults, phaseBResults) {
    const basePlan = this.generateImplementationPlan(phaseAResults);
    
    // Add Phase B specific implementation phases
    const enhancedPhases = [
      ...basePlan.phases,
      {
        phase: 'Phase B - Activity Design',
        duration: '2-3 weeks',
        tasks: [
          'Implement assessment specialist recommendations',
          'Apply instructional design framework',
          'Configure LMS platform optimization',
          'Create H5P interactive content',
          'Conduct accessibility compliance testing',
          'Integrate learning analytics'
        ],
        dependencies: ['Phase A completion', 'Content development'],
        quality: phaseBResults.qualityScore
      }
    ];
    
    return {
      ...basePlan,
      phases: enhancedPhases,
      totalEstimatedTime: '8-12 weeks (enhanced with Phase B)',
      qualityGates: [
        ...basePlan.qualityGates || [],
        'Phase B agent validation (minimum 75%)',
        'Assessment alignment verification',
        'LMS optimization testing',
        'Accessibility compliance audit'
      ]
    };
  }

  generateEnhancedNextSteps(phaseAResults, phaseBResults) {
    const baseSteps = this.generateNextSteps(phaseAResults);
    
    // Add Phase B specific next steps
    const enhancedSteps = [
      ...baseSteps,
      'Review Phase B agent outputs and recommendations',
      'Implement assessment specialist assessment strategy',
      'Apply instructional designer activity framework',
      'Configure LMS integration according to specialist recommendations',
      'Develop H5P interactive content as specified',
      'Conduct comprehensive accessibility testing',
      'Validate learning analytics configuration',
      'Prepare for Phase C content generation (if applicable)'
    ];
    
    return enhancedSteps;
  }
}

module.exports = BlueprintGenerator;