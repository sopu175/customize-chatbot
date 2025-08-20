/** @type {import('next').NextConfig} */
const nextConfig = {
   // Performance optimizations
   experimental: {
      optimizePackageImports: ["@langchain/openai", "@langchain/ollama", "langchain"],
   },

   // Enable compression
   compress: true,

   // Optimize images
   images: {
      domains: ["dcastalia.com"],
      formats: ["image/webp", "image/avif"],
   },

   async rewrites() {
      return [
         {
            source: "/api/:path*",
            destination: "/api/:path*", // Use relative path for same-domain API calls
         },
      ];
   },

   // Security headers
   async headers() {
      return [
         {
            source: "/(.*)",
            headers: [
               {
                  key: "X-Frame-Options",
                  value: "DENY",
               },
               {
                  key: "X-Content-Type-Options",
                  value: "nosniff",
               },
               {
                  key: "Referrer-Policy",
                  value: "strict-origin-when-cross-origin",
               },
            ],
         },
      ];
   },
};

export default nextConfig;
