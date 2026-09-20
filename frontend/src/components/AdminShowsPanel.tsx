import { useCallback, useEffect, useMemo, useState } from "react";
import { createShow, deleteShow, fetchShowsAuth, updateShow } from "../api/adminApi";
import type { LiveShow } from "../types/liveShow";

type Notify = (type: "ok" | "error", text: string) => void;

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = () => ({
  venue: "",
  city: "",
  starts_at_local: "",
  ticket_url: "",
  note: "",
  is_sold_out: false,
});

export function AdminShowsPanel({ notify }: { notify: Notify }) {
  const [shows, setShows] = useState<LiveShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setShows(await fetchShowsAuth());
    } catch (err) {
      notify("error", `Failed to load shows: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () => [...shows].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [shows],
  );

  function reset() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function startEdit(s: LiveShow) {
    setEditingId(s.id);
    setForm({
      venue: s.venue,
      city: s.city,
      starts_at_local: isoToDatetimeLocal(s.starts_at),
      ticket_url: s.ticket_url,
      note: s.note,
      is_sold_out: s.is_sold_out,
    });
    window.scrollTo({ top: document.getElementById("admin-shows-form")?.offsetTop ?? 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.venue.trim() || !form.starts_at_local) {
      notify("error", "Venue and date/time are required.");
      return;
    }
    setSaving(true);
    const payload = {
      venue: form.venue.trim(),
      city: form.city.trim(),
      starts_at: new Date(form.starts_at_local).toISOString(),
      ticket_url: form.ticket_url.trim(),
      note: form.note.trim(),
      is_sold_out: form.is_sold_out,
    };
    try {
      if (editingId != null) {
        await updateShow(editingId, payload);
        notify("ok", "Show updated.");
      } else {
        await createShow(payload);
        notify("ok", "Show added.");
      }
      reset();
      await load();
    } catch (err) {
      notify("error", `Could not save show: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this show?")) return;
    try {
      await deleteShow(id);
      notify("ok", "Show deleted.");
      if (editingId === id) reset();
      await load();
    } catch (err) {
      notify("error", `Could not delete show: ${String(err)}`);
    }
  }

  return (
    <>
      <div className="admin-page__toolbar" style={{ marginTop: "2.5rem" }}>
        <div className="admin-page__toolbar-label">
          <p>.live shows</p>
          <span className="admin-page__toolbar-line" aria-hidden />
        </div>
      </div>

      <div className="admin-card" id="admin-shows-form">
        <h2 className="admin-card__title">{editingId != null ? "Edit show" : "Add show"}</h2>
        <p className="admin-card__lead">
          Shows appear on the public <strong>/shows</strong> page. Past shows hide themselves automatically.
        </p>
        <form className="admin-form" onSubmit={save}>
          <div className="admin-form__row admin-form__row--2">
            <div className="admin-form__row">
              <label htmlFor="show-venue">Venue *</label>
              <input
                id="show-venue"
                value={form.venue}
                onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                placeholder="e.g. The Shrine"
              />
            </div>
            <div className="admin-form__row">
              <label htmlFor="show-city">City</label>
              <input
                id="show-city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="e.g. Lagos, Nigeria"
              />
            </div>
          </div>
          <div className="admin-form__row admin-form__row--2">
            <div className="admin-form__row">
              <label htmlFor="show-when">Date &amp; time *</label>
              <input
                id="show-when"
                type="datetime-local"
                value={form.starts_at_local}
                onChange={(e) => setForm((f) => ({ ...f, starts_at_local: e.target.value }))}
              />
              <p className="admin-form__hint">Uses your current time zone; stored in UTC on the server.</p>
            </div>
            <div className="admin-form__row">
              <label htmlFor="show-tickets">Tickets / RSVP link (optional)</label>
              <input
                id="show-tickets"
                type="url"
                value={form.ticket_url}
                onChange={(e) => setForm((f) => ({ ...f, ticket_url: e.target.value }))}
                placeholder="https://…"
              />
            </div>
          </div>
          <div className="admin-form__row">
            <label htmlFor="show-note">Note (optional)</label>
            <input
              id="show-note"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g. doors 7pm"
            />
          </div>
          <div className="admin-form__row">
            <label className="admin-form__check">
              <input
                type="checkbox"
                checked={form.is_sold_out}
                onChange={(e) => setForm((f) => ({ ...f, is_sold_out: e.target.checked }))}
              />
              <span>Sold out (replaces the tickets button)</span>
            </label>
          </div>
          <div className="admin-page__actions">
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? "Saving…" : editingId != null ? "Save show" : "Add show"}
            </button>
            {editingId != null && (
              <button type="button" className="admin-btn" onClick={reset}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">All shows</h2>
        {loading ? <p className="admin-page__loading">Loading…</p> : null}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Venue</th>
                <th>City</th>
                <th>Tickets</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => {
                const past = new Date(s.starts_at).getTime() < Date.now() - 86400000;
                return (
                  <tr key={s.id} style={past ? { opacity: 0.5 } : undefined}>
                    <td>
                      {new Date(s.starts_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      {past ? " (past)" : ""}
                    </td>
                    <td>{s.venue}</td>
                    <td>{s.city || "—"}</td>
                    <td>
                      {s.is_sold_out ? (
                        "sold out"
                      ) : s.ticket_url ? (
                        <a href={s.ticket_url} target="_blank" rel="noreferrer">
                          link
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn"
                        style={{ marginRight: "0.35rem" }}
                        onClick={() => startEdit(s)}
                      >
                        Edit
                      </button>
                      <button type="button" className="admin-btn admin-btn--danger" onClick={() => void remove(s.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && sorted.length === 0 ? (
                <tr>
                  <td colSpan={5}>No shows yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
