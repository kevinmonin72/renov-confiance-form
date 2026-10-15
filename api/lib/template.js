/**
 * Générateur de template Email Devis ArchiSimple
 * Design propre, soft et élégant respectant la charte graphique ArchiSimple.
 */

export function generateQuoteEmail(quote) {
  const { client, works, architect, quoteReference, dateFormatted } = quote;

  const fmt = (num) => (num || 0).toLocaleString('fr-FR');

  const subject = `Votre estimation ArchiSimple - Devis ${quoteReference} (${client.city})`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F4F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#121212;line-height:1.5;">

  <!-- Conteneur Général Centré -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F4F0;padding:30px 15px;">
    <tr>
      <td align="center">

        <!-- Carte Email Principale -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background-color:#FFFFFF;border:1px solid #DFDBD3;border-radius:6px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
          
          <!-- En-tête de Marque ArchiSimple -->
          <tr>
            <td style="padding:28px 32px;background-color:#121212;color:#FFFFFF;border-bottom:3px solid #E60023;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size:20px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#FFFFFF;">
                      ARCHI<span style="font-weight:300;color:#EAE7E0;">SIMPLE</span>
                    </div>
                    <div style="font-size:9px;font-family:'Courier New',Courier,monospace;letter-spacing:0.18em;text-transform:uppercase;color:#A8A49C;margin-top:4px;">
                      TIERS DE CONFIANCE DE LA RÉNOVATION · AGRÉÉ ACPR
                    </div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#FFFFFF;background-color:#262523;border:1px solid #3D3B37;padding:5px 9px;border-radius:3px;">
                      RÉF. ${quoteReference}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td style="padding:32px 32px 24px 32px;">

              <!-- Salutation Personnalisée -->
              <h1 style="font-size:22px;font-weight:800;color:#121212;margin:0 0 14px 0;letter-spacing:-0.02em;">
                Bonjour ${client.firstname || 'Madame, Monsieur'},
              </h1>
              
              <p style="font-size:14px;color:#4A4843;margin:0 0 20px 0;line-height:1.6;">
                Nous avons bien reçu votre demande d'estimation pour votre <strong>${client.propertyType.toLowerCase()} de ${client.surface} m²</strong> situé à <strong>${client.city}</strong> (${client.postalCode}).
              </p>

              <p style="font-size:14px;color:#4A4843;margin:0 0 24px 0;line-height:1.6;">
                Grâce au simulateur technique <strong>ArchiSimple</strong> et aux barèmes <strong>MaPrimeRénov' 2026</strong>, voici l'évaluation chiffrée de votre projet pour sortir votre logement du statut de passoire thermique avec garantie de résultat.
              </p>

              <!-- Carte Récapitulatif du Bien -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8F7F4;border:1px solid #E5E0D8;border-radius:4px;margin-bottom:26px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;color:#E60023;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">
                      CARACTÉRISTIQUES DU PROJET
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" style="font-size:12px;color:#636058;padding:4px 0;">
                          Type de bien : <strong style="color:#121212;">${client.propertyType}</strong>
                        </td>
                        <td width="50%" style="font-size:12px;color:#636058;padding:4px 0;">
                          Surface : <strong style="color:#121212;">${client.surface} m²</strong>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="font-size:12px;color:#636058;padding:4px 0;">
                          Localisation : <strong style="color:#121212;">${client.city} (${client.postalCode})</strong>
                        </td>
                        <td width="50%" style="font-size:12px;color:#636058;padding:4px 0;">
                          Statut : <strong style="color:#121212;">${client.occupancyStatusLabel}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="font-size:12px;color:#636058;padding:6px 0 2px 0;">
                          Diagnostic énergétique : 
                          <span style="display:inline-block;padding:2px 8px;background-color:#E60023;color:#FFFFFF;font-weight:800;border-radius:2px;font-family:'Courier New',Courier,monospace;font-size:11px;">
                            DPE ${works.dpeInitial}
                          </span>
                          <span style="margin:0 6px;color:#121212;font-weight:700;">➔</span>
                          <span style="display:inline-block;padding:2px 8px;background-color:#0F8A3C;color:#FFFFFF;font-weight:800;border-radius:2px;font-family:'Courier New',Courier,monospace;font-size:11px;">
                            DPE ${works.dpeTarget} GARANTI
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Tableau du Devis Chiffré -->
              <div style="font-size:15px;font-weight:800;color:#121212;margin-bottom:12px;letter-spacing:-0.01em;">
                Synthèse Financière & Estimation des Aides
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #DFDBD3;border-radius:4px;border-collapse:collapse;margin-bottom:24px;">
                <tr style="background-color:#F5F4F0;border-bottom:1px solid #DFDBD3;">
                  <th align="left" style="padding:10px 14px;font-family:'Courier New',Courier,monospace;font-size:11px;color:#6B6760;text-transform:uppercase;">Poste de Rénovation</th>
                  <th align="right" style="padding:10px 14px;font-family:'Courier New',Courier,monospace;font-size:11px;color:#6B6760;text-transform:uppercase;">Montant Estimé</th>
                </tr>

                <tr style="border-bottom:1px solid #EBE7DF;">
                  <td style="padding:12px 14px;font-size:13px;color:#121212;">
                    <strong>Travaux de Rénovation Globale</strong><br>
                    <span style="font-size:11px;color:#78746C;">Isolation thermique, pompe à chaleur, menuiseries &amp; ventilation</span>
                  </td>
                  <td align="right" style="padding:12px 14px;font-size:13px;font-weight:700;font-family:'Courier New',Courier,monospace;color:#121212;">
                    ${fmt(works.totalWorksHT)} € HT<br>
                    <span style="font-size:10px;font-weight:normal;color:#78746C;">(${fmt(works.totalWorksTTC)} € TTC à 5,5%)</span>
                  </td>
                </tr>

                <tr style="border-bottom:1px solid #EBE7DF;background-color:#F9FBF9;">
                  <td style="padding:12px 14px;font-size:13px;color:#0F8A3C;">
                    <strong>Subvention MaPrimeRénov' 2026</strong><br>
                    <span style="font-size:11px;color:#2E693C;">Parcours Accompagné MAR (Prise en charge Anah)</span>
                  </td>
                  <td align="right" style="padding:12px 14px;font-size:14px;font-weight:800;font-family:'Courier New',Courier,monospace;color:#0F8A3C;">
                    - ${fmt(works.aidesAnah)} €
                  </td>
                </tr>

                <tr style="border-bottom:1px solid #EBE7DF;background-color:#F9FBF9;">
                  <td style="padding:10px 14px;font-size:13px;color:#0F8A3C;">
                    <strong>Primes Énergie CEE Complémentaires</strong><br>
                    <span style="font-size:11px;color:#2E693C;">Certificats d'économies d'énergie cumulables</span>
                  </td>
                  <td align="right" style="padding:10px 14px;font-size:13px;font-weight:700;font-family:'Courier New',Courier,monospace;color:#0F8A3C;">
                    - ${fmt(works.primesCEE)} €
                  </td>
                </tr>

                <tr style="background-color:#FFFFFF;border-top:2px solid #121212;">
                  <td style="padding:14px;font-size:14px;font-weight:900;color:#121212;text-transform:uppercase;">
                    Reste à Charge Net Propriétaire
                  </td>
                  <td align="right" style="padding:14px;font-size:18px;font-weight:900;font-family:'Courier New',Courier,monospace;color:#E60023;">
                    ${fmt(works.resteACharge)} € TTC
                  </td>
                </tr>
              </table>

              <!-- Bloc Avantage Fiscal & Déficit Foncier -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F8FA;border-left:4px solid #006699;border-top:1px solid #CBD6E2;border-right:1px solid #CBD6E2;border-bottom:1px solid #CBD6E2;padding:12px 16px;margin-bottom:24px;border-radius:0 4px 4px 0;">
                <tr>
                  <td>
                    <div style="font-size:12px;font-weight:800;color:#004466;margin-bottom:4px;text-transform:uppercase;font-family:'Courier New',Courier,monospace;">
                      ★ OPTIMISATION FISCALE : SUPER DÉFICIT FONCIER 2026
                    </div>
                    <div style="font-size:12px;color:#334E68;line-height:1.5;">
                      En rénovant une passoire énergétique (DPE ${works.dpeInitial}), la Loi de Finances vous autorise à déduire jusqu'à <strong>${fmt(works.deficitFoncier)} €</strong> de votre revenu global, soit un gain d'impôt direct estimé à environ <strong>${fmt(works.economieImpotEstimee)} €</strong> (selon votre tranche d'imposition).
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Tiers Séquestre & Sécurisation ACPR -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFF9F2;border:1px solid #F0D9BC;padding:14px 18px;margin-bottom:26px;border-radius:4px;">
                <tr>
                  <td style="vertical-align:top;padding-right:12px;">
                    <div style="width:24px;height:24px;background-color:#E60023;color:#FFFFFF;border-radius:50%;text-align:center;line-height:24px;font-weight:900;font-size:13px;">✓</div>
                  </td>
                  <td>
                    <div style="font-size:13px;font-weight:800;color:#873800;margin-bottom:3px;">
                      Sécurisation Totale par Tiers Séquestre (Agréé ACPR)
                    </div>
                    <div style="font-size:12px;color:#594433;line-height:1.5;">
                      Vos fonds ne sont <strong>jamais versés directement aux artisans</strong> à l'aveugle. Ils restent consignés sur un compte séquestre dédié et sont débloqués par jalons uniquement après validation par l'architecte MAR et <strong>remise du DPE certifié Classe ${works.dpeTarget}</strong>.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Architecte MAR Référent Assigné -->
              <div style="font-size:14px;font-weight:800;color:#121212;margin-bottom:10px;">
                Votre Architecte MAR Référent
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8F7F4;border:1px solid #E5E0D8;border-radius:4px;padding:14px 18px;margin-bottom:28px;">
                <tr>
                  <td>
                    <div style="font-size:14px;font-weight:800;color:#121212;">${architect.name}</div>
                    <div style="font-size:12px;color:#4A4843;margin-top:2px;">${architect.firm} · ${architect.title}</div>
                    <div style="font-size:11px;font-family:'Courier New',Courier,monospace;color:#78746C;margin-top:4px;">
                      Ordre des Architectes : N° ${architect.matriculeOrdre} · Agrément Anah : ${architect.marApproval}
                    </div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="tel:${architect.phone}" style="display:inline-block;padding:7px 12px;background-color:#FFFFFF;border:1px solid #121212;color:#121212;font-size:11px;font-family:'Courier New',Courier,monospace;font-weight:700;text-decoration:none;border-radius:3px;">
                      ${architect.phone}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Bouton d'Action Principal (CTA) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px;">
                <tr>
                  <td align="center">
                    <a href="https://archisimple-saas.vercel.app/app?devis=${quoteReference}&email=${encodeURIComponent(client.email)}" target="_blank" style="display:inline-block;padding:14px 28px;background-color:#E60023;color:#FFFFFF;font-size:14px;font-weight:800;text-decoration:none;border-radius:4px;text-transform:uppercase;letter-spacing:0.04em;box-shadow:0 2px 8px rgba(230,0,35,0.25);">
                      Valider mon rendez-vous de cadrage ➔
                    </a>
                    <div style="font-size:11px;color:#8F8B82;margin-top:8px;">
                      Échange de 15 minutes sans engagement avec votre architecte MAR
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Signature & Mentions -->
              <p style="font-size:13px;color:#4A4843;margin:0 0 4px 0;">
                Bien cordialement,
              </p>
              <p style="font-size:13px;font-weight:800;color:#121212;margin:0;">
                L'équipe ArchiSimple &amp; Vos Architectes Partenaires
              </p>

            </td>
          </tr>

          <!-- Pied de Page Email -->
          <tr>
            <td style="padding:20px 32px;background-color:#F5F4F0;border-top:1px solid #E5E0D8;font-size:11px;color:#8F8B82;text-align:center;line-height:1.6;">
              <strong>ArchiSimple</strong> · Plateforme de rénovation énergétique sous tiers de confiance &amp; séquestre bancaire.<br>
              Paris · Lyon · Marseille · Tél. : 01 80 90 20 26 · archisimple13@gmail.com<br>
              <span style="font-size:10px;color:#ABA79F;">Ce message automatique vous est envoyé suite à votre demande de devis sur notre formulaire.</span>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = `ARCHISIMPLE — TIERS DE CONFIANCE DE LA RÉNOVATION
Réf. Devis : ${quoteReference} — Date : ${dateFormatted}

Bonjour ${client.firstname || 'Madame, Monsieur'},

Nous avons bien reçu votre demande d'estimation pour votre ${client.propertyType.toLowerCase()} de ${client.surface} m² situé à ${client.city} (${client.postalCode}).

Voici la synthèse de votre devis estimé par le moteur ArchiSimple :

1. TRAVAUX ESTIMÉS :
- Montant Travaux Rénovation Globale : ${fmt(works.totalWorksHT)} € HT (${fmt(works.totalWorksTTC)} € TTC)
- Diagnostic : Saut DPE ${works.dpeInitial} ➔ DPE ${works.dpeTarget} Garanti

2. SUBVENTIONS & AIDES PUBLIQUES 2026 :
- Subvention MaPrimeRénov' (Parcours Accompagné MAR) : - ${fmt(works.aidesAnah)} €
- Primes CEE complémentaires : - ${fmt(works.primesCEE)} €
- Total des Aides publiques : - ${fmt(works.totalSubventions)} €

3. RESTE À CHARGE NET :
- ${fmt(works.resteACharge)} € TTC

4. AVANTAGE FISCAL (LOI DE FINANCES 2026) :
- Super Déficit Foncier déductible : jusqu'à ${fmt(works.deficitFoncier)} € / an
- Économie d'impôt estimée : ~ ${fmt(works.economieImpotEstimee)} €

5. SÉCURISATION TIERS SÉQUESTRE ACPR :
Fonds bloqués sur compte séquestre dédié. 0 € d'avance versée aux artisans sans validation d'étape par l'architecte MAR.

ARCHITECTE MAR ASSIGNÉ :
${architect.name} (${architect.firm})
Agrément MAR France Rénov' : ${architect.marApproval}
Téléphone : ${architect.phone}

Pour valider votre rendez-vous de cadrage de 15 minutes gratuit :
https://archisimple-saas.vercel.app/app?devis=${quoteReference}&email=${encodeURIComponent(client.email)}

Bien cordialement,
L'équipe ArchiSimple
contact@archisimple.fr · 01 80 90 20 26
`;

  return { subject, html, text };
}
