import fs from "fs-extra";
import { cleanEntry } from "./cleanData.js";

function optimizeData() {
   try {
      console.log("🚀 Starting data optimization process...");

      const dataPath = "app/data/dcastalia.json";

      if (!fs.existsSync(dataPath)) {
         console.log("📁 No existing data file found. Run 'npm run scrape' first.");
         return;
      }

      // Read existing data
      const rawData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
      console.log(`📖 Loaded ${rawData.length} entries from existing data`);

      const optimizedData = [];
      let removedCount = 0;
      let totalOriginalSize = 0;
      let totalOptimizedSize = 0;

      for (let i = 0; i < rawData.length; i++) {
         const entry = rawData[i];
         totalOriginalSize += entry.content ? entry.content.length : 0;

         const optimizedEntry = optimizeEntry(entry, i + 1);

         if (optimizedEntry) {
            optimizedData.push(optimizedEntry);
            totalOptimizedSize += optimizedEntry.content.length;
         } else {
            removedCount++;
         }
      }

      console.log(`✅ Optimized data: ${optimizedData.length} entries kept, ${removedCount} removed`);

      // Calculate size reduction
      const sizeReduction = (((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100).toFixed(1);
      console.log(
         `📊 Size reduction: ${totalOriginalSize.toLocaleString()} → ${totalOptimizedSize.toLocaleString()} chars (${sizeReduction}% reduction)`
      );

      // Save optimized data
      const backupPath = dataPath.replace(".json", "_optimized_backup.json");
      fs.copyFileSync(dataPath, backupPath);
      console.log(`💾 Backup created: ${backupPath}`);

      fs.writeFileSync(dataPath, JSON.stringify(optimizedData, null, 2));
      console.log(`💾 Optimized data saved to: ${dataPath}`);

      // Summary
      console.log("\n📊 Optimization Summary:");
      console.log(`📁 Original entries: ${rawData.length}`);
      console.log(`✅ Kept entries: ${optimizedData.length}`);
      console.log(`🗑️  Removed entries: ${removedCount}`);
      console.log(`📊 Size reduction: ${sizeReduction}%`);
      console.log(`💾 Backup saved: ${backupPath}`);

      // Performance recommendations
      console.log("\n💡 Performance Recommendations:");
      if (optimizedData.length > 50) {
         console.log("⚠️  Consider reducing data entries for faster processing");
      }
      if (sizeReduction < 30) {
         console.log("⚠️  Data could benefit from more aggressive cleaning");
      }
      if (sizeReduction > 70) {
         console.log("✅ Excellent data optimization achieved!");
      }
   } catch (error) {
      console.error("💥 Error during data optimization:", error);
   }
}

function optimizeEntry(entry, index) {
   try {
      if (!entry.content || typeof entry.content !== "string") {
         return null;
      }

      let content = entry.content;
      const originalLength = content.length;

      // First clean the entry
      const cleanedEntry = cleanEntry(entry, index);
      if (!cleanedEntry) {
         return null;
      }

      content = cleanedEntry.content;

      // Additional optimizations for chatbot performance

      // Remove very short sentences that don't add value
      const sentences = content.split(/[.!?]/).filter((sentence) => {
         const trimmed = sentence.trim();
         return trimmed.length > 15; // Keep only meaningful sentences
      });

      // Limit to most relevant sentences
      const maxSentences = 8;
      if (sentences.length > maxSentences) {
         content = sentences.slice(0, maxSentences).join(". ") + ".";
      } else {
         content = sentences.join(". ");
      }

      // Remove any remaining excessive whitespace
      content = content.replace(/\s+/g, " ").trim();

      // Final length check
      const maxLength = 600; // Further reduced for faster processing
      if (content.length > maxLength) {
         content = content.substring(0, maxLength) + "...";
      }

      // Check if content is still meaningful
      if (!content || content.length < 80) {
         return null;
      }

      const optimizedLength = content.length;
      const reduction = (((originalLength - optimizedLength) / originalLength) * 100).toFixed(1);

      console.log(`🚀 Entry ${index}: ${originalLength} → ${optimizedLength} chars (${reduction}% reduction)`);

      return {
         url: entry.url,
         content: content,
      };
   } catch (error) {
      console.error(`💥 Error optimizing entry ${index}:`, error);
      return null;
   }
}

// Run optimization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
   optimizeData();
}

export { optimizeData, optimizeEntry };

// Default export to fix Next.js build error
export default {
   optimizeData,
   optimizeEntry,
};
