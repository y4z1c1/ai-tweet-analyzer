import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { AnalysisResult, Sentiment } from '@/types/analysis'
import { saveTweetAnalysis } from '@/lib/google-sheets'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text, authorName, username, tweetUrl } = await request.json()
    
    if (!text) {
      return NextResponse.json(
        { error: 'tweet text is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'openai api key not configured' },
        { status: 500 }
      )
    }

    // build content for analysis
    const completeContent = `Tweet by ${authorName || 'Unknown'}:\n"${text}"`

    // prompt for gpt-4o-mini to analyze tweet
    const prompt = `Analyze this tweet and provide:
1. A brief summary (1-2 sentences) 
2. Overall sentiment (positive, negative, or neutral)

${completeContent}

Please respond in this exact JSON format:
{
  "summary": "your summary here",
  "sentiment": "positive|negative|neutral"
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing social media content for sentiment and summarization. Always respond with valid JSON in the exact format requested."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.3, // lower temperature for more consistent results
    })

    const responseContent = completion.choices[0]?.message?.content
    
    if (!responseContent) {
      throw new Error('no response from openai')
    }

    // parse the json response
    let analysisResult: AnalysisResult
    try {
      const parsed = JSON.parse(responseContent)
      analysisResult = {
        summary: parsed.summary,
        sentiment: parsed.sentiment as Sentiment
      }
    } catch {
      console.error('failed to parse openai response:', responseContent)
      throw new Error('invalid response format from ai')
    }

    // validate sentiment value
    if (!['positive', 'negative', 'neutral'].includes(analysisResult.sentiment)) {
      analysisResult.sentiment = 'neutral'
    }

    // save to google sheets if configured
    try {
      if (process.env.GOOGLE_SHEETS_CREDENTIALS && process.env.SPREADSHEET_ID) {
        await saveTweetAnalysis({
          username: username || 'unknown',
          tweetContent: text,
          sentiment: analysisResult.sentiment,
          summary: analysisResult.summary,
          tweetUrl: tweetUrl || '',
        });
      }
    } catch (sheetsError) {
      // log error but don't fail the whole request
      console.error('failed to save to google sheets:', sheetsError);
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult
    })

  } catch (error) {
    console.error('error analyzing tweet:', error)
    
    // check for specific openai errors
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'openai api key invalid or missing' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'failed to analyze tweet with ai' },
      { status: 500 }
    )
  }
} 