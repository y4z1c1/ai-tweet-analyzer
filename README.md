# AI Tweet Analyzer

Next.js app that fetches tweets and analyzes them with AI for sentiment and summary.

## Features

- **Tweet Fetching**: Enter any Twitter/X URL to fetch tweet content
- **Dark Mode Embeds**: Displays tweets in beautiful dark mode
- **AI Analysis**: Uses GPT-4 to analyze sentiment and generate summaries
- **Real-time Processing**: Instant analysis after tweet fetch

## Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env.local` file with:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Get OpenAI API Key:**
   - Sign up at [OpenAI](https://platform.openai.com/)
   - Create an API key in your dashboard
   - Add it to your `.env.local` file

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

## Usage

1. Paste any Twitter or X.com tweet URL
2. Click "Analyze Tweet" 
3. View the embedded tweet and AI analysis results
4. See sentiment (positive/negative/neutral) with confidence score
5. Read the AI-generated summary

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4 API
- **Tweet Data**: Twitter oEmbed API
- **TypeScript**: Full type safety