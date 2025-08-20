import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { promises as fs } from "fs";
import crypto from "crypto";
import path from "path";

// Configuration object for better maintainability
const CONFIG = {
    MAX_ENTRIES: process.env.MAX_VECTOR_ENTRIES ? parseInt(process.env.MAX_VECTOR_ENTRIES) : 100,
    MAX_CONTENT_LENGTH: process.env.MAX_CONTENT_LENGTH ? parseInt(process.env.MAX_CONTENT_LENGTH) : 800,
    MIN_CONTENT_LENGTH: process.env.MIN_CONTENT_LENGTH ? parseInt(process.env.MIN_CONTENT_LENGTH) : 50,
    DATA_FILE_PATH: process.env.DATA_FILE_PATH || "app/data/dcastalia.json",
    LLM_PROVIDER: process.env.LLM_PROVIDER || "ollama",
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || "mistral",
    OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
};

// Cache management
let vectorStore = null;
let lastDataHash = null;
let lastLoadTime = null;

// Content cleaning patterns - organized for better maintainability
const CLEANING_PATTERNS = {
    // HTML and markup removal
    htmlTags: /<[^>]*>/g,
    whitespace: /\s+/g,

    // JavaScript removal patterns
    functions: /function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g,
    jquery: /jQuery\([^)]*\)[^;]*;/g,
    gtag: /gtag\([^)]*\)/g,
    dataLayer: /window\.dataLayer[^;]*;/g,
    setTimeout: /setTimeout\([^)]*\)/g,

    // CSS removal patterns
    cssRules: /\.[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
    mediaQueries: /@media[^}]*\{[^}]*\}/g,

    // Common unwanted content patterns
    copyright: /© \d{4} [^.]*/g,
    navigation: /Toggle navigation[^.]*/g,
    iframes: /<iframe[^>]*>/g,
    srcAttributes: /src="[^"]*"/g
};

// Unwanted phrases that indicate low-quality content
const FILTER_PHRASES = [
    "function", "jQuery", "gtag", "setTimeout", "©",
    "Toggle navigation", "Get in Touch", "Services",
    "About", "Contact", "Inspiring Innovation"
];

/**
 * Enhanced content cleaning with better error handling and performance
 */
function cleanContent(content) {
    if (!content || typeof content !== 'string') {
        return "No content available";
    }

    try {
        let cleaned = content;

        // Apply all cleaning patterns
        Object.values(CLEANING_PATTERNS).forEach(pattern => {
            cleaned = cleaned.replace(pattern, " ");
        });

        // Split into sentences and filter out unwanted content
        const sentences = cleaned
            .split(/[.!?]/)
            .map(sentence => sentence.trim())
            .filter(sentence => {
                if (sentence.length < 15) return false;

                // Check for unwanted phrases
                const lowerSentence = sentence.toLowerCase();
                return !FILTER_PHRASES.some(phrase =>
                    lowerSentence.includes(phrase.toLowerCase())
                );
            });

        // Rejoin sentences
        cleaned = sentences.join(". ").trim();

        // Fallback if cleaning removed too much content
        if (cleaned.length < CONFIG.MIN_CONTENT_LENGTH) {
            cleaned = content
                .replace(CLEANING_PATTERNS.htmlTags, " ")
                .replace(CLEANING_PATTERNS.whitespace, " ")
                .trim();
        }

        // Apply length limits
        if (cleaned.length > CONFIG.MAX_CONTENT_LENGTH) {
            // Try to cut at sentence boundary
            const cutPoint = cleaned.lastIndexOf(". ", CONFIG.MAX_CONTENT_LENGTH);
            cleaned = cutPoint > CONFIG.MAX_CONTENT_LENGTH * 0.8
                ? cleaned.substring(0, cutPoint + 1)
                : cleaned.substring(0, CONFIG.MAX_CONTENT_LENGTH) + "...";
        }

        return cleaned || "No meaningful content found";

    } catch (error) {
        console.error("Error cleaning content:", error.message);

        // Robust fallback
        try {
            return content
                .replace(CLEANING_PATTERNS.htmlTags, " ")
                .replace(CLEANING_PATTERNS.whitespace, " ")
                .trim()
                .substring(0, CONFIG.MAX_CONTENT_LENGTH) + "...";
        } catch (fallbackError) {
            console.error("Fallback cleaning also failed:", fallbackError.message);
            return "Content processing failed";
        }
    }
}

/**
 * Create efficient hash for change detection
 */
function createDataHash(data) {
    try {
        // Create hash from URLs, content lengths, and modification indicators
        const hashInput = data
            .map(entry => `${entry.url || 'no-url'}:${(entry.content || '').length}`)
            .join('|');

        return crypto
            .createHash('md5')
            .update(hashInput)
            .digest('hex')
            .substring(0, 16);
    } catch (error) {
        console.error("Error creating data hash:", error.message);
        return Date.now().toString(); // Fallback to timestamp
    }
}

/**
 * Validate and load data file
 */
async function loadDataFile() {
    try {
        // Check if file exists
        await fs.access(CONFIG.DATA_FILE_PATH);

        const fileContent = await fs.readFile(CONFIG.DATA_FILE_PATH, "utf8");
        const data = JSON.parse(fileContent);

        if (!Array.isArray(data)) {
            throw new Error("Data file must contain an array");
        }

        console.log(`✓ Data file loaded: ${data.length} entries`);
        return data;

    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`Data file not found: ${CONFIG.DATA_FILE_PATH}`);
        } else if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in data file: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Filter data based on content quality
 */
