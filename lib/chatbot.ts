import fs from 'fs';
import path from 'path';
import { getLLM, validateLLMConnection } from './llm';
import Fuse from 'fuse.js';
import { getErrorMessage } from './errors';

interface DcastaliaPage {
  url: string;
  title: string;
  description: string;
  content: string;
  scrapedAt: string;
}

interface DcastaliaData {
  lastUpdated: string;
  pages: DcastaliaPage[];
  sitemap: string[];
}

function loadDcastaliaData(): DcastaliaData {
  try {
    const dataPath = path.join(process.cwd(), 'app/data/dcastalia.json');
    const data = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading Dcastalia data:', error);
    return {
      lastUpdated: new Date().toISOString(),
      pages: [],
      sitemap: []
    };
  }
}



export async function generateChatbotResponse(message: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

  try {
    // Validate LLM connection first
    await validateLLMConnection();

    const llm = getLLM();
    const data = loadDcastaliaData();

    if (data.pages.length === 0) {
      return "I don't have any data from Dcastalia yet. The scraping process may still be running or may have encountered issues. Please ensure the scraper has successfully collected data from dcastalia.com by running 'npm run scrape' and check the console output.";
    }

    const relevantPages = findRelevantPages(message, data);

    let context = '';
    if (relevantPages.length > 0) {
      console.log(`Found ${relevantPages.length} relevant pages for query: "${message}"`);
      context = relevantPages
        .map(page => `
**${page.title}**
URL: ${page.url}
${page.description ? `Description: ${page.description}` : ''}
Content: ${page.content.slice(0, 1500)}...
`)
        .join('\n---\n');
    } else {
      console.log(`No relevant pages found for query: "${message}"`);
    }

    const prompt = `You are a helpful chatbot with knowledge about Dcastalia.com. 

${context ? `Use the following context from the Dcastalia website to answer the user's question accurately and helpfully:

CONTEXT FROM DCASTALIA.COM:
${context}

Based on this context, please provide a comprehensive answer to the user's question.` : `I don't have specific information from Dcastalia.com that directly relates to this question. Please provide a helpful general response and mention that for more specific information about Dcastalia, the user should visit the website directly.`}

USER QUESTION: ${message}

INSTRUCTIONS:
- Provide a helpful, accurate, and detailed response
- If you reference specific information from Dcastalia, mention the source URL when relevant
- Be conversational and friendly
- If the context doesn't fully answer the question, acknowledge this and provide what information you can
`;

    console.log('Sending prompt to LLM...');
    const response = await llm.invoke(prompt, { signal: controller.signal } as any);
    console.log('Received response from LLM');

    // Handle different response formats
    if (response && typeof response === 'object') {
        if ('content' in response && typeof response.content === 'string') {
            return response.content;
        }
        if ('text' in response && typeof response.text === 'string') {
            return response.text;
        }
    }

    console.error('Unexpected response format:', typeof response, response);
    return 'I received a response but in an unexpected format. Please try rephrasing your question.';
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('LLM request timed out');
      return 'The request to the AI service timed out. Please try again.';
    }
    console.error('Chatbot error:', error);
    return getErrorMessage(error);
  } finally {
    clearTimeout(timeoutId);
  }
}