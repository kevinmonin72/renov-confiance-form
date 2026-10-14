import fs from 'fs';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const tmpFile = '/tmp/archisimple_leads.json';
  if (fs.existsSync(tmpFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
      return res.status(200).json({
        total: data.length,
        status: 'online',
        leads: data
      });
    } catch (e) {
      return res.status(200).json({ total: 0, leads: [], error: e.message });
    }
  }

  return res.status(200).json({
    total: 0,
    status: 'online',
    leads: [],
    message: 'En attente de la première soumission de formulaire.'
  });
}
