const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const DCASTALIA_URL = process.env.DCASTALIA_URL || 'https://dcastalia.com';
const DATA_FILE = path.join(process.cwd(), 'app/data/dcastalia.json');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeSitemap() {
    try {
        console.log(`🔍 Fetching sitemap from ${DCASTALIA_URL}/sitemap.xml`);
        const response = await axios.get(`${DCASTALIA_URL}/sitemap.xml`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DcastaliaChatbot/1.0; +https://example.com/bot)'
            }
        });
        const $ = cheerio.load(response.data, { xmlMode: true });

        const urls = [];
        $('url > loc').each((i, elem) => {
            const url = $(elem).text();
            if (url && url.includes(DCASTALIA_URL)) {
                urls.push(url);
            }
        });

        console.log(`📄 Found ${urls.length} pages in sitemap`);
        return urls;
    } catch (error) {
        console.error('❌ Error fetching sitemap:', error.message);
        return [];
    }
}

async function scrapePage(url) {
    try {
        console.log(`📖 Scraping: ${url}`);
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DcastaliaChatbot/1.0; +https://example.com/bot)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive'
            }
        });

        const $ = cheerio.load(response.data);

        // Remove script and style elements
        $('script, style, nav, footer, .nav, .footer').remove();

        const title = $('title').text().trim() || $('h1').first().text().trim();
        const description = $('meta[name="description"]').attr('content') || '';

        // Extract main content
        let content = '';
        const contentSelectors = [
            'main',
            'article',
            '.content',
            '.post-content',
            '.entry-content',
            '.page-content',
            '.main-content',
            '#content',
            '#main',
            'body'
        ];

        for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                content = element.text().trim();
                break;
            }
        }

        // Clean up content
        content = content
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, ' ')
            .replace(/\t+/g, ' ')
            .trim()
            .slice(0, 8000); // Increased content length

        // Skip pages with very little content
        if (content.length < 100) {
            console.log(`⚠️  Skipping ${url} - insufficient content (${content.length} chars)`);
            return null;
        }

        return {
            url,
            title,
            description,
            content,
            scrapedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error(`❌ Error scraping ${url}:`, error.message);
        return null;
    }
}

async function scrapeAllPages() {
    const urls = await scrapeSitemap();
    const pages = [];

    console.log(`🚀 Starting to scrape ${urls.length} pages...`);

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];

        // Skip non-content URLs
        if (url.includes('/wp-') || url.includes('/feed') || url.includes('.xml') || url.includes('.pdf')) {
            console.log(`⏭️  Skipping ${url} - non-content URL`);
            continue;
        }

        const page = await scrapePage(url);

        if (page && page.content) {
            pages.push(page);
            console.log(`✅ Scraped ${i + 1}/${urls.length}: ${page.title}`);
        } else {
            console.log(`❌ Failed to scrape ${i + 1}/${urls.length}: ${url}`);
        }

        // Add delay to be respectful to the server
        await delay(2000);
    }

    const data = {
        lastUpdated: new Date().toISOString(),
        pages,
        sitemap: urls
    };

    // Ensure data directory exists
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log(`🎉 Successfully scraped ${pages.length} pages`);
    console.log(`💾 Data saved to: ${DATA_FILE}`);

    // Log sample of scraped data
    if (pages.length > 0) {
        console.log(`\n📋 Sample scraped content:`);
        console.log(`Title: ${pages[0].title}`);
        console.log(`Content preview: ${pages[0].content.slice(0, 200)}...`);
    }

    return data;
}

if (require.main === module) {
    require('dotenv').config();
    scrapeAllPages().catch(console.error);
}

module.exports = { scrapeAllPages, scrapePage, scrapeSitemap };