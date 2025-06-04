import { NextRequest, NextResponse } from 'next/server';
import { saveTweetAnalysis, getAnalysisResults, createSpreadsheet } from '@/lib/google-sheets';

// save analysis to google sheets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { username, tweetContent, sentiment, summary, tweetUrl } = body;
    
    if (!username || !tweetContent || !sentiment || !summary || !tweetUrl) {
      return NextResponse.json(
        { error: 'missing required fields' },
        { status: 400 }
      );
    }

    await saveTweetAnalysis({
      username,
      tweetContent,
      sentiment,
      summary,
      tweetUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('error saving to sheets:', error);
    
    // provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'unknown error';
    
    if (errorMessage.includes('google_sheets_credentials')) {
      return NextResponse.json(
        { error: 'google sheets not configured - add credentials to .env.local' },
        { status: 400 }
      );
    }
    
    if (errorMessage.includes('invalid json format')) {
      return NextResponse.json(
        { error: 'google sheets credentials contain invalid json - check format in .env.local' },
        { status: 400 }
      );
    }
    
    if (errorMessage.includes('spreadsheet_id')) {
      return NextResponse.json(
        { error: 'spreadsheet not configured - add SPREADSHEET_ID to .env.local' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'failed to save to google sheets' },
      { status: 500 }
    );
  }
}

// get all analysis results
export async function GET() {
  try {
    // check if google sheets is configured
    if (!process.env.GOOGLE_SHEETS_CREDENTIALS || 
        !process.env.SPREADSHEET_ID || 
        process.env.GOOGLE_SHEETS_CREDENTIALS.trim() === '') {
      return NextResponse.json({ 
        results: [], 
        message: 'google sheets not configured - see GOOGLE_SHEETS_SETUP.md for setup instructions' 
      });
    }
    
    const results = await getAnalysisResults();
    return NextResponse.json({ results });
  } catch (error) {
    console.error('error getting results:', error);
    
    // provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'unknown error';
    
    if (errorMessage.includes('google_sheets_credentials')) {
      return NextResponse.json({ 
        results: [], 
        message: 'google sheets credentials not configured properly' 
      });
    }
    
    if (errorMessage.includes('invalid json format')) {
      return NextResponse.json({ 
        results: [], 
        message: 'google sheets credentials contain invalid json format' 
      });
    }
    
    if (errorMessage.includes('spreadsheet_id')) {
      return NextResponse.json({ 
        results: [], 
        message: 'spreadsheet id not configured' 
      });
    }
    
    return NextResponse.json(
      { error: 'failed to get results from google sheets' },
      { status: 500 }
    );
  }
} 