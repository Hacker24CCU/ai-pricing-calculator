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
    const { customerDetails, relevantData, conversationHistory } = JSON.parse(event.body);
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

    // Build conversation context if this is a follow-up
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = '\n\nPREVIOUS CONVERSATION:\n';
      conversationHistory.forEach(msg => {
        conversationContext += `${msg.role.toUpperCase()}: ${msg.content}\n`;
      });
      conversationContext += '\nPlease revise your recommendation based on the user\'s feedback above.\n';
    }

    const prompt = `You are an expert pricing analyst for Treatment Technology, Inc., a Colorado-based water and wastewater chemical distributor transitioning to manufacturing in March 2026.

CUSTOMER REQUEST:
- Location: ${customerDetails.location}
- Volume: ${customerDetails.volume}
- Product: ${customerDetails.product}
- Timeline: ${customerDetails.timeline}
- Customer Type: ${customerDetails.customerType}
- Special Requirements: ${customerDetails.specialRequirements || 'None'}

COMPETITOR DATA AVAILABLE:
${JSON.stringify(relevantData, null, 2)}

${conversationContext}

PRICING STRATEGY & GUIDELINES:

1. MARGIN REQUIREMENTS (NON-NEGOTIABLE):
   - Absolute floor: 20% gross profit (anything below requires management approval)
   - Target for Sodium Hypochlorite: 40%+ gross profit
   - Target for Specialty Polymers/Coagulants: 50%+ gross profit (limited competition, technical value)
   - Most other chemicals: 30-50% gross profit range

2. SODIUM HYPOCHLORITE SPECIFIC PRICING (March 2026+):
   Post-manufacturing launch (March 2026), our COGS will be:
   - 12.5% concentration: $0.714/gal
   - 10% concentration: $0.576/gal
   
   Volume-Based Tiers (annual gallons):
   
   12.5% Concentration:
   - Tier 1 (>25,000 gal/year): $2.88-$3.63/gal (75-80% GPM)
   - Tier 2 (12,500-24,999 gal/year): $3.38-$3.93/gal (79-82% GPM)
   - Tier 3 (5,000-12,499 gal/year): $3.78-$4.08/gal (81-83% GPM)
   - Tier 4 (1,000-4,999 gal/year): $4.08-$4.18/gal (83% GPM)
   - Tier 5 (<1,000 gal/year): $4.28/gal (83% GPM)
   
   10% Concentration:
   - Tier 1 (>25,000 gal/year): $2.71-$3.46/gal (79-83% GPM)
   - Tier 2 (12,500-24,999 gal/year): $3.21-$3.76/gal (82-85% GPM)
   - Tier 3 (5,000-12,499 gal/year): $3.61-$3.91/gal (84-85% GPM)
   - Tier 4 (1,000-4,999 gal/year): $3.91-$4.01/gal (85-86% GPM)
   - Tier 5 (<1,000 gal/year): $4.11/gal (86% GPM)

   Current distribution COGS (until March 2026):
   - 12.5%: $2.69/gal (target selling: $4.59/gal for ~41% margin)
   - 10%: $2.47/gal (target selling: $3.84/gal for ~36% margin)

3. DELIVERY FEES (add to chemical price):
   - 0-10 miles: $40
   - 11-25 miles: $60
   - 26-50 miles: $75
   - 51-75 miles: $90
   - 76-100 miles: $125
   - 101-125 miles: $150

4. PACKAGE SIZE ADJUSTMENTS:
   Smaller packages command exponentially higher per-unit prices:
   - Bulk Tanker: Base price
   - Totes/Drums: +10-25% premium
   - 15 Gal Containers: +80-100% premium
   - 5 Gal Containers: +100-120% premium
   - Small pails/bags: Case-by-case based on handling costs

5. CATALOGUE REFERENCE PRICES (use as starting points, adjust based on situation):
   Key products from current catalogue:
   - Aluminum Sulfate 48%: $7.95-$8.60/gal (cost: $1.50)
   - Ferric Chloride 38%: $7.84-$9.54/gal (cost: $4.45-$5.32)
   - Caustic Soda 50%: $5.40-$11.05/gal depending on package (cost: $4.08-$6.80)
   - Sodium Bisulfite 40-43%: $5.14/gal (cost: $3.10, comp at $6.48)
   - Phosphoric Acid 75%: $27.45-$29.64/gal (cost: $11.26-$14.03)
   - Hydrogen Peroxide 34%: $7.30-$13.00/gal (cost: $5.18-$11.98)
   
   These are suggestive - we often go lower based on volume and competition.

6. COMPETITIVE STRATEGY:
   - PRIMARY: Undercut competitors while maintaining minimum margins
   - SECONDARY: Emphasize superior service, reliability, and local presence
   - When competitor data shows pricing: aim to be 5-10% below while staying above 20% GP floor
   - For specialty products with limited competition: maintain 50%+ margins

7. VOLUME DISCOUNT PHILOSOPHY:
   - Apply tiered pricing similar to bleach structure for other chemicals
   - Larger annual commitments = better pricing
   - One-time small orders = higher per-unit pricing

8. GEOGRAPHIC/DATA LIMITATIONS:
   If the requested county has insufficient data (<5 relevant rows):
   - Intelligently expand to neighboring or demographically similar counties
   - For mountain counties (Pitkin, Eagle, Summit, Grand): use each other as comparables
   - For plains counties (Weld, Larimer, Adams): use each other as comparables
   - CLEARLY EXPLAIN which counties you used and why in your reasoning
   - Example: "Since Pitkin County had only 2 data points for this chemical, I also analyzed pricing from Eagle County and Summit County (similar mountain resort communities) to provide a more comprehensive recommendation."

9. TIMELINE/URGENCY:
   - ASAP/Rush orders: Consider 10-15% premium if feasible
   - Standard 1-2 week timeline: Normal pricing
   - Flexible timeline: Opportunity for slight discount to optimize logistics

IMPORTANT INSTRUCTIONS:
- Use competitor data as market intelligence, but don't be bound by it
- Balance competitive positioning with our margin requirements
- Consider package size, delivery distance, volume, and timeline in your recommendation
- If data is limited for the exact county/product, intelligently substitute similar markets
- Explain your reasoning clearly, showing how you arrived at the price
- Always ensure we're above 20% gross profit floor

Please provide:
1. A recommended price per gallon/unit (or total order price if more appropriate)
2. Detailed reasoning for this price including:
   - Margin analysis (showing GP%)
   - Competitive positioning
   - Volume considerations
   - Delivery/logistics factors
   - Any geographic substitutions you made
3. Strategic recommendations for this customer

Format your response as:
RECOMMENDED_PRICE: $X.XX/gallon (or $X,XXX total)
MARGIN: XX% Gross Profit

REASONING:
[Your detailed analysis here]

STRATEGIC RECOMMENDATIONS:
[Your recommendations here]`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
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

    const priceMatch = claudeResponse.match(/RECOMMENDED_PRICE:\s*\$?([\d,.]+(?:\/\w+)?|\d+)/i);
    const marginMatch = claudeResponse.match(/MARGIN:\s*([\d.]+)%/i);
    const reasoningMatch = claudeResponse.match(/REASONING:\s*([\s\S]*?)(?=STRATEGIC RECOMMENDATIONS:|$)/i);
    const recommendationsMatch = claudeResponse.match(/STRATEGIC RECOMMENDATIONS:\s*([\s\S]*)/i);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        price: priceMatch ? `$${priceMatch[1]}` : 'See analysis below',
        margin: marginMatch ? `${marginMatch[1]}%` : 'See analysis',
        reasoning: reasoningMatch ? reasoningMatch[1].trim() : claudeResponse,
        recommendations: recommendationsMatch ? recommendationsMatch[1].trim() : '',
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
