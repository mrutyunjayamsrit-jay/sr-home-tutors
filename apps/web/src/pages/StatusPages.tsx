import { Link } from "react-router-dom";
import { Card, EmptyState, Button } from "@/components/ui";
import styles from "@/components/ui/AuthLayout.module.css";

export function UnauthorizedPage() {
  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <EmptyState
          title="You don't have access to this page"
          description="Your account role doesn't include this area. If you think this is wrong, contact your branch office or super admin."
        />
        <Link to="/">
          <Button variant="secondary" fullWidth>
            Go home
          </Button>
        </Link>
      </Card>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <EmptyState title="Page not found" description="The page you're looking for doesn't exist." />
        <Link to="/">
          <Button variant="secondary" fullWidth>
            Go home
          </Button>
        </Link>
      </Card>
    </div>
  );
}
