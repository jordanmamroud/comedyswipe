"use client";

import { useEffect, useState, useRef } from "react";
import { NotionBlocks } from "@/components/NotionBlock";
import type { NotionPage } from "@/lib/notion";

export default function Home() {
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function streamPages() {
      try {
        const res = await fetch("/api/notion");

        if (!res.ok || !res.body) {
          const data = await res.json();
          setError(data.error || "Failed to fetch pages");
          setLoading(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const parsed = JSON.parse(line);
            if (parsed.error) {
              setError(parsed.error);
            } else {
              setPages((prev) => [...prev, parsed]);
            }
          }
        }

        // Handle any remaining data in buffer
        if (buffer.trim()) {
          const parsed = JSON.parse(buffer);
          if (parsed.error) {
            setError(parsed.error);
          } else {
            setPages((prev) => [...prev, parsed]);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    streamPages();
  }, []);

  const handleCopy = async () => {
    if (!contentRef.current) return;

    try {
      // Copy the rich HTML content so Evernote preserves formatting
      const html = contentRef.current.innerHTML;
      const text = contentRef.current.innerText;

      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      alert("Copied to clipboard! Paste into Evernote to preserve formatting.");
    } catch {
      // Fallback: select all text in the content area
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      alert(
        "Content selected! Press Ctrl+C (or Cmd+C) to copy, then paste into Evernote."
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSelectAll = () => {
    if (!contentRef.current) return;
    const range = document.createRange();
    range.selectNodeContents(contentRef.current);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  if (error && pages.length === 0) {
    return (
      <div className="error-box">
        <h2>Error</h2>
        <p>{error}</p>
        <p style={{ marginTop: 12, fontSize: 14 }}>
          Make sure your <code>.env.local</code> has valid{" "}
          <code>NOTION_TOKEN</code> and <code>NOTION_DATABASE_ID</code> values,
          and that the integration has access to the database.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <h1>Notion Print View</h1>
        <span className="status">
          {pages.length} pages loaded{loading ? " (loading more...)" : ""}
        </span>
        <button onClick={handleSelectAll}>Select All</button>
        <button onClick={handleCopy}>Copy All (Rich Text)</button>
        <button className="primary" onClick={handlePrint}>
          Print
        </button>
      </div>

      {pages.length === 0 && loading && (
        <div className="loading">
          <div className="spinner" />
          <p>Fetching pages from Notion...</p>
        </div>
      )}

      <div className="content" ref={contentRef}>
        {pages.map((page) => (
          <div key={page.id} className="notion-page">
            <h1 className="page-title">{page.title}</h1>
            <NotionBlocks blocks={page.blocks} />
          </div>
        ))}
      </div>
    </>
  );
}
