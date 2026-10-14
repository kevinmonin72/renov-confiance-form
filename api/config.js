/**
 * Handler Serverless Vercel : Gestion centralisée et persistante de la configuration HubSpot CRM
 * Permet à tout utilisateur avec le lien de renseigner le token HubSpot dans l'onglet Paramètres,
 * et le rend actif globalement pour TOUS les visiteurs et soumissions du site.
 */

const GITHUB_REPO = 'kevinmonin72/renov-confiance-form';
const VERCEL_PROJECT_ID = 'prj_g3SzCEIHLovMLncL9jCaEsqRqgS4';
const VERCEL_TEAM_ID = 'team_tEdtNqurt2A7UPnkWkr5e5Mt';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET : Récupérer le statut actuel de connexion HubSpot
  if (req.method === 'GET') {
    try {
      const config = await getStoredConfig();
      const activeToken = config.hubspotToken || process.env.HUBSPOT_ACCESS_TOKEN || null;

      if (!activeToken) {
        return res.status(200).json({
          connected: false,
          maskedToken: null,
          pipelineId: config.pipelineId || 'default',
          updatedAt: config.updatedAt || null,
          message: 'Aucun jeton HubSpot configuré. Le site fonctionne en mode simulation sécurisée.'
        });
      }

      // Test de validité auprès de HubSpot
      const testRes = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });

      if (!testRes.ok) {
        return res.status(200).json({
          connected: false,
          maskedToken: maskToken(activeToken),
          pipelineId: config.pipelineId || 'default',
          error: 'Le jeton enregistré a été révoqué ou a expiré auprès de HubSpot.',
          updatedAt: config.updatedAt
        });
      }

      const pipelinesData = await testRes.json();

      return res.status(200).json({
        connected: true,
        maskedToken: maskToken(activeToken),
        pipelineId: config.pipelineId || 'default',
        updatedAt: config.updatedAt,
        pipelinesCount: pipelinesData.results?.length || 0,
        pipelines: pipelinesData.results?.map(p => ({
          id: p.id,
          label: p.label,
          stagesCount: p.stages?.length || 0
        })),
        message: 'HubSpot CRM est connecté et actif pour tous les visiteurs du site.'
      });

    } catch (err) {
      return res.status(500).json({ error: 'Erreur lecture configuration', details: err.message });
    }
  }

  // POST : Enregistrer un nouveau token HubSpot pour TOUT le site
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { token, pipelineId = 'default', action = 'save' } = body || {};

      if (action === 'disconnect') {
        await savePersistentConfig({ hubspotToken: null, pipelineId: 'default' });
        return res.status(200).json({
          success: true,
          connected: false,
          message: 'Connexion HubSpot déconnectée. Le site repasse en mode simulation.'
        });
      }

      if (!token || typeof token !== 'string' || token.trim().length < 10) {
        return res.status(400).json({ error: 'Veuillez fournir un jeton Private App HubSpot valide (commençant par pat-).' });
      }

      const cleanToken = token.trim();

      // 1. Validation immédiate avec l'API HubSpot
      const verifyRes = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        return res.status(400).json({
          error: `Échec d'authentification HubSpot (${verifyRes.status}) : ${errData.message || 'Jeton invalide ou permissions insuffisantes'}.`,
          hint: 'Vérifiez que votre Private App possède bien les scopes crm.objects.contacts.read/write et crm.objects.deals.read/write.'
        });
      }

      const verifyData = await verifyRes.json();

      // 2. Sauvegarde persistante dans le dépôt GitHub pour que tout visiteur en bénéficie
      await savePersistentConfig({
        hubspotToken: cleanToken,
        pipelineId: pipelineId || 'default',
        updatedAt: new Date().toISOString()
      });

      // 3. Mise à jour de la variable d'environnement Vercel en arrière-plan
      updateVercelEnv(cleanToken).catch(e => console.warn('Erreur mise à jour Vercel Env:', e.message));

      return res.status(200).json({
        success: true,
        connected: true,
        maskedToken: maskToken(cleanToken),
        pipelineId: pipelineId || 'default',
        pipelinesCount: verifyData.results?.length || 0,
        pipelines: verifyData.results?.map(p => ({ id: p.id, label: p.label })),
        message: 'Jeton HubSpot validé avec succès et activé pour toutes les prochaines connexions au site !'
      });

    } catch (err) {
      console.error('Erreur sauvegarde config :', err);
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement', details: err.message });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée.' });
}

/**
 * Lit la configuration persistante depuis GitHub
 */
async function getStoredConfig() {
  const ghToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!ghToken) return { hubspotToken: null };

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/config.json?ref=main`, {
      headers: {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) return { hubspotToken: null };

    const data = await res.json();
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return JSON.parse(content);
  } catch (e) {
    console.warn('Erreur lecture config persistante GitHub:', e.message);
    return { hubspotToken: null };
  }
}

/**
 * Sauvegarde la configuration persistante dans GitHub via l'API
 */
async function savePersistentConfig(configObj) {
  const ghToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!ghToken) return;

  // 1. Récupérer le SHA du fichier existant
  let sha = null;
  try {
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/config.json?ref=main`, {
      headers: {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }
  } catch (e) {
    // Fichier peut ne pas exister
  }

  // 2. Mettre à jour le fichier
  const contentBase64 = Buffer.from(JSON.stringify(configObj, null, 2)).toString('base64');
  const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/config.json`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${ghToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'chore: update persistent HubSpot API configuration',
      content: contentBase64,
      sha: sha || undefined,
      branch: 'main'
    })
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(`GitHub API commit error: ${err.message || putRes.status}`);
  }
}

/**
 * Met à jour la variable d'environnement sur Vercel
 */
async function updateVercelEnv(tokenValue) {
  const vercelToken = process.env.VERCEL_TOKEN;
  if (!vercelToken) return;

  try {
    // Lister les variables existantes
    const listRes = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env?teamId=${VERCEL_TEAM_ID}`, {
      headers: { 'Authorization': `Bearer ${vercelToken}` }
    });
    
    if (listRes.ok) {
      const envsData = await listRes.json();
      const existing = envsData.envs?.find(e => e.key === 'HUBSPOT_ACCESS_TOKEN');

      if (existing) {
        // Mettre à jour
        await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env/${existing.id}?teamId=${VERCEL_TEAM_ID}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ value: tokenValue })
        });
        return;
      }
    }

    // Créer la variable si elle n'existait pas
    await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env?teamId=${VERCEL_TEAM_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: 'HUBSPOT_ACCESS_TOKEN',
        value: tokenValue,
        type: 'encrypted',
        target: ['production', 'preview', 'development']
      })
    });
  } catch (err) {
    console.warn('Vercel env update failed:', err.message);
  }
}

function maskToken(token) {
  if (!token || token.length < 12) return '******';
  return token.slice(0, 8) + '...' + token.slice(-4);
}
