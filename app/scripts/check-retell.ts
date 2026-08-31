/**
 * Does voice actually work from THIS process, with the credentials in .env?
 *
 * Nothing else in this repo answers that. A rotated key, an agent id belonging to another account,
 * or an account that has run out of credit all fail the same silent way in production: a customer
 * presses the microphone and nothing happens - `client/limits.ts` names that failure and this is
 * the check that catches it first.
 *
 * The four traps it separates, because they read identically from a browser:
 *   - the key is wrong                  -> 401
 *   - the account has no credit         -> 402   (this is what happened on the old account)
 *   - the agent id is from another key  -> the agent is simply not in the list
 *   - the agent points at a flow that   -> the agent exists, the flow lookup fails
 *     does not exist on this account
 *
 *   npm run retell:check
 */
import { env } from '../src/config.js';

if (!env.RETELL_API_KEY || !env.RETELL_AGENT_ID) {
  console.error('\n  RETELL_API_KEY / RETELL_AGENT_ID are not both set in .env');
  console.error('  That is a supported state - voice endpoints answer `configured: false` - but no call can start.\n');
  process.exit(1);
}

const auth = { authorization: `Bearer ${env.RETELL_API_KEY}` };
const line = (label: string, value: string) => console.log(`  ${label.padEnd(24)}${value}`);

async function get(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`https://api.retellai.com/${path}`, { headers: auth, signal: AbortSignal.timeout(15_000) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

console.log('');

// 1. Is the key any good at all?
const agents = await get('list-agents');
if (agents.status !== 200) {
  line('key', `REJECTED - HTTP ${agents.status}`);
  console.error(`\n  ${agents.status === 401 ? 'The key is wrong or was revoked.' : 'Retell refused the key.'}\n`);
  process.exit(1);
}
const list = (Array.isArray(agents.body) ? agents.body : []) as { agent_id?: string; agent_name?: string; voice_id?: string; response_engine?: { conversation_flow_id?: string } }[];
line('key', `works - ${list.length} agent(s) on this account`);

// 2. Is OUR agent one of them? An id from a different account is the trap that looks like nothing.
const mine = list.find((a) => a.agent_id === env.RETELL_AGENT_ID);
if (!mine) {
  line('RETELL_AGENT_ID', 'NOT ON THIS ACCOUNT');
  console.error('\n  The key and the agent id belong to different Retell accounts.');
  console.error('  Agents this key can see:');
  for (const a of list) console.error(`    ${a.agent_id}  ${a.agent_name ?? ''}`);
  console.error('');
  process.exit(1);
}
line('agent', `${mine.agent_name ?? '(unnamed)'}  voice ${mine.voice_id ?? '?'}`);

// 3. Does its conversation flow resolve? An agent can outlive the flow it points at.
const flowId = mine.response_engine?.conversation_flow_id;
if (flowId) {
  const flow = await get(`get-conversation-flow/${flowId}`);
  const nodes = (flow.body as { nodes?: unknown[] } | null)?.nodes;
  line('conversation flow', flow.status === 200 ? `${flowId}  (${nodes?.length ?? 0} nodes)` : `${flowId}  BROKEN - HTTP ${flow.status}`);
  if (flow.status !== 200) process.exit(1);
}

// 4. Is there room to place a call? Free tiers sit at 1-2; this also proves the account is funded
//    enough to answer, which the call below then confirms outright.
const concurrency = await get('get-concurrency');
const c = concurrency.body as { current_concurrency?: number; concurrency_limit?: number } | null;
if (c) line('concurrency', `${c.current_concurrency ?? '?'} in use of ${c.concurrency_limit ?? '?'}`);

/* 5. The only check that proves it end to end. Everything above can pass on an account with no
      credit - the old one did - and this is the call that answers 402 when that is true. It mints
      a real web call, which is free unless somebody joins it, and nobody does. */
const call = await fetch('https://api.retellai.com/v2/create-web-call', {
  method: 'POST',
  headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify({
    agent_id: env.RETELL_AGENT_ID,
    retell_llm_dynamic_variables: { session_id: 'retell-check', greeting: 'Checking.' },
  }),
  signal: AbortSignal.timeout(15_000),
});

const ok = call.ok;
const token = ok ? ((await call.json()) as { access_token?: string }).access_token : null;
line('create-web-call', ok ? `HTTP ${call.status} - token issued` : `HTTP ${call.status} - REFUSED`);

if (!ok) {
  console.error(
    call.status === 402
      ? '\n  402 = this Retell account is out of credit. Nobody can start a call until it is topped up.\n'
      : `\n  Retell refused to mint a call: ${await call.text()}\n`,
  );
  process.exit(1);
}

console.log(`\n  Working. A browser given that token can start a call.${token ? '' : ''}\n`);
process.exit(0);
