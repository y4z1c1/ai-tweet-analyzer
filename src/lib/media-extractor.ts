import { createWorker } from 'tesseract.js'

export interface MediaContent {
  type: 'image' | 'video'
  url: string
  extractedText?: string
}

export interface MediaAnalysisResult {
  mediaItems: MediaContent[]
  combinedText: string
}

// expand t.co links to get actual media urls
async function expandTwitterLink(tcoUrl: string): Promise<string | null> {
  try {
    console.log('expanding t.co link:', tcoUrl)
    
    // follow redirects to get the final url
    const response = await fetch(tcoUrl, { 
      method: 'HEAD',
      redirect: 'follow' 
    })
    
    const finalUrl = response.url
    console.log('expanded to:', finalUrl)
    
    return finalUrl
  } catch (error) {
    console.error('failed to expand t.co link:', error)
    return null
  }
}

// convert twitter photo page url to direct image url
async function getDirectImageUrl(twitterPhotoUrl: string): Promise<string | null> {
  try {
    console.log('converting twitter photo url to direct image:', twitterPhotoUrl)
    
    // if it's already a direct image url, return as is
    if (twitterPhotoUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
      console.log('url is already a direct image url')
      return twitterPhotoUrl
    }
    
    // if it's a twitter photo page url, try to construct the direct image url
    if (twitterPhotoUrl.includes('/photo/')) {
      console.log('attempting to fetch twitter photo page:', twitterPhotoUrl)
      
      // try to fetch the twitter photo page with headers to avoid blocking
      const response = await fetch(twitterPhotoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      })
      
      console.log('twitter photo page response status:', response.status)
      console.log('response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        console.log(`twitter blocked the request with status ${response.status}. trying alternative approach...`)
        
        // alternative approach: try to construct the image url from the tweet url
        // pattern: https://twitter.com/username/status/123456/photo/1
        // becomes: https://pbs.twimg.com/media/[media_id]
        
        // for now, let's try a different pattern - some twitter images can be accessed directly
        // by modifying the URL structure
        const urlParts = twitterPhotoUrl.split('/')
        const statusId = urlParts[urlParts.indexOf('status') + 1]
        
        if (statusId) {
          console.log('extracted status id:', statusId)
          // this is a guess - twitter media urls sometimes follow predictable patterns
          const possibleImageUrl = `https://pbs.twimg.com/media/${statusId}.jpg`
          console.log('trying constructed image url:', possibleImageUrl)
          
          // test if this constructed url works
          const testResponse = await fetch(possibleImageUrl, { method: 'HEAD' })
          if (testResponse.ok) {
            console.log('constructed image url works!')
            return possibleImageUrl
          } else {
            console.log('constructed image url failed with status:', testResponse.status)
          }
        }
        
        return null
      }
      
      const html = await response.text()
      console.log('fetched html length:', html.length)
      console.log('html preview:', html.substring(0, 500) + '...')
      
      // also log a section that might contain image urls
      const mediaSection = html.match(/pbs\.twimg\.com.{0,200}/i)
      if (mediaSection) {
        console.log('found pbs.twimg.com section:', mediaSection[0])
      } else {
        console.log('no pbs.twimg.com found in html')
      }
      
      // look for the actual image url in the page html
      // updated pattern to capture urls with query parameters
      const imageUrlMatch = html.match(/https:\/\/pbs\.twimg\.com\/media\/[^"'\s<>]+/i)
      
      if (imageUrlMatch) {
        const directImageUrl = imageUrlMatch[0]
        console.log('found direct image url in html:', directImageUrl)
        return directImageUrl
      } else {
        console.log('could not find direct image url in twitter photo page html')
        
        // try alternative regex patterns with broader matching
        const altPatterns = [
          // look for quoted urls
          /"(https:\/\/pbs\.twimg\.com\/media\/[^"]+)"/i,
          /'(https:\/\/pbs\.twimg\.com\/media\/[^']+)'/i,
          // look for urls in meta tags
          /content="(https:\/\/pbs\.twimg\.com\/media\/[^"]+)"/i,
          // look for urls in data attributes
          /data-[^=]*="(https:\/\/pbs\.twimg\.com\/media\/[^"]+)"/i,
          // look for any pbs.twimg.com url
          /https:\/\/pbs\.twimg\.com\/[^"'\s<>]+/i,
        ]
        
        for (let i = 0; i < altPatterns.length; i++) {
          const pattern = altPatterns[i]
          const match = html.match(pattern)
          if (match) {
            const foundUrl = match[1] || match[0]
            console.log(`found image url with alternative pattern ${i + 1}:`, foundUrl)
            return foundUrl
          }
        }
        
        console.log('no image urls found with any pattern')
        return null
      }
    }
    
    console.log('url is not a twitter photo page url')
    return null
  } catch (error) {
    console.error('error converting twitter photo url:', error)
    return null
  }
}

