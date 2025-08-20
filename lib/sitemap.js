import axios from "axios";
import { load } from "cheerio";
import xml2js from "xml2js";
import { ContentCleaner } from "./contentCleaner.js";

const cleaner = new ContentCleaner({
    minLength: 100,
    maxLength: 1000,
    minWords: 20,
    maxSentences: 15
});

export async function fetchSitemap(sitemapUrl = "https://dcastalia.com/sitemap.xml") {
    try {
        console.log(`📋 Fetching sitemap from: ${sitemapUrl}`);

        const { data } = await axios.get(sitemapUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DataScraper/1.0)'
            }
        });

        const parsed = await xml2js.parseStringPromise(data);

        if (!parsed.urlset || !parsed.urlset.url) {
            throw new Error('Invalid sitemap format');
        }

        const urls = parsed.urlset.url.map(u => u.loc[0]);
        console.log(`✅ Found ${urls.length} URLs in sitemap`);

        return urls;

    } catch (error) {
        console.error('❌ Error fetching sitemap:', error.message);
        throw new Error(`Failed to fetch sitemap: ${error.message}`);
    }
}

export async function scrapePage(url, retryCount = 0) {
    const maxRetries = 2;

    try {
        console.log(`🔍 Scraping: ${url}`);

        const { data } = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        const $ = load(data);

        // Remove unwanted elements completely
        const unwantedSelectors = [
            'script', 'style', 'noscript', 'iframe', 'object', 'embed',
            'meta', 'link', 'title', 'head',
            'nav', 'header', 'footer', 'aside',
            '.navigation', '.nav', '.menu', '.header', '.footer', '.sidebar',
            '.social-share', '.social-media', '.share-buttons',
            '.comments', '.comment-section', '.related-posts',
            '.advertisement', '.ads', '.ad-container',
            '.popup', '.modal', '.overlay',
            '.breadcrumb', '.breadcrumbs',
            '.search-form', '.search-box',
            '#navigation', '#header', '#footer', '#sidebar',
            '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]'
        ];

        unwantedSelectors.forEach(selector => {
            $(selector).remove();
        });

        // Extract content with priority order
        let content = '';

        const contentSelectors = [
            'main',
            '.main-content',
            '.content',
            '.post-content',
            '.entry-content',
            '.page-content',
            '.article-content',
            'article',
            '.container .content',
            'body'
        ];

        for (const selector of contentSelectors) {
            const element = $(selector).first();
            if (element.length > 0) {
                content = element.text();
                console.log(`📄 Extracted content using selector: ${selector}`);
                break;
            }
        }

        if (!content) {
            content = $('body').text();
            console.log('📄 Fallback: extracted from body');
        }

        // Clean the content using our comprehensive cleaner
        const cleanedContent = cleaner.clean(content);

        if (!cleanedContent) {
            console.log(`⚠️ No meaningful content found for: ${url}`);
            return { url, content: "No meaningful content found" };
        }

        console.log(`✅ Successfully scraped: ${cleanedContent.length} characters`);

        return {
            url,
            content: cleanedContent,
            scrapedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error(`❌ Error scraping ${url}:`, error.message);

        // Retry logic
        if (retryCount < maxRetries) {
            console.log(`🔄 Retrying ${url} (attempt ${retryCount + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
            return scrapePage(url, retryCount + 1);
        }

        return {
            url,
            content: "Content unavailable",
            error: error.message,
            scrapedAt: new Date().toISOString()
        };
    }
}

export default {
    fetchSitemap,
    scrapePage
};