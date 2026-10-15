/**
 * Moteur de calcul et simulation de devis ArchiSimple
 * Basé sur les barèmes de la plateforme SaaS et de la landing page.
 */

export function calculateRealQuote(leadData = {}) {
  const firstname = (leadData.firstname || 'Propriétaire').trim();
  const lastname = (leadData.lastname || '').trim();
  const email = (leadData.email || '').trim();
  const phone = (leadData.phone || '').trim();
  const postalCode = (leadData.postalCode || '75011').trim();
  const city = (leadData.city || 'Paris').trim();
  const propertyType = leadData.propertyType || 'Appartement';
  const occupancyStatus = leadData.occupancyStatus || 'loue';
  const dpeRating = (leadData.dpeRating || 'G').toUpperCase();
  const surface = Math.max(15, parseInt(leadData.surface || '65', 10));
  const projectStageAnswer = leadData.projectStageAnswer || 'devis_recus';

  // 1. Prix au m² selon le DPE actuel
  const pricePerSqmMap = {
    G: 560, // Passoire G : rénovation thermique globale lourde
    F: 500, // Passoire F : rénovation intermédiaire
    E: 420, // Classe E : optimisation thermique & ventilation
    INCONNU: 500
  };
  const pricePerSqm = pricePerSqmMap[dpeRating] || 500;

  // 2. Budget travaux HT & TTC (TVA réduite 5,5% rénovation énergétique)
  const totalWorksHT = surface * pricePerSqm;
  const tvaAmount = Math.round(totalWorksHT * 0.055);
  const totalWorksTTC = totalWorksHT + tvaAmount;

  // 3. Subvention MaPrimeRénov' 2026 (Parcours Accompagné MAR - Saut de 2 à 3 classes DPE)
  // Prise en charge 60% à 70% plafonnée à 28 000 €
  const rateAides = dpeRating === 'G' ? 0.65 : (dpeRating === 'F' ? 0.60 : 0.50);
  const aidesAnah = Math.min(Math.round(totalWorksHT * rateAides), 28000);

  // 4. Primes CEE (Certificats d'Économies d'Énergie) complémentaires
  const primesCEE = Math.round(surface * 35);
  const totalSubventions = aidesAnah + primesCEE;

  // 5. Reste à Charge Net
  const resteACharge = Math.max(0, totalWorksTTC - totalSubventions);

  // 6. Super Déficit Foncier (Loi de Finances 2026)
  // Plafond doublé à 21 400 € / an pour sortie de passoire énergétique F ou G
  const isPassoire = dpeRating === 'G' || dpeRating === 'F';
  const maxDeficit = isPassoire ? 21400 : 10700;
  const deficitFoncier = Math.min(resteACharge, maxDeficit);
  const economieImpotEstimee = Math.round(deficitFoncier * 0.30); // Base TMI 30%

  // 7. Tiers Séquestre Bancaire ACPR & Commission 2%
  const commissionPlateforme2Pct = Math.round(totalWorksHT * 0.02);
  const montantSequestreBloque = totalWorksTTC;

  // 8. DPE Cible Garanti
  const targetDpe = dpeRating === 'G' ? 'C' : (dpeRating === 'F' ? 'C' : 'B');

  // 9. Économies d'énergie annuelles estimées
  const economieEnergieAnnuelle = Math.round(surface * 28);

  // 10. Architecte MAR référent selon la localisation
  let assignedArchitect = {
    name: "Thomas Roux",
    firm: "Atelier Roux & Associés",
    title: "Architecte DPLG · Agréé Mon Accompagnateur Rénov' (MAR)",
    matriculeOrdre: "75-40892",
    marApproval: "MAR-IDF-2026-084",
    phone: "01 42 68 55 10",
    city: city || "Paris"
  };

  if (/13|Marseille|Aix|Nice|PACA/i.test(city) || /^(13|06|83|84)/.test(postalCode)) {
    assignedArchitect = {
      name: "Olivier Duverdier",
      firm: "Atelier Méditerranée Architecture",
      title: "Architecte HMONP · Agréé Mon Accompagnateur Rénov' (MAR)",
      matriculeOrdre: "13-52014",
      marApproval: "MAR-PACA-2026-119",
      phone: "04 91 33 20 40",
      city: "Marseille"
    };
  } else if (/69|Lyon|Rhône/i.test(city) || /^69/.test(postalCode)) {
    assignedArchitect = {
      name: "Claire Delmas",
      firm: "Studio Lyon Rénovation Verte",
      title: "Architecte DPLG · Agréée MAR",
      matriculeOrdre: "69-31450",
      marApproval: "MAR-ARA-2026-067",
      phone: "04 78 40 12 80",
      city: "Lyon"
    };
  }

  // Identifiant unique du devis
  const quoteReference = `DEV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return {
    quoteReference,
    dateFormatted,
    client: {
      firstname,
      lastname,
      fullName: `${firstname} ${lastname}`.trim(),
      email,
      phone,
      postalCode,
      city,
      propertyType,
      occupancyStatus,
      occupancyStatusLabel: occupancyStatus === 'loue' ? 'Investissement Locatif (Bailleur)' : (occupancyStatus === 'residence_principale' ? 'Résidence Principale' : 'Vacant / Relocation'),
      dpeRating,
      surface
    },
    works: {
      dpeInitial: dpeRating,
      dpeTarget: targetDpe,
      pricePerSqm,
      totalWorksHT,
      tvaAmount,
      totalWorksTTC,
      aidesAnah,
      primesCEE,
      totalSubventions,
      resteACharge,
      deficitFoncier,
      economieImpotEstimee,
      economieEnergieAnnuelle,
      montantSequestreBloque,
      commissionPlateforme2Pct
    },
    architect: assignedArchitect,
    stages: [
      { step: "1", title: "Audit Énergétique Réglementaire & Cadrage MAR", delay: "J+7", status: "Inclus & Planifié" },
      { step: "2", title: "Dossier de Subventions Anah & Devis Artisans", delay: "J+15", status: "Pris en charge" },
      { step: "3", title: "Dépôt des Fonds sur Compte Séquestre ACPR", delay: "J+30", status: "Protection 100%" },
      { step: "4", title: "Livraison du Chantier & Attestation DPE C/D", delay: "J+90", status: "Paiement sur Résultat" }
    ]
  };
}
