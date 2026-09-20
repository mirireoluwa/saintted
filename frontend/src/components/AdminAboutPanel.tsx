import { useCallback, useEffect, useState } from "react";
import { fetchAboutAuth, updateAbout } from "../api/adminApi";
import { DEFAULT_ABOUT, type AboutContent } from "../types/aboutContent";

type Notify = (type: "ok" | "error", text: string) => void;

export function AdminAboutPanel({ notify }: { notify: Notify }) {
  const [about, setAbout] = useState<AboutContent>(DEFAULT_ABOUT);
  const [heading, setHeading] = useState(DEFAULT_ABOUT.heading);
  const [body, setBody] = useState("");
  const [email, setEmail] = useState(DEFAULT_ABOUT.booking_email);
  const [file, setFile] = useState<File | null>(null);
  const [removePortrait, setRemovePortrait] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const apply = useCallback((a: AboutContent) => {
    setAbout(a);
    setHeading(a.heading);
    setBody(a.body || "");
    setEmail(a.booking_email || "");
    setFile(null);
    setRemovePortrait(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAboutAuth()
      .then((a) => {
        if (!cancelled) apply(a);
      })
      .catch((err) => {
        if (!cancelled) notify("error", `Failed to load About content: ${String(err)}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apply, notify]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!heading.trim()) {
      notify("error", "The heading can't be empty.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateAbout({
        heading: heading.trim(),
        body: body.trim(),
        booking_email: email.trim(),
        portrait: file,
        removePortrait,
      });
      apply(updated);
      notify("ok", "About section saved.");
    } catch (err) {
      notify("error", `Could not save: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  const currentPortrait = removePortrait ? "" : about.portrait_url;

  return (
    <>
      <div className="admin-page__toolbar" style={{ marginTop: "2.5rem" }}>
        <div className="admin-page__toolbar-label">
          <p>.about section</p>
          <span className="admin-page__toolbar-line" aria-hidden />
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">About section</h2>
        <p className="admin-card__lead">
          Edit the About section on the home page: the heading, an optional bio, the booking email, and the portrait.
        </p>
        {loading ? <p className="admin-page__loading">Loading…</p> : null}
        <form className="admin-form" onSubmit={save}>
          <div className="admin-form__row">
            <label htmlFor="about-heading">Heading *</label>
            <input id="about-heading" value={heading} onChange={(e) => setHeading(e.target.value)} />
          </div>
          <div className="admin-form__row">
            <label htmlFor="about-body">Bio (optional)</label>
            <textarea
              id="about-body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Leave empty to show just the heading. Use a blank line between paragraphs."
            />
          </div>
          <div className="admin-form__row">
            <label htmlFor="about-email">Booking &amp; press email</label>
            <input
              id="about-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
            <p className="admin-form__hint">Leave empty to hide the email button.</p>
          </div>
          <div className="admin-form__row">
            <label htmlFor="about-portrait">Portrait (optional)</label>
            {currentPortrait ? (
              <img
                src={currentPortrait}
                alt="Current portrait"
                style={{ width: 120, aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 8, marginBottom: 8 }}
              />
            ) : (
              <p className="admin-form__hint">Using the site's default portrait.</p>
            )}
            <input
              id="about-portrait"
              type="file"
              accept="image/*"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setRemovePortrait(false);
              }}
            />
            {about.portrait_url ? (
              <label className="admin-form__check" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={removePortrait}
                  onChange={(e) => {
                    setRemovePortrait(e.target.checked);
                    if (e.target.checked) setFile(null);
                  }}
                />
                <span>Remove uploaded portrait (go back to the default)</span>
              </label>
            ) : null}
          </div>
          <div className="admin-page__actions">
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving || loading}>
              {saving ? "Saving…" : "Save About section"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
