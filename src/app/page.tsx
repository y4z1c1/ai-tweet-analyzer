'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function Home() {
  const [tweetUrl, setTweetUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tweetUrl.trim()) return
    
    setIsLoading(true)
    // analyze tweet logic will go here
    console.log('analyzing tweet:', tweetUrl)
    
    // simulate loading
    setTimeout(() => {
      setIsLoading(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="url"
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              placeholder="https://twitter.com/username/status/..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !tweetUrl.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? 'analyzing...' : 'analyze tweet'}
          </button>
        </form>
      </div>
    </div>
  )
}
