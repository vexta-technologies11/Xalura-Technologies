import Image from "next/image";
import type { PartnerRow } from "@/lib/constants";

export function Partners({ partners }: { partners: PartnerRow[] }) {
  const doubled = [...partners, ...partners];
  return (
    <section className="partners wrap" id="contact">
      <p className="label r">Distribution</p>
      <h2 className="h2 r" style={{ transitionDelay: "0.1s", color: "white" }}>
        The parts are already
        <br />
        <em style={{ color: "#6B8BF5" }}>where people shop.</em>
      </h2>
      <p
        className="body-text r"
        style={{
          transitionDelay: "0.2s",
          color: "rgba(255,255,255,.4)",
          marginBottom: 48,
        }}
      >
        When GearMedic tells you what is wrong with your car, it does not just
        leave you hanging. It shows you the part you need, matched to your
        diagnosis, from retailers you already know and trust like Amazon,
        AutoZone, and eBay. No extra searching. No second-guessing. Just the
        answer and where to get what you need.
      </p>
      <div className="partner-scroll">
        <div className="partner-track">
          {doubled.map((p, i) => (
            <div key={`${p.id}-${i}`} className="partner-item">
              {p.logo_url ? (
                <Image
                  src={p.logo_url}
                  alt=""
                  width={120}
                  height={28}
                  unoptimized
                  className="logo-white"
                  style={{ height: 28, width: "auto" }}
                />
              ) : null}
              <span className="partner-name">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="r" style={{ transitionDelay: "0.3s" }}>
        <a className="btn btn-blue" href="mailto:hello@xalura.tech">
          Get in Touch
        </a>
      </div>
    </section>
  );
}
