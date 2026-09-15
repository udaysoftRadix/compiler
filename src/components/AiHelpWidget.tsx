import { useEffect, useRef, useState } from 'react';
import { requestAiHelp, hasApiKey, type AiHelpMode } from '../ai/openrouter';
import { renderMarkdown } from '../ai/markdown';
import { IconCheckCircle, IconLightbulb, IconMaximize, IconMinimize, IconSend, IconSparkles, IconX } from './icons';
import './AiHelpWidget.css';

interface AiHelpWidgetProps {
  language: string;
  code: string;
  consoleOutput?: string;
}

interface Turn {
  id: string;
  role: 'user' | 'assistant' | 'error';
  mode: AiHelpMode;
  text: string;
  model?: string;
}

const MODE_LABEL: Record<AiHelpMode, string> = {
  hint: 'Hint requested',
  solution: 'Full solution requested',
  ask: '',
};

let nextId = 0;

export function AiHelpWidget({ language, code, consoleOutput }: AiHelpWidgetProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<AiHelpMode | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, loading]);

  async function runRequest(mode: AiHelpMode, questionText?: string) {
    if (loading) return;
    if (mode === 'ask' && !questionText?.trim()) return;

    const userLabel = mode === 'ask' ? questionText!.trim() : MODE_LABEL[mode];
    setTurns((prev) => [...prev, { id: `t${nextId++}`, role: 'user', mode, text: userLabel }]);
    setLoading(true);
    setActiveMode(mode);
    if (mode === 'ask') setQuestion('');

    try {
      const result = await requestAiHelp({ mode, language, code, consoleOutput, question: questionText });
      setTurns((prev) => [...prev, { id: `t${nextId++}`, role: 'assistant', mode, text: result.content, model: result.model }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTurns((prev) => [...prev, { id: `t${nextId++}`, role: 'error', mode, text: message }]);
    } finally {
      setLoading(false);
    }
  }

  function handleTextareaInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      runRequest('ask', question);
    }
  }

  const apiKeyMissing = !hasApiKey();

  return (
    <>
      <button className="ai-help-fab" onClick={() => setOpen((o) => !o)} title="AI help" aria-label="Toggle AI help">
        {open ? <IconX size={20} /> : <IconSparkles size={20} />}
      </button>

      {open && (
        <div className={`ai-help-panel ${expanded ? 'expanded' : ''}`}>
          <div className="ai-help-header">
            <div className="ai-help-header-title">
              <span className="ai-help-header-icon">
                <IconSparkles size={14} />
              </span>
              <span>AI Assistant</span>
            </div>
            <div className="ai-help-header-right">
              <span className={`ai-help-status ${apiKeyMissing ? 'offline' : 'online'}`}>
                <span className="ai-help-status-dot" />
                {apiKeyMissing ? 'Not configured' : 'Online'}
              </span>
              <button
                className="ai-help-expand"
                onClick={() => setExpanded((e) => !e)}
                aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <IconMinimize size={14} /> : <IconMaximize size={14} />}
              </button>
              <button className="ai-help-close" onClick={() => setOpen(false)} aria-label="Close">
                <IconX size={14} />
              </button>
            </div>
          </div>

          <div className="ai-help-segmented">
            <button
              className={activeMode === 'hint' ? 'active' : ''}
              disabled={loading}
              onClick={() => runRequest('hint')}
            >
              <IconLightbulb size={14} />
              Hint
            </button>
            <button
              className={activeMode === 'solution' ? 'active' : ''}
              disabled={loading}
              onClick={() => runRequest('solution')}
            >
              <IconCheckCircle size={14} />
              Full Solution
            </button>
          </div>

          <div className="ai-help-body" ref={scrollRef}>
            {turns.length === 0 && !loading && (
              <div className="ai-help-empty">
                <IconSparkles size={22} className="ai-help-empty-icon" />
                Stuck? Ask for a hint, the full solution, or type a question below.
              </div>
            )}

            {turns.map((turn) => (
              <div className={`ai-turn ai-turn-${turn.role}`} key={turn.id}>
                {turn.role === 'user' && (
                  <div className="ai-turn-user-bubble">
                    {turn.mode === 'hint' && <IconLightbulb size={13} />}
                    {turn.mode === 'solution' && <IconCheckCircle size={13} />}
                    {turn.text}
                  </div>
                )}
                {turn.role === 'assistant' && (
                  <div className="ai-turn-assistant-bubble">
                    <div className="ai-markdown">{renderMarkdown(turn.text)}</div>
                    {turn.model && <div className="ai-help-model">via {turn.model}</div>}
                  </div>
                )}
                {turn.role === 'error' && <pre className="ai-help-error">{turn.text}</pre>}
              </div>
            ))}

            {loading && (
              <div className="ai-turn ai-turn-assistant">
                <div className="ai-turn-assistant-bubble ai-help-loading">
                  <span className="ai-help-dot" />
                  <span className="ai-help-dot" />
                  <span className="ai-help-dot" />
                </div>
              </div>
            )}
          </div>

          <div className="ai-help-ask">
            <textarea
              ref={textareaRef}
              placeholder="Ask a question about your code…"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                handleTextareaInput();
              }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
            />
            <button
              className="ai-help-send"
              disabled={loading || !question.trim()}
              onClick={() => runRequest('ask', question)}
              aria-label="Send"
              title="Send (Enter)"
            >
              <IconSend size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
