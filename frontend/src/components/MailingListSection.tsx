import { MailingForm } from "./MailingForm";
import { WhatsAppButton } from "./WhatsAppButton";
import "./MailingListSection.css";

/** Full-width accent panel with the signup form; linked to from the footer as #mailing-list-section. */
export function MailingListSection() {
  return (
    <section className="section" id="mailing-list-section" aria-labelledby="mailing-title">
      <div className="wrap">
        <div className="cta">
          <div className="cta__copy">
            <p className="eyebrow">mailing list</p>
            <h2 id="mailing-title">stay in the loop</h2>
            <p className="cta__sub">new music, shows and updates, straight to your inbox.</p>
          </div>
          <div className="cta__form">
            <MailingForm idPrefix="ml" actions={<WhatsAppButton />} />
          </div>
        </div>
      </div>
    </section>
  );
}
