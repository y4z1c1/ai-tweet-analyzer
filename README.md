# AI Tweet Analyzer

A Next.js app that analyzes tweets using AI for sentiment and summary, saving results to Google Sheets.

## 🚀 Live Demo

- **App**: https://ai-tweet-analyzer-git-main-y4z1c1s-projects.vercel.app
- **Results Spreadsheet**: https://docs.google.com/spreadsheets/d/1PwBQP9EUJAGfpFlmE4-0vr0MhoFCa9NolrR-m6cqtoM/edit?usp=sharing

## ✨ Features

- Paste any Twitter/X URL to analyze tweets
- AI-powered sentiment analysis and summaries
- Automatic save to Google Sheets
- Dark mode tweet embeds
- OCR for image text extraction

## 🛠️ Quick Setup

1. **Clone & Install**
```bash
git clone https://github.com/y4z1c1/ai-tweet-analyzer.git
cd swipeline_case
npm install
```

2. **Environment Variables**
Create `.env.local`:
```env
OPENAI_API_KEY=your_openai_api_key
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account",...}
SPREADSHEET_ID=your_spreadsheet_id
```

3. **Run**
```bash
npm run dev
```

## 📋 Usage

1. Paste a Twitter URL (e.g., `https://twitter.com/username/status/123456789`)
2. Click analyze to get AI sentiment and summary
3. Results automatically save to Google Sheets

## 🔧 Getting API Keys

### OpenAI
1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Create API key
3. Add to `.env.local`

### Google Sheets
1. Create project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Sheets API
3. Create service account & download JSON key
4. Share your spreadsheet with service account email
5. Add credentials to `.env.local`

## 📊 Tech Stack

- Next.js 15 + TypeScript
- Tailwind CSS v4
- OpenAI GPT-4o-mini
- Google Sheets API
- Twitter oEmbed API

```


