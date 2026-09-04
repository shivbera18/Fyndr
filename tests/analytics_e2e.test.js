const assert = require('assert');
const mongoose = require('../node-server-1/node_modules/mongoose');
const { createApp } = require('../node-server-1/dist/app');

const PORT = 5999;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function run() {
  console.log('[analytics_e2e] Starting test server on port', PORT);
  const app = createApp();
  const server = app.listen(PORT);

  try {
    const timestamp = Date.now();
    const email = `analytics_test_${timestamp}@example.com`;
    const eventPin = '987654';

    // 1. Create test user
    console.log('[analytics_e2e] Registering photographer user...');
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Photographer Test',
        email,
        password: 'password123',
      }),
    });
    assert.strictEqual(regRes.status, 200);

    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'password123',
      }),
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    const userId = loginData._id;
    assert.ok(userId, 'Expected valid userId');

    // 2. Create test event
    console.log('[analytics_e2e] Creating test event with PIN:', eventPin);
    const evRes = await fetch(`${BASE_URL}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'Roy Wedding & Sangeet',
        created_id: userId,
        pin: eventPin,
      }),
    });
    assert.strictEqual(evRes.status, 200);
    const evData = await evRes.json();
    const eventId = evData._id;
    assert.ok(eventId, 'Expected valid eventId');

    // 3. Guest Access: Wrong PIN attempt
    console.log('[analytics_e2e] Testing access attempt with INCORRECT PIN...');
    const wrongPinRes = await fetch(`${BASE_URL}/api/analytics/access-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        name: 'Aarav Patel',
        phone: '+919876543210',
        pin: '000000',
        sessionId: `sess_${timestamp}`,
        deviceInfo: { type: 'mobile', os: 'Android', browser: 'Chrome' },
      }),
    });

    assert.strictEqual(wrongPinRes.status, 200);
    const wrongPinData = await wrongPinRes.json();
    assert.strictEqual(wrongPinData.ok, false);
    assert.strictEqual(wrongPinData.verified, false);
    const guestId = wrongPinData.guestId;
    assert.ok(guestId, 'Expected guestId to be created on first attempt');

    // 4. Guest Access: Correct PIN attempt
    console.log('[analytics_e2e] Testing access attempt with CORRECT PIN...');
    const correctPinRes = await fetch(`${BASE_URL}/api/analytics/access-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        name: 'Aarav Patel',
        phone: '+919876543210',
        pin: eventPin,
        sessionId: `sess_${timestamp}`,
        deviceInfo: { type: 'mobile', os: 'Android', browser: 'Chrome' },
      }),
    });

    assert.strictEqual(correctPinRes.status, 200);
    const correctPinData = await correctPinRes.json();
    assert.strictEqual(correctPinData.ok, true);
    assert.strictEqual(correctPinData.verified, true);
    assert.strictEqual(correctPinData.guestId, guestId);

    // 5. Funnel Telemetry: Track search, view, and download
    console.log('[analytics_e2e] Tracking selfie search, photo view, and download events...');
    await fetch(`${BASE_URL}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        sessionId: `sess_${timestamp}`,
        guestId,
        type: 'selfie_search',
        metadata: { matchCount: 4, latencyMs: 320 },
      }),
    });

    await fetch(`${BASE_URL}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        sessionId: `sess_${timestamp}`,
        guestId,
        type: 'photo_view',
        metadata: { photoName: 'roy_wedding_001.jpg', similarity: 0.94 },
      }),
    });

    await fetch(`${BASE_URL}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        sessionId: `sess_${timestamp}`,
        guestId,
        type: 'photo_download',
        metadata: { photoId: 'p_001', photoName: 'roy_wedding_001.jpg' },
      }),
    });

    // 6. Summary KPI Verification
    console.log('[analytics_e2e] Verifying event summary metrics...');
    const summaryRes = await fetch(`${BASE_URL}/api/analytics/event/${eventId}/summary`);
    assert.strictEqual(summaryRes.status, 200);
    const summary = await summaryRes.json();

    assert.strictEqual(summary.uniqueGuests, 1);
    assert.strictEqual(summary.verifiedGuests, 1);
    assert.strictEqual(summary.totalAttempts, 2);
    assert.strictEqual(summary.failedAttempts, 1);
    assert.strictEqual(summary.totalSearches, 1);
    assert.strictEqual(summary.totalDownloads, 1);
    assert.strictEqual(summary.uniquePhotosDownloaded, 1);
    assert.strictEqual(summary.downloadConversionRate, 100);
    assert.strictEqual(summary.searchSuccessRate, 100);

    // 7. Guests Ledger Verification
    console.log('[analytics_e2e] Verifying guest leads ledger...');
    const guestsRes = await fetch(`${BASE_URL}/api/analytics/event/${eventId}/guests`);
    assert.strictEqual(guestsRes.status, 200);
    const guestsData = await guestsRes.json();
    assert.strictEqual(guestsData.total, 1);
    const lead = guestsData.guests[0];
    assert.strictEqual(lead.guestName, 'Aarav Patel');
    assert.strictEqual(lead.guestPhone, '+919876543210');
    assert.strictEqual(lead.attempts, 2);
    assert.strictEqual(lead.failedAttempts, 1);
    assert.strictEqual(lead.verified, true);
    assert.strictEqual(lead.searchesCount, 1);
    assert.strictEqual(lead.viewsCount, 1);
    assert.strictEqual(lead.downloadsCount, 1);
    assert.strictEqual(lead.device.type, 'mobile');

    // 8. Event CSV Export
    console.log('[analytics_e2e] Verifying event CSV export...');
    const csvRes = await fetch(`${BASE_URL}/api/analytics/event/${eventId}/export-csv`);
    assert.strictEqual(csvRes.status, 200);
    const csvContentType = csvRes.headers.get('content-type') || '';
    assert(csvContentType.includes('text/csv'));
    const csvText = await csvRes.text();
    assert(csvText.includes('Aarav Patel'));
    assert(csvText.includes('+919876543210'));

    // 9. Activity Feed
    console.log('[analytics_e2e] Verifying real-time activity feed...');
    const actRes = await fetch(`${BASE_URL}/api/analytics/event/${eventId}/activity`);
    assert.strictEqual(actRes.status, 200);
    const actData = await actRes.json();
    assert(Array.isArray(actData));
    assert(actData.length >= 3);

    // 10. Timeline Aggregation
    console.log('[analytics_e2e] Verifying timeline aggregation...');
    const timelineRes = await fetch(`${BASE_URL}/api/analytics/event/${eventId}/timeline`);
    assert.strictEqual(timelineRes.status, 200);
    const timelineData = await timelineRes.json();
    assert(Array.isArray(timelineData));

    // 11. Studio Overview
    console.log('[analytics_e2e] Verifying studio overview across all events...');
    const studioRes = await fetch(`${BASE_URL}/api/analytics/studio/overview?userId=${userId}`);
    assert.strictEqual(studioRes.status, 200);
    const studioData = await studioRes.json();
    assert.strictEqual(studioData.totalEvents, 1);
    assert.strictEqual(studioData.totalGuests, 1);
    assert.strictEqual(studioData.verifiedGuests, 1);
    assert.strictEqual(studioData.totalDownloads, 1);
    assert.strictEqual(studioData.topEvents.length, 1);
    assert.strictEqual(studioData.topEvents[0].eventName, 'Roy Wedding & Sangeet');

    // 12. Studio CSV Export
    console.log('[analytics_e2e] Verifying studio leads CSV export...');
    const studioCsvRes = await fetch(`${BASE_URL}/api/analytics/studio/export-leads?userId=${userId}`);
    assert.strictEqual(studioCsvRes.status, 200);
    const studioCsvType = studioCsvRes.headers.get('content-type') || '';
    assert(studioCsvType.includes('text/csv'));
    const studioCsvText = await studioCsvRes.text();
    assert(studioCsvText.includes('Roy Wedding & Sangeet'));
    assert(studioCsvText.includes('Aarav Patel'));
    assert(studioCsvText.includes('+919876543210'));

    console.log('✅ ALL ANALYTICS E2E TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Test failed:', err);
      process.exit(1);
    });
}

module.exports = { run };
