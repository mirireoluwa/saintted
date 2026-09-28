import { useState } from "react";
import { subscribeToMailingList } from "../api/client";
import { trackEvent } from "../utils/analytics";
import "./MailingForm.css";

type FormState = "idle" | "loading" | "success" | "error";

type MailingFormProps = {
  /** Prefix for input ids so two forms can live on one page. */
  idPrefix: string;
  /** Called once a subscribe succeeds (the popup uses it to close itself). */
  onSuccess?: () => void;
  firstFieldRef?: React.Ref<HTMLInputElement>;
  /** Extra actions shown on the same row as the subscribe button (e.g. the WhatsApp link). */
  actions?: React.ReactNode;
};

/** Name + email signup. Colours inherit, so it works on paper and on the accent panel. */
export function MailingForm({ idPrefix, onSuccess, firstFieldRef, actions }: MailingFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formState === "loading") return;
    setFormState("loading");
    setMessage("");
    try {
      const result = await subscribeToMailingList({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
      });
      setFormState("success");
      setMessage(result.message);
      if (!result.already_subscribed) trackEvent("subscribe");
      if (!result.already_subscribed) {
        setFirstName("");
        setLastName("");
        setEmail("");
      }
      onSuccess?.();
    } catch (err) {
      setFormState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  if (formState === "success") {
    return (
      <div className="mform__success" role="status">
        <span className="mform__tick" aria-hidden>✓</span>
        <p>{message}</p>
      </div>
    );
  }

  const disabled = formState === "loading";

  return (
    <form className="mform" onSubmit={handleSubmit} noValidate>
      <div className="mform__row">
        <div className="mform__field">
          <label htmlFor={`${idPrefix}-first`}>first name</label>
          <input
            id={`${idPrefix}-first`}
            ref={firstFieldRef}
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="first name"
            required
            disabled={disabled}
            autoComplete="given-name"
          />
        </div>
        <div className="mform__field">
          <label htmlFor={`${idPrefix}-last`}>last name</label>
          <input
            id={`${idPrefix}-last`}
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="last name"
            required
            disabled={disabled}
            autoComplete="family-name"
          />
        </div>
        <div className="mform__field mform__field--wide">
          <label htmlFor={`${idPrefix}-email`}>email address</label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={disabled}
            autoComplete="email"
          />
        </div>
      </div>
      <div className="mform__foot">
        {formState === "error" && message ? (
          <p className="mform__error" role="alert">{message}</p>
        ) : (
          <span />
        )}
        <div className="mform__actions">
          <button type="submit" className="btn btn--primary" disabled={disabled}>
            {disabled ? "subscribing…" : "subscribe"} <span className="arrow" aria-hidden>→</span>
          </button>
          {actions}
        </div>
      </div>
    </form>
  );
}
