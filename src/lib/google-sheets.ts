import { google } from 'googleapis';

// google sheets client setup
export async function getGoogleSheetsClient() {
  try {
    const credentialsString = process.env.GOOGLE_SHEETS_CREDENTIALS;
    
    if (!credentialsString || credentialsString.trim() === '') {
      throw new Error('google_sheets_credentials environment variable not set');
    }
    
    let credentials;
    try {
      credentials = JSON.parse(credentialsString);
    } catch (parseError) {
      console.error('invalid json in google_sheets_credentials:', parseError);
      throw new Error('google_sheets_credentials contains invalid json format');
    }
    
    if (!credentials.type || !credentials.client_email) {
      throw new Error('invalid google sheets credentials format - missing required fields');
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  } catch (error) {
    console.error('error setting up google sheets client:', error);
    throw error; // re-throw the original error to preserve the specific message
  }
}

// create spreadsheet with headers
export async function createSpreadsheet(title: string = 'Tweet Analysis Results') {
  const sheets = await getGoogleSheetsClient();
  
  try {
    // create new spreadsheet
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
        sheets: [
          {
            properties: {
              title: 'Analysis Results',
            },
          },
        ],
      },
    });

    const spreadsheetId = response.data.spreadsheetId;
    
    if (!spreadsheetId) {
      throw new Error('failed to get spreadsheet id from response');
    }
    
    // add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'A1:F1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          ['Username', 'Tweet Content', 'Sentiment', 'Summary', 'Date/Time', 'Tweet URL']
        ],
      },
    });

    return spreadsheetId;
  } catch (error) {
    console.error('error creating spreadsheet:', error);
    throw new Error('failed to create spreadsheet');
  }
}

// save tweet analysis to spreadsheet
export async function saveTweetAnalysis(data: {
  username: string;
  tweetContent: string;
  sentiment: string;
  summary: string;
  tweetUrl: string;
}) {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('spreadsheet_id not configured');
  }

  const sheets = await getGoogleSheetsClient();
  
  try {
    const timestamp = new Date().toISOString();
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            data.username,
            data.tweetContent,
            data.sentiment,
            data.summary,
            timestamp,
            data.tweetUrl
          ]
        ],
      },
    });

    return { success: true };
  } catch (error) {
    console.error('error saving to sheets:', error);
    throw new Error('failed to save to google sheets');
  }
}

// get all analysis results from spreadsheet
export async function getAnalysisResults() {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('spreadsheet_id not configured');
  }

  const sheets = await getGoogleSheetsClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:F',
    });

    const rows = response.data.values || [];
    
    // skip header row
    const dataRows = rows.slice(1);
    
    return dataRows.map((row: string[]) => ({
      username: row[0] || '',
      tweetContent: row[1] || '',
      sentiment: row[2] || '',
      summary: row[3] || '',
      dateTime: row[4] || '',
      tweetUrl: row[5] || '',
    }));
  } catch (error) {
    console.error('error reading from sheets:', error);
    throw new Error('failed to read from google sheets');
  }
} 