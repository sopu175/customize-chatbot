import { fetchSitemap, scrapePage } from "./sitemap.js";
import { DataManager } from "./dataManager.js";

async function updateJson() {
    const startTime = Date.now();

    try {
        console.log("🚀 Starting enhanced data update process...");

        const dataManager = new DataManager();

        // Load existing data for comparison
        const existingData = await dataManager.loadExistingData();
        const existingUrls = new Set(existingData.map(entry => entry.url));

        // Fetch sitemap
        console.log("📋 Fetching sitemap...");
        const urls = await fetchSitemap();
        console.log(`✅ Found ${urls.length} URLs in sitemap`);

        // Filter new URLs
        const newUrls = urls.filter(url => !existingUrls.has(url));
        console.log(`🆕 New URLs to scrape: ${newUrls.length}`);
        console.log(`🔄 Existing URLs to update: ${urls.length - newUrls.length}`);

        const results = [...existingData]; // Start with existing data
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        // Process all URLs (new and existing)
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];

            try {
                console.log(`\n🔄 Processing ${i + 1}/${urls.length}: ${url}`);

                const result = await scrapePage(url);

                // Validate the scraped content
                if (result.content &&
                    result.content.length > 100 &&
                    !result.content.includes("Content unavailable") &&
                    !result.content.includes("No meaningful content found")) {

                    // Remove existing entry if it exists
                    const existingIndex = results.findIndex(item => item.url === url);
                    if (existingIndex >= 0) {
                        results.splice(existingIndex, 1);
                        console.log(`🔄 Updated existing entry`);
                    } else {
                        console.log(`🆕 Added new entry`);
                    }

                    results.push(result);
                    successCount++;
                    console.log(`✅ Success: ${result.content.length} characters`);

                } else {
                    console.log(`⚠️ Skipped: Poor content quality (${result.content?.length || 0} chars)`);
                    skippedCount++;
                }

                // Respectful delay
                if (i < urls.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (err) {
                console.error(`❌ Failed: ${url} - ${err.message}`);
                errorCount++;
            }
        }

        // Deduplicate and validate data
        console.log("\n🔍 Processing collected data...");
        const deduplicatedData = dataManager.deduplicateData(results);
        const validatedData = dataManager.validateDataQuality(deduplicatedData);

        // Save processed data
        await dataManager.saveData(validatedData);

        // Final statistics
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log("\n📊 Update Summary:");
        console.log(`⏱️ Duration: ${duration}s`);
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${errorCount}`);
        console.log(`⚠️ Skipped: ${skippedCount}`);
        console.log(`📁 Total processed: ${validatedData.length} entries`);
        console.log(`💾 Saved to: ${dataManager.dataPath}`);

        if (validatedData.length === 0) {
            console.warn("⚠️ Warning: No valid data was saved!");
            process.exit(1);
        } else {
            console.log("🎉 Data update completed successfully!");
        }

    } catch (error) {
        console.error("💥 Fatal error during update:", error);
        process.exit(1);
    }
}

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    updateJson();
}

export default {
    updateJson
};