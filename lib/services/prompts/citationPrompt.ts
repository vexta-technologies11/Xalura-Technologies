export interface CitationParams {
  sourceType: string;
  style: string;
  url?: string;
  title?: string;
  author?: string;
  publisher?: string;
  year?: string;
  pages?: string;
  volume?: string;
  issue?: string;
  doi?: string;
  accessedDate?: string;
  institution?: string;
  isBulk: boolean;
  urls?: string[];
}

export function buildCitationPrompt(params: CitationParams): string {
  const { sourceType, style, isBulk, urls } = params;

  if (isBulk && urls?.length) {
    return `You are a citation generator. Generate citations for the following list of sources.

SOURCES (URLs or descriptions):
${urls.map((u, i) => `${i + 1}. ${u}`).join("\n")}

CITATION STYLE: ${style}

Return valid JSON only:
{
  "citations": [
    {
      "id": "cit-1",
      "formatted": "Full citation string",
      "style": "${style}",
      "sourceType": "detected type",
      "inText": "(Author, Year)"
    }
  ]
}

For APA: Author, A. A. (Year). Title. Publisher. URL
For MLA: Author, A. A. "Title." Publisher, Year. URL.
For Chicago: Author, A. A. "Title." Publisher. URL.
For Harvard: Author, A. A. (Year) Title. Publisher. Available at: URL.
For IEEE: [1] A. A. Author, "Title," Publisher, Year.
For Vancouver: 1. Author AA. Title. Publisher; Year.`;
  }

  return `You are a citation generator. Generate a single citation.

SOURCE TYPE: ${sourceType}
STYLE: ${style}

SOURCE DETAILS:
${params.title ? `- Title: ${params.title}` : ""}
${params.author ? `- Author: ${params.author}` : ""}
${params.publisher ? `- Publisher: ${params.publisher}` : ""}
${params.year ? `- Year: ${params.year}` : ""}
${params.url ? `- URL: ${params.url}` : ""}
${params.pages ? `- Pages: ${params.pages}` : ""}
${params.volume ? `- Volume: ${params.volume}` : ""}
${params.issue ? `- Issue: ${params.issue}` : ""}
${params.doi ? `- DOI: ${params.doi}` : ""}
${params.accessedDate ? `- Accessed: ${params.accessedDate}` : ""}
${params.institution ? `- Institution: ${params.institution}` : ""}

Return valid JSON only:
{
  "citations": [
    {
      "id": "cit-1",
      "formatted": "Full citation string",
      "style": "${style}",
      "sourceType": "${sourceType}",
      "inText": "(Author, Year)",
      "bibliographyNote": "2-3 sentence annotation (if annotated mode)"
    }
  ]
}

Style rules:
- APA: Author, A. A. (Year). *Title*. Publisher. URL
- MLA: Author, A. A. "Title." *Publisher*, Year, URL.
- Chicago: Author, A. A. "Title." Publisher. URL.
- Harvard: Author, A. A. (Year) *Title*. Available at: URL.
- IEEE: [1] A. A. Author, "Title," Publisher, Year.
- Vancouver: 1. Author AA. Title. Publisher; Year.`;
}
