'use client';

import { useState, useEffect } from 'react';

interface AnalysisRecord {
  username: string;
  tweetContent: string;
  sentiment: string;
  summary: string;
  dateTime: string;
  tweetUrl: string;
}

export default function ResultsHistory() {
  const [results, setResults] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);

  // fetch results from google sheets
  const fetchResults = async () => {
    setLoading(true);
    setError('');
    setNotConfigured(false);
    
    try {
      const response = await fetch('/api/sheets');
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results || []);
        
        // check if google sheets is not configured
        if (data.message && data.message.includes('not configured')) {
          setNotConfigured(true);
        }
      } else {
        throw new Error(data.error || 'failed to fetch results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  // format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // sentiment badge color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'neutral': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Analysis History</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">loading results...</p>
        </div>
      </div>
    );
  }

  if (notConfigured) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Analysis History</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Google Sheets Not Configured</h3>
              <p className="text-blue-800 mb-4">
                To see analysis history, you need to set up Google Sheets integration. 
                This will automatically save all your tweet analyses.
              </p>
              <div className="bg-white border border-blue-200 rounded p-3 mb-4">
                <p className="text-sm text-blue-700 font-medium mb-2">Quick Setup:</p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Follow the guide in <code className="bg-blue-100 px-1 rounded">GOOGLE_SHEETS_SETUP.md</code></li>
                  <li>Add your credentials to <code className="bg-blue-100 px-1 rounded">.env.local</code></li>
                  <li>Restart the dev server</li>
                </ol>
              </div>
              <button 
                onClick={fetchResults}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                check again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Analysis History</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">error loading results: {error}</p>
          <button 
            onClick={fetchResults}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Analysis History</h2>
        <button 
          onClick={fetchResults}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          refresh
        </button>
      </div>
      
      {results.length === 0 ? (
        <p className="text-gray-600 text-center py-8">no analysis results found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-900">user</th>
                <th className="text-left py-3 px-2 font-medium text-gray-900">tweet</th>
                <th className="text-left py-3 px-2 font-medium text-gray-900">sentiment</th>
                <th className="text-left py-3 px-2 font-medium text-gray-900">summary</th>
                <th className="text-left py-3 px-2 font-medium text-gray-900">date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <div className="font-medium text-gray-900">@{result.username}</div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="max-w-xs truncate text-gray-700" title={result.tweetContent}>
                      {result.tweetContent}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSentimentColor(result.sentiment)}`}>
                      {result.sentiment}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="max-w-sm text-gray-700 text-sm">
                      {result.summary}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-600">
                    {formatDate(result.dateTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 