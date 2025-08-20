import fs from "fs-extra";

function cleanExistingData() {
   try {
      console.log("🧹 Starting data cleaning process...");

      const dataPath = "app/data/dcastalia.json";

      if (!fs.existsSync(dataPath)) {
         console.log("📁 No existing data file found. Run 'npm run scrape' first.");
         return;
      }

      // Read existing data
      const rawData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
      console.log(`📖 Loaded ${rawData.length} entries from existing data`);

      const cleanedData = [];
      let removedCount = 0;

      for (let i = 0; i < rawData.length; i++) {
         const entry = rawData[i];
         const cleanedEntry = cleanEntry(entry, i + 1);

         if (cleanedEntry) {
            cleanedData.push(cleanedEntry);
         } else {
            removedCount++;
         }
      }

      console.log(`✅ Cleaned data: ${cleanedData.length} entries kept, ${removedCount} removed`);

      // Save cleaned data
      const backupPath = dataPath.replace(".json", "_backup.json");
      fs.copyFileSync(dataPath, backupPath);
      console.log(`💾 Backup created: ${backupPath}`);

      fs.writeFileSync(dataPath, JSON.stringify(cleanedData, null, 2));
      console.log(`💾 Cleaned data saved to: ${dataPath}`);

      // Summary
      console.log("\n📊 Cleaning Summary:");
      console.log(`📁 Original entries: ${rawData.length}`);
      console.log(`✅ Kept entries: ${cleanedData.length}`);
      console.log(`🗑️  Removed entries: ${removedCount}`);
      console.log(`💾 Backup saved: ${backupPath}`);
   } catch (error) {
      console.error("💥 Error during data cleaning:", error);
   }
}

function cleanEntry(entry, index) {
   try {
      if (!entry.content || typeof entry.content !== "string") {
         console.log(`⚠️  Entry ${index}: Invalid content type`);
         return null;
      }

      let content = entry.content;
      const originalLength = content.length;

      // Remove HTML tags
      content = content.replace(/<[^>]*>/g, " ");

      // Remove excessive whitespace
      content = content.replace(/\s+/g, " ").trim();

      // Remove JavaScript code
      content = content.replace(/function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g, "");
      content = content.replace(/jQuery\([^)]*\)[^;]*;/g, "");
      content = content.replace(/gtag\([^)]*\)/g, "");
      content = content.replace(/window\.dataLayer[^;]*;/g, "");
      content = content.replace(/setTimeout\([^)]*\)/g, "");

      // Remove CSS rules
      content = content.replace(/\.[a-zA-Z0-9_-]+\s*\{[^}]*\}/g, "");
      content = content.replace(/@media[^}]*\{[^}]*\}/g, "");

      // Remove repetitive navigation text
      const repetitivePatterns = [
         /Toggle navigation[^.]*\./g,
         /Inspiring Innovation[^.]*\./g,
         /Get in Touch[^.]*\./g,
         /©\s*\d{4}[^.]*\./g,
         /Software Development[^.]*\./g,
         /Website Development[^.]*\./g,
         /UX\/UI Design[^.]*\./g,
         /Technical Support[^.]*\./g,
         /Case Studies[^.]*\./g,
         /About[^.]*\./g,
         /Contact[^.]*\./g,
         /Blog[^.]*\./g,
         /Career[^.]*\./g,
         /Services[^.]*\./g,
      ];

      repetitivePatterns.forEach((pattern) => {
         content = content.replace(pattern, "");
      });

      // Split into sentences and filter meaningful ones
      const sentences = content.split(/[.!?]/).filter((sentence) => {
         const trimmed = sentence.trim();
         return (
            trimmed.length > 20 && // Longer sentences are usually more meaningful
            trimmed.length < 200 && // Avoid extremely long sentences
            !trimmed.match(/^[0-9\s\-_]+$/) && // Not just numbers/symbols
            !trimmed.includes("function") &&
            !trimmed.includes("jQuery") &&
            !trimmed.includes("gtag") &&
            !trimmed.includes("setTimeout") &&
            !trimmed.includes("©") &&
            !trimmed.includes("Toggle navigation") &&
            !trimmed.includes("Inspiring Innovation") &&
            !trimmed.includes("Get in Touch")
         );
      });

      // Join sentences and clean up
      content = sentences.join(". ").trim();

      // Remove any remaining excessive whitespace
      content = content.replace(/\s+/g, " ").trim();

      // Check if content is still meaningful
      if (!content || content.length < 100) {
         console.log(`⚠️  Entry ${index}: Content too short after cleaning (${content.length} chars)`);
         return null;
      }

      // Limit content length
      const maxLength = 800;
      if (content.length > maxLength) {
         content = content.substring(0, maxLength) + "...";
      }

      const cleanedLength = content.length;
      const reduction = (((originalLength - cleanedLength) / originalLength) * 100).toFixed(1);

      console.log(`✅ Entry ${index}: ${originalLength} → ${cleanedLength} chars (${reduction}% reduction)`);

      return {
         url: entry.url,
         content: content,
      };
   } catch (error) {
      console.error(`💥 Error cleaning entry ${index}:`, error);
      return null;
   }
}

// Run cleaning if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
   cleanExistingData();
}

export { cleanExistingData, cleanEntry };

// Default export to fix Next.js build error
export default {
   cleanExistingData,
   cleanEntry,
};
