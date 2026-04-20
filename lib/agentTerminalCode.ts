import type { IconType } from "@/types/employee";

/** ~250 code-like terminal lines per role — synthesized at module load */
const N = 250;

function pad(n: number, w = 3) {
  return String(n % 1000).padStart(w, "0");
}

function writerLine(i: number): string {
  const slug = `article-${200 + (i % 180)}`;
  const cmds = [
    () => `gear publish push --slug ${slug} --env=staging`,
    () => `mdx compile ./content/${slug}.mdx --toc --anchors`,
    () => `pnpm exec remark-lint ${slug}.mdx | tail -n +${(i % 9) + 1}`,
    () => `node scripts/embed-internal-links.mjs --file=${slug}.mdx`,
    () => `curl -sSf -X POST https://api.gearmedic.net/v1/articles/${slug}/preview`,
    () => `git diff --stat content/${slug}.mdx | wc -l`,
    () => `prettier --write content/${slug}.mdx`,
    () => `grep -n "fault code" content/${slug}.mdx | head`,
    () => `export DRAFT_ID=draft_${pad(i)} && npm run validate:frontmatter`,
    () => `esbuild content/${slug}.mdx --bundle --metafile=meta-${i % 40}.json`,
  ];
  return cmds[i % cmds.length]!();
}

function seoLine(i: number): string {
  const path = ["/guides/", "/diagnostics/", "/learn/"][(i >> 2) % 3]!;
  const page = `page-${(i * 17) % 400}`;
  const cmds = [
    () => `crawl --origin https://gearmedic.net --path ${path}${page} --depth=3`,
    () => `linkgraph build --sitemap sitemap.xml --out graph-${pad(i)}.json`,
    () => `python tools/anchor_scan.py --url ${path}${page} --min-sim=0.72`,
    () => `node lighthouse-batch.mjs --only=categories:seo --url=https://gearmedic.net${path}${page}`,
    () => `rg -n "canonical" dist/${page}.html`,
    () => `jq '.inlinks[] | select(.type=="deeplink")' crawl-${i % 50}.json | wc -l`,
    () => `curl -sI https://gearmedic.net${path}${page} | grep -i link:`,
    () => `pnpm exec ts-node scripts/internal-link-suggest.ts --cluster=engine`,
    () => `robots-parser https://gearmedic.net/robots.txt --ua=GearMedicBot/1`,
    () => `diff -u prev-map.json link-map-${pad(i)}.json | head -n 12`,
  ];
  return cmds[i % cmds.length]!();
}

function analystLine(i: number): string {
  const cmds = [
    () =>
      `duckdb analytics.duckdb -c "SELECT query, ctr FROM gsc WHERE date>'2025-01-01' LIMIT ${10 + (i % 20)};"`,
    () =>
      `python -c "import pandas as pd; df=pd.read_parquet('sessions_${pad(i)}.pq'); print(df.groupby('intent').size())"`,
    () =>
      `clickhouse-client -q "SELECT avg(position), count() FROM serp WHERE page LIKE '%diagnostic%'"`,
    () =>
      `npm run extract:gsc -- --property=sc-domain:gearmedic.net --rows=${500 + i}`,
    () => `Rscript model/intent_fit.R --fold=${i % 8} --metric=ndcg@10`,
    () => `jq '.rows[] | {q, clicks, impr}' gsc-export-${i % 30}.json | head`,
    () =>
      `sqlite3 cache.db "EXPLAIN QUERY PLAN SELECT * FROM trends WHERE kw GLOB '*misfire*';"`,
    () => `uv run notebooks/ctr_delta.ipynb --param seed=${i % 99}`,
    () => `gzip -dc traffic-${pad(i)}.jsonl.gz | awk '{c+=$3} END{print c}'`,
    () => `otel-cli span --name analyst.pipeline --attrs job=${i % 64}`,
  ];
  return cmds[i % cmds.length]!();
}

function designerLine(i: number): string {
  const asset = `hero-${(i * 3) % 120}`;
  const cmds = [
    () => `sharp input/${asset}.png --resize 1200 --webp --output dist/${asset}.webp`,
    () => `svgo --multipass assets/icons/sprite-${i % 24}.svg -o dist/sprite.svg`,
    () => `figma-export pull --file=GmDesign --node=Frame_${pad(i)} --format=png`,
    () => `node scripts/generate-og.mjs --title="Fault codes" --variant=${i % 5}`,
    () => `cwebp -q 82 public/thumbs/thumb_${i % 90}.jpg -o public/thumbs/thumb_${i % 90}.webp`,
    () => `sass scss/article.scss:dist/article-${i % 12}.css --style=compressed`,
    () => `ffmpeg -y -loop 1 -i banner_${pad(i)}.png -t 3 -pix_fmt yuv420p out/banner.mp4`,
    () => `eslint --fix components/visual/*.tsx && prettier --write components/visual`,
    () => `rsync -avz ./export/ user@cdn:/var/www/gearmedic/assets/v${i % 8}/`,
    () => `imagemin public/social/* --plugin=mozjpeg > build-report-${i % 40}.txt`,
  ];
  return cmds[i % cmds.length]!();
}

const builders: Record<IconType, (i: number) => string> = {
  writer: writerLine,
  seo: seoLine,
  analyst: analystLine,
  designer: designerLine,
};

function buildPool(type: IconType): readonly string[] {
  const b = builders[type];
  return Array.from({ length: N }, (_, i) => b(i));
}

export const terminalCodePools: Record<IconType, readonly string[]> = {
  writer: buildPool("writer"),
  seo: buildPool("seo"),
  analyst: buildPool("analyst"),
  designer: buildPool("designer"),
};

export function getRandomTerminalLine(type: IconType): string {
  const pool = terminalCodePools[type];
  return pool[Math.floor(Math.random() * pool.length)]!;
}
