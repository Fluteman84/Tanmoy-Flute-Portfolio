import { useEffect, useRef, useState } from "react";
import { renderTool } from "./tool-shell";
import { Capture } from "./singing/capture";
import { recordingSources } from "./singing/catalogue";
import { SongSearch } from "./singing/search";
import { Study } from "./singing/study";
import { analyzeAudio, maxBytes } from "./singing/load-audio";
import { gestures } from "./singing/pitch.mjs";
import example from "./singing/raabta.json";
import "./singing/trainer.css";

const track = Float32Array.from(example.hzTenths, (n) => n / 10);
const reference = { ...example, startAt: 44, track, marks: gestures(track), id: example.videoId };
const initialTitle = new URLSearchParams(location.search).get("song") || "";

function SingingTrainer() {
  const [recording, setRecording] = useState(reference);
  const [match, setMatch] = useState(null);
  const [status, setStatus] = useState("");
  const [isolate, setIsolate] = useState(false);
  const [busy, setBusy] = useState(false);
  const details = useRef(null);
  const pending = useRef(null);
  const loadPanel = useRef(null);
  useEffect(
    () => () => {
      pending.current?.abort();
      details.current?.abort();
    },
    [],
  );
  useEffect(
    () => () => {
      if (recording.url) URL.revokeObjectURL(recording.url);
    },
    [recording],
  );

  function selectReference() {
    details.current?.abort();
    pending.current?.abort();
    setBusy(false);
    setStatus("");
    setMatch(null);
    setRecording(reference);
    document.getElementById("pitch-study")?.scrollIntoView();
  }
  async function loadAudio(source, title, capture = false) {
    pending.current?.abort();
    const task = new AbortController();
    pending.current = task;
    setBusy(true);
    const remote = !(source instanceof Blob);
    try {
      let blob = source;
      if (remote) {
        if (source.size > maxBytes) throw new Error("Choose a recording under 48 MB.");
        setStatus("Loading the recording…");
        const response = await fetch(source.url, { signal: task.signal });
        if (!response.ok) throw new Error("Could not fetch that recording. Load a local copy instead.");
        blob = await response.blob();
      }
      task.signal.throwIfAborted();
      setStatus("Listening for Sa and tracing the pitch…");
      const { media, ...analysis } = await analyzeAudio(blob, capture, task.signal, isolate, setStatus);
      task.signal.throwIfAborted();
      const url = URL.createObjectURL(media);
      setRecording({ ...(remote ? source : {}), ...analysis, url, id: url, title: title || source.title });
      details.current?.abort();
      setStatus("");
      setMatch(null);
      requestAnimationFrame(() => document.getElementById("pitch-study")?.scrollIntoView());
    } catch (error) {
      if (!task.signal.aborted)
        setStatus(
          error.name === "EncodingError"
            ? "This audio format could not be decoded. Try a WAV or MP3 file."
            : error.message,
        );
    } finally {
      if (!task.signal.aborted) setBusy(false);
    }
  }
  async function chooseMatch(item) {
    details.current?.abort();
    const request = new AbortController();
    details.current = request;
    pending.current?.abort();
    setBusy(false);
    setMatch(item);
    setStatus("");
    loadPanel.current?.scrollIntoView();
    try {
      const info = await recordingSources(
        item,
        AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
      );
      if (!request.signal.aborted) setMatch({ ...item, ...info });
    } catch {
      /* The recording search remains usable when release details are unavailable. */
    }
  }
  return (
    <main className="singer-main">
      <header className="singer-heading">
        <h1>
          Sargam <em>Singing Trainer</em>
        </h1>
        <p>Follow the singer’s pitch, hear each slide, and repeat a phrase at your own pace.</p>
        <a href="#song-search">Find a song ↓</a>
      </header>
      <Study key={recording.id} recording={recording} />
      <div id="song-search">
        <SongSearch
          initialTitle={initialTitle}
          chooseFile={loadAudio}
          reference={reference}
          selectReference={selectReference}
          chooseMatch={chooseMatch}
        />
      </div>
      <section className="singer-panel" ref={loadPanel}>
        <h2>Study your recording</h2>
        {match && (
          <div className="chosen-version">
            <strong>
              {match.title} · {match.artist}
            </strong>
            <p>
              {match.release
                ? "Earliest catalogued release · " + [match.release.title, match.release.date].join(" · ")
                : [match.album, match.date].filter(Boolean).join(" · ")}
            </p>
            {match.links?.map((link) => (
              <p key={link.url}>
                <a href={link.url} target="_blank" rel="noreferrer">
                  Open recording on {new URL(link.url).hostname} ↗
                </a>
              </p>
            ))}
            <a
              href={
                "https://www.youtube.com/results?search_query=" +
                encodeURIComponent(
                  [match.title, match.artist, match.album, "official audio"].filter(Boolean).join(" "),
                )
              }
              target="_blank"
              rel="noreferrer"
            >
              Find this performance on YouTube ↗
            </a>
            <p>Capture the matching performance from its tab or load your copy below.</p>
          </div>
        )}
        <p>Load a vocal track or capture a passage. Audio analysis runs on your device.</p>
        <label className="isolate-option">
          <input type="checkbox" checked={isolate} onChange={(e) => setIsolate(e.target.checked)} /> Isolate
          vocals with Demucs
        </label>
        <small>
          For songs with accompaniment. Downloads a 172 MB model on first use and accepts passages up to three
          minutes.
        </small>
        <div className="singer-inputs">
          <div>
            <label className="file-button">
              Choose audio file
              <input
                type="file"
                accept="audio/*,.webm,.m4a,.flac"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadAudio(file, file.name.replace(/\.[^.]+$/, ""));
                  e.target.value = "";
                }}
              />
            </label>
            <small>Up to 10 minutes and 48 MB. Solo vocals give the clearest results.</small>
          </div>
          <Capture onAudio={loadAudio} />
        </div>
        <p role="status">{status}</p>
        {busy && (
          <button
            onClick={() => {
              pending.current?.abort();
              setStatus("Analysis cancelled.");
              setBusy(false);
            }}
          >
            Cancel analysis
          </button>
        )}
        {recording !== reference && <button onClick={selectReference}>Return to the Raabta study</button>}
      </section>
    </main>
  );
}
renderTool(<SingingTrainer />);
