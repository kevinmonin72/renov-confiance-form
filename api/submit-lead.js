/**
 * Handler Serverless Vercel : Synchronisation HubSpot CRM v3
 * Crée ou met à jour le Contact, crée le Deal dans le bon stade du pipeline commercial
 * calculé intelligemment sans poser de question explicite de vente à l'utilisateur.
 */

export default async function handler(req, res) {
  // Gestion CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    const {
      firstname = '',
      lastname = '',
      email = '',
      phone = '',
      postalCode = '',
      city = '',
      propertyType = 'Appartement',
      occupancyStatus = 'loue',
      dpeRating = 'G',
      surface = '',
      projectStageAnswer = 'devis_recus',
      timeframe = '1_3_mois',
      budget = '25000_50000',
      tokenOverride = null
    } = payload || {};

    if (!email) {
      return res.status(400).json({ error: 'L\'adresse email est obligatoire.' });
    }

    // 1. Détection intelligente de l'étape du pipeline commercial (SANS question explicite)
    const pipelineData = computeStealthPipelineStage({
      projectStageAnswer,
      timeframe,
      occupancyStatus,
      dpeRating,
      budget,
      surface
    });

    // Récupération du token HubSpot (priorité : override UI > env Vercel > config persistante GitHub)
    const { token: hubspotToken, pipelineId } = await getActiveHubspotConfig(tokenOverride);

    // 2. Si aucun token HubSpot n'est configuré : Mode Simulation Transparent
    if (!hubspotToken) {
      console.log('⚠️ [HubSpot Mode Démo] Aucun token HubSpot configuré. Simulation réussie.');
      
      return res.status(200).json({
        success: true,
        simulated: true,
        notice: 'Mode simulation actif (configurez HUBSPOT_ACCESS_TOKEN dans Vercel pour envoyer en direct vers votre compte HubSpot).',
        contact: {
          id: `sim_contact_${Math.floor(100000 + Math.random() * 900000)}`,
          email,
          firstname,
          lastname,
          phone,
          leadStatus: pipelineData.leadStatus
        },
        deal: {
          id: `sim_deal_${Math.floor(100000 + Math.random() * 900000)}`,
          name: pipelineData.dealName,
          stage: pipelineData.dealStage,
          stageLabel: pipelineData.stageLabel,
          pipeline: pipelineId,
          amount: pipelineData.amount,
          priority: pipelineData.priority,
          urgency: pipelineData.urgencyLabel
        },
        stealthDetection: {
          reponseProjet: projectStageAnswer,
          etapeCommercialeDetectee: pipelineData.stageLabel,
          justification: pipelineData.justification,
          prioriteCommerciale: pipelineData.priority
        }
      });
    }

    // 3. Appel réel à l'API HubSpot v3 CRM (Support Private App Bearer & hapikey)
    const isPrivateApp = hubspotToken.startsWith('pat-');
    const hubspotHeaders = {
      'Content-Type': 'application/json',
      ...(isPrivateApp ? { 'Authorization': `Bearer ${hubspotToken}` } : {})
    };

    function hubspotUrl(path) {
      if (isPrivateApp) return `https://api.hubapi.com${path}`;
      const sep = path.includes('?') ? '&' : '?';
      return `https://api.hubapi.com${path}${sep}hapikey=${encodeURIComponent(hubspotToken)}`;
    }

    // A. Recherche ou Création du Contact
    let contactId = null;
    const contactProperties = {
      email: email.trim().toLowerCase(),
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      phone: phone.trim(),
      city: city.trim(),
      zip: postalCode.trim(),
      hs_lead_status: pipelineData.leadStatus,
      message: `[Rénov.Confiance] Projet: ${propertyType} (${surface ? surface + 'm²' : 'N/C'}) - DPE: ${dpeRating} - Étape déduite: ${pipelineData.stageLabel}`
    };

    const createContactRes = await fetch(hubspotUrl('/crm/v3/objects/contacts'), {
      method: 'POST',
      headers: hubspotHeaders,
      body: JSON.stringify({ properties: contactProperties })
    });

    if (createContactRes.ok) {
      const contactData = await createContactRes.json();
      contactId = contactData.id;
    } else {
      const errJson = await createContactRes.json().catch(() => ({}));
      
      // Si le contact existe déjà (HTTP 409 Conflict)
      if (createContactRes.status === 409 || errJson.category === 'CONFLICT') {
        const existingIdMatch = errJson.message && errJson.message.match(/Existing ID: (\d+)/);
        if (existingIdMatch && existingIdMatch[1]) {
          contactId = existingIdMatch[1];
        } else {
          // Recherche par email
          const searchRes = await fetch(hubspotUrl('/crm/v3/objects/contacts/search'), {
            method: 'POST',
            headers: hubspotHeaders,
            body: JSON.stringify({
              filterGroups: [{
                filters: [{
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email.trim().toLowerCase()
                }]
              }]
            })
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.results && searchData.results.length > 0) {
              contactId = searchData.results[0].id;
            }
          }
        }

        // Mise à jour du contact existant
        if (contactId) {
          await fetch(hubspotUrl(`/crm/v3/objects/contacts/${contactId}`), {
            method: 'PATCH',
            headers: hubspotHeaders,
            body: JSON.stringify({ properties: contactProperties })
          });
        }
      } else {
        throw new Error(`Erreur création contact HubSpot (${createContactRes.status}): ${errJson.message || 'Détail indisponible'}`);
      }
    }

    if (!contactId) {
      throw new Error('Impossible de récupérer l\'ID du contact HubSpot.');
    }

    // B. Création du Deal (Transaction) dans HubSpot avec le bon DealStage
    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + (pipelineData.daysToClose || 30));

    const dealDescription = [
      `=== DOSSIER PROJET RÉNOV.CONFIANCE ===`,
      `• Type de bien : ${propertyType} (${surface ? surface + ' m²' : 'Surface non précisée'})`,
      `• Localisation : ${postalCode} ${city}`,
      `• Classe DPE actuelle : ${dpeRating}`,
      `• Statut d'occupation : ${formatOccupancy(occupancyStatus)}`,
      `• Avancement chantier : ${formatProjectAnswer(projectStageAnswer)}`,
      `• Délai de démarrage : ${pipelineData.urgencyLabel}`,
      `• Budget estimé : ${pipelineData.amount.toLocaleString('fr-FR')} €`,
      `---------------------------------------`,
      `Étape Commerciale Déduite : ${pipelineData.stageLabel}`,
      `Priorité Commerciale : ${pipelineData.priority}`,
      `Séquestre bancaire ACPR : REQUIS & VALORISÉ`
    ].join('\n');

    const dealProperties = {
      dealname: pipelineData.dealName,
      pipeline: pipelineId,
      dealstage: pipelineData.dealStage,
      amount: String(pipelineData.amount),
      closedate: closeDate.toISOString(),
      description: dealDescription
    };

    const createDealRes = await fetch(hubspotUrl('/crm/v3/objects/deals'), {
      method: 'POST',
      headers: hubspotHeaders,
      body: JSON.stringify({ properties: dealProperties })
    });

    let dealId = null;
    if (createDealRes.ok) {
      const dealData = await createDealRes.json();
      dealId = dealData.id;
    } else {
      const dealErr = await createDealRes.json().catch(() => ({}));
      console.warn('⚠️ Erreur création Deal HubSpot :', dealErr);
      // Fallback : si le dealstage custom est rejeté, réessayer avec 'appointmentscheduled' standard
      if (dealErr.message && dealErr.message.includes('dealstage')) {
        dealProperties.dealstage = 'appointmentscheduled';
        const retryRes = await fetch(hubspotUrl('/crm/v3/objects/deals'), {
          method: 'POST',
          headers: hubspotHeaders,
          body: JSON.stringify({ properties: dealProperties })
        });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          dealId = retryData.id;
        }
      }
    }

    // C. Association Deal -> Contact dans HubSpot
    if (dealId && contactId) {
      await fetch(hubspotUrl(`/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`), {
        method: 'PUT',
        headers: hubspotHeaders
      }).catch(err => console.warn('Erreur association deal-contact:', err));

      // D. Création d'une Note / Timeline liée au contact et au deal
      await fetch(hubspotUrl('/crm/v3/objects/notes'), {
        method: 'POST',
        headers: hubspotHeaders,
        body: JSON.stringify({
          properties: {
            hs_timestamp: new Date().toISOString(),
            hs_note_body: dealDescription
          },
          associations: [
            {
              to: { id: contactId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] // note_to_contact
            },
            {
              to: { id: dealId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }] // note_to_deal
            }
          ]
        })
      }).catch(err => console.warn('Erreur création note timeline:', err));
    }

    return res.status(200).json({
      success: true,
      simulated: false,
      contactId,
      dealId,
      pipelineStage: pipelineData.stageLabel,
      hubspotDealStage: pipelineData.dealStage,
      leadStatus: pipelineData.leadStatus,
      amount: pipelineData.amount,
      priority: pipelineData.priority,
      message: 'Client et opportunité créés avec succès dans HubSpot CRM !'
    });

  } catch (error) {
    console.error('Erreur API HubSpot :', error);
    return res.status(500).json({
      error: 'Erreur interne lors de la synchronisation avec HubSpot.',
      details: error.message
    });
  }
}

