"use client";

import type { PdfDocument, PdfTemplateId } from "@/lib/pdfGenerator/types";

function Metrics({ items, variant }: { items: { label: string; value: string }[]; variant: "grid" | "strip" }) {
  if (!items.length) return null;
  return (
    <div className={variant === "grid" ? "pdf-doc__metrics pdf-doc__metrics--grid" : "pdf-doc__metrics pdf-doc__metrics--strip"}>
      {items.map((m) => (
        <div key={`${m.label}\0${m.value}`} className="pdf-doc__metric">
          <span className="pdf-doc__metric-label">{m.label}</span>
          <span className="pdf-doc__metric-value">{m.value}</span>
        </div>
      ))}
    </div>
  );
}

function SectionBlock({ section, index }: { section: PdfDocument["sections"][0]; index: number }) {
  return (
    <section className="pdf-doc__section" key={`${section.title}-${index}`}>
      <h2 className="pdf-doc__h2">{section.title}</h2>
      {section.paragraphs?.map((p, i) => (
        <p key={i} className="pdf-doc__p">
          {p}
        </p>
      ))}
      {section.bullets && section.bullets.length > 0 ? (
        <ul className="pdf-doc__ul">
          {section.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : null}
      {section.subsections?.map((sub, j) => (
        <div className="pdf-doc__subsection" key={`${sub.title}-${j}`}>
          <h3 className="pdf-doc__h3">{sub.title}</h3>
          {sub.paragraphs?.map((p, i) => (
            <p key={i} className="pdf-doc__p">
              {p}
            </p>
          ))}
          {sub.bullets && sub.bullets.length > 0 ? (
            <ul className="pdf-doc__ul">
              {sub.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </section>
  );
}

function Tables({ tables }: { tables: NonNullable<PdfDocument["tables"]> }) {
  return (
    <div className="pdf-doc__tables">
      {tables.map((tb, i) => (
        <div key={i} className="pdf-doc__table-wrap">
          {tb.caption ? <p className="pdf-doc__table-cap">{tb.caption}</p> : null}
          <table className="pdf-doc__table">
            <thead>
              <tr>
                {tb.headers.map((h, j) => (
                  <th key={j}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tb.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((c, cj) => (
                    <td key={cj}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function InvoiceView({ inv }: { inv: NonNullable<PdfDocument["invoice"]> }) {
  return (
    <div className="pdf-doc__invoice">
      <div className="pdf-doc__invoice-head">
        {inv.from ? (
          <div>
            <div className="pdf-doc__invoice-k">From</div>
            <div className="pdf-doc__invoice-v">{inv.from}</div>
          </div>
        ) : null}
        {inv.billTo ? (
          <div>
            <div className="pdf-doc__invoice-k">Bill to</div>
            <div className="pdf-doc__invoice-v">{inv.billTo}</div>
          </div>
        ) : null}
        <div className="pdf-doc__invoice-meta">
          {inv.invoiceId ? (
            <div>
              <span className="pdf-doc__invoice-k">Invoice #</span> {inv.invoiceId}
            </div>
          ) : null}
          {inv.date ? (
            <div>
              <span className="pdf-doc__invoice-k">Date</span> {inv.date}
            </div>
          ) : null}
        </div>
      </div>
      <table className="pdf-doc__table pdf-doc__table--invoice">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th className="pdf-doc__num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((line, i) => (
            <tr key={i}>
              <td>{line.description}</td>
              <td>{line.quantity ?? "—"}</td>
              <td className="pdf-doc__num">{line.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pdf-doc__totals">
        {inv.totals.subtotal ? (
          <div>
            <span>Subtotal</span> <span>{inv.totals.subtotal}</span>
          </div>
        ) : null}
        {inv.totals.tax ? (
          <div>
            <span>Tax</span> <span>{inv.totals.tax}</span>
          </div>
        ) : null}
        <div className="pdf-doc__totals--grand">
          <span>Total</span> <span>{inv.totals.total}</span>
        </div>
      </div>
    </div>
  );
}

type Props = {
  document: PdfDocument;
  templateId: PdfTemplateId;
  templateLabel: string;
  printId?: string;
};

export function PdfDocumentView({ document: doc, templateId, templateLabel, printId }: Props) {
  const mod = `pdf-doc--${templateId}`;
  const isInv = templateId === "invoice" && doc.invoice;
  const tables = doc.tables && doc.tables.length > 0 ? doc.tables : null;
  const dataTablesUpFront = templateId === "data_focused" && tables;

  return (
    <article className={`pdf-doc ${mod}`} id={printId}>
      <header className="pdf-doc__header">
        <h1 className="pdf-doc__h1">{doc.documentTitle}</h1>
        {doc.subtitle ? <p className="pdf-doc__subtitle">{doc.subtitle}</p> : null}
        <p className="pdf-doc__template-pill pdf-doc__no-print" aria-label="Layout template">
          {templateLabel}
        </p>
      </header>

      {isInv && doc.invoice ? <InvoiceView inv={doc.invoice} /> : null}

      {doc.tableOfContents && doc.tableOfContents.length > 0 ? (
        <nav className="pdf-doc__toc" aria-label="Contents">
          <h2 className="pdf-doc__h2">Contents</h2>
          <ol className="pdf-doc__toc-ol">
            {doc.tableOfContents.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </nav>
      ) : null}

      {doc.executiveSummary ? (
        <div className="pdf-doc__exec">
          <h2 className="pdf-doc__h2">Executive summary</h2>
          <p className="pdf-doc__p pdf-doc__exec-text">{doc.executiveSummary}</p>
        </div>
      ) : null}

      {templateId === "data_focused" && doc.keyNumbersHighlight && doc.keyNumbersHighlight.length > 0 ? (
        <Metrics items={doc.keyNumbersHighlight} variant="strip" />
      ) : null}

      {doc.keyMetrics && doc.keyMetrics.length > 0 ? <Metrics items={doc.keyMetrics} variant="grid" /> : null}

      {dataTablesUpFront ? <Tables tables={tables} /> : null}

      {!isInv && doc.invoice && doc.invoice.lines.length > 0 ? <InvoiceView inv={doc.invoice} /> : null}

      {doc.steps && doc.steps.length > 0 ? (
        <ol className="pdf-doc__steps">
          {doc.steps.map((s, i) => (
            <li key={i} className="pdf-doc__step">
              {s.title ? <div className="pdf-doc__step-title">{s.title}</div> : null}
              <div className="pdf-doc__step-body">{s.body}</div>
            </li>
          ))}
        </ol>
      ) : null}

      {doc.codeSamples && doc.codeSamples.length > 0 ? (
        <div className="pdf-doc__code-block-wrap">
          {doc.codeSamples.map((c, i) => (
            <div key={i} className="pdf-doc__code-block">
              {c.title ? <div className="pdf-doc__code-title">{c.title}</div> : null}
              <pre className="pdf-doc__pre">
                <code>{c.code}</code>
              </pre>
            </div>
          ))}
        </div>
      ) : null}

      {doc.sections.map((sec, i) => (
        <SectionBlock key={i} section={sec} index={i} />
      ))}

      {!dataTablesUpFront && tables && templateId !== "invoice" ? <Tables tables={tables} /> : null}

      {doc.closingCta ? (
        <div className="pdf-doc__cta">
          <p className="pdf-doc__p">{doc.closingCta}</p>
        </div>
      ) : null}
    </article>
  );
}
