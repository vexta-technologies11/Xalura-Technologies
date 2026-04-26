/**
 * Light markdown → HTML for compliance officer memos (email-safe).
 * Supports: ## / ### headings, paragraphs, - bullets, **bold**, pipe tables.
 */

function isMarkdownTableSeparatorRow(line: string): boolean {
  const t = line.trim();
  if (!t.includes("|") || !t.includes("-")) return false;
  const parts = t.split("|").map((c) => c.trim()).filter(Boolean);
  return (
    parts.length > 0 &&
    parts.every((c) => /^:?-{3,}:?$/.test(c) || c.replace(/-+/g, "") === "")
  );
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(s: string): string {
  const parts = s.split(/\*\*/);
  return parts
    .map((p, i) => (i % 2 === 1 ? `<strong>${esc(p)}</strong>` : esc(p)))
    .join("");
}

export function complianceMemoMarkdownToEmailHtml(md: string): string {
  const t = md.replace(/\r\n/g, "\n").trim();
  if (!t) return "";

  const lines = t.split("\n");
  const out: string[] = [];
  let i = 0;
  const flushPara = (buf: string[]) => {
    if (buf.length === 0) return;
    const j = buf.join(" ").replace(/\s+/g, " ").trim();
    buf.length = 0;
    if (!j) return;
    out.push(
      `<p style="margin:0 0 14px 0;line-height:1.6;color:#1a1a1a;font-size:15px;">${inlineFormat(j)}</p>`,
    );
  };

  const paraBuf: string[] = [];

  const tableFromRows = (rows: string[]) => {
    if (rows.length < 2) {
      for (const r of rows) {
        out.push(
          `<p style="margin:0 0 8px 0;font-family:ui-monospace,monospace;font-size:12px;color:#333;">${esc(
            r,
          )}</p>`,
        );
      }
      return;
    }
    const cells = (line: string) =>
      line
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    const header = cells(rows[0]!);
    if (rows[1] && isMarkdownTableSeparatorRow(rows[1]!)) {
      rows = [rows[0]!, ...rows.slice(2)];
    }
    const th = header
      .map(
        (c) =>
          `<th style="text-align:left;padding:8px 12px;border:1px solid #ccc;background:#f4f4f2;font-size:13px;">${inlineFormat(
            c,
          )}</th>`,
      )
      .join("");
    const trs: string[] = [];
    for (const row of rows.slice(1)) {
      if (!row.trim().startsWith("|")) continue;
      const c = cells(row);
      if (c.length === 0) continue;
      trs.push(
        `<tr>${c
          .map(
            (cell) =>
              `<td style="padding:8px 12px;border:1px solid #ddd;vertical-align:top;font-size:14px;">${inlineFormat(
                cell,
              )}</td>`,
          )
          .join("")}</tr>`,
      );
    }
    out.push(
      `<div style="overflow-x:auto;margin:0 0 16px 0;"><table style="width:100%;border-collapse:collapse;min-width:400px;" cellpadding="0" cellspacing="0"><thead><tr>${th}</tr></thead><tbody>${trs.join(
        "",
      )}</tbody></table></div>`,
    );
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const tr = line.trim();

    if (!tr) {
      flushPara(paraBuf);
      i += 1;
      continue;
    }

    if (tr.startsWith("## ")) {
      flushPara(paraBuf);
      const level = tr.match(/^#+/)?.[0].length ?? 2;
      const text = tr.replace(/^#+\s+/, "");
      if (level <= 2) {
        out.push(
          `<h2 style="margin:24px 0 12px 0;font-size:17px;font-weight:700;color:#0a0a0a;border-bottom:1px solid #e5e5e0;padding-bottom:6px;">${esc(
            text,
          )}</h2>`,
        );
      } else {
        out.push(
          `<h3 style="margin:16px 0 8px 0;font-size:15px;font-weight:700;color:#262626;">${esc(text)}</h3>`,
        );
      }
      i += 1;
      continue;
    }

    if (tr.startsWith("### ")) {
      flushPara(paraBuf);
      out.push(
        `<h3 style="margin:16px 0 8px 0;font-size:15px;font-weight:700;color:#262626;">${esc(tr.replace(/^###\s+/, ""))}</h3>`,
      );
      i += 1;
      continue;
    }

    if (tr.startsWith("|") && tr.includes("|")) {
      flushPara(paraBuf);
      const tableRows: string[] = [line];
      i += 1;
      while (i < lines.length) {
        const L = lines[i] ?? "";
        const T = L.trim();
        if (!T) break;
        if (T.startsWith("|") && T.includes("|")) {
          tableRows.push(L);
          i += 1;
        } else break;
      }
      tableFromRows(tableRows);
      continue;
    }

    if (/^[-*]\s+/.test(tr)) {
      flushPara(paraBuf);
      out.push(
        `<p style="margin:0 0 8px 0;padding-left:18px;text-indent:-14px;line-height:1.58;font-size:15px;color:#1a1a1a;">${inlineFormat(tr.replace(/^[-*]\s+/, ""))}</p>`,
      );
      i += 1;
      continue;
    }

    paraBuf.push(tr);
    i += 1;
  }
  flushPara(paraBuf);

  return out.join("\n");
}
