# 💬 Dcastalia Chatbot

A chatbot powered by LangChain + Next.js, built using live data from [dcastalia.com](https://dcastalia.com).

## 🚀 Features

- Auto-scrapes sitemap.xml for fresh content
- Stores data in `app/data/dcastalia.json`
- Runs on free Ollama LLMs (local)
- Switchable to ChatGPT (OpenAI GPT-4) via .env

## 🛠 Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Choose provider:

```
LLM_PROVIDER=ollama   # free local LLM
# LLM_PROVIDER=openai # premium ChatGPT
```

If using OpenAI:

```
OPENAI_API_KEY=your_openai_api_key
```

### 3. Install Ollama (free local LLM)

Download from [ollama.ai](https://ollama.ai)

Pull a model (e.g., mistral):

```bash
ollama pull mistral
```

### 4. Scrape site

```bash
npm run scrape
```

### 5. Run chatbot

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🔄 Updating

Re-run `npm run scrape` to refresh.

## ⚡ Switching to ChatGPT Premium

Update `.env`:

```
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
```

Restart server with `npm run dev`.

## 🏗️ Architecture

- **Frontend**: Next.js 13 with App Router + shadcn/ui components
- **Backend**: API routes for chat functionality
- **Data**: JSON-based storage with intelligent content scraping
- **AI**: LangChain integration with pluggable LLM providers
- **Scraping**: Automated sitemap.xml parsing and content extraction

## 📁 Project Structure

```
├── app/
│   ├── api/chat/           # Chat API endpoint
│   ├── data/              # Scraped data storage
│   └── page.tsx           # Main chat interface
├── components/
│   └── chatbot.tsx        # Chat UI component
├── lib/
│   ├── chatbot.ts         # Chat logic and context
│   └── llm.ts            # LLM provider configuration
├── scripts/
│   └── scraper.js         # Content scraping functionality
└── .env.example           # Environment configuration
```

## 🤖 Supported Models

### Ollama (Free Local)
- mistral
- llama2
- codellama
- And many more from [ollama.ai](https://ollama.ai/library)

### OpenAI (Premium)
- GPT-4
- GPT-3.5-turbo
- GPT-4-turbo

## 🔧 Configuration

All configuration is done via environment variables in `.env`:

```env
# Required: Choose your LLM provider
LLM_PROVIDER=ollama|openai

# OpenAI Configuration (if using openai)
OPENAI_API_KEY=sk-...

# Ollama Configuration (if using ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# Scraping Configuration
DCASTALIA_URL=https://dcastalia.com
```

## 🎨 Features

- **Smart Content Matching**: Intelligent relevance scoring for better responses
- **Real-time Chat**: Instant messaging with typing indicators
- **Responsive Design**: Works perfectly on mobile and desktop
- **Error Handling**: Graceful error handling with helpful messages
- **Clear Chat**: Easy conversation reset functionality
- **Timestamp Display**: Message timestamps for better context

## 🚀 Performance

- **Efficient Scraping**: Respects rate limits with built-in delays
- **Content Optimization**: Intelligent content extraction and trimming
- **Fast Responses**: Optimized context retrieval for quick answers
- **Caching**: JSON-based data storage for rapid access

## 📝 License

This project is open source and available under the MIT License.