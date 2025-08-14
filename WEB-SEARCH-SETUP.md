# 🔍 Web Search Setup Guide

## Overview
The course development system now supports web search integration to enhance activities with current information about municipal administration topics.

## Quick Setup (5 minutes)

### Step 1: Get Tavily API Key
1. Go to [https://tavily.com](https://tavily.com)
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key

### Step 2: Add API Key to Environment
1. Open your `.env` file
2. Replace `your_tavily_api_key_here` with your actual API key:
   ```
   TAVILY_API_KEY=tvly-your-actual-api-key-here
   ```
3. Save the file

### Step 3: Test the Integration
```bash
node test-web-search.js
```

You should see live search results instead of fallback content.

## How It Works

### Automatic Enhancement
When generating course activities, the system will:
1. **Search for current information** related to the activity topic
2. **Filter results** to Canadian government, municipal, and educational sources
3. **Include current context** in activity instructions
4. **Provide recent examples** and data points

### Search Sources Prioritized
- Government of Canada (canada.ca, gc.ca)
- Major Canadian news (CBC, CTV)
- Municipal websites (Toronto, Vancouver, Calgary)
- Professional associations (FCM, IPAC)
- Educational institutions

### Activity Types Enhanced
- **Reading Activities**: Current reports and recent developments
- **Case Studies**: Recent municipal challenges and solutions
- **Research Projects**: Latest data and trends
- **Discussions**: Current issues and debates
- **Infographics**: Recent statistics and data points

## Cost Information
- **Free Tier**: 1,000 searches per month
- **Cost**: ~$0.001 per search after free tier
- **Typical Usage**: 10-50 searches per course generation

## Example Enhanced Activity

### Before (Without Web Search):
```markdown
**1.1.1 Reading: Municipal Service Delivery**

Read relevant chapters about municipal services...
```

### After (With Web Search):
```markdown
**1.1.1 Reading: Municipal Service Delivery**

**Current Information on municipal service delivery** (Search Date: 8/7/2025)

**Key Findings:**
Recent developments show increased focus on digital service delivery and citizen engagement platforms across Canadian municipalities.

**Recent Sources:**
- **Digital Government Strategy 2024** (canada.ca): New initiatives for online municipal services...
- **Municipal Innovation Report** (fcm.ca): Best practices from Toronto and Vancouver...
- **Service Delivery Trends** (cbc.ca): Analysis of post-pandemic municipal service changes...

Read relevant chapters about municipal services...
```

## Configuration Options

### Search Preferences
You can customize search behavior in `src/config.js`:
```javascript
search: {
  defaultOptions: {
    maxResults: 5,        // Number of search results
    depth: 'basic',       // 'basic' or 'advanced'
    includeDomains: [     // Preferred sources
      'canada.ca',
      'gc.ca',
      'cbc.ca',
      // ... add more
    ]
  }
}
```

### Disable Web Search
To disable web search temporarily:
1. Comment out or remove `TAVILY_API_KEY` from `.env`
2. System will automatically use fallback content

## Troubleshooting

### Search Not Working?
1. **Check API Key**: Ensure it starts with `tvly-`
2. **Check Internet**: Verify network connectivity
3. **Check Logs**: Look for error messages in console
4. **Test Manually**: Run `node test-web-search.js`

### Getting Irrelevant Results?
1. **Adjust Domains**: Modify `includeDomains` in config
2. **Refine Queries**: The system automatically builds search queries
3. **Check Activity Type**: Different activities use different search strategies

### API Limits Reached?
1. **Monitor Usage**: Check your Tavily dashboard
2. **Upgrade Plan**: Consider paid tier for heavy usage
3. **Cache Results**: System automatically avoids duplicate searches

## Next Steps
1. ✅ Get Tavily API key and add to `.env`
2. ✅ Test with `node test-web-search.js`
3. ✅ Process a course: `node process-course.js MUNI-201`
4. ✅ Review enhanced activities in the generated blueprint
5. ✅ Customize search preferences if needed

The system will now automatically enhance all course activities with current, relevant information from trusted Canadian sources!