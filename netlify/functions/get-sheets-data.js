exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
    const API_KEY = process.env.GOOGLE_API_KEY;
    const SHEETS_RANGE = 'CO Chemical Research - Table!A:Z';
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${SHEETS_RANGE}?key=${API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.values || data.values.length < 2) {
      throw new Error('No data found in sheet');
    }

    const headers_row = data.values[0];
    const parsedData = data.values.slice(1).map(row => {
      const obj = {};
      headers_row.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: parsedData,
        count: parsedData.length
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
