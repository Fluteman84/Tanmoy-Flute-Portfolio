import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer, ReferencePlayer } from "./reference-player";
import { makePitchGuide } from "./pitch-guide";
import { Contour } from "./contour";
import { STEP, semitones, swara } from "./pitch.mjs";

function phraseNotes(track, sa, start, end) {
  const result = [];
  let run = null,
    first = start;
  for (let i = start; i <= end; i++) {
    const degree = i < end && track[i] ? Math.round(semitones(track[i], sa)) : null;
    if (degree === run) continue;
    if (run !== null && i - first >= 5)
      result.push({ time: first * STEP, until: i * STEP, name: swara(run) });
    first = i;
    run = degree;
  }
  return result;
}

function Drone({ sa }) {
  const [on, setOn] = useState(false);
  const sound = useRef(null);
  useEffect(
    () => () => {
      sound.current?.ctx.close();
    },
    [],
  );
  useEffect(() => {
    if (sound.current) sound.current.osc.frequency.setTargetAtTime(sa, sound.current.ctx.currentTime, 0.03);
  }, [sa]);
  async function toggle() {
    if (sound.current) {
      const ctx = sound.current.ctx;
      sound.current = null;
      setOn(false);
      await ctx.close();
      return;
    }
    const ctx = new AudioContext();
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.frequency.value = sa;
    gain.gain.value = 0.065;
    osc.connect(gain).connect(ctx.destination);
    sound.current = { ctx, osc };
    osc.start();
    setOn(true);
    await ctx.resume();
  }
  return (
    <button onClick={toggle} aria-pressed={on}>
      {on ? "Stop Sa drone" : "Hear Sa drone"}
    </button>
  );
}

