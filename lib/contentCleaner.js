// ====== contentCleaner.js ======
export class ContentCleaner {
    constructor(options = {}) {
        this.options = {
            minLength: options.minLength || 80,
            maxLength: options.maxLength || 1000,
            minWords: options.minWords || 15,
            maxSentences: options.maxSentences || 12,
            ...options
        };

        // Comprehensive cleaning patterns
        this.cleaningPatterns = {
            // HTML and XML
            htmlTags: /<[^>]*>/gi,
            xmlTags: /<\?xml[^>]*\?>/gi,
            doctype: /<!DOCTYPE[^>]*>/gi,
            comments: /<!--[\s\S]*?-->/gi,

            // Scripts and styles
            scriptTags: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            styleTags: /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
            inlineStyles: /style\s*=\s*["'][^"']*["']/gi,

            // JavaScript code patterns
            functions: /function\s+\w*\s*\([^)]*\)\s*\{[^}]*\}/gi,
            arrowFunctions: /\([^)]*\)\s*=>\s*\{[^}]*\}/gi,
            jquery: /\$\([^)]*\)[^;]*;?/gi,
            jqueryDoc: /\$\(document\)\.ready\([^)]*\)/gi,
            eventHandlers: /on\w+\s*=\s*["'][^"']*["']/gi,
            gtag: /gtag\([^)]*\)[^;]*;?/gi,
            dataLayer: /window\.dataLayer[^;]*;?/gi,
            setTimeout: /setTimeout\([^)]*\)[^;]*;?/gi,
            setInterval: /setInterval\([^)]*\)[^;]*;?/gi,

            // CSS patterns
            cssRules: /\.[a-zA-Z0-9_-]+\s*\{[^}]*\}/gi,
            idSelectors: /#[a-zA-Z0-9_-]+\s*\{[^}]*\}/gi,
            mediaQueries: /@media[^}]*\{[^}]*\}/gi,
            keyframes: /@keyframes[^}]*\{[^}]*\}/gi,
            cssImports: /@import[^;]*;/gi,

            // URLs and links
            urls: /https?:\/\/[^\s<>"']+/gi,
            emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

            // Common unwanted content
            copyright: /©\s*\d{4}[^.!?]*[.!?]?/gi,
            allRightsReserved: /all\s+rights\s+reserved[^.!?]*[.!?]?/gi,
            cookieNotices: /this\s+site\s+uses\s+cookies[^.!?]*[.!?]?/gi,

            // Navigation and UI elements
            navigation: /toggle\s+navigation[^.!?]*[.!?]?/gi,
            breadcrumbs: /home\s*[>\/]\s*\w+(\s*[>\/]\s*\w+)*/gi,
            skipToContent: /skip\s+to\s+(main\s+)?content[^.!?]*[.!?]?/gi,

            // Social media and sharing
            shareText: /share\s+(this|on)[^.!?]*[.!?]?/gi,
            followUs: /follow\s+us[^.!?]*[.!?]?/gi,
            socialLinks: /(facebook|twitter|linkedin|instagram|youtube)[^.!?]*[.!?]?/gi,

            // Form elements and interactions
            clickHere: /click\s+here[^.!?]*[.!?]?/gi,
            readMore: /read\s+more[^.!?]*[.!?]?/gi,
            learnMore: /learn\s+more[^.!?]*[.!?]?/gi,

            // Whitespace and formatting
            excessiveWhitespace: /\s+/g,
            leadingSpaces: /^\s+/,
            trailingSpaces: /\s+$/,
            multipleNewlines: /\n\s*\n/g,

            // Special characters and encoding
            htmlEntities: /&[a-zA-Z0-9#]+;/g,
            unicodeChars: /[\u00A0\u2000-\u200B\u2028-\u2029\u202F\u205F\u3000]/g,

            // Numbers and symbols that don't add meaning
            standaloneNumbers: /\b\d{1,2}\b(?!\w)/g,
            bulletPoints: /[•·▪▫◦‣⁃]/g,
            arrows: /[←↑→↓↔↕⇄⇅⇆]/g
        };

        // Site-specific patterns for dcastalia.com
        this.siteSpecificPatterns = {
            inspiringInnovation: /inspiring\s+innovation[^.!?]*[.!?]?/gi,
            getInTouch: /get\s+in\s+touch[^.!?]*[.!?]?/gi,
            dcastaliaLimited: /dcastalia\s+limited[^.!?]*[.!?]?/gi,
            services: /services\s*:\s*[^.!?]*[.!?]?/gi,
            softwareDev: /software\s+development[^.!?]*[.!?]?/gi,
            websiteDev: /website\s+development[^.!?]*[.!?]?/gi,
            uxuiDesign: /ux\s*\/\s*ui\s+design[^.!?]*[.!?]?/gi,
            technicalSupport: /technical\s+support[^.!?]*[.!?]?/gi,
            caseStudies: /case\s+studies[^.!?]*[.!?]?/gi,
        };

        // Phrases that indicate low-quality or navigation content
        this.filterPhrases = [
            'function', 'jquery', 'gtag', 'settimeout', 'setinterval',
            'toggle navigation', 'skip to content', 'main menu',
            'get in touch', 'contact us', 'about us', 'privacy policy',
            'terms of service', 'cookie policy', 'all rights reserved',
            'follow us', 'share this', 'read more', 'learn more',
            'click here', 'view all', 'see more', 'load more',
            'inspiring innovation', 'dcastalia limited'
        ];
    }

    /**
     * Main cleaning method
     */
    clean(content) {
        if (!content || typeof content !== 'string') {
            return null;
        }

        try {
            let cleaned = content;
            const originalLength = cleaned.length;

            // Step 1: Remove scripts, styles, and HTML
            cleaned = this.removeScriptsAndStyles(cleaned);
            cleaned = this.removeHtmlTags(cleaned);

            // Step 2: Remove JavaScript and CSS code
            cleaned = this.removeCodePatterns(cleaned);

            // Step 3: Remove URLs and technical content
            cleaned = this.removeTechnicalContent(cleaned);

            // Step 4: Remove site-specific repetitive content
            cleaned = this.removeSiteSpecificContent(cleaned);

            // Step 5: Clean whitespace and formatting
            cleaned = this.normalizeWhitespace(cleaned);

            // Step 6: Filter sentences and validate content
            cleaned = this.filterSentences(cleaned);

            // Step 7: Final validation and length control
            const result = this.finalizeContent(cleaned);

            if (result) {
                console.log(`🧹 Cleaned: ${originalLength} → ${result.length} chars (${(((originalLength - result.length) / originalLength) * 100).toFixed(1)}% reduction)`);
            }

            return result;

        } catch (error) {
            console.error('❌ Content cleaning error:', error.message);
            return this.fallbackClean(content);
        }
    }

    removeScriptsAndStyles(content) {
        const patterns = [
            this.cleaningPatterns.scriptTags,
            this.cleaningPatterns.styleTags,
            this.cleaningPatterns.comments,
            this.cleaningPatterns.doctype,
            this.cleaningPatterns.xmlTags
        ];

        return patterns.reduce((text, pattern) => text.replace(pattern, ' '), content);
    }

    removeHtmlTags(content) {
        // Remove inline styles first
        let cleaned = content.replace(this.cleaningPatterns.inlineStyles, '');

        // Remove event handlers
        cleaned = cleaned.replace(this.cleaningPatterns.eventHandlers, '');

        // Remove all HTML tags
        cleaned = cleaned.replace(this.cleaningPatterns.htmlTags, ' ');

        return cleaned;
    }

    removeCodePatterns(content) {
        const codePatterns = [
            this.cleaningPatterns.functions,
            this.cleaningPatterns.arrowFunctions,
            this.cleaningPatterns.jquery,
            this.cleaningPatterns.jqueryDoc,
            this.cleaningPatterns.gtag,
            this.cleaningPatterns.dataLayer,
            this.cleaningPatterns.setTimeout,
            this.cleaningPatterns.setInterval,
            this.cleaningPatterns.cssRules,
            this.cleaningPatterns.idSelectors,
            this.cleaningPatterns.mediaQueries,
            this.cleaningPatterns.keyframes,
            this.cleaningPatterns.cssImports
        ];

        return codePatterns.reduce((text, pattern) => text.replace(pattern, ' '), content);
    }

    removeTechnicalContent(content) {
        const technicalPatterns = [
            this.cleaningPatterns.urls,
            this.cleaningPatterns.emails,
            this.cleaningPatterns.htmlEntities,
            this.cleaningPatterns.unicodeChars,
            this.cleaningPatterns.bulletPoints,
            this.cleaningPatterns.arrows
        ];

        return technicalPatterns.reduce((text, pattern) => text.replace(pattern, ' '), content);
    }

    removeSiteSpecificContent(content) {
        const sitePatterns = [
            ...Object.values(this.siteSpecificPatterns),
            this.cleaningPatterns.copyright,
            this.cleaningPatterns.allRightsReserved,
            this.cleaningPatterns.cookieNotices,
            this.cleaningPatterns.navigation,
            this.cleaningPatterns.breadcrumbs,
            this.cleaningPatterns.skipToContent,
            this.cleaningPatterns.shareText,
            this.cleaningPatterns.followUs,
            this.cleaningPatterns.socialLinks,
            this.cleaningPatterns.clickHere,
            this.cleaningPatterns.readMore,
            this.cleaningPatterns.learnMore
        ];

        return sitePatterns.reduce((text, pattern) => text.replace(pattern, ' '), content);
    }

    normalizeWhitespace(content) {
        return content
            .replace(this.cleaningPatterns.excessiveWhitespace, ' ')
            .replace(this.cleaningPatterns.multipleNewlines, '\n')
            .replace(this.cleaningPatterns.leadingSpaces, '')
            .replace(this.cleaningPatterns.trailingSpaces, '')
            .trim();
    }

    filterSentences(content) {
        if (!content) return '';

        // Split into sentences
        const sentences = content
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(sentence => this.isMeaningfulSentence(sentence));

        // Limit number of sentences
        const limitedSentences = sentences.slice(0, this.options.maxSentences);

        return limitedSentences.join('. ').trim();
    }

    isMeaningfulSentence(sentence) {
        if (!sentence || sentence.length < 10) return false;

        // Check word count
        const words = sentence.split(/\s+/).filter(word => word.length > 0);
        if (words.length < 3) return false;

        // Check for unwanted phrases
        const lowerSentence = sentence.toLowerCase();
        const hasUnwantedPhrase = this.filterPhrases.some(phrase =>
            lowerSentence.includes(phrase.toLowerCase())
        );

        if (hasUnwantedPhrase) return false;

        // Check for meaningful content (not just numbers or symbols)
        const meaningfulWordCount = words.filter(word =>
            /^[a-zA-Z]/.test(word) && word.length > 2
        ).length;

        return meaningfulWordCount >= Math.min(3, words.length * 0.5);
    }

    finalizeContent(content) {
        if (!content) return null;

        // Final cleaning
        let final = content.trim();

        // Check minimum requirements
        if (final.length < this.options.minLength) return null;

        const words = final.split(/\s+/).filter(w => w.length > 0);
        if (words.length < this.options.minWords) return null;

        // Apply length limit
        if (final.length > this.options.maxLength) {
            // Try to cut at sentence boundary
            const sentences = final.split(/[.!?]+/);
            let truncated = '';

            for (const sentence of sentences) {
                const potential = truncated + sentence + '.';
                if (potential.length > this.options.maxLength) break;
                truncated = potential;
            }

            final = truncated || final.substring(0, this.options.maxLength) + '...';
        }

        return final;
    }

    fallbackClean(content) {
        try {
            return content
                .replace(this.cleaningPatterns.htmlTags, ' ')
                .replace(this.cleaningPatterns.excessiveWhitespace, ' ')
                .trim()
                .substring(0, this.options.maxLength);
        } catch (error) {
            console.error('❌ Fallback cleaning failed:', error.message);
            return null;
        }
    }
}

