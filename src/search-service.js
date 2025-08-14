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

    async searchForCourseContent(topic, courseContext = 'municipal administration', options = {}) {
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
        const sources = options.sources || 'government education municipal';
        
        return `${baseQuery} ${location} ${timeframe} ${sources}`;
    }

    async performTavilySearch(query, options = {}) {
        const searchParams = {
            query: query,
            search_depth: options.depth || 'basic',
            include_answer: true,
            include_raw_content: false,
            max_results: options.maxResults || 5,
            include_domains: options.includeDomains || [
                'canada.ca',
                'gc.ca', 
                'cbc.ca',
                'ctv.ca',
                'toronto.ca',
                'vancouver.ca',
                'calgary.ca',
                'fcm.ca',
                'ipac.ca'
            ]
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

    getFallbackContent(topic, courseContext = 'municipal administration') {
        return `
**Topic Context: ${topic}**

**Note:** Current web search is not available. The following guidance is based on established practices in ${courseContext}:

**General Guidance:**
- Focus on Canadian municipal examples and case studies
- Reference current government reports and municipal websites
- Include recent developments in municipal service delivery
- Consider regional variations across Canadian municipalities

**Recommended Current Sources:**
- Government of Canada municipal resources (canada.ca)
- Federation of Canadian Municipalities (fcm.ca)
- Provincial municipal affairs departments
- Major city websites (Toronto, Vancouver, Calgary, Montreal)
- Canadian Public Administration journal
- Institute of Public Administration of Canada (IPAC)

**Research Suggestion:** Manually search for recent information on "${topic}" using the recommended sources above.
        `.trim();
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