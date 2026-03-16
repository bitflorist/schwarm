#!/usr/bin/env npx tsx
/**
 * Orchestra v0.1 — Multi-LLM Agent Dispatcher
 *
 * Dispatches prompts to CLI-based LLM agents (Claude, Codex, Gemini),
 * collects responses, and runs consensus deliberation loops.
 *
 * Usage:
 *   npx tsx orchestra.ts dispatch <agent> <prompt|file>
 *   npx tsx orchestra.ts fanout <agents|all> <prompt|file>
 *   npx tsx orchestra.ts synthesize [session-id]
 *   npx tsx orchestra.ts deliberate <prompt|file> [--rounds N]
 *   npx tsx orchestra.ts list
 *   npx tsx orchestra.ts sessions
 */

import { spawn, execFileSync } from 'node:child_process';
import {
  readFileSync, writeFileSync, mkdirSync, readdirSync,
  existsSync, statSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';

// ─── Paths ────────────────────────────────────────────────────────────────────

const SCRIPT_DIR  = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '../..');
const SESSIONS_DIR = join(SCRIPT_DIR, 'sessions');
const AGENTS_FILE  = join(SCRIPT_DIR, 'agents.json');

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentConfig {
  command: string;
  args: string[];
  stdinPrompt: boolean;
  cwd?: 'project' | 'neutral' | string;
  timeout?: number;
  strengths?: string[];
}

interface AgentResponse {
  agent: string;
  status: 'ok' | 'error';
  content: string;
  durationMs: number;
}

interface ConsensusRound {
  round: number;
  synthesis: string;
  consensus: boolean;
}

interface Session {
  id: string;
  task: string;
  created: string;
  agents: string[];
  responses: AgentResponse[];
  rounds: ConsensusRound[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

function loadAgents(): Record<string, AgentConfig> {
  return JSON.parse(readFileSync(AGENTS_FILE, 'utf-8'));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolvePrompt(parts: string[]): string {
  const input = parts.join(' ').trim();
  if (!input) return '';
  if (existsSync(input) && statSync(input).isFile()) {
    return readFileSync(input, 'utf-8');
  }
  return input;
}

function ts(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

async function dispatch(agentName: string, prompt: string): Promise<AgentResponse> {
  const agents = loadAgents();
  const agent = agents[agentName];
  if (!agent) {
    return {
      agent: agentName,
      status: 'error',
      content: `Unknown agent: ${agentName}. Available: ${Object.keys(agents).join(', ')}`,
      durationMs: 0,
    };
  }

  const start = Date.now();

  return new Promise((res) => {
    // Replace {PROMPT} placeholder in args, or pipe via stdin
    const args = agent.args.map((a) => (a === '{PROMPT}' ? prompt : a));

    // Resolve cwd: "project" = monorepo root, "neutral" = /tmp (no project config)
    let cwd = PROJECT_ROOT;
    if (agent.cwd === 'neutral') cwd = tmpdir();
    else if (agent.cwd && agent.cwd !== 'project') cwd = agent.cwd;

    const proc = spawn(agent.command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
      timeout: agent.timeout || 600_000,
    });

    if (agent.stdinPrompt) {
      proc.stdin.write(prompt);
    }
    proc.stdin.end();

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const ms = Date.now() - start;
      if (code === 0) {
        res({ agent: agentName, status: 'ok', content: stdout, durationMs: ms });
      } else {
        res({ agent: agentName, status: 'error', content: `Exit ${code}: ${stderr.slice(0, 1000)}`, durationMs: ms });
      }
    });

    proc.on('error', (err) => {
      res({ agent: agentName, status: 'error', content: `Spawn error: ${err.message}`, durationMs: Date.now() - start });
    });
  });
}

// ─── Session Management ───────────────────────────────────────────────────────

function createSession(task: string, agentNames: string[]): Session {
  const id = `${ts()}-${randomUUID().slice(0, 8)}`;
  const session: Session = {
    id,
    task,
    created: new Date().toISOString(),
    agents: agentNames,
    responses: [],
    rounds: [],
  };
  const dir = join(SESSIONS_DIR, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'task.md'), task);
  saveSession(session);
  return session;
}

function saveSession(s: Session) {
  const dir = join(SESSIONS_DIR, s.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'session.json'), JSON.stringify(s, null, 2));
}

function loadSession(id: string): Session {
  return JSON.parse(readFileSync(join(SESSIONS_DIR, id, 'session.json'), 'utf-8'));
}

// ─── Fanout ───────────────────────────────────────────────────────────────────

