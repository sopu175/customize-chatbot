import fs from "fs-extra";
import crypto from "crypto";

export class DataManager {
    constructor(dataPath = "app/data/dcastalia.json") {
        this.dataPath = dataPath;
        this.backupPath = dataPath.replace('.json', '_backup.json');
    }

    async loadExistingData() {
        try {
            if (await fs.pathExists(this.dataPath)) {
                const data = await fs.readJson(this.dataPath);
                console.log(`📖 Loaded ${data.length} existing entries`);
                return Array.isArray(data) ? data : [];
            }
            return [];
        } catch (error) {
            console.error('❌ Error loading existing data:', error.message);
            return [];
        }
    }

    async saveData(data, createBackup = true) {
        try {
            // Ensure directory exists
            await fs.ensureDir("app/data");

            // Create backup if requested and file exists
            if (createBackup && await fs.pathExists(this.dataPath)) {
                await fs.copy(this.dataPath, this.backupPath);
                console.log(`💾 Backup created: ${this.backupPath}`);
            }

            // Save new data
            await fs.writeJson(this.dataPath, data, { spaces: 2 });
            console.log(`💾 Data saved: ${data.length} entries to ${this.dataPath}`);

            // Validate saved data
            const savedData = await fs.readJson(this.dataPath);
            if (savedData.length !== data.length) {
                throw new Error('Data validation failed: length mismatch');
            }

            return true;
        } catch (error) {
            console.error('❌ Error saving data:', error.message);
            throw error;
        }
    }

    deduplicateData(data) {
        console.log('🔍 Starting deduplication process...');

        const seen = new Set();
        const unique = [];
        let duplicateCount = 0;

        for (const entry of data) {
            // Create content hash for deduplication
            const contentHash = this.createContentHash(entry.content);
            const urlHash = this.createContentHash(entry.url);
            const combinedHash = `${urlHash}-${contentHash}`;

            if (!seen.has(combinedHash)) {
                seen.add(combinedHash);
                unique.push({
                    ...entry,
                    contentHash // Add hash for future reference
                });
            } else {
                duplicateCount++;
                console.log(`🗑️ Duplicate removed: ${entry.url}`);
            }
        }

        console.log(`✅ Deduplication complete: ${duplicateCount} duplicates removed`);
        console.log(`📊 Final count: ${unique.length} unique entries`);

        return unique;
    }

    createContentHash(content) {
        return crypto
            .createHash('md5')
            .update(content || '')
            .digest('hex')
            .substring(0, 12);
    }

    validateDataQuality(data) {
        console.log('🔍 Validating data quality...');

        const stats = {
            total: data.length,
            valid: 0,
            invalid: 0,
            tooShort: 0,
            noContent: 0,
            errors: 0
        };

        const validEntries = data.filter(entry => {
            if (!entry.url) {
                stats.invalid++;
                return false;
            }

            if (!entry.content || entry.content.includes('Content unavailable')) {
                stats.noContent++;
                return false;
            }

            if (entry.content.length < 80) {
                stats.tooShort++;
                return false;
            }

            if (entry.error) {
                stats.errors++;
                return false;
            }

            stats.valid++;
            return true;
        });

        console.log('📊 Data Quality Report:');
        console.log(`  ✅ Valid entries: ${stats.valid}`);
        console.log(`  ❌ Invalid entries: ${stats.invalid}`);
        console.log(`  📏 Too short: ${stats.tooShort}`);
        console.log(`  🚫 No content: ${stats.noContent}`);
        console.log(`  ⚠️ Errors: ${stats.errors}`);

        return validEntries;
    }
}