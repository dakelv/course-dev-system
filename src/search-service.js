const axios = require('axios');
const logger = require('../utils/logger');

class SearchService {
    constructor() {
        this.tavilyApiKey = process.env.TAVILY_API_KEY;
        this.enabled = !!this.tavilyApiKey && this.tavilyApiKey !== 'your_tavily_api_key_here';
        
        if (!this.enabled) {
            console.log('⚠️  Web search disabled: TAVILY_API_KEY not configured');
        } else {
            console.log('✅ Web search enabled with Tavily API');
        }
    }

    async searchForCourseContent(topic, courseContext = 'general', options = {}) {
        if (!this.enabled) {
            return this.getFallbackContent(topic, courseContext);
        }

        try {
            const query = this.buildSearchQuery(topic, courseContext, options);
            console.log(`🔍 Searching for: ${query}`);
            
            const searchResults = await this.performTavilySearch(query, options);
            return this.formatSearchResults(searchResults, topic);
            
        } catch (error) {
            logger.logError(error, { operation: 'web-search', topic, courseContext });
            console.log(`⚠️  Search failed for "${topic}", using fallback content`);
            return this.getFallbackContent(topic, courseContext);
        }
    }

    buildSearchQuery(topic, courseContext, options = {}) {
        const baseQuery = `${topic} ${courseContext}`;
        const location = options.location || 'Canada';
        const timeframe = options.timeframe || '2023 2024';
        const sources = options.sources || this.getContextualSources(courseContext);
        
        return `${baseQuery} ${location} ${timeframe} ${sources}`;
    }

    getContextualSources(courseContext) {
        const contextLower = courseContext.toLowerCase();
        
        if (contextLower.includes('municipal') || contextLower.includes('government')) {
            return 'government municipal education academic';
        }
        if (contextLower.includes('business') || contextLower.includes('management')) {
            return 'business government statistics education';
        }
        if (contextLower.includes('accounting') || contextLower.includes('financial')) {
            return 'professional government regulatory education';
        }
        if (contextLower.includes('computer') || contextLower.includes('technology')) {
            return 'technical documentation tutorial education';
        }
        if (contextLower.includes('health') || contextLower.includes('medical')) {
            return 'medical government research education';
        }
        if (contextLower.includes('engineering') || contextLower.includes('technical')) {
            return 'professional technical government education';
        }
        
        return 'government education academic';
    }

