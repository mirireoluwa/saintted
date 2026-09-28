import { trackEvent } from "../utils/analytics";
import whatsappIcon from "../assets/whatsapp.svg";

/** The community link also used in the footer's "elsewhere" list. */
export const WHATSAPP_URL = "https://chat.whatsapp.com/FXNIdq5z0r92PaMzEXQkkF";

/** Outline button that opens the WhatsApp channel. Sits beside the email signup. */
export function WhatsAppButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("whatsapp")}
      className={`btn whatsapp-btn ${className}`.trim()}
    >
      <img src={whatsappIcon} alt="" aria-hidden />
      whatsapp channel <span className="arrow" aria-hidden>↗</span>
    </a>
  );
}
