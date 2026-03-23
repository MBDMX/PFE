interface Props {
  text: string;
  highlight: string;
}

export default function HighlightText({ text, highlight }: Props) {
  if (!highlight.trim()) return <span>{text}</span>;
  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part)
          ? <span key={i} className="text-blue-400 underline decoration-blue-500/30 underline-offset-2">{part}</span>
          : part
      )}
    </span>
  );
}