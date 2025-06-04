import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { AnalysisResult, Sentiment } from '@/types/analysis'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text, authorName, mediaText } = await request.json()
    
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

    // build complete content including media text
    let completeContent = `Tweet by ${authorName || 'Unknown'}:\n"${text}"`
    
    if (mediaText && mediaText.trim()) {
      completeContent += `\n\nMedia content (extracted text from images/videos):\n${mediaText}`
    }

    // prompt for gpt-4o-mini to analyze tweet including media
    const prompt = `Analyze this tweet (including any media content) and provide:
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
          content: "You are an expert at analyzing social media content for sentiment and summarization. Consider both the main text and any extracted text from images/videos. Always respond with valid JSON in the exact format requested."
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
    } catch (parseError) {
      console.error('failed to parse openai response:', responseContent)
      throw new Error('invalid response format from ai')
    }

    // validate sentiment value
    if (!['positive', 'negative', 'neutral'].includes(analysisResult.sentiment)) {
      analysisResult.sentiment = 'neutral'
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