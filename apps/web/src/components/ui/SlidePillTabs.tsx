import React, { useRef } from "react";
import { motion } from "motion/react";

export interface PillTabItem {
  id: string;
  label: string;
}

export interface SlidePillTabsProps {
  items: PillTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  layoutGroupId?: string;
  className?: string;
}

export function SlidePillTabs({
  items,
  activeId,
  onChange,
  ariaLabel,
  layoutGroupId = "pill-tabs",
  className = "",
}: SlidePillTabsProps) {
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx = idx;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % items.length;
    else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + items.length) % items.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = items.length - 1;
    else return;

    e.preventDefault();
    const nextItem = items[nextIdx];
    if (nextItem) {
      onChange(nextItem.id);
      btnRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-full border p-1 ${className}`}
      style={{
        backgroundColor: "var(--color-surface-alt)",
        borderColor: "var(--color-border)",
      }}
    >
      {items.map((item, idx) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            ref={(el) => {
              btnRefs.current[idx] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${layoutGroupId}-${item.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            data-testid={`pill-tab-${item.id}`}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className="relative inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full px-4 text-xs font-semibold whitespace-nowrap transition-colors"
            style={{
              color: isActive ? "var(--color-primary-contrast)" : "var(--color-text-muted)",
            }}
          >
            {isActive ? (
              <motion.span
                layoutId={layoutGroupId}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: "var(--color-primary)",
                  boxShadow: "var(--shadow-pill)",
                }}
                aria-hidden="true"
              />
            ) : null}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
