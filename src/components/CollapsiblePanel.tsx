import { useState, type ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  badge?: string | number;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export function CollapsiblePanel({
  title,
  subtitle,
  badge,
  defaultOpen = true,
  className = "",
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`panel collapsible-panel ${open ? "collapsible-panel--open" : ""} ${className}`.trim()}
    >
      <button
        type="button"
        className="collapsible-panel__header"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="collapsible-panel__chevron" aria-hidden />
        <span className="collapsible-panel__titles">
          <span className="collapsible-panel__title">{title}</span>
          {subtitle && (
            <span className="collapsible-panel__subtitle">{subtitle}</span>
          )}
        </span>
        {badge !== undefined && badge !== "" && (
          <span className="badge">{badge}</span>
        )}
      </button>
      <div className="collapsible-panel__body" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
