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

// helper function to fetch profile picture with multiple fallback strategies
async function fetchProfilePicture(username: string): Promise<string | undefined> {
  if (!username) return undefined
  
  try {
    // strategy 1: try twitter's direct avatar api (sometimes works)
    const avatarUrl = `https://unavatar.io/twitter/${username}`
    
    try {
      const avatarResponse = await fetch(avatarUrl, {
        method: 'HEAD', // just check if it exists
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TwitterAnalyzer/1.0)'
        }
      })
      
      if (avatarResponse.ok) {
        console.log(`found avatar via unavatar for ${username}`)
        return avatarUrl
      }
    } catch (error) {
      console.log(`unavatar failed for ${username}:`, error)
    }
    
    // strategy 2: try github's avatar proxy (works for many social platforms)
    const githubAvatarUrl = `https://github.com/${username}.png`
    
    try {
      const githubResponse = await fetch(githubAvatarUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TwitterAnalyzer/1.0)'
        }
      })
      
      if (githubResponse.ok) {
        console.log(`found avatar via github for ${username}`)
        return githubAvatarUrl
      }
    } catch (error) {
      console.log(`github avatar failed for ${username}:`, error)
    }
    
    // strategy 3: try gravatar with twitter username as email hash
    try {
      const crypto = await import('crypto')
      const emailHash = crypto.createHash('md5').update(`${username}@twitter.com`).digest('hex')
      const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=404&s=200`
      
      const gravatarResponse = await fetch(gravatarUrl, {
        method: 'HEAD'
      })
      
      if (gravatarResponse.ok) {
        console.log(`found avatar via gravatar for ${username}`)
        return gravatarUrl
      }
    } catch (error) {
      console.log(`gravatar failed for ${username}:`, error)
    }
    
    // strategy 4: use twitter's default avatar pattern (fallback)
    // this creates a deterministic default avatar based on username
    const defaultAvatarUrl = `https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png`
    console.log(`using default avatar for ${username}`)
    return defaultAvatarUrl
    
  } catch (error) {
    console.error(`all avatar strategies failed for ${username}:`, error)
    return undefined
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

    // try multiple strategies to fetch tweet data
    let oembedData = null
    let tweetText = ''
    let authorName = ''
    let authorUrl = ''
    let username = ''

    // strategy 1: try twitter oembed api with dark theme
    try {
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(normalizedUrl)}&omit_script=true&theme=dark`
      console.log('attempting oembed fetch:', oembedUrl)
      
      const response = await fetch(oembedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TwitterAnalyzer/1.0)',
        },
        // add timeout to prevent hanging
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (response.ok) {
        oembedData = await response.json()
        console.log('oembed success for:', normalizedUrl)
      } else {
        console.log('oembed failed with status:', response.status)
        throw new Error(`oembed failed: ${response.status}`)
      }
    } catch (error) {
      console.log('oembed api failed, trying fallback methods:', error)
      
      // fallback: extract tweet info from url
      const tweetIdMatch = normalizedUrl.match(/status\/(\d+)/)
      const usernameMatch = normalizedUrl.match(/(?:twitter\.com|x\.com)\/([^\/]+)/)
      
      if (tweetIdMatch && usernameMatch) {
        username = usernameMatch[1]
        authorName = username.charAt(0).toUpperCase() + username.slice(1) // capitalize first letter
        authorUrl = `https://x.com/${username}`
        tweetText = 'Tweet content could not be retrieved due to API limitations'
        
        // create minimal fallback data
        oembedData = {
          html: `<blockquote><p>${tweetText}</p>&mdash; ${authorName} (@${username})</blockquote>`,
          author_name: authorName,
          author_url: authorUrl,
          url: normalizedUrl,
          width: 500,
          height: 200
        }
        
        console.log('using fallback data for:', username)
      } else {
        return NextResponse.json(
          { error: 'tweet not found, deleted, private, or API temporarily unavailable' },
          { status: 404 }
        )
      }
    }

    if (!oembedData) {
      return NextResponse.json(
        { error: 'failed to retrieve tweet data' },
        { status: 500 }
      )
    }
    
    console.log('oembed response data:')
    console.log('- author_name:', oembedData.author_name)
    console.log('- author_url:', oembedData.author_url)
    console.log('- url:', oembedData.url)
    console.log('- html length:', oembedData.html?.length)
    
    // extract username from author url or use extracted username
    username = username || extractUsernameFromUrl(oembedData.author_url || '')
    console.log('- extracted username:', username)
    
    // fetch profile picture (with fallbacks)
    const profilePicture = await fetchProfilePicture(username)
    
    // extract text content from html or use fallback
    const extractedText = oembedData.html ? extractTextFromHtml(oembedData.html) : tweetText
    
    // extract useful info from oembed response
    const tweetData = {
      html: oembedData.html,
      authorName: oembedData.author_name || authorName,
      authorUrl: oembedData.author_url || authorUrl,
      username: username,
      url: oembedData.url || normalizedUrl,
      text: extractedText,
      width: oembedData.width || 500,
      height: oembedData.height || 200,
      profilePicture: profilePicture
    }

    return NextResponse.json({
      success: true,
      tweet: tweetData
    })

  } catch (error) {
    console.error('error fetching tweet:', error)
    return NextResponse.json(
      { error: 'failed to fetch tweet data. the tweet may be private, deleted, or the api is temporarily unavailable' },
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