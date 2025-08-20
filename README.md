# 💬 Dcastalia Chatbot

A chatbot powered by LangChain + Next.js, built using live data from [dcastalia.com](https://dcastalia.com).

## 🚀 Features

-  Auto-scrapes sitemap.xml for fresh content
-  Stores data in `app/data/dcastalia.json`
-  Runs on free Ollama LLMs (local)
-  Switchable to ChatGPT (OpenAI GPT-4) via .env

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