async function fanout(task: string, agentNames: string[]): Promise<Session> {
  const session = createSession(task, agentNames);
  const dir = join(SESSIONS_DIR, session.id);

  console.log(`\n[orchestra] Session: ${session.id}`);
  console.log(`[orchestra] Task: ${task.slice(0, 120)}${task.length > 120 ? '...' : ''}`);
  console.log(`[orchestra] Agents: ${agentNames.join(', ')}\n`);

  const results = await Promise.allSettled(
    agentNames.map(async (name) => {
      console.log(`  -> ${name} starting...`);
      const r = await dispatch(name, task);
      const mark = r.status === 'ok' ? '<-' : 'X ';
      console.log(`  ${mark} ${name} ${r.status} (${(r.durationMs / 1000).toFixed(1)}s, ${r.content.length} chars)`);
      return r;
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      session.responses.push(result.value);
      writeFileSync(join(dir, `${result.value.agent}.md`), result.value.content);
    }
  }

  saveSession(session);
  console.log(`\n[orchestra] Done. Session dir: ${dir}`);
  return session;
}

// ─── Synthesize ───────────────────────────────────────────────────────────────

function buildConsensusPrompt(session: Session): string {
  let p = '# Consensus Review\n\n';
  p += `## Original Task\n\n${session.task}\n\n---\n\n`;
  p += '## Agent Responses\n\n';

  for (const r of session.responses) {
    if (r.status === 'ok') {
      p += `### ${r.agent}\n\n${r.content}\n\n---\n\n`;
    }
  }

  p += `## Your Assignment\n\n`;
  p += `Analyze the agent responses and produce:\n\n`;
  p += `1. **AGREEMENTS** — Points where all agents converge\n`;
  p += `2. **DISAGREEMENTS** — Where agents differ, with reasoning\n`;
  p += `3. **BLIND_SPOTS** — Important aspects NO agent addressed\n`;
  p += `4. **SYNTHESIS** — Best combined answer from strongest parts\n`;
  p += `5. **CONSENSUS: YES/NO** — YES if fundamentally aligned, NO if substantive gaps remain\n\n`;
  p += `Be specific. If CONSENSUS is NO, state exactly what must be resolved.\n`;

  return p;
}

function synthesize(sessionId: string): string {
  const session = loadSession(sessionId);
  const dir = join(SESSIONS_DIR, sessionId);
  const prompt = buildConsensusPrompt(session);
  writeFileSync(join(dir, 'consensus-prompt.md'), prompt);
  console.log(`[orchestra] Consensus prompt -> ${join(dir, 'consensus-prompt.md')}`);
  return prompt;
}

// ─── Deliberate ───────────────────────────────────────────────────────────────

async function deliberate(task: string, maxRounds: number): Promise<void> {
  const allAgents = Object.keys(loadAgents());
  let session = await fanout(task, allAgents);

  for (let round = 1; round <= maxRounds; round++) {
    console.log(`\n[orchestra] === Consensus Round ${round}/${maxRounds} ===\n`);

    const consensusPrompt = buildConsensusPrompt(session);
    const dir = join(SESSIONS_DIR, session.id);
    writeFileSync(join(dir, `consensus-prompt-r${round}.md`), consensusPrompt);

    console.log(`[orchestra] Judge (claude) evaluating...`);
    const verdict = await dispatch('claude', consensusPrompt);
    writeFileSync(join(dir, `consensus-verdict-r${round}.md`), verdict.content);

    const hasConsensus = /consensus:\s*yes/i.test(verdict.content);
    session.rounds.push({ round, synthesis: verdict.content, consensus: hasConsensus });
    saveSession(session);

    if (hasConsensus) {
      console.log(`\n[orchestra] Consensus reached in round ${round}.`);
      console.log(`[orchestra] Verdict: ${join(dir, `consensus-verdict-r${round}.md`)}`);
      return;
    }

    if (round < maxRounds) {
      console.log(`[orchestra] No consensus. Refining...\n`);
      const refined = [
        task,
        '\n\n---\n\n## Previous Round Feedback\n\n',
        verdict.content,
        '\n\nAddress the blind spots and disagreements above. Refine your response.',
      ].join('');
      session = await fanout(refined, allAgents);
    }
  }

  console.log(`\n[orchestra] No consensus after ${maxRounds} rounds. Review session manually.`);
}

// ─── Streams ─────────────────────────────────────────────────────────────────

// Load streams from .schwarm.json or use defaults
function loadStreams(): string[] {
  try {
    const configPath = join(PROJECT_ROOT, '.schwarm.json');
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config.streams?.length) return config.streams.map((s: { name: string }) => s.name);
    }
  } catch { /* use defaults */ }
  return ['backend', 'frontend'];
}

