/**
 * Endpoint Serverless Vercel : Récupération en temps réel des deals réels de HubSpot CRM
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!token) {
    return res.status(200).json({
      connected: false,
      message: 'Aucun jeton HUBSPOT_ACCESS_TOKEN configuré.',
      deals: []
    });
  }

  try {
    const hubRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals?properties=dealname,amount,dealstage,closedate,pipeline,hs_priority&limit=25', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!hubRes.ok) {
      const err = await hubRes.json().catch(() => ({}));
      return res.status(200).json({
        connected: false,
        error: err,
        deals: []
      });
    }

    const data = await hubRes.json();
    return res.status(200).json({
      connected: true,
      total: data.results?.length || 0,
      deals: data.results?.map(d => ({
        id: d.id,
        name: d.properties?.dealname || 'Opportunité sans nom',
        amount: parseFloat(d.properties?.amount || '0') || 0,
        stage: d.properties?.dealstage || 'default',
        priority: d.properties?.hs_priority || 'NORMAL',
        createdAt: d.createdAt
      })) || []
    });

  } catch (error) {
    return res.status(500).json({
      connected: false,
      error: error.message,
      deals: []
    });
  }
}
