"use client";

import ReactMarkdown from "react-markdown";

type ChatMarkdownProps = {
  content: string;
};

/**
 * Markdown renderer for assistant messages in the composer chat.
 *
 * Tuned to the editorial palette: bold pops in signal orange, bullets get
 * mono micro-eyebrows, links inherit the signal hover. Strips outer paragraph
 * margins so the rendered prose hugs the bubble.
 *
 * Safe to stream into: ReactMarkdown handles partial inputs (e.g. an unclosed
 * `**`) without throwing.
 */
export function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <div className="wn-chat-md text-[15px] leading-7 text-[var(--foreground)]">
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="my-2 leading-7 first:mt-0 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--signal)]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[var(--foreground)]/90">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="my-2 space-y-1 pl-1 first:mt-0 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1 pl-5 list-decimal first:mt-0 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2.5 leading-7 marker:text-[var(--signal)]">
              <span
                aria-hidden
                className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--signal)]"
              />
              <span className="flex-1">{children}</span>
            </li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="font-medium text-[var(--signal)] underline decoration-[var(--signal)]/40 underline-offset-2 transition hover:decoration-[var(--signal)]"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded-md border border-[var(--border)] bg-[var(--background)]/60 px-1.5 py-0.5 font-mono text-[12px] text-[var(--foreground)]">
              {children}
            </code>
          ),
          h1: ({ children }) => (
            <h3 className="mt-3 mb-2 text-[16px] font-medium tracking-[-0.01em] text-[var(--foreground)] first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="mt-3 mb-2 text-[15px] font-medium tracking-[-0.01em] text-[var(--foreground)] first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mt-2 mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] first:mt-0">
              {children}
            </h4>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-[var(--signal)] pl-3 italic text-[var(--foreground)]/85">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-t border-[var(--border)]" />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
