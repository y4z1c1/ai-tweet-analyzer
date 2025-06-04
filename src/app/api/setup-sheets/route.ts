import { NextRequest, NextResponse } from 'next/server';
import { createSpreadsheet } from '@/lib/google-sheets';

// create new spreadsheet for tweet analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title } = body;
    
    if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
      return NextResponse.json(
        { error: 'google sheets credentials not configured' },
        { status: 400 }
      );
    }

    const spreadsheetId = await createSpreadsheet(title || 'Tweet Analysis Results');
    
    return NextResponse.json({ 
      success: true, 
      spreadsheetId,
      message: 'spreadsheet created successfully. add this id to your .env.local as SPREADSHEET_ID'
    });
  } catch (error) {
    console.error('error creating spreadsheet:', error);
    return NextResponse.json(
      { error: 'failed to create spreadsheet' },
      { status: 500 }
    );
  }
} 