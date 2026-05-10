"use client";

import { useEffect, useRef, useState } from "react";

type Option = { label: string; value: string };

type FilterPopoverProps = {
  label: string;
  value: string;
  defaultValue: string;
  defaultLabel?: string;
  options: Option[];
  onChange: (value: string) => void;
  align?: "start" | "end";
};

export function FilterPopover({
  label,
  value,
  defaultValue,
  defaultLabel,
  options,
  onChange,
  align = "start"
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const isDirty = value !== defaultValue;
  const selected = options.find((option) => option.value === value);
  const displayValue = selected?.label ?? defaultLabel ?? defaultValue;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openMenu() {
    const idx = options.findIndex((option) => option.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function handleTriggerKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu();
    }
  }

  function handleListKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) {
        onChange(option.value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    }
  }

  function handleClear(event: React.MouseEvent | React.KeyboardEvent) {
    event.stopPropagation();
    onChange(defaultValue);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKey}
        className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
          isDirty
            ? "border-[var(--signal)]/55 bg-[var(--signal)]/10 text-[var(--foreground)] hover:border-[var(--signal)]"
            : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
        }`}
      >
        <span className="text-[var(--muted)]">{label}</span>
        <span className="text-[var(--foreground)]">{displayValue.toLowerCase()}</span>
        {isDirty ? (
          <span
            role="button"
            aria-label={`clear ${label} filter`}
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleClear(event);
              }
            }}
            className="-mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--signal)]/20 hover:text-[var(--signal)]"
          >
            ×
          </span>
        ) : (
          <span aria-hidden className="text-[var(--muted-2)]">▾</span>
        )}
      </button>

      {open ? (
        <div
          ref={(node) => {
            listRef.current = node;
            if (node) node.focus();
          }}
          role="listbox"
          tabIndex={-1}
          aria-label={`${label} options`}
          onKeyDown={handleListKey}
          className={`absolute z-[700] mt-2 max-h-72 w-44 overflow-auto rounded-md border border-[var(--border-strong)] bg-[var(--surface)] py-1 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-md focus:outline-none ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFocused = index === activeIndex;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.16em] transition ${
                  isFocused ? "bg-[var(--surface-2)]" : ""
                } ${isSelected ? "text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              >
                <span>{option.label.toLowerCase()}</span>
                {isSelected ? (
                  <span aria-hidden className="text-[var(--signal)]">●</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
