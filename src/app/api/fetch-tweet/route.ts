import { NextRequest, NextResponse } from 'next/server'
import { validateTweetUrl, normalizeTweetUrl, cleanTweetUrl } from '@/lib/utils'

// helper function to extract username from twitter profile url
function extractUsernameFromUrl(authorUrl: string): string {
  try {
    // author_url format: https://twitter.com/username
    const match = authorUrl.match(/twitter\.com\/([^\/\?#]+)/i) || authorUrl.match(/x\.com\/([^\/\?#]+)/i)
    return match ? match[1] : ''
  } catch {
    return ''
  }
}

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
    
    console.log('oembed response data:')
    console.log('- author_name:', oembedData.author_name)
    console.log('- author_url:', oembedData.author_url)
    console.log('- url:', oembedData.url)
    console.log('- html length:', oembedData.html?.length)
    
    // extract username from author url
    const username = extractUsernameFromUrl(oembedData.author_url || '')
    console.log('- extracted username:', username)
    
    // extract useful info from oembed response
    const tweetData = {
      html: oembedData.html,
      authorName: oembedData.author_name,
      authorUrl: oembedData.author_url,
      username: username,
      url: oembedData.url,
      // extract text content from html
      text: extractTextFromHtml(oembedData.html),
      width: oembedData.width,
      height: oembedData.height
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
  // first try to find the actual tweet text in a more structured way
  // twitter oembed often contains the tweet text in specific patterns
  
  // look for the main tweet content in blockquote
  const blockquoteMatch = html.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i)
  
  if (blockquoteMatch) {
    let tweetText = blockquoteMatch[1]
    
    // remove links (like pic.twitter.com links)
    tweetText = tweetText.replace(/<a[^>]*>.*?<\/a>/gi, '')
    
    // remove the author info and date (usually at the end)
    // pattern: &mdash; AuthorName (@username) Date
    tweetText = tweetText.replace(/&mdash;[\s\S]*?$/i, '')
    
    // remove any remaining html tags
    tweetText = tweetText.replace(/<[^>]*>/g, '')
    
    // decode html entities properly
    tweetText = tweetText
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&apos;/g, "'")
    
    // clean up whitespace
    tweetText = tweetText
      .replace(/\s+/g, ' ')
      .trim()
    
    console.log('extracted clean tweet text:', tweetText)
    return tweetText
  }
  
  // fallback to previous method if blockquote method fails
  const textContent = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // remove scripts
    .replace(/<[^>]*>/g, '') // remove html tags
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .trim()
  
  console.log('extracted tweet text (fallback):', textContent)
  return textContent
} 