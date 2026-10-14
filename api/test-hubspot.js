/**
 * Diagnostic Endpoint : Test de connexion HubSpot CRM
 * Permet de valider la clé d'API / Private App Token et de lister les pipelines et dealstages disponibles.
 */

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '') || process.env.HUBSPOT_ACCESS_TOKEN;

  if (!token) {
    return res.status(200).json({
      connected: false,
      notice: 'Aucun token HUBSPOT_ACCESS_TOKEN configuré. Le formulaire fonctionne en mode simulation sécurisée.',
      howToConnect: [
        '1. Rendez-vous dans HubSpot > Paramètres (roue crantée) > Intégrations > Applications privées.',
        '2. Créez une application nommée "Rénov.Confiance Form".',
        '3. Cochez les scopes : crm.objects.contacts.read/write, crm.objects.deals.read/write.',
        '4. Copiez le jeton commençant par "pat-eu1-..." ou "pat-na1-...".',
        '5. Ajoutez-le dans Vercel > Settings > Environment Variables > HUBSPOT_ACCESS_TOKEN.'
      ]
    });
  }

  try {
    let pipelinesRes = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!pipelinesRes.ok && (token.startsWith('eu1-') || token.startsWith('na1-') || !token.startsWith('pat-'))) {
      const fallback = await fetch(`https://api.hubapi.com/crm/v3/pipelines/deals?hapikey=${encodeURIComponent(token)}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (fallback.ok || fallback.status === 403) {
        pipelinesRes = fallback;
      }
    }

    if (!pipelinesRes.ok) {
      const err = await pipelinesRes.json().catch(() => ({}));
      if (err.category === 'MISSING_SCOPES' || pipelinesRes.status === 403) {
        return res.status(403).json({
          connected: false,
          status: 'MISSING_SCOPES',
          message: 'Clé HubSpot reconnue avec succès, mais les permissions (Scopes) Contacts et Deals doivent être cochées dans HubSpot.',
          instructions: 'Dans HubSpot > Paramètres > Applications privées > onglet "Portées (Scopes)" > cochez crm.objects.contacts (read/write) et crm.objects.deals (read/write).'
        });
      }
      return res.status(401).json({
        connected: false,
        error: `Échec d'authentification HubSpot (${pipelinesRes.status}) : ${err.message || 'Token invalide ou permissions insuffisantes'}`
      });
    }

    const data = await pipelinesRes.json();

    return res.status(200).json({
      connected: true,
      message: 'Connexion à HubSpot CRM réussie avec succès !',
      pipelinesCount: data.results?.length || 0,
      pipelines: data.results?.map(p => ({
        id: p.id,
        label: p.label,
        stages: p.stages?.map(s => ({
          id: s.id,
          label: s.label,
          displayOrder: s.displayOrder
        }))
      }))
    });

  } catch (error) {
    return res.status(500).json({
      connected: false,
      error: 'Erreur lors de la requête vers HubSpot',
      details: error.message
    });
  }
}
