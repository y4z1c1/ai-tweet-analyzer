# AI Tweet Analysis App - Simple Project Plan

## Overview
Next.js app that takes tweet urls, analyzes content with ai, saves to google sheets

## Tech Stack
- Framework: Next.js (frontend + api routes)
- AI: OpenAI API (or mock)
- Storage: Google Sheets API

## Steps

### 1. Setup Project
- create next.js app
- basic folder structure
- install dependencies

### 2. Tweet Fetching
- input form for tweet url
- mock tweet data generator
- extract tweet content

### 3. AI Analysis  
- openai api integration in api routes
- get summary (1-2 sentences)
- get sentiment (positive/negative/neutral)

### 4. Google Sheets Integration
- setup google sheets api
- create spreadsheet with columns:
  - username
  - tweet content
  - sentiment  
  - summary
  - date/time
- save analysis results

### 5. Connect Everything
- api routes for tweet analysis
- frontend calls api routes
- error handling
- basic ui styling

## File Structure
```
/pages
  /api
    analyze-tweet.js - api route for analysis
  index.js - main page
/components - react components
/lib - utility functions
/styles - css files
.env.local - api keys
README.md - setup instructions
```

## Environment Variables
- `OPENAI_API_KEY`
- `GOOGLE_SHEETS_CREDENTIALS`
- `SPREADSHEET_ID`

## Done When
- user inputs tweet url
- app shows analysis results  
- data saves to google sheets automatically 