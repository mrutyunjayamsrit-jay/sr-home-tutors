import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Spinner } from "@/components/ui";
import { EducationIllustration } from "@/features/auth/EducationIllustration";
import { usePublicBranches, usePublicContact } from "./api";
import { ParentEnquiryForm } from "./ParentEnquiryForm";
import { TutorEnquiryForm } from "./TutorEnquiryForm";
import styles from "./HomePage.module.css";

type EnquireTab = "parent" | "tutor";

const FEATURES = [
  { icon: "🎓", title: "Verified tutors", body: "Every tutor is personally vetted for qualifications, subject expertise, and background before they ever teach your child." },
  { icon: "🏠", title: "One-on-one, at home", body: "Real home tuition, not a crowded classroom — a dedicated tutor, on your family's schedule, in your own home." },
  { icon: "📊", title: "Track progress online", body: "Attendance, test scores, and tutor notes — visible to parents the moment they're recorded, not just at report-card time." },
  { icon: "💳", title: "Transparent fees", body: "Clear, upfront monthly pricing tied to classes actually taken. No hidden charges, ever." },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HomePage() {
  const [tab, setTab] = useState<EnquireTab>("parent");
  const branches = usePublicBranches();
  const contact = usePublicContact();

  const goToEnquire = (which: EnquireTab) => {
    setTab(which);
    scrollToId("enquire");
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoMark} aria-hidden="true">SR</span>
          SR Home Tutors
        </div>
        <nav className={styles.navLinks} aria-label="Primary">
          <button className={[styles.navLink, styles.navLinkParents].join(" ")} onClick={() => goToEnquire("parent")}>
            <span aria-hidden="true">👪</span> For Parents
          </button>
          <button className={[styles.navLink, styles.navLinkTutors].join(" ")} onClick={() => goToEnquire("tutor")}>
            <span aria-hidden="true">🎓</span> For Tutors
          </button>
          <button className={[styles.navLink, styles.navLinkContact].join(" ")} onClick={() => scrollToId("contact")}>
            <span aria-hidden="true">☎️</span> Contact
          </button>
        </nav>
        <div className={styles.navActions}>
          <Link to="/login">
            <Button variant="primary" size="sm">Staff / Portal Login</Button>
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Home tuition, done right</span>
          <h1 className={styles.heroTitle}>
            Quality home tutors, <span>matched to your family</span>
          </h1>
          <p className={styles.heroSubtitle}>
            SR Home Tutors connects verified, qualified tutors with students for one-on-one home tuition —
            across every board and subject, with attendance, test scores, and fees tracked online for total peace of mind.
          </p>
          <div className={styles.heroCtas}>
            <Button size="lg" onClick={() => goToEnquire("parent")}>Find a Tutor</Button>
            <Button size="lg" variant="secondary" onClick={() => goToEnquire("tutor")}>Become a Tutor</Button>
          </div>
        </div>
        <div className={styles.heroIllustration}>
          <EducationIllustration />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2>Why families and tutors choose us</h2>
          <p>A modern, transparent tutoring agency — built around trust and visibility for everyone involved.</p>
        </div>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <Card key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="enquire" className={[styles.section, styles.enquireSection].join(" ")}>
        <div className={styles.sectionHeading}>
          <h2>Get started today</h2>
          <p>Tell us a little about what you need — our branch team will call you back shortly.</p>
        </div>

        <div className={styles.enquireLayout}>
          <div className={styles.enquireBlurb}>
            <div className={styles.toggle} role="tablist" aria-label="Choose enquiry type">
              <button
                role="tab"
                aria-selected={tab === "parent"}
                className={[styles.toggleBtn, tab === "parent" ? styles.toggleBtnActive : ""].join(" ")}
                onClick={() => setTab("parent")}
              >
                I need a tutor
              </button>
              <button
                role="tab"
                aria-selected={tab === "tutor"}
                className={[styles.toggleBtn, tab === "tutor" ? styles.toggleBtnActive : ""].join(" ")}
                onClick={() => setTab("tutor")}
              >
                I want to teach
              </button>
            </div>

            {tab === "parent" ? (
              <>
                <h3>Looking for the right tutor for your child?</h3>
                <p>Share a few details and our branch office will match you with a qualified, background-checked tutor nearby.</p>
                <ul>
                  <li><span className={styles.checkMark}>✓</span> Free, no-obligation enquiry</li>
                  <li><span className={styles.checkMark}>✓</span> Matched by subject, board, and location</li>
                  <li><span className={styles.checkMark}>✓</span> A callback within 1–2 working days</li>
                </ul>
              </>
            ) : (
              <>
                <h3>Passionate about teaching?</h3>
                <p>Join our network of verified home tutors. Tell us your subjects and areas — we'll match you with students nearby.</p>
                <ul>
                  <li><span className={styles.checkMark}>✓</span> Flexible hours, choose your own students</li>
                  <li><span className={styles.checkMark}>✓</span> Transparent, per-class payouts</li>
                  <li><span className={styles.checkMark}>✓</span> An online dashboard for attendance & earnings</li>
                </ul>
              </>
            )}
          </div>

          <Card className={styles.formCard}>
            {tab === "parent" ? <ParentEnquiryForm /> : <TutorEnquiryForm />}
          </Card>
        </div>
      </section>

      <section id="contact" className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2>Visit or call us</h2>
          <p>Have questions before you enquire? Reach out directly.</p>
        </div>

        {contact.data && (
          <div className={styles.supportCard}>
            <h3>{contact.data.organizationName} — Support</h3>
            <div className={styles.supportRow}>
              {contact.data.supportPhone && <a href={`tel:${contact.data.supportPhone}`}>📞 {contact.data.supportPhone}</a>}
              {contact.data.supportEmail && <a href={`mailto:${contact.data.supportEmail}`}>✉️ {contact.data.supportEmail}</a>}
            </div>
          </div>
        )}

        {branches.isLoading ? (
          <Spinner size="lg" />
        ) : (
          <div className={styles.contactGrid}>
            {(branches.data ?? []).map((b) => (
              <Card key={b.id} className={styles.contactCard}>
                <h3>{b.name}</h3>
                {b.address && <p>{b.address}</p>}
                {b.contactPhone && <p><a href={`tel:${b.contactPhone}`}>{b.contactPhone}</a></p>}
              </Card>
            ))}
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} SR Home Tutors. All rights reserved. · <Link to="/login">Staff / Portal Login</Link>
      </footer>
    </div>
  );
}
