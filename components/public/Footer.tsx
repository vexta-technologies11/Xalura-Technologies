import type { PageContentMap } from "@/types/content";

export function Footer({ content, className }: { content: PageContentMap["footer"]; className?: string }) {
  const lines = content.tagline.split("\n");
  return (
    <footer id="contact" className={className}>
      <div className="footer-top">
        <div>
          <div className="f-brand">Xalura Tech</div>
          <p className="f-tag">
            {lines.map((line, i) => (
              <span key={i}>
                {line}
                {i < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li>
                <a href="#mission">Mission</a>
              </li>
              <li>
                <a href="#">Careers</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Products</h4>
            <ul>
              <li>
                <a href="#products">GearMedic</a>
              </li>
              <li>
                <a href="/dashboard">Dashboard</a>
              </li>
              <li>
                <a href="/articles">Articles</a>
              </li>
              <li>
                <a href="/courses">Courses</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Connect</h4>
            <ul>
              <li>
                <a href="#">LinkedIn</a>
              </li>
              <li>
                <a href="#">X / Twitter</a>
              </li>
              <li>
                <a href="mailto:hello@xalura.tech">hello@xalura.tech</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p className="f-copy">© {new Date().getFullYear()} Xalura Technologies. All rights reserved.</p>
        <p className="f-founder">
          Jhon Louie Durano Cadullo, MBA, Founder, Xalura Technologies
        </p>
      </div>
    </footer>
  );
}
