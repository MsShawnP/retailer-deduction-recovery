const CHAPTERS = [
  { id: 1, label: "The Problem" },
  { id: 2, label: "Why This Happens" },
  { id: 3, label: "The Evidence Gap" },
  { id: 4, label: "What to Do About It" },
] as const;

export type ChapterId = 1 | 2 | 3 | 4;

interface Props {
  active: ChapterId;
  onChange: (chapter: ChapterId) => void;
}

export default function ChapterNav({ active, onChange }: Props) {
  return (
    <nav className="chapter-nav">
      {CHAPTERS.map(({ id, label }) => (
        <button
          key={id}
          className={active === id ? "chapter-tab active" : "chapter-tab"}
          onClick={() => onChange(id)}
        >
          <span className="chapter-num">{id}</span>
          {label}
        </button>
      ))}
    </nav>
  );
}
