const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

describe('Single Active Session per Browser Context Verification', () => {
  const browserContextA = 'browser-ctx-1111';
  const browserContextB = 'browser-ctx-2222';

  it('1. User A logs in from Browser Context A and can access protected endpoint', async () => {
    // Login as Super Admin Dora027
    const loginResA = await request(app)
      .post('/api/auth/super-admin/login')
      .set('x-client-context-id', browserContextA)
      .send({
        username: 'Dora027',
        password: 'DOra#027',
      });

    assert.strictEqual(loginResA.status, 200);
    const tokenA = loginResA.body.accessToken || loginResA.body.token;
    assert.ok(tokenA);

    // Make protected request using tokenA from Browser Context A
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-client-context-id', browserContextA);

    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.data.username, 'Dora027');
  });

  it('2. Another user logs in from same Browser Context A -> User A session is replaced with 401 SESSION_REPLACED', async () => {
    // First, login Dora027 in Browser Context A
    const loginA = await request(app)
      .post('/api/auth/super-admin/login')
      .set('x-client-context-id', browserContextA)
      .send({
        username: 'Dora027',
        password: 'DOra#027',
      });
    const tokenA = loginA.body.accessToken || loginA.body.token;

    // Next, State Admin logs in from the SAME Browser Context A (simulating Tab 2 in same browser)
    const loginB = await request(app)
      .post('/api/auth/state-admin/login')
      .set('x-client-context-id', browserContextA)
      .send({
        username: 'Tamil_Nadu_admin',
        password: 'Tamil_Nadu_Admin@123',
      });
    assert.strictEqual(loginB.status, 200);
    const tokenB = loginB.body.accessToken || loginB.body.token;
    assert.ok(tokenB);

    // Now, Tab 1 (User A / tokenA) attempts to access /api/auth/me from Browser Context A
    const replacedRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-client-context-id', browserContextA);

    assert.strictEqual(replacedRes.status, 401);
    assert.strictEqual(replacedRes.body.error?.code, 'SESSION_REPLACED');
    assert.strictEqual(replacedRes.body.error?.message, 'Your DLR session was replaced by a new login.');

    // Tab 2 (User B / tokenB) in Browser Context A still works
    const validResB = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-client-context-id', browserContextA);

    assert.strictEqual(validResB.status, 200);
    assert.strictEqual(validResB.body.data.username, 'Tamil_Nadu_admin');
  });

  it('3. User on Computer B (Browser Context B) is NOT affected when User in Browser Context A logs in', async () => {
    // Login Officer in Browser Context B (representing Computer B)
    const loginOfficerB = await request(app)
      .post('/api/auth/officer/login')
      .set('x-client-context-id', browserContextB)
      .send({
        username: 'DEMO-OFFICER-001',
        password: 'OfficerPass123!',
      });
    assert.strictEqual(loginOfficerB.status, 200);
    const tokenOfficerB = loginOfficerB.body.accessToken || loginOfficerB.body.token;

    // Now a login happens on Browser Context A (Computer A)
    const loginAdminA = await request(app)
      .post('/api/auth/super-admin/login')
      .set('x-client-context-id', browserContextA)
      .send({
        username: 'Dora027',
        password: 'DOra#027',
      });
    assert.strictEqual(loginAdminA.status, 200);

    // Officer on Computer B MUST remain valid and active
    const officerCheck = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenOfficerB}`)
      .set('x-client-context-id', browserContextB);

    assert.strictEqual(officerCheck.status, 200);
    assert.strictEqual(officerCheck.body.data.username, 'DEMO-OFFICER-001');
  });

  it('4. Requests without client context header work normally (backward compatibility)', async () => {
    const login = await request(app)
      .post('/api/auth/super-admin/login')
      .send({
        username: 'Dora027',
        password: 'DOra#027',
      });
    const token = login.body.accessToken || login.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(meRes.status, 200);
  });

  after(async () => {
    try {
      await pool.end();
    } catch (_) {}
  });
});
