'use client'

import { useState } from 'react'
import Image from 'next/image'
import { TweetData, TweetApiResponse } from '@/types/tweet'

export default function Home() {
  const [tweetUrl, setTweetUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tweetData, setTweetData] = useState<TweetData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tweetUrl.trim()) return
    
    setIsLoading(true)
    setError(null)
    setTweetData(null)

    try {
      const response = await fetch('/api/fetch-tweet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tweetUrl: tweetUrl.trim() }),
      })

      const data: TweetApiResponse = await response.json()

      if (data.success && data.tweet) {
        setTweetData(data.tweet)
      } else {
        setError(data.error || 'failed to fetch tweet')
      }
    } catch (err) {
      console.error('fetch error:', err)
      setError('network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="mb-6">
            <Image
              src="/tweet_analyzer.png"
              alt="Tweet Analyzer Logo"
              width={80}
              height={80}
              className="mx-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            ai tweet analyzer
          </h1>
          <p className="text-gray-400 text-sm">
            paste tweet url to analyze with ai
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <input
              type="url"
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              placeholder="https://twitter.com/username/status/... or https://x.com/username/status/..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !tweetUrl.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? 'fetching tweet...' : 'analyze tweet'}
          </button>
        </form>

        {/* error display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* tweet data display */}
        {tweetData && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-white font-semibold mb-2">fetched tweet data:</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">author:</span>
                  <span className="text-white ml-2">{tweetData.authorName}</span>
                </div>
                <div>
                  <span className="text-gray-400">text content:</span>
                  <p className="text-white mt-1 bg-gray-800 p-3 rounded border">
                    {tweetData.text}
                  </p>
                </div>
              </div>
            </div>
            
            {/* raw html preview (optional) */}
            <details className="mt-4">
              <summary className="text-gray-400 cursor-pointer hover:text-white">
                show raw embed html
              </summary>
              <div className="mt-2 p-3 bg-gray-800 rounded text-xs text-gray-300 overflow-auto">
                <pre>{tweetData.html}</pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}
