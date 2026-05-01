import { useState } from "react";
import { subscribeToMailingList } from "../api/client";
import "./MailingListSection.css";

type FormState = "idle" | "loading" | "success" | "error";

export function MailingListSection() {
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
      if (!result.already_subscribed) {
        setFirstName("");
        setLastName("");
        setEmail("");
      }
    } catch (err) {
      setFormState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const isDisabled = formState === "loading" || formState === "success";

  return (
    <section className="mailing-list-section" id="mailing-list-section">
      <div className="mailing-list-section__inner">
        <div className="section-label">
          <span className="section-label__text">mailing list</span>
          <span className="section-label__line" />
        </div>

        <div className="mailing-list-section__body">
          <div className="mailing-list-section__copy">
            <h2 className="mailing-list-section__heading">stay in the loop</h2>
            <p className="mailing-list-section__sub">
              New music, events, and updates — straight to your inbox.
            </p>
          </div>

          {formState === "success" ? (
            <div className="mailing-list-section__success">
              <span className="mailing-list-section__success-icon" aria-hidden>✓</span>
              <p className="mailing-list-section__success-text">{message}</p>
            </div>
          ) : (
            <form className="mailing-list-form" onSubmit={handleSubmit} noValidate>
              <div className="mailing-list-form__row">
                <div className="mailing-list-form__field">
                  <label htmlFor="ml-first-name" className="mailing-list-form__label">
                    First Name
                  </label>
                  <input
                    id="ml-first-name"
                    type="text"
                    className="mailing-list-form__input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    required
                    disabled={isDisabled}
                    autoComplete="given-name"
                  />
                </div>
                <div className="mailing-list-form__field">
                  <label htmlFor="ml-last-name" className="mailing-list-form__label">
                    Last Name
                  </label>
                  <input
                    id="ml-last-name"
                    type="text"
                    className="mailing-list-form__input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    required
                    disabled={isDisabled}
                    autoComplete="family-name"
                  />
                </div>
                <div className="mailing-list-form__field mailing-list-form__field--email">
                  <label htmlFor="ml-email" className="mailing-list-form__label">
                    Email Address
                  </label>
                  <input
                    id="ml-email"
                    type="email"
                    className="mailing-list-form__input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={isDisabled}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="mailing-list-form__footer">
                {formState === "error" && message ? (
                  <p className="mailing-list-form__error" role="alert">{message}</p>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  className="mailing-list-form__btn"
                  disabled={isDisabled}
                >
                  {formState === "loading" ? "Subscribing…" : "Subscribe"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
