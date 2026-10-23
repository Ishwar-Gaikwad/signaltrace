import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Claim } from '../src/models/index.js';

describe('Feature: Citizen WhatsApp & SMS Helpline Bot API', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await Claim.deleteMany({
      sourcePlatform: { $in: ['citizen-whatsapp-hotline', 'citizen-sms-hotline'] }
    });
    await disconnectDB();
  });

  it('should reject requests with missing or empty message with 400', async () => {
    const res = await request(app).post('/api/claims/citizen-bot').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should process a WhatsApp forward, run extraction & corroboration, and format WhatsApp response', async () => {
    const res = await request(app)
      .post('/api/claims/citizen-bot')
      .send({
        message: 'MASSIVE 7.2 Richter earthquake just hit Chamoli Uttarakhand! Hundreds feared dead.',
        channel: 'whatsapp'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('botReply');
    expect(res.body.data).toHaveProperty('overallStatus');
    expect(res.body.data.channel).toBe('whatsapp');
    expect(res.body.data.botReply).toContain('SIGNALTRACE DISASTER HELPLINE');
    expect(res.body.data.botReply).toContain('EMERGENCY NUMBERS');
    expect(res.body.data.botReply).toContain('112');
  });

  it('should format compact SMS reply when channel is sms', async () => {
    const res = await request(app)
      .post('/api/claims/citizen-bot')
      .send({
        message: 'Water levels crossed danger marks on Teesta river near Domohani Jalpaiguri.',
        channel: 'sms'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.channel).toBe('sms');
    expect(res.body.data.botReply).toContain('[SignalTrace Alert');
    expect(res.body.data.botReply).toContain('STATUS:');
    expect(res.body.data.botReply).toContain('HELP: Call 112');
  });
});