function filterDataByQuality(data) {
    const qualityChecks = {
        hasContent: entry => entry.content && entry.content.length > 0,
        hasUrl: entry => entry.url && typeof entry.url === 'string',
        hasMinLength: entry => entry.content.length >= CONFIG.MIN_CONTENT_LENGTH,
        notErrorContent: entry =>
            !entry.content.includes("Content unavailable") &&
            !entry.content.includes("No content available") &&
            !entry.content.includes("Error processing"),
        hasVariedContent: entry => {
            // Check for content diversity (not just repeated phrases)
            const words = entry.content.toLowerCase().split(/\s+/);
            const uniqueWords = new Set(words);
            return uniqueWords.size >= words.length * 0.3; // At least 30% unique words
        }
    };

    const filtered = data.filter((entry, index) => {
        const checks = Object.entries(qualityChecks);
        const failedChecks = checks.filter(([name, check]) => !check(entry));

        if (failedChecks.length > 0) {
            console.log(`⚠ Filtering entry ${index + 1}: Failed ${failedChecks.map(([name]) => name).join(', ')}`);
            return false;
        }

        return true;
    });

    console.log(`✓ Quality filter: ${filtered.length}/${data.length} entries passed`);
    return filtered;
}

/**
 * Initialize embeddings provider
 */
function createEmbeddings() {
    try {
        const provider = CONFIG.LLM_PROVIDER.toLowerCase();

        switch (provider) {
            case "openai":
                return new OpenAIEmbeddings({
                    modelName: CONFIG.OPENAI_EMBEDDING_MODEL
                });

            case "ollama":
            default:
                return new OllamaEmbeddings({
                    model: CONFIG.EMBEDDING_MODEL
                });
        }
    } catch (error) {
        console.error("Error creating embeddings provider:", error.message);
        // Fallback to Ollama
        return new OllamaEmbeddings({ model: "mistral" });
    }
}

/**
 * Process data for vector store creation
 */
function processDataForVectorStore(data) {
    console.log("🔄 Processing content...");

    const processed = data.map((entry, index) => {
        try {
            const cleaned = cleanContent(entry.content);

            if (index % 10 === 0) { // Log every 10th entry to avoid spam
                console.log(`Processing ${index + 1}/${data.length}...`);
            }

            return {
                text: cleaned,
                metadata: {
                    url: entry.url,
                    originalLength: entry.content ? entry.content.length : 0,
                    cleanedLength: cleaned.length,
                    index: index
                }
            };

        } catch (error) {
            console.error(`Error processing entry ${index + 1}:`, error.message);
            return {
                text: "Error processing content",
                metadata: {
                    url: entry.url || 'unknown',
                    error: true,
                    index: index
                }
            };
        }
    });

    const texts = processed.map(p => p.text);
    const metadatas = processed.map(p => p.metadata);

    console.log("✓ Content processing completed");
    return { texts, metadatas };
}

/**
 * Dispose of existing vector store to free memory
 */
function disposeVectorStore() {
    if (vectorStore) {
        console.log("🗑️ Disposing old vector store");
        vectorStore = null;

        // Force garbage collection if available (Node.js with --expose-gc)
        if (global.gc) {
            global.gc();
        }
    }
}

/**
 * Main function to load and create vector index
 */
export async function loadIndex() {
    const startTime = Date.now();

    try {
        console.log("🚀 Starting vector store creation...");
        console.log(`📋 Config: ${CONFIG.MAX_ENTRIES} max entries, ${CONFIG.LLM_PROVIDER} provider`);

        // Load and validate data
        const rawData = await loadDataFile();

        // Check cache validity
        const currentHash = createDataHash(rawData);
        const cacheAge = lastLoadTime ? Date.now() - lastLoadTime : Infinity;
        const maxCacheAge = 5 * 60 * 1000; // 5 minutes

        if (vectorStore &&
            lastDataHash === currentHash &&
            cacheAge < maxCacheAge) {
            console.log("✅ Using cached vector store");
            return vectorStore;
        }

        // Dispose old vector store
        disposeVectorStore();

        // Filter and limit data
        const qualityData = filterDataByQuality(rawData);
        const limitedData = qualityData.slice(0, CONFIG.MAX_ENTRIES);

        if (limitedData.length < qualityData.length) {
            console.log(`⚠️ Limited to ${CONFIG.MAX_ENTRIES} entries (${qualityData.length} available)`);
        }

        if (limitedData.length === 0) {
            throw new Error("No valid data entries found after filtering");
        }

        // Process data
        const { texts, metadatas } = processDataForVectorStore(limitedData);

        // Create embeddings and vector store
        console.log("🔤 Creating embeddings...");
        const embeddings = createEmbeddings();

        console.log("📊 Building vector store...");
        vectorStore = await MemoryVectorStore.fromTexts(texts, metadatas, embeddings);

        // Update cache info
        lastDataHash = currentHash;
        lastLoadTime = Date.now();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Vector store created successfully in ${duration}s`);
        console.log(`📈 Processed ${limitedData.length} entries`);

        return vectorStore;

    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`❌ Error in loadIndex after ${duration}s:`, error.message);

        // Clean up on error
        disposeVectorStore();

        // Re-throw with more context
        throw new Error(`Vector store creation failed: ${error.message}`);
    }
}

/**
 * Get current vector store status
 */
export function getVectorStoreStatus() {
    return {
        isLoaded: !!vectorStore,
        lastLoadTime,
        lastDataHash,
        config: CONFIG
    };
}

/**
 * Force refresh of vector store
 */
export async function refreshVectorStore() {
    console.log("🔄 Forcing vector store refresh...");
    disposeVectorStore();
    lastDataHash = null;
    lastLoadTime = null;
    return await loadIndex();
}

// Default export for Next.js compatibility
export default {
    loadIndex,
    getVectorStoreStatus,
    refreshVectorStore
};