# 🔍 Enabling Web Search for Claude API

## Current Limitation
The Claude API (Anthropic) does not currently support real-time web search capabilities like some other AI services. Claude can only work with information from its training data (up to its knowledge cutoff date).

## Alternative Solutions

### Option 1: Use Claude with Web Search Tools (Recommended)
Instead of direct API web search, you can integrate web search tools:

#### A. Tavily Search API Integration
```javascript
// Install: npm install tavily
const { TavilySearchAPIClient } = require('tavily');

const tavilyClient = new TavilySearchAPIClient({
  apiKey: process.env.TAVILY_API_KEY
});

async function searchAndAnalyze(query) {
  // 1. Search the web
  const searchResults = await tavilyClient.search(query, {
    searchDepth: "advanced",
    maxResults: 5
  });
  
  // 2. Send results to Claude for analysis
  const claudeResponse = await anthropic.messages.create({
    model: "claude-3-sonnet-20240229",
    messages: [{
      role: "user", 
      content: `Analyze these search results about "${query}": ${JSON.stringify(searchResults)}`
    }]
  });
  
  return claudeResponse;
}
```

#### B. Serper API Integration
```javascript
// Install: npm install axios
const axios = require('axios');

async function searchWithSerper(query) {
  const response = await axios.post('https://google.serper.dev/search', {
    q: query,
    num: 5
  }, {
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data;
}
```

### Option 2: Use Perplexity API (Has Built-in Web Search)
```javascript
// Perplexity has built-in web search capabilities
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'llama-3.1-sonar-small-128k-online',
    messages: [{
      role: 'user',
      content: 'Find recent information about municipal service delivery in Canada'
    }]
  })
});
```

### Option 3: Manual Research Integration
For the course development system, you could:

1. **Pre-research Phase**: Manually gather current information
2. **Context Injection**: Include recent data in the prompts
3. **Hybrid Approach**: Combine Claude's analysis with current web data

## Implementation for Course System

### Step 1: Add Search Configuration
```javascript
// In src/config.js
module.exports = {
  // ... existing config
  searchProviders: {
    tavily: {
      apiKey: process.env.TAVILY_API_KEY,
      enabled: true
    },
    serper: {
      apiKey: process.env.SERPER_API_KEY,
      enabled: false
    }
  }
};
```

### Step 2: Create Search Service
```javascript
// Create src/search-service.js
class SearchService {
  async searchForCourseContent(topic, courseContext) {
    const query = `${topic} ${courseContext} Canada 2023 2024`;
    
    // Search for current information
    const searchResults = await this.performSearch(query);
    
    // Format for Claude
    return this.formatSearchResults(searchResults);
  }
  
  async performSearch(query) {
    // Implementation depends on chosen provider
    // Return structured search results
  }
}
```

### Step 3: Integrate with Activity Generation
```javascript
// In blueprint-generator.js
async generateEnhancedActivity(activity) {
  // 1. Search for current information
  const currentInfo = await this.searchService.searchForCourseContent(
    activity.topic, 
    'municipal administration'
  );
  
  // 2. Include in Claude prompt
  const enhancedPrompt = `
    Generate activity content for: ${activity.title}
    
    Current information: ${currentInfo}
    
    Create detailed, current activity instructions...
  `;
  
  // 3. Process with Claude
  return await this.processWithClaude(enhancedPrompt);
}
```

## Recommended Approach for Your System

1. **Start with Tavily API** (most cost-effective for educational content)
2. **Add search capability to activity generation**
3. **Focus on Canadian municipal content searches**
4. **Cache search results to avoid repeated API calls**

## API Keys Needed
Add to your `.env` file:
```
TAVILY_API_KEY=your_tavily_key_here
# OR
SERPER_API_KEY=your_serper_key_here
# OR  
PERPLEXITY_API_KEY=your_perplexity_key_here
```

## Cost Considerations
- **Tavily**: ~$0.001 per search
- **Serper**: ~$0.001 per search  
- **Perplexity**: ~$0.001-0.005 per request

Would you like me to implement one of these search integrations for your course development system?