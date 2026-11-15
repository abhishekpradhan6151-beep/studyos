import { readFileSync, writeFileSync } from 'node:fs';
const status = JSON.parse(readFileSync('.qa-local-status.json', 'utf8'));
const url = status.API_URL || status.api_url;
const anon = status.ANON_KEY || status.anon_key;
const service = status.SERVICE_ROLE_KEY || status.service_role_key;
if (!url?.startsWith('http://127.0.0.1:') || !anon || !service) throw new Error('Expected an isolated local Supabase stack.');
const env = `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${anon}\nSUPABASE_SERVICE_ROLE_KEY=${service}\nAI_GATEWAY_MODEL=google/gemini-3.8-flash\n`;
writeFileSync('.env.local', env, { mode: 0o600 });
console.log('Configured the isolated test stack. No hosted account credentials are used.');