/**
 * MAPPING INTELLIGENT DE L'ÉTAPE DU PIPELINE
 * Déduit l'avancement exact dans le tunnel de vente sans question technique explicite
 */
function computeStealthPipelineStage({ projectStageAnswer, timeframe, occupancyStatus, dpeRating, budget, surface }) {
  let dealStage = 'appointmentscheduled'; // Étape 1 par défaut dans HubSpot
  let leadStatus = 'OPEN';
  let stageLabel = 'Découverte & Diagnostic DPE';
  let priority = 'MEDIUM';
  let justification = '';
  let daysToClose = 30;

  // Calcul du montant prévisionnel du deal
  let amount = 38000;
  if (budget === 'moins_25000') amount = 20000;
  else if (budget === '25000_50000') amount = 38000;
  else if (budget === '50000_80000') amount = 65000;
  else if (budget === 'plus_80000') amount = 95000;
  else if (surface && !isNaN(surface)) {
    amount = Math.max(25000, Math.round(Number(surface) * 850));
  }

  // Analyse subtile de la réponse utilisateur
  switch (projectStageAnswer) {
    case 'devis_recus':
      // Le client a déjà des devis d'artisans en main -> Forte intention, point de friction = peur des arnaques/séquestre
      dealStage = 'qualifiedtobuy'; // Étape 2 : Qualifié / Devis à valider
      leadStatus = 'IN_PROGRESS';
      stageLabel = 'Devis Artisans Reçus — Besoin Tiers Séquestre & Audit';
      priority = 'HIGH';
      daysToClose = 20;
      justification = 'Le prospect a déjà démarché des artisans. Phase critique de réassurance : il recherche un tiers de confiance avec séquestre ACPR pour valider les prix et sécuriser son acompte.';
      break;

    case 'pret_a_demarrer':
      // Budget validé, décision prise -> Phase de closing immédiate
      dealStage = 'decisionmakerboughtin'; // Étape 4/5 : Prêt à signer / Lancement
      leadStatus = 'HOT';
      stageLabel = 'Projet Financé — Cadrage Architecte & Lancement';
      priority = 'VERY_HIGH';
      daysToClose = 14;
      justification = 'Financement acquis et volonté de démarrer au plus vite. Attribution prioritaire d\'un architecte sous 24h pour validation du cahier des charges.';
      break;

    case 'deficit_foncier':
      // Investisseur patrimonial à forte fiscalité (TMI 30-45%)
      dealStage = 'qualifiedtobuy';
      leadStatus = 'QUALIFIED_PATRIMONIAL';
      stageLabel = 'Investisseur Patrimonial — Déficit Foncier 21 400 €';
      priority = 'HIGH';
      daysToClose = 25;
      justification = 'Projet d\'optimisation fiscale (Loi Finances 2026/2027). Nécessite liasse fiscale 2044 et encadrement architecte.';
      break;

    case 'decouverte':
    default:
      // Découverte / sensibilisation réglementaire DPE
      if (timeframe === 'immediat' || occupancyStatus === 'vacant') {
        dealStage = 'appointmentscheduled';
        leadStatus = 'OPEN_URGENT';
        stageLabel = 'Passoire Vacante — Urgence Relocation & Aides';
        priority = 'HIGH';
        daysToClose = 21;
        justification = 'Le bien est vacant ou le départ est imminent. Urgence légale de rénover pour éviter la vacance locative prolongée.';
      } else {
        dealStage = 'appointmentscheduled';
        leadStatus = 'OPEN';
        stageLabel = 'Sensibilisation DPE & Montage des Aides';
        priority = (timeframe === '1_3_mois') ? 'MEDIUM' : 'NORMAL';
        daysToClose = 45;
        justification = 'Prospect au stade de réflexion réglementaire. Accompagnement pédagogique sur le reste à charge et le calendrier légal.';
      }
      break;
  }

  // Nom dynamique du Deal
  const dealName = `[Rénov] ${dpeRating ? 'DPE ' + dpeRating : 'Passoire'} · ${surface ? surface + 'm²' : 'Logement'} · ${stageLabel.split('—')[0].trim()}`;

  // Libellé délai
  const timeframeLabels = {
    'immediat': 'Moins de 30 jours (Urgent)',
    '1_3_mois': '1 à 3 mois (Court terme)',
    '3_6_mois': '3 à 6 mois (Moyen terme)',
    'veille': 'Veille & anticipation'
  };

  return {
    dealStage,
    leadStatus,
    stageLabel,
    priority,
    justification,
    amount,
    dealName,
    daysToClose,
    urgencyLabel: timeframeLabels[timeframe] || 'Non précisé'
  };
}

