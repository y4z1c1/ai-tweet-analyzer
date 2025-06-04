'use client'

import { useState } from 'react'
import Image from 'next/image'
import { TweetData, TweetApiResponse } from '@/types/tweet'
import { AnalysisResult, AnalysisApiResponse } from '@/types/analysis'

export default function Home() {
  const [tweetUrl, setTweetUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [tweetData, setTweetData] = useState<TweetData | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tweetUrl.trim()) return
    
    setIsLoading(true)
    setError(null)
    setTweetData(null)
    setAnalysis(null)

    try {
      // first fetch the tweet
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
        
        // then analyze the tweet with ai
        setIsAnalyzing(true)
        const analysisResponse = await fetch('/api/analyze-tweet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: data.tweet.text,
            authorName: data.tweet.authorName
          }),
        })

        const analysisData: AnalysisApiResponse = await analysisResponse.json()
        
        if (analysisData.success && analysisData.analysis) {
          setAnalysis(analysisData.analysis)
        } else {
          setError(analysisData.error || 'failed to analyze tweet')
        }
      } else {
        setError(data.error || 'failed to fetch tweet')
      }
    } catch (err) {
      console.error('fetch error:', err)
      setError('network error occurred')
    } finally {
      setIsLoading(false)
      setIsAnalyzing(false)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  // helper function to get sentiment color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400'
      case 'negative': return 'text-red-400'
      case 'neutral': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  // custom tweet component
  const TweetDisplay = ({ tweet }: { tweet: TweetData }) => {
    // extract date from tweet url (tweet id contains timestamp info)
    const getTweetDate = () => {
      try {
        const tweetId = tweet.url.match(/status\/(\d+)/)?.[1]
        if (tweetId) {
          // twitter snowflake ids contain timestamp
          // extract first 41 bits and convert to timestamp
          const timestamp = (BigInt(tweetId) >> BigInt(22)) + BigInt(1288834974657)
          return new Date(Number(timestamp))
        }
      } catch (error) {
        console.error('error extracting date from tweet id:', error)
      }
      return new Date() // fallback to current date
    }

    const tweetDate = getTweetDate()
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' at ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }

    // generate username from author name
    const generateUsername = (authorName: string) => {
      return '@' + authorName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    }

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        {/* tweet header */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {tweet.authorName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold">{tweet.authorName}</h4>
            <p className="text-gray-400 text-sm">{generateUsername(tweet.authorName)}</p>
          </div>
        </div>

        {/* tweet content */}
        <div className="mb-4">
          <p className="text-white text-lg leading-relaxed">{tweet.text}</p>
        </div>

        {/* date and time */}
        <div className="mb-4 text-gray-400 text-sm">
          {formatDate(tweetDate)}
        </div>

        {/* ai analysis section */}
        {isAnalyzing && (
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
              <p className="text-blue-200 font-medium">analyzing with ai...</p>
            </div>
          </div>
        )}

        {analysis && (
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-white font-semibold mb-4">✨ ai analysis:</h4>
            
            <div className="space-y-4">
              {/* sentiment */}
              <div>
                <h5 className="text-gray-400 text-sm mb-2">sentiment:</h5>
                <span className={`font-semibold text-lg ${getSentimentColor(analysis.sentiment)}`}>
                  {analysis.sentiment}
                </span>
              </div>

              {/* summary */}
              <div>
                <h5 className="text-gray-400 text-sm mb-2">summary:</h5>
                <p className="text-white bg-gray-800 p-3 rounded">
                  {analysis.summary}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* header with logo and title side by side */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Image
              src="/tweet_analyzer.png"
              alt="Tweet Analyzer Logo"
              width={60}
              height={60}
            />
            <h1 className="text-2xl font-bold text-white">
              ai tweet analyzer
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            paste tweet url to analyze with ai
          </p>
        </div>

        {/* input with search icon */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative">
            <input
              type="url"
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="https://twitter.com/username/status/... or https://x.com/username/status/..."
              className="w-full px-4 py-3 pr-12 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
              disabled={isLoading || isAnalyzing}
            />
            <button
              type="submit"
              disabled={isLoading || isAnalyzing || !tweetUrl.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isLoading || isAnalyzing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* error display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* tweet display with analysis combined */}
        {tweetData && <TweetDisplay tweet={tweetData} />}
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
