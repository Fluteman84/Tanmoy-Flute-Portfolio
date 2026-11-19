import { useEffect, useRef, useState } from "react";
import { findRecordings, findAudio } from "./catalogue";

export function SongSearch({ initialTitle, chooseFile, reference, selectReference, chooseMatch }) {
  const [title, setTitle] = useState(initialTitle),
    [artist, setArtist] = useState("");
  const [results, setResults] = useState(null),
    [busy, setBusy] = useState(false);
  const pending = useRef(null);
  async function search() {
    if (!title.trim()) return;
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15000)]);
    setBusy(true);
    setResults(null);
    const [recordings, audio] = await Promise.allSettled([
      findRecordings(title.trim(), artist.trim(), signal),
      findAudio(title.trim(), artist.trim(), signal),
    ]);
    if (request.signal.aborted) return;
    setResults({ query: title, singer: artist, recordings: recordings.value, audio: audio.value });
    setBusy(false);
  }
  useEffect(() => {
    if (initialTitle) search();
    return () => pending.current?.abort();
  }, []);
  return (
    <section className="singer-panel">
      <h2>Find a recording</h2>
      <form
        className="singer-search"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <label>
          Song title
          <input
            required
            maxLength={180}
            value={title}
            placeholder="Raabta"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Singer (optional)
          <input
            maxLength={150}
            value={artist}
            placeholder="Arijit Singh"
            onChange={(e) => setArtist(e.target.value)}
          />
        </label>
        <button className="singer-primary">{busy ? "Searching…" : "Search recordings"}</button>
      </form>
      {results && (
        <div className="singer-results">
          <h3>Versions of “{results.query}”</h3>
          <p>Check the singer, release and year to choose the performance you mean.</p>
          {/raabta/i.test(results.query) && (
            <button onClick={selectReference}>{reference.title} · Open pitch study</button>
          )}
          {results.recordings?.map((r) => (
            <div className="catalogue-row" key={r.id}>
              <div>
                <strong>{r.title}</strong>
                <small>{[r.artist, r.album, r.date].filter(Boolean).join(" · ")}</small>
              </div>
              <a href={r.url} target="_blank" rel="noreferrer">
                Release details ↗
              </a>
              <button onClick={() => chooseMatch(r)}>Use this version</button>
            </div>
          ))}
          {!results.recordings?.length && (
            <p>
              {results.recordings
                ? "No matching releases found."
                : "MusicBrainz is unavailable. Try searching again."}
            </p>
          )}
          <p><a href={"https://www.youtube.com/results?search_query=" +
            encodeURIComponent([results.query, results.singer, "official audio"].filter(Boolean).join(" "))}
            target="_blank" rel="noreferrer">Search YouTube for the original recording ↗</a></p>
          <h3>Audio from Wikimedia Commons</h3>
          {results.audio?.map((r) => (
            <div className="catalogue-row" key={r.id}>
              <div>
                <strong>{r.title}</strong>
                <small>{[r.artist, r.license].filter(Boolean).join(" · ")}</small>
              </div>
              <a href={r.source} target="_blank" rel="noreferrer">
                Source ↗
              </a>
              <button onClick={() => chooseFile(r)}>Analyze recording</button>
            </div>
          ))}
          {!results.audio?.length && (
            <p>
              {results.audio
                ? "No downloadable match. Load your copy or capture the performance from a browser tab."
                : "The audio catalogue is unavailable. You can load a file or capture tab audio."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
