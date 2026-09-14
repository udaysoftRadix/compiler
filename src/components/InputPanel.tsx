interface InputPanelProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function InputPanel({ value, onChange, placeholder }: InputPanelProps) {
  return (
    <div className="io-panel input-panel">
      <div className="io-panel-header">
        <span>Input (stdin)</span>
      </div>
      <textarea
        className="io-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Type input here, one value per line.'}
        spellCheck={false}
      />
    </div>
  );
}
