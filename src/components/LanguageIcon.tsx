import './LanguageIcon.css';

const iconUrls = import.meta.glob('../assets/lang-icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

interface LanguageIconProps {
  id?: string;
  size?: number;
}

export function LanguageIcon({ id, size = 16 }: LanguageIconProps) {
  const url = id ? iconUrls[`../assets/lang-icons/${id}.svg`] : undefined;
  const box = size + 6;

  return (
    <span className="lang-icon" style={{ width: box, height: box }} aria-hidden="true">
      {url && <img src={url} width={size} height={size} alt="" draggable={false} />}
    </span>
  );
}
