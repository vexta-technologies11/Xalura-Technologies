import { LogoMark } from "./LogoMark";

export function Nav() {
  return (
    <nav>
      <div className="nav-brand">
        <a className="logo logo--with-mark" href="/">
          <LogoMark />
          <span className="logo-wordmark">Xalura Tech</span>
        </a>
        <a
          className="nav-login"
          href="/login"
          target="_blank"
          rel="noopener noreferrer"
        >
          Login
        </a>
      </div>
      <div className="nav-right">
        <ul className="nav-links">
          <li>
            <a href="/#mission">Mission</a>
          </li>
          <li>
            <a href="/#ai-employees">AI Employees</a>
          </li>
          <li>
            <a href="/dashboard">Dashboard</a>
          </li>
          <li>
            <a href="/news">News</a>
          </li>
          <li>
            <a href="/articles">Articles</a>
          </li>
          <li>
            <a href="/courses">Courses</a>
          </li>
        </ul>
        <a className="nav-pill" href="/#contact">
          Contact
        </a>
      </div>
    </nav>
  );
}
