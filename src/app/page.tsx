'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { TweetData, TweetApiResponse } from '@/types/tweet'

export default function Home() {
  const [tweetUrl, setTweetUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tweetData, setTweetData] = useState<TweetData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // load twitter widgets script when tweet data is available
  useEffect(() => {
    if (tweetData && typeof window !== 'undefined') {
      // load twitter widgets script if not already loaded
      if (!window.twttr) {
        const script = document.createElement('script')
        script.src = 'https://platform.twitter.com/widgets.js'
        script.async = true
        script.onload = () => {
          // process widgets after script loads
          if (window.twttr?.widgets) {
            window.twttr.widgets.load()
          }
        }
        document.body.appendChild(script)
      } else {
        // if script already loaded, just process widgets
        window.twttr.widgets.load()
      }
    }
  }, [tweetData])

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

        {/* tweet embed display */}
        {tweetData && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3 text-center">
              fetched tweet:
            </h3>
            <div 
              dangerouslySetInnerHTML={{ __html: tweetData.html }}
              className="flex justify-center"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// extend window type for twitter widgets
declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: () => void
      }
    }
  }
}