function formatOccupancy(status) {
  const map = {
    'loue': 'Actuellement loué (Bailleur)',
    'vacant': 'Logement vacant / Départ locataire imminent',
    'compromis': 'En cours d\'acquisition / Signature compromis',
    'occupant': 'Résidence principale ou projet familial'
  };
  return map[status] || status;
}

function formatProjectAnswer(ans) {
  const map = {
    'devis_recus': 'A déjà des devis d\'artisans mais craint les litiges/malfaçons (Besoin Séquestre)',
    'pret_a_demarrer': 'Projet et budget validés, prêt à démarrer sous mandat d\'architecte',
    'deficit_foncier': 'Arbitrage patrimonial Déficit Foncier 21 400 € / an',
    'decouverte': 'Sensibilisation DPE et calcul préliminaire des aides'
  };
  return map[ans] || ans;
}

/**
 * Récupère le token actif (Override > Env Vercel > Config persistante GitHub)
 */
async function getActiveHubspotConfig(tokenOverride) {
  if (tokenOverride && tokenOverride.trim().length > 10) {
    return { token: tokenOverride.trim(), pipelineId: process.env.HUBSPOT_PIPELINE_ID || 'default' };
  }

  if (process.env.HUBSPOT_ACCESS_TOKEN && process.env.HUBSPOT_ACCESS_TOKEN.trim().length > 10) {
    return { token: process.env.HUBSPOT_ACCESS_TOKEN.trim(), pipelineId: process.env.HUBSPOT_PIPELINE_ID || 'default' };
  }

  // Lecture depuis le store persistant GitHub
  const ghToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (ghToken) {
    try {
      const res = await fetch('https://api.github.com/repos/kevinmonin72/renov-confiance-form/contents/data/config.json?ref=main', {
        headers: {
          'Authorization': `token ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        const parsed = JSON.parse(content);
        if (parsed.hubspotToken) {
          return { token: parsed.hubspotToken, pipelineId: parsed.pipelineId || 'default' };
        }
      }
    } catch (e) {
      console.warn('Erreur lecture config persistante dans submit-lead:', e.message);
    }
  }

  return { token: null, pipelineId: 'default' };
}

