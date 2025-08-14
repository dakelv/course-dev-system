const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

async function testClaudeAPI() {
    console.log('Testing Claude API...');
    console.log('API Key present:', process.env.CLAUDE_API_KEY ? 'Yes' : 'No');
    console.log('API Key starts with:', process.env.CLAUDE_API_KEY ? process.env.CLAUDE_API_KEY.substring(0, 20) + '...' : 'N/A');
    
    try {
        const anthropic = new Anthropic({
            apiKey: process.env.CLAUDE_API_KEY,
        });

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 100,
            messages: [
                { role: 'user', content: 'Hello! Please respond with "API test successful"' }
            ]
        });

        console.log('✅ API Test Successful!');
        console.log('Response:', response.content[0].text);
        return true;
    } catch (error) {
        console.log('❌ API Test Failed:');
        console.log('Error:', error.message);
        console.log('Status:', error.status);
        return false;
    }
}

testClaudeAPI();