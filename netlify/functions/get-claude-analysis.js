exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { customerDetails, relevantData } = JSON.parse(event.body);
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

    const prompt = `You are an expert pricing analyst for a chemical supply company. Analyze the following scenario and provide intelligent pricing recommendations.

CUSTOMER REQUEST:
- Location: ${customerDetails.location}
- Volume: ${customerDetails.volume}
- Product: ${customerDetails.product}
- Timeline: ${customerDetails.timeline}
- Customer Type: ${customerDetails.customerType}
- Special Requirements: ${customerDetails.specialRequirements || 'None'}

COMPETITOR DATA:
${JSON.stringify(relevantData, null, 2)}

Please provide:
1. A recommended price per gallon/unit
2. Detailed reasoning for this price
3. Competitive analysis insights
4. Strategic recommendations

Format your response as:
RECOMMENDED_PRICE: $X.XX/gallon
REASONING: [Your detailed analysis]

Consider factors like:
- Competitor pricing in the area
- Volume discounts
- Delivery timeline impact
- Customer type considerations
- Market positioning
- Profit margins`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const claudeResponse = data.content[0].text;

    const priceMatch = claudeResponse.match(/RECOMMENDED_PRICE:\s*\$?([\d.]+)/i);
    const reasoningMatch = claudeResponse.match(/REASONING:\s*([\s\S]*)/i);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        price: priceMatch ? `$${priceMatch[1]}/gallon` : 'See analysis below',
        reasoning: reasoningMatch ? reasoningMatch[1].trim() : claudeResponse,
        rawResponse: claudeResponse
      })
    };

  } catch (error) {
    console.error('Claude API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
