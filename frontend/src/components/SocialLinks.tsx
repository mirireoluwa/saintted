import instagramIcon from "../assets/instagram.svg";
import linkIcon from "../assets/link.svg";
import xIcon from "../assets/x.svg";
import untitledIcon from "../assets/untitled-in-brackets.svg";
import appleMusicIcon from "../assets/apple-music.svg";
import spotifyIcon from "../assets/spotify.svg";
import youtubeIcon from "../assets/youtube.svg";

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
  { href: "https://linktr.ee/saintted", label: "Linktree", icon: linkIcon },
  {
    href: "https://untitled.stream/library/project/jWQL4g2PdE8woebBo6Wgv",
    label: "Untitled — silence, selah",
    icon: untitledIcon,
  },
] as const;

interface SocialLinksProps {
  className?: string;
  linkClassName?: string;
}

export function SocialLinks({ className, linkClassName }: SocialLinksProps) {
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
        >
          <img src={icon} alt="" width={24} height={24} />
        </a>
      ))}
    </div>
  );
}
