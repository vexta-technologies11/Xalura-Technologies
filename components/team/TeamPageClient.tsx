"use client";

import Image from "next/image";
import type { PageContentMap } from "@/types/content";
import type { TeamMemberRow } from "@/types/team";

type Props = {
  teamPage: PageContentMap["teamPage"];
  members: TeamMemberRow[];
};

/**
 * /team — headline + grid only (no subhero, no category filters).
 */
export function TeamPageClient({ teamPage, members }: Props) {
  return (
    <div className="team-page">
      <div className="team-page__head team-page__head--compact">
        <h1 className="team-page__h1">
          {teamPage.meetHeadline} <em>{teamPage.meetHeadlineEmphasis}</em>
        </h1>
      </div>
      {members.length === 0 ? (
        <p className="body-text team-page__empty">No one is listed yet. Check back soon.</p>
      ) : (
        <ul className="team-page__grid" role="list">
          {members.map((m) => (
            <li key={m.id} className="team-page__card">
              <div className="team-page__portrait">
                <span className="team-page__arcs" aria-hidden />
                <span className="team-page__arcs team-page__arcs--2" aria-hidden />
                <div className="team-page__img-wrap">
                  {m.avatar_url ? (
                    <Image
                      className="team-page__img"
                      src={m.avatar_url}
                      alt=""
                      fill
                      sizes="(max-width: 520px) 50vw, 20vw"
                    />
                  ) : (
                    <div
                      className="team-page__img"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}
                    >
                      —
                    </div>
                  )}
                </div>
                {m.region_badge ? (
                  <span className="team-page__region" title="Region">
                    {m.region_badge.slice(0, 3)}
                  </span>
                ) : null}
              </div>
              <h3 className="team-page__name">{m.name}</h3>
              <span className="team-page__title">{m.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