const STREAMS = loadStreams();
type Stream = string;

interface GhIssue {
  number: number;
  title: string;
  labels: { name: string }[];
}

function gh(ghArgs: string[]): string {
  try {
    return execFileSync('gh', ghArgs, { cwd: PROJECT_ROOT, timeout: 15_000, encoding: 'utf-8' });
  } catch { return '[]'; }
}

function streamStatus(): void {
  console.log('\n  Stream Status (from GitHub Issues)\n');
  console.log('  Stream      Ready  Open   Top Issue');
  console.log('  ----------  -----  -----  -----------------------------------');

  for (const stream of STREAMS) {
    const label = `stream:${stream}`;
    let openIssues: GhIssue[] = [];
    let readyIssues: GhIssue[] = [];
    try {
      openIssues = JSON.parse(gh(['issue', 'list', '-l', label, '-s', 'open', '--json', 'number,title,labels', '--limit', '50']));
      readyIssues = JSON.parse(gh(['issue', 'list', '-l', label, '-l', 'status:ready', '-s', 'open', '--json', 'number,title,labels', '--limit', '10']));
    } catch { /* label may not exist yet */ }

    const topIssue = readyIssues[0] || openIssues[0];
    const topStr = topIssue ? `#${topIssue.number} ${topIssue.title.slice(0, 35)}` : '(none)';
    console.log(`  ${stream.padEnd(12)}${String(readyIssues.length).padEnd(7)}${String(openIssues.length).padEnd(7)}${topStr}`);
  }
  console.log();
}

// Map streams to fallback mod: labels (auto-generated from stream name)
function getModLabels(stream: string): string[] {
  return [`mod:${stream}`];
}