export function Study({ recording }) {
  const { track, marks, title, duration } = recording;
  const [player, setPlayer] = useState(null),
    [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(recording.startAt || 0),
    [speed, setSpeed] = useState(1);
  const [sa, setSa] = useState(recording.sa),
    [draftSa, setDraftSa] = useState(String(recording.sa));
  const [width, setWidth] = useState(4),
    [loop, setLoop] = useState(null);
  const [error, setError] = useState("");
  const [guide, setGuide] = useState(false);
  const guideUrl = useRef(null);
  const resumeAt = useRef({ time: recording.startAt || 0, speed: 1 });
  const connect = useCallback((next) => {
    if (next) {
      const resume = resumeAt.current;
      if (resume.time) next.seek(resume.time);
      if (next.rates.includes(resume.speed)) next.rate(resume.speed);
      else setSpeed(1);
    }
    setPlayer(next);
  }, []);
  useEffect(
    () => () => {
      if (guideUrl.current) URL.revokeObjectURL(guideUrl.current);
    },
    [],
  );
  function switchAudio() {
    resumeAt.current = { time, speed };
    player?.pause();
    setPlayer(null);
    setPlaying(false);
    if (!guideUrl.current) guideUrl.current = URL.createObjectURL(makePitchGuide(track, duration));
    setGuide((value) => !value);
  }
  const pendingSeek = useRef(null);
  const start =
    loop ??
    Math.min(Math.floor(time / width) * width, Math.max(0, (Math.ceil(duration / width) - 1) * width));
  const end = Math.min(start + width, duration);
  const hz = track[Math.round(time / STEP)];
  const notes = useMemo(
    () => phraseNotes(track, sa, Math.floor(start / STEP), Math.min(track.length, Math.ceil(end / STEP))),
    [track, sa, start, end],
  );

  const seek = useCallback(
    (value) => {
      const next = Math.max(0, Math.min(duration - 0.001, value));
      pendingSeek.current = { next, until: performance.now() + 1200 };
      setTime(next);
      resumeAt.current.time = next;
      player?.seek(next);
    },
    [duration, player],
  );

  useEffect(() => {
    if (!player) return;
    const timer = setInterval(() => {
      const rate = player.currentRate();
      if (Number.isFinite(rate) && rate > 0) setSpeed(rate);
      const now = player.time();
      if (!Number.isFinite(now)) return;
      const pending = pendingSeek.current;
      if (pending && performance.now() < pending.until && Math.abs(pending.next - now) > 0.18) return;
      pendingSeek.current = null;
      if (loop !== null && playing && (now >= end - 0.04 || now < start - 0.12)) seek(start);
      else setTime(Math.min(duration, now));
    }, 35);
    return () => clearInterval(timer);
  }, [player, duration, loop, start, end, playing, seek]);

  const ended = useCallback(() => {
    if (loop !== null && player) {
      seek(loop);
      Promise.resolve(player.play()).catch(() => setPlaying(false));
    } else setPlaying(false);
  }, [loop, player, seek]);

  function changeSa(value) {
    if (!Number.isFinite(value) || value < 40 || value > 1200) value = sa;
    setSa(value);
    setDraftSa(String(value));
  }
  function move(value) {
    setLoop(null);
    seek(value);
  }
  async function play() {
    try {
      setError("");
      if (playing) player.pause();
      else {
        if (time >= duration - 0.05 || (loop !== null && (time < start || time >= end))) seek(loop ?? 0);
        await player.play();
      }
    } catch {
      setError("Playback could not start. Try the recording’s own play control.");
    }
  }
  return (
    <section className="singer-panel study" id="pitch-study" aria-labelledby="study-title">
      <div className="study-header">
        <div>
          <p className="singer-label">Pitch study</p>
          <h2 id="study-title">{title}</h2>
        </div>
        <div className="current-swara">
          <small>Current swara</small>
          <strong>{hz ? swara(semitones(hz, sa)) : "—"}</strong>
        </div>
      </div>
      <div className="study-layout">
        <div className="study-score">
          <Contour {...{ track, sa, start, end, time, marks, seek }} />
          <div className="phrase-notes" aria-label="Estimated phrase sargam">
            {notes.length ? (
              notes.map((note) => (
                <button
                  key={note.time}
                  className={time >= note.time && time < note.until ? "sounding" : ""}
                  onClick={() => seek(note.time)}
                >
                  {note.name}
                </button>
              ))
            ) : (
              <small>No sustained swara in this phrase.</small>
            )}
          </div>
          <label className="time-slider">
            Recording position{" "}
            <output>
              {time.toFixed(1)} / {duration.toFixed(1)} s
            </output>
            <input
              aria-label="Recording position"
              type="range"
              min="0"
              max={duration}
              step=".01"
              value={time}
              onChange={(e) => move(Number(e.target.value))}
            />
          </label>
          <div className="singer-actions">
            <button className="singer-primary" disabled={!player} onClick={play}>
              {playing ? "Pause" : guide ? "Play pitch guide" : "Play recording"}
            </button>
            {[
              [0.5, "½×"],
              [0.75, "¾×"],
              [1, "1×"],
            ].map(([rate, label]) => (
              <button
                key={rate}
                disabled={!player?.rates.includes(rate)}
                aria-label={label + " speed"}
                aria-pressed={speed === rate}
                onClick={() => {
                  player.rate(rate);
                  setSpeed(rate);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="singer-actions">
            <button disabled={start <= 0} onClick={() => move(Math.max(0, start - width))}>
              Previous phrase
            </button>
            <button disabled={end >= duration} onClick={() => move(end)}>
              Next phrase
            </button>
            <button aria-pressed={loop !== null} onClick={() => setLoop(loop === null ? start : null)}>
              Loop phrase
            </button>
            <label>
              Phrase length{" "}
              <select
                value={width}
                onChange={(e) => {
                  setLoop(null);
                  setWidth(Number(e.target.value));
                }}
              >
                <option value={4}>4 s</option>
                <option value={8}>8 s</option>
              </select>
            </label>
          </div>
          {error && <p role="status">{error}</p>}
        </div>
        <aside className="study-listen">
          {recording.videoId && !guide ? (
            <ReferencePlayer
              id={recording.videoId}
              connect={connect}
              onPlaying={setPlaying}
              onEnded={ended}
            />
          ) : (
            <AudioPlayer
              url={guide ? guideUrl.current : recording.url}
              connect={connect}
              onPlaying={setPlaying}
              onEnded={ended}
            />
          )}
          <button className="guide-switch" aria-pressed={guide} onClick={switchAudio}>
            {guide ? "Use original recording" : "Use synthesized pitch guide"}
          </button>
          {recording.source && (
            <small>
              {[recording.artist, recording.license].filter(Boolean).join(" · ")}{" "}
              <a href={recording.source} target="_blank" rel="noreferrer">
                Recording source ↗
              </a>
            </small>
          )}
          <h3>Tune your Sa</h3>
          <p>Listen to the drone against the singer’s resting note. Adjust Sa if they differ.</p>
          <label>
            Tonic (Hz)
            <input
              type="number"
              min="40"
              max="1200"
              step=".1"
              value={draftSa}
              onChange={(e) => setDraftSa(e.target.value)}
              onBlur={() => changeSa(Number(draftSa))}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          </label>
          <div className="singer-actions">
            <Drone sa={sa} />
            <button onClick={() => changeSa(recording.sa)}>Use estimate · {recording.sa} Hz</button>
          </div>
        </aside>
      </div>
      <details className="singer-help">
        <summary>Reading the sargam</summary>
        <p>
          Each swara is measured relative to Sa. A prime marks the upper octave and a dot below marks the
          lower octave. Listen for the slide between swaras in a meend or a quick cluster in a khatka.
          Highlighted passages are candidates to check by ear. Select a swara or a marker to hear that moment
          when you press play.
        </p>
        <p>
          {recording.videoId
            ? "This study measures the vocal stem isolated with Demucs from the linked live performance."
            : recording.isolated
              ? "Demucs isolated the vocals on your device. Pitchy measured the vocal stem against your selected Sa."
              : "Pitchy tracks the strongest periodic pitch in the recording. Instruments and overlapping voices can affect the estimate. A solo voice or isolated vocal track gives the clearest contour."}
        </p>
      </details>
    </section>
  );
}
