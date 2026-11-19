import React from "react";

interface SafeMarkdownProps {
  content: string;
  onCitationClick?: (citationNum: number) => void;
}

function renderInlineTokens(
  text: string,
  onCitationClick?: (citationNum: number) => void
): React.ReactNode[] {
  // Split safely into bold (**...**), inline code (`...`), and citation markers ([1])
  const tokenRe = /(\*\*[^*]+\*\*|`[^`]+`|\[\d+\])/g;
  const parts = text.split(tokenRe);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-inherit">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-400/30 font-mono text-[0.85em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const citeMatch = /^\[(\d+)\]$/.exec(part);
    if (citeMatch) {
      const num = Number(citeMatch[1]);
      return (
        <button
          key={idx}
          type="button"
          onClick={() => onCitationClick?.(num)}
          className="inline-flex items-center justify-center mx-0.5 px-1.5 py-0.5 rounded-md bg-sky-500/20 hover:bg-sky-400/35 border border-sky-400/45 text-sky-300 font-mono text-[11px] font-bold cursor-pointer align-baseline transition"
          title={`View source [${num}]`}
        >
          [{num}]
        </button>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Pure React JSX Markdown renderer without dangerouslySetInnerHTML so untrusted or LLM text
 * can never inject raw HTML or scripts into the DOM.
 */
export function SafeMarkdown({ content, onCitationClick }: SafeMarkdownProps) {
  const lines = (content || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: { ordered: boolean; text: string }[] = [];

  const flushList = (keyBase: string) => {
    if (listItems.length === 0) return;
    const isOrdered = listItems[0].ordered;
    const Tag = isOrdered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={keyBase}
        className={`pl-5 space-y-1 my-1.5 ${isOrdered ? "list-decimal" : "list-disc"}`}
      >
        {listItems.map((it, i) => (
          <li key={i} className="leading-relaxed">
            {renderInlineTokens(it.text, onCitationClick)}
          </li>
        ))}
      </Tag>
    );
    listItems = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`list-${idx}`);
      return;
    }

    if (line.startsWith("### ")) {
      flushList(`list-${idx}`);
      blocks.push(
        <h4 key={`h3-${idx}`} className="font-bold text-sm mt-2.5 mb-1">
          {renderInlineTokens(line.slice(4), onCitationClick)}
        </h4>
      );
      return;
    }
    if (line.startsWith("## ")) {
      flushList(`list-${idx}`);
      blocks.push(
        <h3 key={`h2-${idx}`} className="font-bold text-base mt-3 mb-1">
          {renderInlineTokens(line.slice(3), onCitationClick)}
        </h3>
      );
      return;
    }
    if (line.startsWith("# ")) {
      flushList(`list-${idx}`);
      blocks.push(
        <h3 key={`h1-${idx}`} className="font-bold text-base mt-3 mb-1">
          {renderInlineTokens(line.slice(2), onCitationClick)}
        </h3>
      );
      return;
    }

    const ulMatch = /^[-*•]\s+(.+)$/.exec(line);
    if (ulMatch) {
      if (listItems.length > 0 && listItems[0].ordered) flushList(`list-${idx}`);
      listItems.push({ ordered: false, text: ulMatch[1] });
      return;
    }

    const olMatch = /^\d+[.)]\s+(.+)$/.exec(line);
    if (olMatch) {
      if (listItems.length > 0 && !listItems[0].ordered) flushList(`list-${idx}`);
      listItems.push({ ordered: true, text: olMatch[1] });
      return;
    }

    flushList(`list-${idx}`);
    blocks.push(
      <p key={`p-${idx}`} className="leading-relaxed">
        {renderInlineTokens(line, onCitationClick)}
      </p>
    );
  });

  flushList("list-end");
  return <div className="space-y-1.5 text-sm break-words">{blocks}</div>;
}
