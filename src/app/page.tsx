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
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null)
  const [isShaking, setIsShaking] = useState(false)
  const [isInvalid, setIsInvalid] = useState(false)

  // validate tweet url function
  const isValidTweetUrl = (url: string): boolean => {
    const tweetUrlPattern = /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/i
    return tweetUrlPattern.test(url.trim())
  }

  // trigger shake animation and red border
  const triggerInvalidFeedback = () => {
    setIsShaking(true)
    setIsInvalid(true)
    setTimeout(() => {
      setIsShaking(false)
      setIsInvalid(false)
    }, 500)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tweetUrl.trim()) return
    
    // validate tweet url before proceeding
    if (!isValidTweetUrl(tweetUrl)) {
      triggerInvalidFeedback()
      return
    }
    
    setIsLoading(true)
    setError(null)
    setTweetData(null)
    setAnalysis(null)
    setSaveStatus(null)

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
            authorName: data.tweet.authorName,
            username: data.tweet.username,
            tweetUrl: tweetUrl.trim()
          }),
        })

        const analysisData: AnalysisApiResponse = await analysisResponse.json()
        
        if (analysisData.success && analysisData.analysis) {
          setAnalysis(analysisData.analysis)
          
          // save to database
          setSaveStatus('saving')
          try {
            // simulate database save - replace with actual api call
            await new Promise(resolve => setTimeout(resolve, 1000))
            setSaveStatus('saved')
          } catch (saveError) {
            console.error('database save error:', saveError)
            setSaveStatus('error')
          }
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
      handleSubmit(e as React.FormEvent)
    }
  }

  // function to reset to main page
  const handleBackToMain = () => {
    setTweetData(null)
    setAnalysis(null)
    setError(null)
    setSaveStatus(null)
    setTweetUrl('')
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

    // generate username from author name - fallback if username not available
    const generateUsername = (authorName: string) => {
      return '@' + authorName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    }

    // use actual username if available, otherwise generate one
    const displayUsername = tweet.username ? `@${tweet.username}` : generateUsername(tweet.authorName)

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 sm:p-6">
        {/* tweet header - improved responsive layout */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
            {tweet.profilePicture ? (
              <Image
                src={tweet.profilePicture}
                alt={`${tweet.authorName} profile picture`}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // fallback to placeholder if image fails to load
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
              />
            ) : null}
            <div className={`w-full h-full bg-blue-600 rounded-full flex items-center justify-center ${tweet.profilePicture ? 'hidden' : ''}`}>
              <span className="text-white font-bold text-sm sm:text-lg">
                {tweet.authorName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-semibold text-base sm:text-lg truncate">{tweet.authorName}</h4>
            <p className="text-gray-400 text-sm truncate">{displayUsername}</p>
          </div>
        </div>

        {/* tweet content - improved typography and spacing */}
        <div className="mb-6">
          <p className="text-white text-base sm:text-lg leading-relaxed break-words">{tweet.text}</p>
          {tweet.text.includes('could not be retrieved') && (
            <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
              <p className="text-yellow-200 text-sm">
                ⚠️ tweet content limited due to api restrictions. analysis will proceed with available data.
              </p>
            </div>
          )}
          

        </div>

        {/* date and time - improved responsive text */}
        <div className="mb-4 text-gray-400 text-xs sm:text-sm">
          {formatDate(tweetDate)}
        </div>

        {/* ai analysis section - improved loading state alignment */}
        {isAnalyzing && (
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-center sm:justify-start space-x-3 mb-4">
              <Image
                src="/loading-spinner.png"
                alt="Loading"
                width={20}
                height={20}
                className="animate-spin"
              />
              <p className="text-blue-200 font-medium text-sm sm:text-base">analyzing with ai...</p>
            </div>
          </div>
        )}

        {analysis && (
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-white font-semibold mb-4 text-base sm:text-lg">✨ ai analysis:</h4>
            
            <div className="space-y-4">
              {/* sentiment - improved responsive layout */}
              <div>
                <h5 className="text-gray-400 text-xs sm:text-sm mb-2 font-medium">sentiment:</h5>
                <span className={`font-semibold text-lg sm:text-xl ${getSentimentColor(analysis.sentiment)} capitalize`}>
                  {analysis.sentiment}
                </span>
              </div>

              {/* summary - improved responsive container */}
              <div>
                <h5 className="text-gray-400 text-xs sm:text-sm mb-2 font-medium">summary:</h5>
                <p className="text-white bg-gray-800 p-3 sm:p-4 rounded text-sm sm:text-base leading-relaxed break-words">
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
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* dot grid background with fade effect */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(59, 130, 246, 0.6) 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
          maskImage: 'radial-gradient(circle at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 40%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 40%, transparent 70%)'
        }}
      />
      
      {/* main container with proper padding and responsive design */}
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex-grow relative z-10">
        {/* main analyzer section with better responsive width */}
        <div className="max-w-2xl mx-auto">
          {/* header with logo and title - smooth transition to top when search is made */}
          <div className={`text-center transition-all duration-700 ease-in-out ${
            tweetData ? 'mb-8' : 'mb-12 min-h-[50vh] flex flex-col justify-center'
          }`}>
            <button 
              onClick={handleBackToMain}
              className={`flex items-center justify-center space-x-1 transition-all duration-700 ease-in-out hover:scale-105 active:scale-95 cursor-pointer group ${
                tweetData || error ? 'mb-4' : 'mb-8'
              }`}
            >
              <Image
                src="/tweet_analyzer.png"
                alt="Tweet Analyzer Logo"
                width={60}
                height={60}
                className="flex-shrink-0 group-hover:rotate-12 transition-transform duration-300"
              />
              <h1 className="text-3xl sm:text-4xl font-thin bg-gradient-to-r from-blue-400 via-blue-300 to-white bg-clip-text text-transparent hover:from-blue-500 hover:via-blue-400 hover:to-gray-100 transition-all duration-300"
                style={{
                  backgroundSize: '200% 200%',
                  animation: 'gradient-shift 4s ease-in-out infinite'
                }}>
                ai tweet analyzer
              </h1>
            </button>

            {/* input with paste and search icons - improved responsive form */}
            <form onSubmit={handleSubmit} className={`transition-all duration-700 ease-in-out ${
              tweetData ? 'mb-0' : 'mb-8'
            }`}>
              <div className="relative">
                <input
                  type="text"
                  value={tweetUrl}
                  onChange={(e) => setTweetUrl(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="paste tweet url here"
                  className={`w-full px-4 py-4 pr-24 bg-gray-900 border ${isInvalid ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none ${isInvalid ? 'focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'} transition-all duration-200 text-sm sm:text-base ${isShaking ? 'animate-pulse' : ''}`}
                  style={isShaking ? {
                    animation: 'shake 0.5s ease-in-out',
                    transform: 'translateX(0)'
                  } : {}}
                  disabled={isLoading || isAnalyzing}
                />
                
                {/* paste button */}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText()
                      setTweetUrl(text)
                    } catch (err) {
                      console.error('failed to read clipboard:', err)
                    }
                  }}
                  disabled={isLoading || isAnalyzing}
                  className="absolute right-16 top-1/2 transform -translate-y-1/2 p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
                  title="paste from clipboard"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
                
                {/* submit button */}
                <button
                  type="submit"
                  disabled={isLoading || isAnalyzing}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
                >
                  {isLoading || isAnalyzing ? (
                    <Image
                      src="/loading-spinner.png"
                      alt="Loading"
                      width={20}
                      height={20}
                      className="animate-spin"
                    />
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* error display - improved spacing and responsiveness */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-8 transform transition-all duration-500 ease-in-out animate-in slide-in-from-top-4">
              <p className="text-red-200 text-sm sm:text-base text-center sm:text-left">{error}</p>
            </div>
          )}

          {/* tweet display with analysis combined - improved container with smooth entry */}
          <div className="space-y-6">
            {tweetData && (
              <div className="transform transition-all duration-700 ease-in-out animate-in slide-in-from-bottom-8">
                <TweetDisplay tweet={tweetData} />
                
                {/* database save status indicator */}
                {saveStatus && (
                  <div className="text-center mt-4">
                    <p className={`text-xs sm:text-sm transition-all duration-300 ${
                      saveStatus === 'saved' 
                        ? 'text-green-400' 
                        : saveStatus === 'error'
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}>
                      {saveStatus === 'saving' && (
                        <>💾 saving analysis to <a href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID}/edit`} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300 transition-colors">database</a>...</>
                      )}
                      {saveStatus === 'saved' && (
                        <>✅ analysis saved to <a href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID}/edit`} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300 transition-colors">database</a></>
                      )}
                      {saveStatus === 'error' && (
                        <>❌ failed to save analysis to <a href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID}/edit`} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300 transition-colors">database</a></>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
        
      {/* footer - always at bottom */}
      <footer className="mt-auto pt-8 pb-4 border-t border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center space-x-2">
            <p className="text-gray-500 text-xs">
              app currently doesn&apos;t support twitter media
            </p>
            <p className="text-gray-500 text-xs">
              |
            </p>
            <p className="text-gray-500 text-xs">
              created by{' '}
              <a 
                href="https://github.com/y4z1c1" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors duration-200 underline"
              >
                y4z1c1
              </a>
            </p>
          </div>
        </div>
      </footer>
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
