// Purely decorative CSS composition: thin gold lines and outlined
// rectangles suggesting a wardrobe. Never carries semantic content.
export function WardrobeArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <span className="hero-art-accent" />
      <span className="hero-art-frame" />
      <span className="hero-art-divider" />
      <span className="hero-art-rail" />
      <span className="hero-art-garment hero-art-garment--a" />
      <span className="hero-art-garment hero-art-garment--b" />
      <span className="hero-art-shelf hero-art-shelf--a" />
      <span className="hero-art-shelf hero-art-shelf--b" />
      <span className="hero-art-shelf hero-art-shelf--c" />
      <span className="hero-art-box hero-art-box--a" />
      <span className="hero-art-box hero-art-box--b" />
      <span className="hero-art-drawer hero-art-drawer--a">
        <span className="hero-art-handle" />
      </span>
      <span className="hero-art-drawer hero-art-drawer--b">
        <span className="hero-art-handle" />
      </span>
    </div>
  );
}
