/**
 * Advisory-only compliance memo rubric (Gemini prompt). Not legal advice — product posture review.
 * Scores are qualitative; model must ground every point in the briefing / internal analyst notes.
 */

export const COMPLIANCE_OFFICER_RUBRIC = `
## Mandatory rubric (score each 1–10; 10 = lowest concern for that dimension)

Use **only** evidence from the briefing and the INTERNAL analyst blocks. If evidence is missing, say **INSUFFICIENT_DATA** for that dimension and do not invent facts.

| Dimension | What you evaluate |
|-----------|---------------------|
| **D1 Regulated vertical** | If VERTICAL is healthcare/legal/regulated: does copy stay tooling/product/research framing and avoid clinical or personalized legal advice? |
| **D2 Unsubstantiated claims** | Superlatives, guarantees, “FDA-approved”, revenue promises, or performance claims without support in the text. |
| **D3 Professional advice** | Content that could read as medical, legal, tax, or investment **advice to the reader** vs neutral education. |
| **D4 Comparative / reputational** | Potentially defamatory or unfair comparisons to named companies/people. |
| **D5 Privacy & data** | Mishandling of PII, surveillance promises, or data practices that contradict cautious tone. |
| **D6 Affiliate / disclosure** | Undisclosed sponsorship or affiliate patterns if the article implies commercial relationships. |
| **D7 Process integrity** | Whether Publishing Manager rationale in the briefing appears proportionate to the draft risk (advisory only). |

After the table, output **exactly one line** (machine-parseable):
\`COMPLIANCE_SCORE_OVERALL: X.X/10\` where X.X is a weighted conservative aggregate (**10 = strongest compliance posture / lowest actionable content risk**; **1 = severe concerns**). On the next line, state any key assumptions in one sentence.

Then output **exactly one line**:
\`COMPLIANCE_CONFIDENCE: HIGH\` | \`MEDIUM\` | \`LOW\` based on how much article text was available vs INSUFFICIENT_DATA.

## Voice

Write the **## Regulatory & legal posture (advisory)** section in the tone of **outside tech regulatory counsel** briefing a founder: precise, cautious, structured. Every paragraph must end with or contain an explicit reminder that this is **internal risk commentary**, **not legal advice**, and **not a substitute for qualified counsel** where jurisdiction-specific law applies.
`;
