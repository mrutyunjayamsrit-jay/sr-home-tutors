import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/authStore";
import { ROLE_LABEL } from "@/features/auth/types";
import { Button } from "@/components/ui";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import styles from "./AppShell.module.css";

export interface NavItem {
  label: string;
  to: string;
  /** Module not built yet — still linked (so IA is visible/plannable) but visually marked and routes to a "coming soon" page. */
  comingSoon?: boolean;
  end?: boolean;
}

interface AppShellProps {
  children: ReactNode;
  nav?: NavItem[];
}

export function AppShell({ children, nav }: AppShellProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoMark} aria-hidden="true">
            SR
          </span>
          SR Home Tutors
          {user && <span className={styles.roleBadge}>{ROLE_LABEL[user.role]}</span>}
        </div>
        {user && (
          <div className={styles.userMenu}>
            <NotificationBell />
            <span className={styles.userName}>{user.name ?? user.email ?? user.username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        )}
      </header>
      <div className={styles.body}>
        {nav && (
          <nav className={styles.sidebar} aria-label="Primary">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => [styles.navLink, isActive ? styles.navLinkActive : ""].join(" ")}
              >
                {item.label}
                {item.comingSoon && <span className={styles.soonTag}>soon</span>}
              </NavLink>
            ))}
          </nav>
        )}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