function streamPick(stream: Stream): void {
  const streamLabel = `stream:${stream}`;
  const modLabels = getModLabels(stream);
  let ready: GhIssue[] = [];
  let all: GhIssue[] = [];

  // Try stream:X label first, fall back to mod:X labels
  ready = JSON.parse(gh(['issue', 'list', '-l', streamLabel, '-l', 'status:ready', '-s', 'open', '--json', 'number,title,labels', '--limit', '5']));
  if (!ready.length) {
    all = JSON.parse(gh(['issue', 'list', '-l', streamLabel, '-s', 'open', '--json', 'number,title,labels', '--limit', '5']));
  }

  // Fallback to mod: labels if no stream: labels exist
  if (!ready.length && !all.length) {
    for (const modLabel of modLabels) {
      const modIssues: GhIssue[] = JSON.parse(gh(['issue', 'list', '-l', modLabel, '-s', 'open', '--json', 'number,title,labels', '--limit', '5']));
      all.push(...modIssues);
    }
    // Deduplicate by issue number
    all = [...new Map(all.map((i) => [i.number, i])).values()];
  }

  const issues = ready.length ? ready : all;
  if (!issues.length) {
    console.log(`[orchestra] No open issues for ${label}.`);
    return;
  }

  console.log(`\n  Stream: ${stream} — ${ready.length ? 'Ready' : 'Open'} Tasks\n`);
  for (const issue of issues) {
    const labels = issue.labels.map((l: { name: string }) => l.name).filter((n: string) => !n.startsWith('stream:'));
    const sizeLabel = labels.find((l: string) => l.startsWith('size:'));
    const isBreaking = labels.some((l: string) => l === 'shared:breaking');

    let recommendation = 'dispatch claude';
    if (isBreaking) recommendation = 'orchestra deliberate (shared:breaking!)';
    else if (sizeLabel === 'size:L') recommendation = 'orchestra fanout all (large task)';
    else if (sizeLabel === 'size:M') recommendation = 'dispatch claude (medium, straightforward)';

    console.log(`  #${issue.number} ${issue.title}`);
    console.log(`    labels: ${labels.join(', ') || '(none)'}`);
    console.log(`    recommended: ${recommendation}`);
    console.log();
  }

  console.log(`  Directories: ${STREAM_DIRS[stream].join(', ')}`);
  console.log(`  Start: gh issue edit ${issues[0].number} --add-label "status:in-progress"\n`);
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'dispatch': {
      const [agent, ...rest] = args;
      const prompt = resolvePrompt(rest);
      if (!agent || !prompt) { console.error('Usage: orchestra dispatch <agent> <prompt|file>'); process.exit(1); }
      const r = await dispatch(agent, prompt);
      if (r.status === 'ok') console.log(r.content);
      else { console.error(`[error] ${r.content}`); process.exit(1); }
      break;
    }

    case 'fanout': {
      const [agentList, ...rest] = args;
      const prompt = resolvePrompt(rest);
      if (!agentList || !prompt) { console.error('Usage: orchestra fanout <a1,a2,...|all> <prompt|file>'); process.exit(1); }
      const agents = agentList === 'all' ? Object.keys(loadAgents()) : agentList.split(',');
      await fanout(prompt, agents);
      break;
    }

    case 'synthesize': {
      const [sessionId] = args;
      if (!sessionId) {
        mkdirSync(SESSIONS_DIR, { recursive: true });
        const dirs = readdirSync(SESSIONS_DIR)
          .filter((d) => existsSync(join(SESSIONS_DIR, d, 'session.json')))
          .sort().reverse();
        if (!dirs.length) { console.log('No sessions.'); break; }
        console.log('Sessions:');
        dirs.slice(0, 10).forEach((d) => console.log(`  ${d}`));
        console.log('\nUsage: orchestra synthesize <session-id>');
        break;
      }
      const prompt = synthesize(sessionId);
      console.log('\n' + prompt);
      break;
    }

    case 'deliberate': {
      const roundsIdx = args.indexOf('--rounds');
      const maxRounds = roundsIdx >= 0 ? parseInt(args[roundsIdx + 1], 10) || 3 : 3;
      const promptArgs = args.filter((_, i) => i !== roundsIdx && (roundsIdx < 0 || i !== roundsIdx + 1));
      const prompt = resolvePrompt(promptArgs);
      if (!prompt) { console.error('Usage: orchestra deliberate <prompt|file> [--rounds N]'); process.exit(1); }
      await deliberate(prompt, maxRounds);
      break;
    }

    case 'list': {
      const agents = loadAgents();
      console.log('\nAgents:\n');
      for (const [name, cfg] of Object.entries(agents)) {
        console.log(`  ${name}: ${cfg.command} ${cfg.args.join(' ')}`);
        if (cfg.strengths?.length) console.log(`    strengths: ${cfg.strengths.join(', ')}`);
        console.log();
      }
      break;
    }

    case 'sessions': {
      mkdirSync(SESSIONS_DIR, { recursive: true });
      const dirs = readdirSync(SESSIONS_DIR)
        .filter((d) => existsSync(join(SESSIONS_DIR, d, 'session.json')))
        .sort().reverse();
      if (!dirs.length) { console.log('No sessions.'); break; }
      console.log('\nSessions:\n');
      for (const d of dirs.slice(0, 10)) {
        const s = loadSession(d);
        const ok = s.responses.filter((r) => r.status === 'ok').length;
        console.log(`  ${d}  [${s.agents.join(',')}]  ${ok}/${s.responses.length} ok`);
        console.log(`    ${s.task.slice(0, 80)}${s.task.length > 80 ? '...' : ''}`);
      }
      break;
    }

    case 'streams': {
      streamStatus();
      break;
    }

    case 'pick': {
      const [streamName] = args;
      if (!streamName || !STREAMS.includes(streamName as Stream)) {
        console.error(`Usage: orchestra pick <${STREAMS.join('|')}>`);
        process.exit(1);
      }
      streamPick(streamName as Stream);
      break;
    }

    default:
      console.log(`Orchestra v0.2 — Multi-LLM Agent Dispatcher + Stream Coordinator

Agent Commands:
  dispatch <agent> <prompt|file>           Send to one agent
  fanout <agents|all> <prompt|file>        Parallel dispatch to multiple agents
  synthesize [session-id]                  Generate consensus prompt from session
  deliberate <prompt|file> [--rounds N]    Full consensus loop (default 3 rounds)
  list                                     Show configured agents
  sessions                                 List recent sessions

Stream Commands:
  streams                                  Show all stream status (from GitHub Issues)
  pick <backend|web|mobile|data>           Pick next task for a stream

Examples:
  ./run streams                              See what's happening across all streams
  ./run pick mobile                          Pick next task for mobile stream
  ./run deliberate concept.md --rounds 2     Multi-LLM consensus on architecture
  ./run fanout codex,gemini review.md        Get review from non-Claude agents`);
  }
}

main().catch((err) => {
  console.error(`[orchestra] Fatal: ${err.message}`);
  process.exit(1);
});
