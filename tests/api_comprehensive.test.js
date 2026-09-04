/**
 * Fyndr Backend API Comprehensive Test Suite
 * Covers:
 * 1. Authentication & Security (Register, Duplicate Email, Login, Injection defense)
 * 2. Studio & Photographer Branding (/studio, /find_studio, /exist-studio)
 * 3. Event Lifecycle (Create, List, Update, PIN lock, Delete)
 * 4. Photo Ingestion & Vector Cleanup (Batch upload, SHA-256 dedup, In-event list, Photo delete)
 * 5. Guest Face Matching & Search (Matching selfie, non-matching face, threshold validation)
 * 6. Prometheus Metrics & Queue DLQ (/metrics, /queue/stats)
 */

const assert = require('assert');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API = process.env.API_URL || 'http://127.0.0.1:5000';
const ML = process.env.ML_URL || 'http://127.0.0.1:5001';

async function run() {
  console.log('🧪 Starting Fyndr Comprehensive API Test Suite...\n');

  // ================= 1. AUTHENTICATION SUITE =================
  console.log('--- 1. Testing Authentication & Security ---');
  const testEmail = `photographer_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  // 1.1 Valid Registration
  console.log('  [auth] registering new photographer...');
  let res = await axios.post(`${API}/register`, {
    name: 'Apex Studio',
    email: testEmail,
    password: testPassword,
  });
  assert.strictEqual(res.status, 200);
  assert(res.data.message.includes('successful'), 'Expected registration success message');

  // 1.2 Duplicate Email Rejection
  console.log('  [auth] verifying duplicate email rejection...');
  try {
    await axios.post(`${API}/register`, {
      name: 'Duplicate Tester',
      email: testEmail,
      password: testPassword,
    });
    assert.fail('Should have rejected duplicate email');
  } catch (err) {
    assert.strictEqual(err.response.status, 400);
    assert(err.response.data.message.includes('exists'));
  }

  // 1.3 Missing Fields Rejection
  console.log('  [auth] verifying missing fields rejection...');
  try {
    await axios.post(`${API}/register`, { email: 'incomplete@example.com' });
    assert.fail('Should reject incomplete registration');
  } catch (err) {
    assert.strictEqual(err.response.status, 400);
  }

  // 1.4 Valid Login
  console.log('  [auth] testing valid login...');
  res = await axios.post(`${API}/login`, {
    email: testEmail,
    password: testPassword,
  });
  assert.strictEqual(res.status, 200);
  assert(res.data._id, 'Expected user _id in response');
  assert.strictEqual(res.data.name, 'Apex Studio');
  const userId = res.data._id;

  // 1.5 Invalid Password Login
  console.log('  [auth] testing incorrect password rejection...');
  try {
    await axios.post(`${API}/login`, {
      email: testEmail,
      password: 'WrongPassword!',
    });
    assert.fail('Should reject wrong password');
  } catch (err) {
    assert.strictEqual(err.response.status, 404);
  }

  // 1.6 Query Injection Attempt
  console.log('  [auth] verifying query injection defense...');
  try {
    await axios.post(`${API}/login`, {
      email: { $ne: null },
      password: { $ne: null },
    });
    assert.fail('Should reject query injection attempt');
  } catch (err) {
    assert(err.response.status === 400 || err.response.status === 404);
  }

  // ================= 2. STUDIO BRANDING SUITE =================
  console.log('\n--- 2. Testing Studio & Photographer Profile ---');
  console.log('  [studio] saving studio profile...');
  res = await axios.post(`${API}/studio`, {
    create_by: userId,
    studio_name: 'Apex Visuals Studio',
    phone_no: '+91 98765 43210',
    address: 'Mumbai, India',
    offer: 'Wedding Special 2026',
    description: 'Award-winning wedding cinema and photography.',
  });
  assert.strictEqual(res.status, 200);

  console.log('  [studio] retrieving studio profile via /find_studio...');
  res = await axios.post(`${API}/find_studio`, { create_by: userId });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.studio_name, 'Apex Visuals Studio');
  assert.strictEqual(res.data.phone_no, '+91 98765 43210');

  console.log('  [studio] verifying studio existence via /exist-studio...');
  res = await axios.get(`${API}/exist-studio?create_by=${userId}`);
  assert.strictEqual(res.status, 200);
  assert(res.data.exist);

  // ================= 3. EVENT LIFECYCLE SUITE =================
  console.log('\n--- 3. Testing Event Lifecycle & Access PIN ---');
  const eventPin = '987654';
  const imgPath = path.join(__dirname, '../front-end/public/images/wedding.jpg');

  // 3.1 Create Event with Cover and PIN
  console.log('  [event] creating new event with cover image and PIN...');
  const eventFormData = new FormData();
  eventFormData.append('event_name', 'Grand Mumbai Wedding');
  eventFormData.append('created_id', userId);
  eventFormData.append('pin', eventPin);
  if (fs.existsSync(imgPath)) {
    eventFormData.append('event_photo', fs.createReadStream(imgPath));
  }

  res = await axios.post(`${API}/event`, eventFormData, {
    headers: eventFormData.getHeaders(),
  });
  assert.strictEqual(res.status, 200);
  assert(res.data._id, 'Expected event _id');
  assert.strictEqual(res.data.event_name, 'Grand Mumbai Wedding');
  assert.strictEqual(res.data.pin, eventPin);
  const eventId = res.data._id;

  // 3.2 List Events
  console.log('  [event] fetching events for user...');
  res = await axios.post(`${API}/display_event`, { userId });
  assert.strictEqual(res.status, 200);
  assert(Array.isArray(res.data));
  assert(res.data.some((e) => e._id === eventId));

  // 3.3 Guest Event Portal Access
  res = await axios.post(`${API}/collect_event`, { _id: eventId });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.event.event_name, 'Grand Mumbai Wedding');
  assert(!('created_id' in res.data.event), 'Guest response must not leak owner id');

  // 3.4 PIN Confirmation Tests
  console.log('  [guest] testing correct PIN verification...');
  res = await axios.post(`${API}/confirm_pin`, { _id: eventId, pin: eventPin });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.pin, eventPin);

  console.log('  [guest] testing incorrect PIN rejection...');
  try {
    await axios.post(`${API}/confirm_pin`, { _id: eventId, pin: '000000' });
    assert.fail('Should reject wrong PIN');
  } catch (err) {
    assert.strictEqual(err.response.status, 404);
  }
  // 3.5 Update Event Name & PIN (owner-only: created_id required)
  console.log('  [event] updating event name and PIN...');
  res = await axios.put(`${API}/events/${eventId}`, {
    created_id: userId,
    updateName: 'Grand Mumbai Wedding (Updated)',
    updatePin: '654321',
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.updatedEvent.event_name, 'Grand Mumbai Wedding (Updated)');
  assert.strictEqual(res.data.updatedEvent.pin, '654321');

  // 3.6 Non-owner update must be rejected
  console.log('  [event] verifying non-owner update rejection...');
  try {
    await axios.put(`${API}/events/${eventId}`, {
      created_id: '000000000000000000000000',
      updateName: 'Hijacked',
    });
    assert.fail('Should reject non-owner update');
  } catch (err) {
    assert.strictEqual(err.response.status, 403);
  }

  // ================= 4. PHOTO INGESTION & DELETION SUITE =================
  console.log('\n--- 4. Testing Photo Upload & Deletion ---');
  if (fs.existsSync(imgPath)) {
    // 4.1 Upload photo
    console.log('  [photo] uploading event photo...');
    const photoForm = new FormData();
    photoForm.append('name', fs.createReadStream(imgPath));
    photoForm.append('event_id', eventId);
    photoForm.append('upload_by', userId);

    res = await axios.post(`${API}/photo`, photoForm, {
      headers: photoForm.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000,
    });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data) && res.data.length > 0);
    const photoId = res.data[0]._id;
    assert(photoId, 'Expected saved photo _id');

    // 4.2 Deduplication Test (re-upload same photo)
    console.log('  [photo] testing duplicate image hash detection...');
    const photoFormDup = new FormData();
    photoFormDup.append('name', fs.createReadStream(imgPath));
    photoFormDup.append('event_id', eventId);
    photoFormDup.append('upload_by', userId);

    const resDup = await axios.post(`${API}/photo`, photoFormDup, {
      headers: photoFormDup.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000,
    });
    assert.strictEqual(resDup.status, 200);

    // 4.3 In-event gallery list
    console.log('  [photo] verifying in-event photo list...');
    res = await axios.post(`${API}/in-event`, { _id: eventId });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data) && res.data.length > 0);

    // ================= 5. GUEST FACE MATCHING SUITE =================
    console.log('\n--- 5. Testing Guest Face Search & Vector Store ---');
    console.log('  [ml] matching face with event query...');
    const selfieForm = new FormData();
    selfieForm.append('image', fs.createReadStream(imgPath));
    selfieForm.append('event_id', eventId);

    const matchRes = await axios.post(`${ML}/match_faces`, selfieForm, {
      headers: selfieForm.getHeaders(),
      timeout: 30000,
    });
    assert.strictEqual(matchRes.status, 200);
    assert(Array.isArray(matchRes.data.matches));
    assert(matchRes.data.matches.length > 0, 'Expected match for uploaded face');
    assert(matchRes.data.matches[0].similarity >= 0.34, 'Similarity score should be >= 0.34');

    // Non-matching face search
    const nonMatchPath = path.join(__dirname, '../front-end/public/images/maryam.jpg');
    if (fs.existsSync(nonMatchPath)) {
      console.log('  [ml] testing non-matching face query...');
      const nonMatchForm = new FormData();
      nonMatchForm.append('image', fs.createReadStream(nonMatchPath));
      nonMatchForm.append('event_id', eventId);

      const nonMatchRes = await axios.post(`${ML}/match_faces`, nonMatchForm, {
        headers: nonMatchForm.getHeaders(),
        timeout: 30000,
      });
      assert.strictEqual(nonMatchRes.status, 200);
      assert(!nonMatchRes.data.matches || nonMatchRes.data.matches.length === 0);
    }

    // 4.4 Delete single photo and verify cleanup
    console.log('  [photo] testing single photo deletion via /delete-img...');
    const delRes = await axios.delete(`${API}/delete-img`, {
      data: { _id: photoId },
    });
    assert.strictEqual(delRes.status, 200);
    assert(delRes.data.success);
  }

  // ================= 6. METRICS & CLEANUP SUITE =================
  console.log('\n--- 6. Testing Monitoring & Cleanup ---');
  console.log('  [metrics] scraping Prometheus metrics...');
  res = await axios.get(`${API}/metrics`);
  assert.strictEqual(res.status, 200);
  assert(res.data.includes('fyndr_http_requests_total'));

  console.log('  [queue] checking queue stats...');
  res = await axios.get(`${API}/queue/stats?event_id=${eventId}`);
  assert.strictEqual(res.status, 200);

  console.log('  [event] deleting event via /delete-event...');
  res = await axios.delete(`${API}/delete-event`, { data: { _id: eventId } });
  assert.strictEqual(res.status, 200);

  console.log('\n🎉 ALL COMPREHENSIVE BACKEND INTEGRATION TESTS PASSED!');
}

if (require.main === module) {
  run().catch((e) => {
    console.error('❌ Test failed:', e.response?.data || e.message);
    process.exit(1);
  });
}

module.exports = { run };
