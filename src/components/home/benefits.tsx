import { benefits } from "@/config/home";

export function Benefits() {
  return (
    <section className="home-section" aria-labelledby="benefits-title">
      <div className="site-container">
        <div className="home-head">
          <h2 id="benefits-title" className="section-title">
            Deine Vorteile
          </h2>
        </div>
        <ul className="benefit-grid">
          {benefits.map(({ icon: Icon, title, text }) => (
            <li className="benefit-card" key={title}>
              <span className="benefit-icon" aria-hidden="true">
                <Icon />
              </span>
              <h3 className="benefit-title">{title}</h3>
              <p className="benefit-text">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
