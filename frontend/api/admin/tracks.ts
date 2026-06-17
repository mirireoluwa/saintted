import { verifyAdminCookie } from "../_lib-js/adminAuth.js";
import { getRedis, TRACKS_KEY } from "../_lib-js/redis.js";
import type { Track } from "../_lib/types.js";

type Req = {
  method?: string;
  headers?: { cookie?: string };
  query?: Record<string, string | string[]>;
  body?: Record<string, unknown>;
};
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "track"
  );
}

function uniqueSlug(base: string, existing: Track[]): string {
  if (!existing.some((t) => t.slug === base)) return base;
  let n = 2;
  while (existing.some((t) => t.slug === `${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function parse(raw: unknown): Track[] {
  if (!raw) return [];
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as Track[];
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Content-Type", "application/json");

  if (!verifyAdminCookie(req.headers?.cookie, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  const slug = typeof req.query?.slug === "string" ? req.query.slug : "";

  if (req.method === "POST" && req.query?.action === "seed") {
    try {
      const q = (title: string) => encodeURIComponent(`Saintted ${title}`);
      type SeedEntry = {
        slug: string;
        title: string;
        meta: string;
        description: string;
        year: number;
        order: number;
        youtube_url: string;
        apple_music_url: string;
        spotify_url: string;
      };
      const seeds: SeedEntry[] = [
        {
          slug: "one-chance",
          title: "one chance",
          meta: "Single",
          order: 0,
          description: "the song talks about giving someone a chance to prove themselves after a mistake but realizing that sometimes apologies are not enough.\n\nthe lyrics express the struggle of holding onto special memories and feelings while trying to move on from a relationship that may not be working out, symbolized by the metaphor of giving one dance to prove wrong.",
          year: 2025,
          youtube_url: `https://www.youtube.com/results?search_query=${q("one chance")}`,
          apple_music_url: `https://music.apple.com/us/search?term=${q("one chance")}`,
          spotify_url: `https://open.spotify.com/search/${q("one chance")}`,
        },
        {
          slug: "shimmer",
          title: "shimmer",
          meta: "Single (Sound)",
          order: 1,
          description: "i decided to do something really unconventional. This one has no vocals and I'm sure you all might be wondering, \"why?\". The truth is, it's the best way I could express how i was feeling at the time: \"i've got no words to say\".\n\n\"shimmer\" tells a story of solitude and how i've come to enjoy finding some quiet time alone to think and process life. This song is supposed to help with that. It is designed to help go through those moments of solitude.",
          year: 2025,
          youtube_url: `https://www.youtube.com/results?search_query=${q("shimmer")}`,
          apple_music_url: `https://music.apple.com/us/search?term=${q("shimmer")}`,
          spotify_url: `https://open.spotify.com/search/${q("shimmer")}`,
        },
        {
          slug: "hyperphoria",
          title: "hyperphoria",
          meta: "Single",
          order: 2,
          description: "This song was actually written in the summer of 2023. I was at a point where I was just trying to figure out my life. It speaks about my aspirations to be a great person, the challenges I will face to get there, and leaving some pain from my past behind.",
          year: 2024,
          youtube_url: `https://www.youtube.com/results?search_query=${q("hyperphoria")}`,
          apple_music_url: `https://music.apple.com/us/search?term=${q("hyperphoria")}`,
          spotify_url: `https://open.spotify.com/search/${q("hyperphoria")}`,
        },
        {
          slug: "runaway",
          title: "runaway",
          meta: "Single",
          order: 3,
          description: "Runaway speaks about a transition period in my life. I wanted things to change so badly and I thought that the best way to express that was by essentially running away from the old to the new.",
          year: 2022,
          youtube_url: `https://www.youtube.com/results?search_query=${q("runaway")}`,
          apple_music_url: `https://music.apple.com/us/search?term=${q("runaway")}`,
          spotify_url: `https://open.spotify.com/search/${q("runaway")}`,
        },
        {
          slug: "home",
          title: "home",
          meta: "Single",
          order: 4,
          description: "this song stems from two perspectives.\n\nthe first, from a quote that says, \"sometimes home is a person\". The idea for this song was developed from this quote.\n\nthe second, a vision for a better world where love is everything we express.",
          year: 2022,
          youtube_url: `https://www.youtube.com/results?search_query=${q("home")}`,
          apple_music_url: `https://music.apple.com/us/search?term=${q("home")}`,
          spotify_url: `https://open.spotify.com/search/${q("home")}`,
        },
      ];

      // Strip everything except lowercase letters and digits for fuzzy title match.
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

      const tracks = parse(await redis.get<string>(TRACKS_KEY));
      let created = 0;
      let updated = 0;
      const log: string[] = [];

      for (const seed of seeds) {
        // Try exact slug match first, then fall back to normalized title match.
        let idx = tracks.findIndex((t) => t.slug === seed.slug);
        if (idx === -1) {
          idx = tracks.findIndex((t) => norm(t.title) === norm(seed.title));
        }

        if (idx === -1) {
          // Track not found by slug or title — create it.
          tracks.push({
            id: Date.now() + created,
            title: seed.title,
            slug: seed.slug,
            meta: seed.meta,
            order: seed.order,
            description: seed.description,
            year: seed.year,
            art_url: "",
            link_url: "",
            youtube_url: seed.youtube_url,
            apple_music_url: seed.apple_music_url,
            spotify_url: seed.spotify_url,
            is_published: true,
            is_highlighted: false,
            is_unreleased: false,
            release_at: null,
            presave_url: "",
          });
          created++;
          log.push(`created "${seed.slug}"`);
        } else {
          // Found — always restore canonical detail fields.
          // Preserve user-set fields: art_url, presave_url, is_published,
          // is_highlighted, is_unreleased, release_at, order, id, slug.
          const t = tracks[idx];
          tracks[idx] = {
            ...t,
            title: seed.title,
            meta: seed.meta,
            description: seed.description,
            year: seed.year,
            youtube_url: seed.youtube_url,
            apple_music_url: seed.apple_music_url,
            spotify_url: seed.spotify_url,
          };
          updated++;
          log.push(`restored "${t.slug}" (matched as "${seed.slug}")`);
        }
      }

      await redis.set(TRACKS_KEY, JSON.stringify(tracks));
      return res.status(200).json({ ok: true, created, updated, seeded: created + updated, log });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Seed failed" });
    }
  }

  if (req.method === "GET") {
    try {
      const tracks = parse(await redis.get<string>(TRACKS_KEY));
      return res.status(200).json(tracks.sort((a, b) => a.order - b.order || a.id - b.id));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to fetch tracks" });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body ?? {};
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return res.status(400).json({ ok: false, message: "title is required" });

      const tracks = parse(await redis.get<string>(TRACKS_KEY));
      const rawSlug = typeof body.slug === "string" ? body.slug.trim() : "";
      const newSlug = rawSlug || uniqueSlug(slugify(title), tracks);

      if (tracks.some((t) => t.slug === newSlug)) {
        return res.status(400).json({ ok: false, message: `Slug "${newSlug}" already exists` });
      }

      const isUnreleased = body.is_unreleased === true;
      const releaseAt = typeof body.release_at === "string" ? body.release_at : null;
      if (isUnreleased && !releaseAt) {
        return res.status(400).json({ ok: false, message: "release_at is required for unreleased tracks" });
      }

      const track: Track = {
        id: Date.now(),
        title,
        slug: newSlug,
        meta: typeof body.meta === "string" ? body.meta.trim() : "",
        art_url: typeof body.art_url === "string" ? body.art_url.trim() : "",
        link_url: typeof body.link_url === "string" ? body.link_url.trim() : "",
        order: typeof body.order === "number" ? body.order : 0,
        description: typeof body.description === "string" ? body.description.trim() : "",
        year: typeof body.year === "number" ? body.year : null,
        youtube_url: typeof body.youtube_url === "string" ? body.youtube_url.trim() : "",
        apple_music_url: typeof body.apple_music_url === "string" ? body.apple_music_url.trim() : "",
        spotify_url: typeof body.spotify_url === "string" ? body.spotify_url.trim() : "",
        is_published: body.is_published !== false,
        is_highlighted: body.is_highlighted === true,
        is_unreleased: isUnreleased,
        release_at: releaseAt,
        presave_url: typeof body.presave_url === "string" ? body.presave_url.trim() : "",
      };

      tracks.push(track);
      await redis.set(TRACKS_KEY, JSON.stringify(tracks));
      return res.status(201).json(track);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to create track" });
    }
  }

  if (req.method === "PATCH" || req.method === "PUT") {
    if (!slug) return res.status(400).json({ ok: false, message: "slug query param required" });
    try {
      const tracks = parse(await redis.get<string>(TRACKS_KEY));
      const idx = tracks.findIndex((t) => t.slug === slug);
      if (idx === -1) return res.status(404).json({ ok: false, message: "Track not found" });

      const body = (req.body ?? {}) as Partial<Track>;
      if (body.is_unreleased && !body.release_at && !tracks[idx].release_at) {
        return res.status(400).json({ ok: false, message: "release_at is required for unreleased tracks" });
      }
      const updated: Track = {
        ...tracks[idx],
        ...body,
        id: tracks[idx].id,
        slug: (typeof body.slug === "string" && body.slug.trim()) ? body.slug.trim() : tracks[idx].slug,
      };
      tracks[idx] = updated;
      await redis.set(TRACKS_KEY, JSON.stringify(tracks));
      return res.status(200).json(updated);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to update track" });
    }
  }

  if (req.method === "DELETE") {
    if (!slug) return res.status(400).json({ ok: false, message: "slug query param required" });
    try {
      const tracks = parse(await redis.get<string>(TRACKS_KEY));
      const filtered = tracks.filter((t) => t.slug !== slug);
      if (filtered.length === tracks.length) return res.status(404).json({ ok: false, message: "Track not found" });
      await redis.set(TRACKS_KEY, JSON.stringify(filtered));
      return res.status(204).json({});
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to delete track" });
    }
  }

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
