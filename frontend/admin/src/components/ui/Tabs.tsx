import type { TabItem } from "../../types";

interface Props {
  tabs: TabItem[];
  value: string;
  onChange: (key: string) => void;
}

export default function Tabs({ tabs, value, onChange }: Props) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          className={`tab${value === t.key ? " active" : ""}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
