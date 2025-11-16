// Netlify Function: get-places
// This runs on the server and keeps your Airtable token secret!

exports.handler = async function(event, context) {
  // Enable CORS so your website can call this
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Get Airtable credentials from environment variables (secure!)
    const AIRTABLE_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
    const BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Table 1';

    // Check if credentials are configured
    if (!AIRTABLE_TOKEN || !BASE_ID) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Airtable credentials not configured',
          message: 'Please set environment variables in Netlify'
        })
      };
    }

    // Call Airtable API
    const airtableUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
    
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform the data to a simpler format
    // Only include APPROVED places
    const places = data.records
      .filter(record => record.fields.Approved === true) // Only approved places
      .map(record => {
        // Handle single-select fields which can be objects or strings
        const typeField = record.fields.Type;
        let typeValue = typeof typeField === 'object' && typeField !== null
          ? typeField.name || ''
          : typeField || '';

        // Strip emojis from type value (keep only text)
        typeValue = typeValue.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

        return {
          id: record.id,
          Name: record.fields.Name || '',
          Type: typeValue,
          City: record.fields.City || '',
          Description: record.fields.Description || '',
          GoogleMapsLink: record.fields['Google Maps Link'] || record.fields.GoogleMapsLink || '',
          Notes: record.fields.Notes || '',
          AddedBy: record.fields['Added By'] || record.fields.AddedBy || '',
          Photo: record.fields.Photo && record.fields.Photo[0] ? record.fields.Photo[0].url : null
        };
      });

    // Return the data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ places })
    };

  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch places',
        message: error.message 
      })
    };
  }
};