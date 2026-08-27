/**
 * Fyndr P2 — 1 happy-path e2e (no per-function suites)
 * Run: npm test --prefix tests or node tests/e2e.test.js
 * Requires: mongod, node 5000, flask 5001 running (CI handles)
 */
const assert = require('assert');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API = process.env.API_URL || 'http://127.0.0.1:5000';
const ML = process.env.ML_URL || 'http://127.0.0.1:5001';

async function run() {
  console.log('[e2e] register');
  const email = `test_${Date.now()}@example.com`;
  let r = await axios.post(`${API}/register`, { name: 'Test', email, password: 'test123' });
  assert(r.data.message.includes('successful'));

  console.log('[e2e] login');
  r = await axios.post(`${API}/login`, { email, password: 'test123' });
  assert(r.data._id, 'login failed');
  const userId = r.data._id;

  console.log('[e2e] create event');
  r = await axios.post(`${API}/event`, { event_name: 'E2E Test', created_id: userId, pin: '123456' });
  assert(r.data._id);
  const eventId = r.data._id;

  console.log('[e2e] upload');
  const imgPath = path.join(__dirname, '../front-end/public/images/wedding.jpg');
  if (!fs.existsSync(imgPath)) {
    console.log('[e2e] skip upload, no image');
    return;
  }
  const fd = new FormData();
  fd.append('name', fs.createReadStream(imgPath));
  fd.append('event_id', eventId);
  fd.append('upload_by', userId);
  r = await axios.post(`${API}/photo`, fd, { headers: fd.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity });
  assert(Array.isArray(r.data) && r.data.length > 0);

  console.log('[e2e] metrics');
  r = await axios.get(`${API}/metrics`);
  assert(r.data.includes('fyndr_http_requests_total'));

  console.log('[e2e] queue stats');
  r = await axios.get(`${API}/queue/stats?event_id=${eventId}`);
  assert(typeof r.data.done === 'number');

  console.log('[e2e] faiss stats');
  r = await axios.get(`${ML}/faiss_stats?event_id=${eventId}`);
  assert(typeof r.data.ntotal === 'number');

  console.log('[e2e] selfie search (matching face)');
  const fd2 = new FormData();
  fd2.append('image', fs.createReadStream(imgPath));
  fd2.append('event_id', eventId);
  r = await axios.post(`${ML}/match_faces`, fd2, { headers: fd2.getHeaders() });
  assert(Array.isArray(r.data.matches) && r.data.matches.length > 0, 'expected matching face to be found');
  assert(r.data.matches[0].similarity >= 0.34, 'expected similarity above threshold');

  console.log('[e2e] selfie search (non-matching face)');
  const nonMatchPath = path.join(__dirname, '../front-end/public/images/maryam.jpg');
  if (fs.existsSync(nonMatchPath)) {
    const fd3 = new FormData();
    fd3.append('image', fs.createReadStream(nonMatchPath));
    fd3.append('event_id', eventId);
    const r3 = await axios.post(`${ML}/match_faces`, fd3, { headers: fd3.getHeaders() });
    assert(!r3.data.matches || r3.data.matches.length === 0, 'expected non-matching face to return 0 matches');
  }

  console.log('✅ e2e passed');
}

if (require.main === module) {
  run().catch(e => { console.error(e.response?.data || e.message); process.exit(1); });
}
module.exports = { run };
