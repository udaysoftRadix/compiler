import { OPENROUTER_FALLBACK_MODELS } from './openrouterModels';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 30000;

export type AiHelpMode = 'hint' | 'solution' | 'ask';

export interface AiHelpRequest {
  mode: AiHelpMode;
  language: string;
  code: string;
  consoleOutput?: string;
  question?: string;
}

export interface AiHelpResult {
  content: string;
  model: string;
}

export class AiHelpError extends Error {}

function getApiKey(): string | undefined {
  return import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
}

export function hasApiKey(): boolean {
  return Boolean(getApiKey());
}

function buildMessages({ mode, language, code, consoleOutput, question }: AiHelpRequest) {
  const context = [
    `Language/environment: ${language}`,
    '',
    'Current code:',
    '```',
    code,
    '```',
    consoleOutput?.trim() ? `\nConsole/output so far:\n${consoleOutput.trim()}` : '',
  ].join('\n');

  const formatting =
    'Format your entire reply in Markdown. Use short paragraphs and bullet points where useful. ' +
    'Whenever you include code, put it in a fenced code block with a language tag right after the opening fence ' +
    "(e.g. ```js). If the block represents a whole file, make the very first line inside the fence a comment naming " +
    'the file in that language\'s comment syntax (e.g. `// filename: sort.js` or `# filename: sort.py`).';

  if (mode === 'hint') {
    return [
      {
        role: 'system',
        content:
          'You are a patient coding tutor embedded in an online code editor. The user is stuck and wants a HINT, not the answer. ' +
          'Point them toward the specific issue (what part of the code, what concept) and suggest a direction to investigate, ' +
          'but do NOT write corrected code or give the full fix. Keep it to 2-4 short sentences, no headings, no code blocks.',
      },
      { role: 'user', content: context },
    ];
  }

  if (mode === 'solution') {
    return [
      {
        role: 'system',
        content:
          'You are a coding assistant embedded in an online code editor. The user wants the full solution. ' +
          'Structure your reply with exactly two headings, in this order: ' +
          '"## Problem" (1-2 sentences on what is wrong) and "## Solution" (what to change, then the complete corrected ' +
          `code in a fenced code block). ${formatting}`,
      },
      { role: 'user', content: context },
    ];
  }

  return [
    {
      role: 'system',
      content: `You are a coding assistant embedded in an online code editor. Answer the user question about their code concisely and helpfully. ${formatting}`,
    },
    { role: 'user', content: `${context}\n\nQuestion: ${question ?? ''}` },
  ];
}

async function callModel(model: string, messages: unknown, apiKey: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Online Code Compiler',
    },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  });

  if (!res.ok) {
    throw new AiHelpError(`HTTP ${res.status}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new AiHelpError('Empty response');
  }
  return content;
}

export async function requestAiHelp(request: AiHelpRequest): Promise<AiHelpResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new AiHelpError('Missing VITE_OPENROUTER_API_KEY. Add it to your .env file and restart the dev server.');
  }

  const messages = buildMessages(request);
  const errors: string[] = [];

  for (const { model } of OPENROUTER_FALLBACK_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const content = await callModel(model, messages, apiKey, controller.signal);
      clearTimeout(timer);
      return { content, model };
    } catch (err) {
      clearTimeout(timer);
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${model}: ${message}`);
    }
  }

  throw new AiHelpError(`All models failed.\n${errors.join('\n')}`);
}