    async performTavilySearch(query, options = {}) {
        const searchParams = {
            query: query,
            search_depth: options.depth || 'basic',
            include_answer: true,
            include_raw_content: false,
            max_results: options.maxResults || 5,
            include_domains: options.includeDomains || this.getDefaultDomains(options.courseContext)
        };

        const response = await axios.post('https://api.tavily.com/search', searchParams, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.tavilyApiKey}`
            },
            timeout: 10000 // 10 second timeout
        });

        return response.data;
    }

    getDefaultDomains(courseContext = '') {
        const contextLower = courseContext.toLowerCase();
        
        // Base Canadian domains
        const baseDomains = ['canada.ca', 'gc.ca', 'cbc.ca', 'ctv.ca', 'statcan.gc.ca'];
        
        if (contextLower.includes('municipal') || contextLower.includes('government')) {
            return [...baseDomains, 'fcm.ca', 'ipac.ca', 'toronto.ca', 'vancouver.ca', 'calgary.ca'];
        }
        if (contextLower.includes('business') || contextLower.includes('management')) {
            return [...baseDomains, 'bdc.ca', 'ic.gc.ca', 'chamber.ca'];
        }
        if (contextLower.includes('accounting') || contextLower.includes('financial')) {
            return [...baseDomains, 'cpacanada.ca', 'cra-arc.gc.ca'];
        }
        if (contextLower.includes('computer') || contextLower.includes('technology')) {
            return [...baseDomains, 'github.com', 'stackoverflow.com', 'developer.mozilla.org'];
        }
        if (contextLower.includes('health') || contextLower.includes('medical')) {
            return [...baseDomains, 'phac-aspc.gc.ca', 'cihr-irsc.gc.ca', 'healthcanada.gc.ca'];
        }
        if (contextLower.includes('engineering')) {
            return [...baseDomains, 'engineerscanada.ca', 'nrc-cnrc.gc.ca'];
        }
        
        return baseDomains;
    }

    formatSearchResults(searchResults, topic) {
        if (!searchResults || !searchResults.results) {
            return this.getFallbackContent(topic);
        }

        const formattedResults = {
            topic: topic,
            summary: searchResults.answer || '',
            sources: searchResults.results.map(result => ({
                title: result.title,
                url: result.url,
                content: result.content,
                score: result.score
            })),
            searchDate: new Date().toISOString(),
            totalResults: searchResults.results.length
        };

        return this.createSearchSummary(formattedResults);
    }

    createSearchSummary(results) {
        const summary = `
**Current Information on ${results.topic}** (Search Date: ${new Date(results.searchDate).toLocaleDateString()})

**Key Findings:**
${results.summary || 'Recent developments and current practices in this area.'}

**Recent Sources:**
${results.sources.slice(0, 3).map(source => 
    `- **${source.title}** (${new URL(source.url).hostname}): ${source.content.substring(0, 150)}...`
).join('\n')}

**Search Context:** Based on ${results.totalResults} current sources from Canadian government, municipal, and educational websites.
        `.trim();

        return summary;
    }

    getFallbackContent(topic, courseContext = 'general') {
        const contextualGuidance = this.getContextualFallbackGuidance(courseContext);
        
        return `
**Topic Context: ${topic}**

**Note:** Current web search is not available. The following guidance is based on established practices in ${courseContext}:

${contextualGuidance.guidance}

**Recommended Current Sources:**
${contextualGuidance.sources.map(source => `- ${source}`).join('\n')}

**Research Suggestion:** Manually search for recent information on "${topic}" using the recommended sources above.
        `.trim();
    }

    getContextualFallbackGuidance(courseContext) {
        const contextLower = courseContext.toLowerCase();
        
        if (contextLower.includes('municipal') || contextLower.includes('government')) {
            return {
                guidance: `**General Guidance:**
- Focus on Canadian municipal examples and case studies
- Reference current government reports and municipal websites
- Include recent developments in municipal service delivery
- Consider regional variations across Canadian municipalities`,
                sources: [
                    'Government of Canada municipal resources (canada.ca)',
                    'Federation of Canadian Municipalities (fcm.ca)',
                    'Provincial municipal affairs departments',
                    'Major city websites (Toronto, Vancouver, Calgary, Montreal)',
                    'Canadian Public Administration journal',
                    'Institute of Public Administration of Canada (IPAC)'
                ]
            };
        }
        
        if (contextLower.includes('business') || contextLower.includes('management')) {
            return {
                guidance: `**General Guidance:**
- Focus on Canadian business examples and case studies
- Reference current market data and business statistics
- Include recent developments in business practices
- Consider industry-specific variations and trends`,
                sources: [
                    'Statistics Canada business data (statcan.gc.ca)',
                    'Business Development Bank of Canada (bdc.ca)',
                    'Innovation, Science and Economic Development Canada (ic.gc.ca)',
                    'Canadian Chamber of Commerce resources',
                    'Harvard Business Review case studies',
                    'Canadian business journals and publications'
                ]
            };
        }
        
        if (contextLower.includes('accounting') || contextLower.includes('financial')) {
            return {
                guidance: `**General Guidance:**
- Focus on Canadian accounting standards and practices
- Reference current tax legislation and regulations
- Include recent developments in financial reporting
- Consider professional standards and compliance requirements`,
                sources: [
                    'CPA Canada resources and standards (cpacanada.ca)',
                    'Canada Revenue Agency publications (cra-arc.gc.ca)',
                    'Financial reporting standards and guidelines',
                    'Provincial accounting regulatory bodies',
                    'Canadian accounting journals and publications',
                    'Government financial reporting examples'
                ]
            };
        }
        
        if (contextLower.includes('computer') || contextLower.includes('technology')) {
            return {
                guidance: `**General Guidance:**
- Focus on current technology trends and best practices
- Reference official documentation and standards
- Include recent developments in software and systems
- Consider practical implementation and real-world examples`,
                sources: [
                    'Official language and framework documentation',
                    'GitHub repositories and open source projects',
                    'Stack Overflow discussions and solutions',
                    'Technology blogs and tutorial websites',
                    'Professional development resources',
                    'Industry standards and best practices'
                ]
            };
        }
        
        if (contextLower.includes('health') || contextLower.includes('medical')) {
            return {
                guidance: `**General Guidance:**
- Focus on evidence-based practices and current research
- Reference official health guidelines and policies
- Include recent developments in healthcare delivery
- Consider patient safety and ethical considerations`,
                sources: [
                    'Health Canada guidelines and policies (canada.ca)',
                    'Public Health Agency of Canada (phac-aspc.gc.ca)',
                    'Canadian Institutes of Health Research (cihr-irsc.gc.ca)',
                    'Provincial health authorities and colleges',
                    'Peer-reviewed medical journals',
                    'Professional health organization resources'
                ]
            };
        }
        
        if (contextLower.includes('engineering')) {
            return {
                guidance: `**General Guidance:**
- Focus on technical standards and professional practices
- Reference current codes and engineering principles
- Include recent developments in engineering solutions
- Consider safety, sustainability, and regulatory compliance`,
                sources: [
                    'Engineers Canada professional standards (engineerscanada.ca)',
                    'National Research Council publications (nrc-cnrc.gc.ca)',
                    'Canadian Standards Association documents',
                    'Provincial professional engineering associations',
                    'Engineering journals and technical publications',
                    'Government infrastructure and technical reports'
                ]
            };
        }
        
        // General fallback
        return {
            guidance: `**General Guidance:**
- Focus on Canadian examples and current practices
- Reference authoritative sources and recent research
- Include recent developments in the field
- Consider practical applications and real-world contexts`,
            sources: [
                'Government of Canada resources (canada.ca)',
                'Statistics Canada data and reports (statcan.gc.ca)',
                'Academic journals and research publications',
                'Professional association resources',
                'Current news and analysis from reputable sources',
                'Educational institution resources and libraries'
            ]
        };
    }

    // Method to search for specific activity content
    async searchForActivityContent(activityType, topic, courseContext) {
        const searchOptions = {
            maxResults: 3,
            depth: 'basic',
            timeframe: '2022 2023 2024'
        };

        switch (activityType.toLowerCase()) {
            case 'reading':
                searchOptions.sources = 'academic journal government report';
                break;
            case 'case-study':
                searchOptions.sources = 'municipal government case study example';
                break;
            case 'video':
                searchOptions.sources = 'educational video government youtube';
                break;
            case 'infographic':
                searchOptions.sources = 'municipal data statistics infographic';
                break;
            default:
                searchOptions.sources = 'government education municipal';
        }

        return await this.searchForCourseContent(topic, courseContext, searchOptions);
    }

    // Method to get current municipal data
    async getCurrentMunicipalData(topic) {
        const query = `${topic} municipal data statistics Canada 2023 2024`;
        
        try {
            const results = await this.performTavilySearch(query, {
                maxResults: 3,
                includeDomains: ['statcan.gc.ca', 'fcm.ca', 'canada.ca']
            });
            
            return this.extractDataFromResults(results);
        } catch (error) {
            return 'Current municipal data not available - recommend checking Statistics Canada and FCM reports';
        }
    }

    extractDataFromResults(results) {
        if (!results.results || results.results.length === 0) {
            return 'No current data found';
        }

        const dataPoints = results.results
            .map(result => result.content)
            .join(' ')
            .match(/\d+%|\$[\d,]+|\d+,\d+|\d+ million|\d+ billion/g) || [];

        return dataPoints.length > 0 
            ? `Recent data points: ${dataPoints.slice(0, 5).join(', ')}`
            : 'Current data available in search results';
    }
}

module.exports = SearchService;