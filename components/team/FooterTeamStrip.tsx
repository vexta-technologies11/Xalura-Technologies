import Image from "next/image";
import Link from "next/link";
import type { PageContentMap } from "@/types/content";
import type { TeamMemberRow } from "@/types/team";

type Props = {
  teamPage: PageContentMap["teamPage"];
  members: TeamMemberRow[];
};

/**
 * Dark-theme team strip in footer (circular avatars, accent titles) — data from `team_members`.
 */
export function FooterTeamStrip({ teamPage, members }: Props) {
  if (members.length === 0) return null;
  const show = members.slice(0, 5);
  return (
    <div className="footer-team-strip">
      <h4 className="footer-team-strip__h">{teamPage.footerStripTitle}</h4>
      <ul className="footer-team-strip__row" role="list">
        {show.map((m) => (
          <li key={m.id} className="footer-team-strip__li">
            <div className="footer-team-strip__portrait">
              {m.avatar_url ? (
                <Image
                  className="footer-team-strip__img"
                  src={m.avatar_url}
                  alt=""
                  width={64}
                  height={64}
                />
              ) : (
                <span className="footer-team-strip__ph" aria-hidden>
                  {" "}
                </span>
              )}
            </div>
            <div className="footer-team-strip__label">{m.name.split(" ")[0]}</div>
          </li>
        ))}
      </ul>
      <Link href={teamPage.footerStripHref} className="footer-team-strip__link">
        {teamPage.footerStripCta} →
      </Link>
    </div>
  );
}
