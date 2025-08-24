// src/main/notion.js
const fetch = require('node-fetch');
const Store = require('electron-store');
const keytar = require('keytar');

const store = new Store();
const SERVICE = 'Synk';
const NOTION_ACCOUNT = 'notion-integration';

async function connectNotion({ token }) {
  if (!token) return { ok: false, error: 'Missing token' };
  await keytar.setPassword(SERVICE, NOTION_ACCOUNT, token);
  store.set('notion.connected', true);
  return { ok: true };
}

async function getToken() {
  const token = await keytar.getPassword(SERVICE, NOTION_ACCOUNT);
  if (!token) throw new Error('Notion token not set');
  return token;
}

async function listDatabases() {
  const token = await getToken();
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filter: { value: 'database', property: 'object' } })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion list failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  const items = (json.results || []).map(d => ({
    id: d.id,
    title: (d.title && d.title[0] && d.title[0].plain_text) || (d.properties && Object.keys(d.properties)[0]) || d.id
  }));
  return items;
}

module.exports = { connectNotion, listDatabases };