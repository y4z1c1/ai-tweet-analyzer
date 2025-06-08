// utility functions for tweet url handling

export function validateTweetUrl(url: string): boolean {
  const tweetUrlPattern = /^https?:\/\/(twitter\.com|x\.com)\/[\w]+\/status\/\d+\/?$/
  return tweetUrlPattern.test(url)
}

export function normalizeTweetUrl(url: string): string {
  // normalize x.com to twitter.com for consistency with oembed api
  return url.replace(/^https?:\/\/x\.com/, 'https://twitter.com')
}

export function extractTweetId(url: string): string | null {
  const match = url.match(/status\/(\d+)/)
  return match ? match[1] : null
}

export function cleanTweetUrl(url: string): string {
  // remove query params and fragments for cleaner urls
  try {
    const urlObj = new URL(url)
    urlObj.search = ''
    urlObj.hash = ''
    return urlObj.toString()
  } catch {
    return url
  }
} 