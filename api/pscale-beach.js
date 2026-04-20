import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

const KV_KEY = 'pscale-beach-marks';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const marks = (await redis.get(KV_KEY)) || [];
    return res.status(200).json({
      version: 1,
      domain: 'happyseaurchin.com',
      marks
    });
  }

  if (req.method === 'POST') {
    const { agent_id, purpose, path = '/' } = req.body || {};

    if (!agent_id || !purpose) {
      return res.status(400).json({ error: 'agent_id and purpose are required' });
    }

    const marks = (await redis.get(KV_KEY)) || [];

    // Rate limit: one mark per agent per path per hour
    const oneHourAgo = Date.now() - 3600000;
    const duplicate = marks.find(
      m => m.agent_id === agent_id && m.path === path && new Date(m.timestamp).getTime() > oneHourAgo
    );
    if (duplicate) {
      return res.status(409).json({ error: 'Rate limited: one mark per agent per path per hour' });
    }

    const mark = {
      agent_id,
      purpose,
      path,
      timestamp: new Date().toISOString()
    };

    marks.unshift(mark);
    if (marks.length > 100) marks.length = 100;

    await redis.set(KV_KEY, marks);

    return res.status(201).json(mark);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
