/**
 * Asks the real thing two real questions, with the real search behind it.
 *
 * The unit tests never reach the provider, so nothing else in this repo proves the part that
 * actually costs money: that the prompt comes back inside its word limit, that the sites named are
 * real, and above all that no web address survives into prose that gets read down a phone line.
 * The model appended one to every trial run while being told not to, so this is the check that
 * matters most.
 *
 *   AI_PROVIDER=openai npx tsx scripts/check-answers.ts
 */
import { answerQuestion } from '../src/client/askAbout.js';
import { env } from '../src/config.js';

if (env.AI_PROVIDER !== 'openai') {
  console.error('AI_PROVIDER is not openai, so there is no search to check. Set it and try again.');
  process.exit(1);
}
if (!env.ANSWER_QUESTIONS) {
  console.error('ANSWER_QUESTIONS is off, so every answer below would be null by design.');
  process.exit(1);
}

const QUESTIONS: { question: string; kind: 'advice' | 'rates' }[] = [
  { question: 'what is colorbond going for these days?', kind: 'rates' },
  { question: 'my fence blew over in the storm, what do I do?', kind: 'advice' },
];

let failures = 0;

for (const asked of QUESTIONS) {
  const started = Date.now();
  const answer = await answerQuestion(asked, { suburb: 'Berwick', state: 'VIC', material: null });
  const ms = Date.now() - started;

  console.log('\n' + '='.repeat(80));
  console.log(`${asked.kind.toUpperCase()}  "${asked.question}"   ${ms}ms`);
  console.log('='.repeat(80));

  if (!answer) {
    console.log('  no answer came back');
    failures += 1;
    continue;
  }

  console.log(answer.text);
  console.log(`\n  words: ${answer.text.split(/\s+/).length}`);
  for (const source of answer.sources) {
    console.log(`  - ${source.name}${source.figure ? ` — ${source.figure}` : ''}${source.url ? '  [cited]' : ''}`);
  }

  // The three things a reader cannot check by eye but a phone call will find immediately.
  const problems: string[] = [];
  if (/https?:\/\/|www\./i.test(answer.text)) problems.push('a web address survived into the prose');
  if (/\*\*|\]\(|^\s*[-*]\s/m.test(answer.text)) problems.push('markdown survived into the prose');
  if (answer.text.split(/\s+/).length > 150) problems.push('far longer than the 110 words asked for');
  if (asked.kind === 'rates' && answer.sources.length < 3) problems.push(`only ${answer.sources.length} sites named`);

  for (const problem of problems) console.log(`  FAIL: ${problem}`);
  failures += problems.length;
}

console.log(`\n${failures ? `${failures} problem(s)` : 'all clear'}`);
process.exit(failures ? 1 : 0);
