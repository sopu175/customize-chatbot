const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '12345678',
    database: process.env.DB_NAME || 'dc_live_2024'
};

function processContent(content) {
    return content?.replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || '';
}

/* =====================
   FORMATTERS
===================== */
function formatCasestudy(row) {
    return {
        id: `casestudy_${row.id}`,
        title: row.title,
        content: processContent(row.description),
        excerpt: row.short_desc,
        meta: {
            subtitle: row.subtitle,
            primary_services: row.primary_services,
            industry: row.industry,
            service_overview: row.service_overview,
            status: row.status
        }
    };
}

function formatCasestudyPost(row) {
    return {
        id: `casestudy_post_${row.id}`,
        title: row.title,
        content: processContent(row.description),
        excerpt: row.short_desc,
        meta: {
            casestudy_id: row.casestudy_id,
            short_title: row.short_title,
            video_id: row.video_id,
            type: row.type,
            sort_order: row.sort_order,
            status: row.status
        }
    };
}

function formatClient(row) {
    return {
        id: `client_${row.id}`,
        title: row.title,
        content: processContent(row.description),
        excerpt: row.short_desc,
        meta: {
            subtitle: row.subtitle,
            svg_code: row.svg_code,
            status: row.status
        }
    };
}

function formatService(row) {
    return {
        id: `service_${row.id}`,
        title: row.title,
        content: processContent(row.description),
        excerpt: row.short_desc,
        meta: {
            subtitle: row.subtitle,
            type: row.type,
            sort_order: row.sort_order,
            status: row.status
        }
    };
}

function formatServicePost(row) {
    return {
        id: `service_post_${row.id}`,
        title: row.title,
        content: processContent(row.description),
        excerpt: row.short_desc,
        meta: {
            service_id: row.service_id,
            short_title: row.short_title,
            type: row.type,
            sort_order: row.sort_order,
            status: row.status
        }
    };
}

function formatPage(row) {
    return {
        id: `page_${row.id}`,
        title: row.title,
        content: processContent(row.description),
        excerpt: row.short_desc,
        meta: {
            subtitle: row.subtitle,
            blog_category: row.blog_category,
            writer: row.writer,
            status: row.status
        }
    };
}

function formatPagePost(row) {
    return {
        id: `page_post_${row.id}`,
        title: row.title,
        content: processContent(row.description),
        excerpt: row.short_desc,
        meta: {
            page_id: row.page_id,
            subtitle: row.subtitle,
            type: row.type,
            service: row.service,
            sort_order: row.sort_order,
            status: row.status
        }
    };
}

function formatGlobalSettings(rows) {
    const content = {};
    rows.forEach(row => {
        if (row.item_key) {
            content[row.item_key] = row.item_value || "";
        }
    });
    return content;
}

/* =====================
   SCRAPER
===================== */
async function scrapeAll() {
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);

        const data = {
            lastUpdated: new Date().toISOString(),
            data: {}
        };

        // Casestudy
        const [casestudyRows] = await connection.execute('SELECT * FROM `casestudy`');
        data.data.casestudy = casestudyRows.map(formatCasestudy);

        const [casestudyPostRows] = await connection.execute('SELECT * FROM `casestudy_post`');
        data.data.casestudy_post = casestudyPostRows.map(formatCasestudyPost);

        // Client (NO client_post)
        const [clientRows] = await connection.execute('SELECT * FROM `client`');
        data.data.client = clientRows.map(formatClient);

        // Service
        const [serviceRows] = await connection.execute('SELECT * FROM `service`');
        data.data.service = serviceRows.map(formatService);

        const [servicePostRows] = await connection.execute('SELECT * FROM `service_post`');
        data.data.service_post = servicePostRows.map(formatServicePost);

        // Page
        const [pageRows] = await connection.execute('SELECT * FROM `page`');
        data.data.page = pageRows.map(formatPage);

        const [pagePostRows] = await connection.execute('SELECT * FROM `page_post`');
        data.data.page_post = pagePostRows.map(formatPagePost);

        // Global Settings
        const [globalRows] = await connection.execute('SELECT * FROM `global_settings`');
        data.data.global_settings = formatGlobalSettings(globalRows);

        // Save single file
        const filePath = path.join(process.cwd(), 'app/data/chatbot.data.json');
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        console.log(`🎉 All tables scraped into single file → ${filePath}`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

if (require.main === module) {
    require('dotenv').config();
    scrapeAll();
}

module.exports = { scrapeAll };
