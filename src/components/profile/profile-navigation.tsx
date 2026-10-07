import { Link } from "@tanstack/react-router";
import { profileNavigation } from "@/config/profile";

// Horizontal navigation below the header, shown from 768px.
export function ProfileSubNavigation() {
  return (
    <nav className="profile-subnav" aria-label="Profilbereich">
      <div className="site-container profile-subnav-inner">
        {profileNavigation.map(({ to, label }) => (
          <Link key={to} to={to} className="profile-subnav-link">
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

// Fixed bottom tab bar, shown below 768px.
export function ProfileTabBar() {
  return (
    <nav className="profile-tabbar" aria-label="Profilbereich">
      {profileNavigation.map(({ to, shortLabel, icon: Icon }) => (
        <Link key={to} to={to} className="profile-tab">
          <Icon aria-hidden="true" />
          {shortLabel}
        </Link>
      ))}
    </nav>
  );
}
