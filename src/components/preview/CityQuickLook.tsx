"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CityView } from "@/components/city/CityView";
import { usePreview, type PreviewPayload } from "@/components/preview/PreviewContext";
import { getDestinationBySlug } from "@/data/music-travel";
import { upcomingYearForMonth, yearQueryFor } from "@/data/taxonomy";
import { trackEvent } from "@/lib/analytics";

export { QUICK_LOOK_DESC_ID, QUICK_LOOK_TITLE_ID } from "@/components/city/CityView";

type Payload = Extract<PreviewPayload, { kind: "destination" }>;

export function CityQuickLook({ payload, onClose }: { payload: Payload; onClose: () => void }) {
  const preview = usePreview();
  const { destinationSlug, month, siblings, stepFocus } = payload;
  const year = payload.year ?? upcomingYearForMonth(month);

  useEffect(() => {
    if (!stepFocus) return;
    const button = document.querySelector<HTMLButtonElement>(`aside [aria-label="${stepFocus}"]`);
    (button && !button.disabled ? button : document.querySelector<HTMLElement>("aside [data-autofocus]"))?.focus({ preventScroll: true });
  }, [stepFocus]);

  const siblingIndex = siblings ? siblings.indexOf(destinationSlug) : -1;
  const prev = siblingIndex > 0 && siblings ? siblings[siblingIndex - 1] : null;
  const next = siblingIndex >= 0 && siblings && siblingIndex < siblings.length - 1 ? siblings[siblingIndex + 1] : null;
  const prevCity = prev ? getDestinationBySlug(prev)?.city : undefined;
  const nextCity = next ? getDestinationBySlug(next)?.city : undefined;
  const goTo = (slug: string, focus?: "Previous city" | "Next city") => {
    preview?.open({ ...payload, destinationSlug: slug, stepFocus: focus });
    trackEvent("preview_step", { from: destinationSlug, to: slug });
  };
  const guideHref = `/destinations/${destinationSlug}?month=${month}${yearQueryFor(month, year)}`;

  const header = (
    <>
      <StepKeys prev={prev} next={next} onStep={goTo} />
      <div data-sheet-grab className="shrink-0 touch-none sm:touch-auto">
        <span aria-hidden className="mx-auto mt-2 block h-1 w-10 rounded-full bg-[var(--foreground)]/20 sm:hidden" />
        <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-1.5 sm:px-5 sm:py-3">
          <div className="flex items-center gap-1.5">
            {siblings && siblings.length > 1 ? (
              <>
                <StepButton
                  label="Previous city"
                  title={prevCity ? `Previous: ${prevCity}` : undefined}
                  disabled={!prev}
                  onClick={() => prev && goTo(prev, "Previous city")}
                >
                  ‹
                </StepButton>
                <StepButton
                  label="Next city"
                  title={nextCity ? `Next: ${nextCity}` : undefined}
                  disabled={!next}
                  onClick={() => next && goTo(next, "Next city")}
                >
                  ›
                </StepButton>
                <span className="ml-1 text-[13px] font-medium tabular-nums text-[var(--muted)]">
                  {siblingIndex + 1} of {siblings.length}
                </span>
              </>
            ) : (
              <span className="text-[13px] font-medium text-[var(--muted)]">Quick look</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={guideHref}
              replace
              onClick={() => {
                trackEvent("preview_open_guide", { slug: destinationSlug, month });
                preview?.dismiss();
              }}
              className="inline-flex h-10 items-center rounded-full px-3 text-[14px] font-semibold text-[var(--foreground)] underline-offset-4 transition hover:underline"
            >
              <span className="sm:hidden">Guide</span>
              <span className="hidden sm:inline">City guide</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              data-autofocus
              className="grid h-10 w-10 place-items-center rounded-full text-[15px] text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
            >
              ✕
            </button>
          </div>
        </header>
      </div>
    </>
  );

  return (
    <CityView
      slug={destinationSlug}
      month={month}
      year={year}
      variant="sheet"
      header={header}
      onLeave={() => preview?.dismiss()}
      onMonthChange={(m) => preview?.open({ ...payload, month: m, year: upcomingYearForMonth(m), stepFocus: undefined })}
    />
  );
}

function StepButton({
  label,
  title,
  disabled,
  onClick,
  children
}: {
  label: string;
  title?: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border-strong)] text-[20px] leading-none text-[var(--foreground)] transition hover:border-[var(--foreground)] disabled:opacity-30 disabled:hover:border-[var(--border-strong)]"
    >
      <span aria-hidden className="-mt-0.5">
        {children}
      </span>
    </button>
  );
}

function StepKeys({ prev, next, onStep }: { prev: string | null; next: string | null; onStep: (slug: string) => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const neutral = !target || target === document.body || target.matches("aside[role='dialog'], [aria-label='Previous city'], [aria-label='Next city']");
      if (!neutral || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowLeft" && prev) onStep(prev);
      if (event.key === "ArrowRight" && next) onStep(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onStep]);
  return null;
}
