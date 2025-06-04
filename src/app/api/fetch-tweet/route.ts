import { NextRequest, NextResponse } from 'next/server'
import { validateTweetUrl, normalizeTweetUrl, cleanTweetUrl } from '@/lib/utils'
import { analyzeMediaContent } from '@/lib/media-extractor'

export async function POST(request: NextRequest) {
  try {
    const { tweetUrl } = await request.json()
    
    if (!tweetUrl) {
      return NextResponse.json(
        { error: 'tweet url is required' },
        { status: 400 }
      )
    }

    // clean and validate tweet url
    const cleanUrl = cleanTweetUrl(tweetUrl.trim())
    
    if (!validateTweetUrl(cleanUrl)) {
      return NextResponse.json(
        { error: 'invalid tweet url format. use twitter.com or x.com urls' },
        { status: 400 }
      )
    }

    // normalize url for oembed api
    const normalizedUrl = normalizeTweetUrl(cleanUrl)

    // fetch tweet data using twitter oembed api with dark theme
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(normalizedUrl)}&omit_script=true&theme=dark`
    
    const response = await fetch(oembedUrl)
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'tweet not found, deleted, or private' },
          { status: 404 }
        )
      }
      throw new Error(`twitter api error: ${response.status}`)
    }

    const oembedData = await response.json()
    
    // analyze media content and extract text
    const mediaAnalysis = await analyzeMediaContent(oembedData.html)
    
    // extract useful info from oembed response
    const tweetData = {
      html: oembedData.html,
      authorName: oembedData.author_name,
      authorUrl: oembedData.author_url,
      url: oembedData.url,
      // extract text content from html (simple approach)
      text: extractTextFromHtml(oembedData.html),
      width: oembedData.width,
      height: oembedData.height,
      // add media analysis results
      mediaContent: mediaAnalysis.mediaItems,
      mediaText: mediaAnalysis.combinedText
    }

    return NextResponse.json({
      success: true,
      tweet: tweetData
    })

  } catch (error) {
    console.error('error fetching tweet:', error)
    return NextResponse.json(
      { error: 'failed to fetch tweet data' },
      { status: 500 }
    )
  }
}

// helper function to extract text from html
function extractTextFromHtml(html: string): string {
  // remove html tags and decode entities
  const textContent = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // remove scripts
    .replace(/<[^>]*>/g, '') // remove html tags
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()
  
  return textContent
} 