import { steps } from "@/config/home";

export function HowItWorks() {
  return (
    <section
      id="so-funktionierts"
      className="home-section home-section--surface"
      aria-labelledby="steps-title"
    >
      <div className="site-container">
        <div className="home-head">
          <h2 id="steps-title" className="section-title">
            So funktioniert’s
          </h2>
        </div>
        <ol className="steps-band">
          {steps.map(({ title, text }, index) => (
            <li className="step" key={title}>
              <span className="step-numeral" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="step-title">{title}</h3>
              <p className="step-text">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
