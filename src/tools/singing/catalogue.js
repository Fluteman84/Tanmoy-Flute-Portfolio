const textOnly = (html = "") => new DOMParser().parseFromString(html, "text/html").body.textContent.trim();

async function json(base, params, signal) {
  const response = await fetch(base + "?" + new URLSearchParams(params), { signal });
  if (!response.ok) throw new Error("Catalogue unavailable.");
  return response.json();
}

export async function findRecordings(title, artist, signal) {
  const quote = (value) => '"' + value.replace(/["\\]/g, " ").trim() + '"';
  const query = "recording:" + quote(title) + (artist ? " AND artist:" + quote(artist) : "");
  const result = await json(
    "https://musicbrainz.org/ws/2/recording/",
    { query, fmt: "json", limit: 8 },
    signal,
  );
  return result.recordings.map((recording) => {
    const releases = [...(recording.releases || [])].sort((a, b) =>
      (a.date || "9999").localeCompare(b.date || "9999"),
    );
    const first = releases.find((r) => r.date === recording["first-release-date"]) || releases[0];
    return {
      id: recording.id,
      title: recording.title,
      artist: recording["artist-credit"]?.map((c) => c.name + (c.joinphrase || "")).join(""),
      date: recording["first-release-date"],
      album: first?.title,
      url: "https://musicbrainz.org/recording/" + recording.id,
    };
  });
}

export async function recordingSources(recording, signal) {
  const data = await json(
    recording.url.replace("/recording/", "/ws/2/recording/"),
    {
      inc: "url-rels+releases",
      fmt: "json",
    },
    signal,
  );
  const releases = (data.releases || [])
    .filter((r) => r.date && r.status !== "Bootleg")
    .sort((a, b) => a.date.localeCompare(b.date));
  const links = (data.relations || []).filter(
    (r) =>
      r.url?.resource?.startsWith("https:") &&
      ["free streaming", "streaming music", "download for free", "video", "youtube"].includes(r.type),
  );
  return { release: releases[0], links: links.map((r) => ({ url: r.url.resource, type: r.type })) };
}

export async function findAudio(title, artist, signal) {
  const data = await json(
    "https://commons.wikimedia.org/w/api.php",
    {
      action: "query",
      generator: "search",
      gsrsearch: [title, artist, "filetype:audio"].filter(Boolean).join(" "),
      gsrnamespace: 6,
      gsrlimit: 6,
      prop: "imageinfo",
      iiprop: "url|mime|size|extmetadata",
      iiextmetadatafilter: "Artist|LicenseShortName",
      format: "json",
      origin: "*",
    },
    signal,
  );
  if (data.error) throw new Error("Audio catalogue unavailable.");
  return Object.values(data.query?.pages || {})
    .sort((a, b) => a.index - b.index)
    .flatMap((p) => {
      const info = p.imageinfo?.[0];
      if (!info?.url || !info.mime?.startsWith("audio/")) return [];
      return [
        {
          id: p.pageid,
          title: p.title.replace(/^File:/, "").replace(/\.[^.]+$/, ""),
          artist: textOnly(info.extmetadata?.Artist?.value),
          license: info.extmetadata?.LicenseShortName?.value,
          url: info.url,
          source: info.descriptionurl,
          size: info.size,
        },
      ];
    });
}
