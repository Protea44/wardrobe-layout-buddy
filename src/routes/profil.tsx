import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { meResponseSchema } from "@shared/me";

import { ProfileSubNavigation, ProfileTabBar } from "@/components/profile/profile-navigation";
import { api, ApiError } from "@/lib/api";
import { isNetworkError } from "@/lib/offline/online";
import { requireSession } from "@/lib/offline/session";

// Layout for everything below /profil. All of it is private: without a session
// the visitor is sent to the login. The backend checks every request again.
export const Route = createFileRoute("/profil")({
  beforeLoad: async () => {
    // Offline, a browser that holds a user's offline copy may show it.
    await requireSession();
    try {
      return { me: await api("/me", { schema: meResponseSchema }) };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) throw redirect({ to: "/login" });
      if (isNetworkError(error)) return { me: null };
      throw error;
    }
  },
  component: ProfileLayout,
});

function ProfileLayout() {
  const { me } = Route.useRouteContext();

  return (
    <div className="profile-area">
      <ProfileSubNavigation />
      {me !== null && (
        <div className="site-container">
          <p className="profile-greeting">Hallo, {me.displayName}</p>
        </div>
      )}
      <Outlet />
      <ProfileTabBar />
    </div>
  );
}
