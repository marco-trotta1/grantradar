import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
process.loadEnvFile('.env.mail.local');
const origin = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const email = `delivered+grantradar-${Date.now()}@resend.dev`;
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const browser = await chromium.launch();
const page = await browser.newPage();
let userId;
try {
  await page.goto(`${origin}/login`);
  await page.getByLabel('School email').fill(email);
  await page.getByRole('button', { name: 'Send sign-in code', exact: true }).click();
  await expect(page.getByLabel('Sign-in code')).toBeVisible({ timeout: 20000 });
  let mail;
  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await fetch('https://api.resend.com/emails', { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } });
    if (!response.ok) throw new Error(`Email inspection fails: ${response.status}`);
    const list = await response.json();
    const record = list.data.find(item => item.to.includes(email));
    if (record) {
      const detail = await fetch(`https://api.resend.com/emails/${record.id}`, { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } });
      mail = await detail.json();
      if (mail.last_event === 'delivered') break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (mail?.last_event !== 'delivered') throw new Error('The simulated recipient does not confirm delivery.');
  const code = mail.html.match(/\b\d{6}\b/)?.[0];
  if (!code) throw new Error('The email does not contain a sign-in code.');
  await page.getByLabel('Sign-in code').fill(code === '111111' ? '222222' : '111111');
  await page.getByRole('button', { name: 'Open my workspace' }).click();
  await expect(page.locator('.notice.error')).toContainText('invalid or expired');
  await page.getByLabel('Sign-in code').fill(code);
  await page.getByRole('button', { name: 'Open my workspace' }).click();
  await expect(page.getByLabel('School or district name')).toBeVisible({ timeout: 15000 });
  const users = await admin.auth.admin.listUsers({ perPage: 100 });
  userId = users.data.users.find(user => user.email === email)?.id;
  if (!userId) throw new Error('The new account does not exist.');
  const workspace = { version: 1, profile: { name: 'Email Acceptance School', city: 'Boise', state: 'ID', schoolType: 'public-school', grades: ['elementary'], students: 300, fundingGoal: 10000, priorities: ['STEM & technology'], locale: 'rural', titleI: false, capacity: 'limited', mission: 'A science lab' }, saved: [] };
  for (let revision = 0; revision < 12; revision++) {
    workspace.profile.mission = `Revision ${revision + 1}`;
    const response = await page.request.put(`${origin}/api/workspace`, { headers: { Origin: origin }, data: { workspace, revision } });
    expect(response.status()).toBe(200);
  }
  const history = await page.request.get(`${origin}/api/workspace/history`);
  expect((await history.json()).length).toBe(10);
  await page.reload();
  await page.getByRole('button', { name: 'Your school', exact: true }).click();
  page.once('dialog', dialog => dialog.accept('DELETE'));
  await page.getByRole('button', { name: 'Delete my account and data' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get(`${origin}/api/workspace`)).status()).toBe(401);
  expect((await admin.auth.admin.getUserById(userId)).data.user).toBeNull();
  for (const table of ['school_workspaces', 'workspace_history']) {
    const rows = await admin.from(table).select('user_id').eq('user_id', userId);
    expect(rows.error).toBeNull();
    expect(rows.data).toEqual([]);
  }
  console.log(JSON.stringify({ emailDelivery: 'simulated recipient confirmed', invalidCode: 'rejected', passwordlessSignIn: 'passed', historyLimit: 10, accountDeletion: 'passed', workspaceDeletion: 'passed', historyDeletion: 'passed' }));
} finally {
  if (!userId) {
    const users = await admin.auth.admin.listUsers({ perPage: 100 });
    userId = users.data.users.find(user => user.email === email)?.id;
  }
  if (userId) await admin.auth.admin.deleteUser(userId);
  await browser.close();
}
