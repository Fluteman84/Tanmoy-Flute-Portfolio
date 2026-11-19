import { useEffect, useRef, useState } from "react";

export function Capture({ onAudio }) {
  const session = useRef(null);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(
    () => () => {
      if (session.current) {
        session.current.cancelled = true;
        session.current.stop?.();
      }
    },
    [],
  );
  async function start() {
    if (session.current) return;
    const take = { cancelled: false };
    session.current = take;
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (take.cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const tracks = stream.getAudioTracks();
      if (!tracks.length)
        throw new Error("Select a browser tab and enable Share tab audio, or choose an audio file.");
      const recorder = new MediaRecorder(new MediaStream(tracks));
      const chunks = [];
      take.stop = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => {
        clearTimeout(take.timer);
        stream.getTracks().forEach((t) => t.stop());
        if (take.cancelled) return;
        session.current = null;
        setActive(false);
        setMessage("");
        onAudio(new Blob(chunks, { type: recorder.mimeType }), "Captured performance", true);
      };
      stream.getTracks().forEach((t) => t.addEventListener("ended", take.stop));
      recorder.start(1000);
      setActive(true);
      setMessage("Play the passage in the shared tab. Capture stops after three minutes.");
      take.timer = setTimeout(take.stop, 180000);
    } catch (err) {
      stream?.getTracks().forEach((t) => t.stop());
      session.current = null;
      if (!take.cancelled)
        setMessage(
          err.name === "NotAllowedError" ? "Tab sharing was cancelled or unavailable." : err.message,
        );
    }
  }
  if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) return null;
  return (
    <div>
      <button onClick={active ? () => session.current.stop() : start}>
        {active ? "Finish and analyze" : "Capture tab audio"}
      </button>
      <small role="status">{message || "Share the tab playing your recording and enable tab audio."}</small>
    </div>
  );
}
