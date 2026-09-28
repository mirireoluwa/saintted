import { trackEvent } from "../utils/analytics";
import instagramIcon from "../assets/instagram.svg";
import xIcon from "../assets/x.svg";
import appleMusicIcon from "../assets/apple-music.svg";
import spotifyIcon from "../assets/spotify.svg";
import youtubeIcon from "../assets/youtube.svg";
import whatsappIcon from "../assets/whatsapp.svg";

const SOCIAL_LINKS = [
  { href: "https://instagram.com/beingsaintted", label: "Instagram", icon: instagramIcon },
  { href: "https://x.com/beingsaintted", label: "X", icon: xIcon },
  {
    href: "https://music.apple.com/ng/artist/saintted/1683622819",
    label: "Apple Music",
    icon: appleMusicIcon,
  },
  {
    href: "https://open.spotify.com/artist/6y6qTKA4172ZvpCg8t6wE6?si=KXSzB41kS0aKPaBL04PDVw",
    label: "Spotify",
    icon: spotifyIcon,
  },
  { href: "https://www.youtube.com/@saintted", label: "YouTube", icon: youtubeIcon },
  { href: "https://chat.whatsapp.com/FXNIdq5z0r92PaMzEXQkkF", label: "WhatsApp Community", icon: whatsappIcon },
] as const;

interface SocialLinksProps {
  className?: string;
  linkClassName?: string;
  /** Show the platform name beside its icon (footer list) instead of an icon-only row. */
  showLabels?: boolean;
}

export function SocialLinks({ className, linkClassName, showLabels = false }: SocialLinksProps) {
  return (
    <div className={className} role="navigation" aria-label="Social links">
      {SOCIAL_LINKS.map(({ href, label, icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          aria-label={label}
          onClick={() => trackEvent("social", { platform: label })}
        >
          <img src={icon} alt="" width={showLabels ? 16 : 24} height={showLabels ? 16 : 24} />
          {showLabels ? <span>{label}</span> : null}
        </a>
      ))}
    </div>
  );
}
