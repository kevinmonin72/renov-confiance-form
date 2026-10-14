# 🏢 Rénov.Confiance — Formulaire d'Acquisition Interactif (Style Tally) & Synchronisation HubSpot CRM

Interface d'acquisition de projets et de qualification de leads pour **Rénov Tiers de Confiance**, conçue selon l'expérience utilisateur épurée et immersive de **Tally / Typeform** et connectée directement à l'**API HubSpot CRM v3**.

---

## 🎯 Spécificité Clé : Détection Subtile du Pipeline Commercial

Dans ce formulaire, **aucune question commerciale ou technique de type CRM n'est posée explicitement au prospect** (pas de *"À quelle étape du pipeline êtes-vous ?"*).

L'étape exacte du cycle de vente dans **HubSpot Deals** est déduite intelligemment en coulisse à partir de la réponse formulée par le bailleur à une question naturelle sur la réalité de son chantier :

> **Question naturelle posée :**  
> *« Où en êtes-vous dans vos démarches travaux aujourd'hui ? »*

| Réponse Choisi par l'Utilisateur | Étape Déduite dans HubSpot (Deal Stage) | Statut du Lead (hs_lead_status) | Priorité Commerciale | Action Automatisée dans HubSpot |
| :--- | :--- | :--- | :--- | :--- |
| **A. « Je me renseigne sur mes obligations et mes aides »** | `appointmentscheduled` *(Sensibilisation & Diagnostic)* | `OPEN` | Moyenne / Normale | Envoi du guide DPE 2026 et simulation MaPrimeRénov' |
| **B. « J'ai déjà des devis d'artisans, mais je crains les arnaques »** | `qualifiedtobuy` *(Devis Reçus — Besoin Séquestre ACPR)* | `IN_PROGRESS` | **Haute (Lead Chaud)** | Proposition immédiate d'audit de devis par un architecte + séquestre bancaire |
| **C. « Mon budget est calé, je veux lancer le chantier au plus vite »** | `decisionmakerboughtin` *(Chantier Prêt — Cadrage Architecte)* | `HOT` | **Très Haute (Chaud)** | Rappel téléphonique sous 24h et attribution architecte de secteur |
| **D. « J'optimise ma fiscalité via le Déficit Foncier (21 400 €) »** | `qualifiedtobuy` *(Investisseur Patrimonial)* | `QUALIFIED_PATRIMONIAL` | **Haute** | Transmission matrice Excel fiscale & liasse conforme Déclaration 2044 |

---

## 🎨 Direction Artistique & Expérience Utilisateur (UX)

- **Identité Rénov.Confiance :** Typographies *Plus Jakarta Sans* et *Inter*, accents carmin/rouge pinot (`#E60023`), fonds ivoire doux et cartes contrastées.
- **Expérience Tally fluide :**
  - Barre de progression dynamique supérieure avec indicateur de pourcentage en direct.
  - Cartes de questions centrées et aérées, sans distractions visuelles.
  - **Raccourcis clavier universels :**
    - Touche `Entrée ↵` pour valider et passer à la question suivante.
    - Touches `A`, `B`, `C`, `D` ou `1`, `2`, `3`, `4` pour sélectionner instantanément une option avec micro-temporisation fluide.
- **Réassurance Tiers de Confiance :** Badges du séquestre bancaire agréé ACPR (Banque de France) et du réseau de l'Ordre des Architectes.

---

## ⚙️ Architecture Technique & API HubSpot CRM v3

L'application est architecturée avec des fonctions serverless Node.js sur **Vercel** pour garantir la sécurité absolue de votre clé d'API HubSpot (aucune clé exposée côté client) :

```
├── index.html                # Interface Tally interactive (HTML / Tailwind / JS)
├── api/
│   ├── submit-lead.js        # Handler Serverless Vercel (Création Contact, Deal & Note)
│   └── test-hubspot.js       # Endpoint diagnostic & test de connexion Private App
├── vercel.json               # Configuration du routage et des en-têtes CORS
├── .env.example              # Gabarit des variables d'environnement
└── package.json              # Métadonnées du projet
```

### Données transmises et synchronisées dans HubSpot :

1. **Objet Contact (`/crm/v3/objects/contacts`) :**
   - Nom, prénom, email, téléphone portable.
   - Ville et code postal du bien immobilier.
   - Statut du lead (`hs_lead_status`).
   - Synthèse complète du projet dans la propriété `message`.

2. **Objet Deal / Transaction (`/crm/v3/objects/deals`) :**
   - `dealname` dynamique : `[Rénov] DPE G · 55m² · Devis Artisans Reçus`.
   - `dealstage` : calculé automatiquement selon la matrice de maturité.
   - `amount` : calculé selon la fourchette de budget (ex: 38 000 €).
   - `closedate` : date d'échéance estimée (de 14 à 45 jours selon le degré d'urgence).
   - `description` : fiche récapitulative complète avec surface, classe DPE et type de bien.

3. **Association & Note Chronologique :**
   - Association automatique du Deal au Contact (`deal_to_contact`).
   - Création d'une note horodatée sur la fiche contact pour lecture instantanée par les commerciaux.

---

## 🚀 Installation & Déploiement

### 1. Variables d'environnement sur Vercel

Dans votre tableau de bord **Vercel** (`Settings > Environment Variables`) :

| Variable | Description | Exemple |
| :--- | :--- | :--- |
| `HUBSPOT_ACCESS_TOKEN` | Jeton d'application privée HubSpot | `pat-eu1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `HUBSPOT_PIPELINE_ID` | *(Optionnel)* ID du pipeline de transactions | `default` |

> **Mode Simulation Intégré :** Si aucun token n'est configuré, le formulaire bascule automatiquement en mode démo sécurisée : le lead est simulé avec succès, la détection de pipeline est calculée et visualisable en direct sur l'écran final sans bloquer l'expérience utilisateur !

### 2. Déploiement en 1 clic sur Vercel

```bash
vercel deploy --prod
```

### 3. Test local

```bash
npx serve .
```

---

## 🔐 Comment créer votre Private App Token dans HubSpot ?

1. Rendez-vous dans votre compte **HubSpot** > **Paramètres (icône roue crantée)**.
2. Dans le menu de gauche, cliquez sur **Intégrations** > **Applications privées**.
3. Cliquez sur **Créer une application privée** (nommez-la *"Rénov.Confiance Form"*).
4. Dans l'onglet **Portées (Scopes)**, activez les droits suivants :
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
5. Cliquez sur **Créer l'application**, copiez le jeton commençant par `pat-...` et ajoutez-le dans Vercel !
