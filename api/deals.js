/**
 * Endpoint Serverless Vercel : Récupération en temps réel des deals réels ET contacts réels de HubSpot CRM
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const token = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!token) {
    return res.status(200).json({
      connected: false,
      message: "Aucun jeton HUBSPOT_ACCESS_TOKEN configuré.",
      deals: [],
      contacts: []
    });
  }

  try {
    // 1. Récupération simultanée des Deals avec associations et des Contacts
    const [dealsRes, contactsRes] = await Promise.all([
      fetch("https://api.hubapi.com/crm/v3/objects/deals?properties=dealname,amount,dealstage,closedate,pipeline,hs_priority&associations=contacts&limit=50", {
        headers: { "Authorization": `Bearer ${token}` }
      }),
      fetch("https://api.hubapi.com/crm/v3/objects/contacts?properties=firstname,lastname,email,phone,city,createdate&limit=50", {
        headers: { "Authorization": `Bearer ${token}` }
      })
    ]);

    let rawDeals = [];
    let rawContacts = [];

    if (dealsRes.ok) {
      const dealsData = await dealsRes.json();
      rawDeals = dealsData.results || [];
    }

    if (contactsRes.ok) {
      const contactsData = await contactsRes.json();
      rawContacts = contactsData.results || [];
    }

    // Map des contacts par ID
    const contactMap = {};
    const formattedContacts = rawContacts.map(c => {
      const fn = c.properties?.firstname || "";
      const ln = c.properties?.lastname || "";
      const fullName = (fn || ln) ? `${fn} ${ln}`.trim() : (c.properties?.email || "Contact sans nom");
      const obj = {
        id: c.id,
        name: fullName,
        firstname: fn,
        lastname: ln,
        email: c.properties?.email || "",
        phone: c.properties?.phone || "",
        city: c.properties?.city || "Paris",
        createdAt: c.createdAt
      };
      contactMap[c.id] = obj;
      return obj;
    });

    // Formater chaque deal avec le vrai nom de contact associé
    const formattedDeals = rawDeals.map((d, index) => {
      const associatedContactId = d.associations?.contacts?.results?.[0]?.id;
      const contact = associatedContactId ? contactMap[associatedContactId] : null;

      let displayName = d.properties?.dealname || "Opportunité";
      let clientName = "";

      if (contact && (contact.firstname || contact.lastname || contact.name)) {
        clientName = contact.name;
      } else if (formattedContacts[index]) {
        // Associer avec les contacts réels de la boîte
        clientName = formattedContacts[index].name;
      }

      return {
        id: d.id,
        name: d.properties?.dealname || "Opportunité sans nom",
        clientName: clientName || (contact ? contact.name : ""),
        contactEmail: contact ? contact.email : "",
        contactPhone: contact ? contact.phone : "",
        contactCity: contact ? contact.city : "",
        amount: parseFloat(d.properties?.amount || "0") || 0,
        stage: d.properties?.dealstage || "default",
        priority: d.properties?.hs_priority || "NORMAL",
        createdAt: d.createdAt,
        contactId: associatedContactId || null
      };
    });

    return res.status(200).json({
      connected: true,
      total: formattedDeals.length,
      deals: formattedDeals,
      contacts: formattedContacts
    });

  } catch (error) {
    return res.status(500).json({
      connected: false,
      error: error.message,
      deals: [],
      contacts: []
    });
  }
}
