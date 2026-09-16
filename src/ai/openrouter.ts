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
      content:
        'You are a coding assistant embedded in an online code editor. Only answer questions about the code shown below, ' +
        'the language/framework it uses, debugging it, or programming concepts directly relevant to it. ' +
        'If the question is unrelated to programming or this code (general trivia, products, people, etc.), do NOT answer it — ' +
        'reply with exactly one short sentence saying you can only help with the code in the editor, and nothing else. ' +
        `${formatting}`,
    },
    { role: 'user', content: `${context}\n\nQuestion: ${question ?? ''}` },
  ];
}

class ModelCallError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
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
    throw new ModelCallError(`HTTP ${res.status}`, res.status);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new ModelCallError('Empty response');
  }
  return content;
}

export async function requestAiHelp(request: AiHelpRequest): Promise<AiHelpResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new AiHelpError("AI help isn't set up yet. Ask whoever runs this deployment to add an OpenRouter API key.");
  }

  const messages = buildMessages(request);
  const errors: { model: string; status?: number; message: string }[] = [];

  for (const { model } of OPENROUTER_FALLBACK_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const content = await callModel(model, messages, apiKey, controller.signal);
      clearTimeout(timer);
      return { content, model };
    } catch (err) {
      clearTimeout(timer);
      const status = err instanceof ModelCallError ? err.status : undefined;
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ model, status, message });
    }
  }

  console.error('[AI help] every fallback model failed:', errors);

  const allRateLimited = errors.length > 0 && errors.every((e) => e.status === 429);
  throw new AiHelpError(
    allRateLimited
      ? "We've hit today's free AI usage limit. Please try again later."
      : "Couldn't reach the AI assistant right now. Please try again in a moment.",
  );
}