// extract media urls from tweet html
export function extractMediaUrls(html: string): MediaContent[] {
  const mediaItems: MediaContent[] = []
  
  console.log('full html content:')
  console.log(html)
  console.log('---end html---')
  
  // improved regex patterns for twitter media
  const imageRegex = /<img[^>]+src=["']([^"']*(?:pbs\.twimg\.com|twimg\.com)[^"']*\.(?:jpg|jpeg|png|gif|webp))[^"']*["'][^>]*>/gi
  const videoRegex = /<video[^>]*poster=["']([^"']*(?:video\.twimg\.com|twimg\.com)[^"']*\.(?:jpg|jpeg|png))[^"']*["'][^>]*>/gi
  
  // also look for data attributes that might contain media urls
  const dataImageRegex = /data-[^=]*=["']([^"']*(?:pbs\.twimg\.com|twimg\.com)[^"']*\.(?:jpg|jpeg|png|gif|webp))[^"']*["']/gi
  
  // look for pic.twitter.com links in text and extract media hash to construct image urls
  const picTwitterRegex = /pic\.twitter\.com\/([a-zA-Z0-9]+)/gi
  
  // look for t.co links that might be media
  const tcoLinkRegex = /<a[^>]+href=["']([^"']*t\.co[^"']*)["'][^>]*>([^<]*pic\.twitter\.com[^<]*)<\/a>/gi
  
  // new pattern: look for any mention of media ids in the html
  const mediaIdRegex = /media[_-]?id[s]?[\"']?[:\s=]+[\"']?([0-9]+)/gi
  
  // try to extract tweet id from the html to construct media urls
  const tweetIdRegex = /status\/(\d+)/gi
  
  // look for any pbs.twimg.com urls (even without file extensions)
  const pbsUrlRegex = /https:\/\/pbs\.twimg\.com\/media\/([^"'\s<>?]+)/gi
  
  let match
  let tweetId = null
  
  // extract tweet id first
  const tweetIdMatch = tweetIdRegex.exec(html)
  if (tweetIdMatch) {
    tweetId = tweetIdMatch[1]
    console.log('extracted tweet id:', tweetId)
  }
  
  // extract images
  let imageCount = 0
  while ((match = imageRegex.exec(html)) !== null) {
    imageCount++
    const imageUrl = match[1]
    console.log(`found direct image url ${imageCount}:`, imageUrl)
    
    // ensure we get high-res version
    const cleanUrl = imageUrl.replace(/&name=\w+/, '&name=large')
    
    mediaItems.push({
      type: 'image',
      url: cleanUrl
    })
  }
  
  // extract video thumbnails
  let videoCount = 0
  while ((match = videoRegex.exec(html)) !== null) {
    videoCount++
    const thumbnailUrl = match[1]
    console.log(`found video thumbnail ${videoCount}:`, thumbnailUrl)
    
    mediaItems.push({
      type: 'video',
      url: thumbnailUrl
    })
  }
  
  // extract from data attributes
  let dataCount = 0
  while ((match = dataImageRegex.exec(html)) !== null) {
    dataCount++
    const imageUrl = match[1]
    console.log(`found data image url ${dataCount}:`, imageUrl)
    
    // avoid duplicates
    if (!mediaItems.some(item => item.url === imageUrl)) {
      const cleanUrl = imageUrl.replace(/&name=\w+/, '&name=large')
      
      mediaItems.push({
        type: 'image',
        url: cleanUrl
      })
    }
  }
  
  // look for any pbs.twimg.com urls
  let pbsCount = 0
  while ((match = pbsUrlRegex.exec(html)) !== null) {
    pbsCount++
    const mediaHash = match[1]
    console.log(`found pbs.twimg.com url ${pbsCount}:`, match[0], 'hash:', mediaHash)
    
    // construct full image url
    const constructedUrl = `https://pbs.twimg.com/media/${mediaHash}?format=jpg&name=large`
    console.log(`constructed image url from pbs:`, constructedUrl)
    
    // avoid duplicates
    if (!mediaItems.some(item => item.url === constructedUrl || item.url.includes(mediaHash))) {
      mediaItems.push({
        type: 'image',
        url: constructedUrl
      })
    }
  }
  
  // look for pic.twitter.com references and try to construct image urls
  let picCount = 0
  while ((match = picTwitterRegex.exec(html)) !== null) {
    picCount++
    const mediaHash = match[1]
    console.log(`found pic.twitter.com reference ${picCount}:`, mediaHash)
    
    // try to construct direct image url from the hash
    // twitter often uses predictable patterns for media urls
    const constructedUrl = `https://pbs.twimg.com/media/${mediaHash}?format=jpg&name=large`
    console.log(`constructed image url from pic.twitter.com:`, constructedUrl)
    
    // avoid duplicates
    if (!mediaItems.some(item => item.url === constructedUrl || item.url.includes(mediaHash))) {
      mediaItems.push({
        type: 'image',
        url: constructedUrl
      })
    }
  }
  
  // look for media ids and try to construct urls
  let mediaIdCount = 0
  while ((match = mediaIdRegex.exec(html)) !== null) {
    mediaIdCount++
    const mediaId = match[1]
    console.log(`found media id ${mediaIdCount}:`, mediaId)
    
    // construct twitter media url from id
    const constructedUrl = `https://pbs.twimg.com/media/${mediaId}?format=jpg&name=large`
    console.log(`constructed image url from media id:`, constructedUrl)
    
    // avoid duplicates
    if (!mediaItems.some(item => item.url === constructedUrl || item.url.includes(mediaId))) {
      mediaItems.push({
        type: 'image',
        url: constructedUrl
      })
    }
  }
  
  // if we found a tweet id but no media, try to use twitter api patterns
  if (tweetId && mediaItems.length === 0) {
    console.log('no media found with standard methods, trying tweet id construction...')
    
    // twitter sometimes uses tweet id as part of media urls
    const possibleMediaUrls = [
      `https://pbs.twimg.com/media/${tweetId}?format=jpg&name=large`,
      `https://pbs.twimg.com/media/${tweetId}.jpg`,
      `https://pbs.twimg.com/tweet_video_thumb/${tweetId}.jpg`
    ]
    
    for (const url of possibleMediaUrls) {
      console.log('trying constructed url from tweet id:', url)
      mediaItems.push({
        type: 'image',
        url: url
      })
    }
  }
  
  // look for t.co links that might be media
  let tcoCount = 0
  while ((match = tcoLinkRegex.exec(html)) !== null) {
    tcoCount++
    const tcoUrl = match[1]
    const linkText = match[2]
    console.log(`found t.co media link ${tcoCount}:`, tcoUrl, 'text:', linkText)
    
    // store t.co url for later expansion
    mediaItems.push({
      type: 'image', // assume image for now
      url: tcoUrl // we'll expand this later
    })
  }
  
  console.log(`extraction summary:`)
  console.log(`- tweet id: ${tweetId}`)
  console.log(`- direct images: ${imageCount}`)
  console.log(`- video thumbnails: ${videoCount}`)
  console.log(`- data images: ${dataCount}`)
  console.log(`- pbs urls: ${pbsCount}`)
  console.log(`- pic.twitter.com refs: ${picCount}`)
  console.log(`- media ids: ${mediaIdCount}`)
  console.log(`- t.co links: ${tcoCount}`)
  console.log(`total media items found: ${mediaItems.length}`)
  
  return mediaItems
}

// extract text from image using ocr
export async function extractTextFromImage(imageUrl: string): Promise<string> {
  try {
    console.log('=== starting ocr process ===')
    console.log('initial image url:', imageUrl)
    
    let finalUrl = imageUrl
    
    // if it's a t.co link, expand it first
    if (imageUrl.includes('t.co')) {
      console.log('detected t.co link, expanding...')
      const expanded = await expandTwitterLink(imageUrl)
      if (expanded) {
        finalUrl = expanded
        console.log('successfully expanded t.co to:', finalUrl)
      } else {
        console.log('failed to expand t.co link, skipping ocr')
        return ''
      }
    }
    
    // now convert to direct image url if needed
    console.log('attempting to get direct image url from:', finalUrl)
    const directImageUrl = await getDirectImageUrl(finalUrl)
    
    if (!directImageUrl) {
      console.log('could not get direct image url, skipping ocr')
      return ''
    }
    
    console.log('final direct image url for ocr:', directImageUrl)
    
    // validate that this looks like an image url
    if (!directImageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
      console.log('final url does not appear to be an image, skipping ocr')
      return ''
    }
    
    console.log('creating tesseract worker...')
    const worker = await createWorker('eng')
    
    // fetch image as blob
    console.log('fetching image blob from:', directImageUrl)
    const response = await fetch(directImageUrl)
    
    if (!response.ok) {
      console.log('failed to fetch image, status:', response.status)
      console.log('response headers:', Object.fromEntries(response.headers.entries()))
      throw new Error(`failed to fetch image: ${response.status}`)
    }
    
    const imageBlob = await response.blob()
    console.log('successfully fetched image blob')
    console.log('image blob size:', imageBlob.size, 'bytes')
    console.log('image blob type:', imageBlob.type)
    
    if (imageBlob.size === 0) {
      console.log('image blob is empty, skipping ocr')
      await worker.terminate()
      return ''
    }
    
    console.log('starting tesseract recognition...')
    const { data: { text } } = await worker.recognize(imageBlob)
    
    console.log('tesseract recognition complete')
    await worker.terminate()
    
    const extractedText = text.trim()
    console.log('extracted text length:', extractedText.length)
    
    if (extractedText.length > 0) {
      console.log('extracted text preview:', extractedText.substring(0, 200) + '...')
    } else {
      console.log('no text was extracted from the image')
    }
    
    console.log('=== ocr process complete ===')
    return extractedText
  } catch (error) {
    console.error('ocr error for url', imageUrl, ':', error)
    return ''
  }
}

// extract text from video thumbnail (simplified approach)
export async function extractTextFromVideo(videoUrl: string): Promise<string> {
  try {
    // for videos, we'll try to extract text from thumbnail
    // twitter video thumbnails are usually available by modifying the url
    const thumbnailUrl = videoUrl.replace(/\.(mp4|mov)$/i, '.jpg')
    
    return await extractTextFromImage(thumbnailUrl)
  } catch (error) {
    console.error('video text extraction error:', error)
    return ''
  }
}

// process all media in a tweet and extract text
export async function analyzeMediaContent(html: string): Promise<MediaAnalysisResult> {
  console.log('starting media analysis...')
  
  const mediaItems = extractMediaUrls(html)
  const extractedTexts: string[] = []
  
  for (const item of mediaItems) {
    console.log(`processing ${item.type}:`, item.url)
    
    let extractedText = ''
    
    if (item.type === 'image') {
      extractedText = await extractTextFromImage(item.url)
    } else if (item.type === 'video') {
      extractedText = await extractTextFromVideo(item.url)
    }
    
    if (extractedText) {
      item.extractedText = extractedText
      extractedTexts.push(`[${item.type}]: ${extractedText}`)
      console.log(`extracted from ${item.type}:`, extractedText.substring(0, 100) + '...')
    } else {
      console.log(`no text found in ${item.type}`)
    }
  }
  
  const result = {
    mediaItems,
    combinedText: extractedTexts.join('\n\n')
  }
  
  console.log('media analysis complete. combined text length:', result.combinedText.length)
  
  return result
} 