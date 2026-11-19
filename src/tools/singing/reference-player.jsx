import { useEffect, useRef, useState } from "react";

let sdk;
function youtubeSDK() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (sdk) return sdk;
  sdk = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      sdk = null;
      reject(new Error("Player unavailable"));
    };
    const timer = setTimeout(fail, 15000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      resolve(window.YT);
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return sdk;
}

export function ReferencePlayer({ id, connect, onPlaying, onEnded }) {
  const host = useRef(null);
  const ended = useRef(onEnded);
  useEffect(() => {
    ended.current = onEnded;
  }, [onEnded]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false,
      player,
      cuedTime = 0;
    const timer = setTimeout(() => !disposed && setFailed(true), 20000);
    const node = document.createElement("div");
    host.current.replaceChildren(node);
    youtubeSDK()
      .then((YT) => {
        if (disposed) return;
        player = new YT.Player(node, {
          videoId: id,
          host: "https://www.youtube-nocookie.com",
          playerVars: { playsinline: 1, origin: location.origin },
          events: {
            onReady: () => {
              if (disposed) return;
              clearTimeout(timer);
              setFailed(false);
              connect({
                time: () => cuedTime ?? player.getCurrentTime(),
                seek: (t) => {
                  if (cuedTime !== null) {
                    cuedTime = t;
                    player.cueVideoById({ videoId: id, startSeconds: t });
                  } else player.seekTo(t, true);
                },
                play: () => player.playVideo(),
                pause: () => player.pauseVideo(),
                get rates() {
                  return player.getAvailablePlaybackRates() || [1];
                },
                currentRate: () => player.getPlaybackRate(),
                rate: (n) => player.setPlaybackRate(n),
              });
            },
            onStateChange: (e) => {
              if (disposed) return;
              if (e.data === YT.PlayerState.PLAYING) cuedTime = null;
              onPlaying(e.data === YT.PlayerState.PLAYING);
              if (e.data === YT.PlayerState.ENDED) ended.current();
            },
            onError: () => {
              if (!disposed) {
                setFailed(true);
                connect(null);
                onPlaying(false);
              }
            },
          },
        });
      })
      .catch(() => !disposed && setFailed(true));
    return () => {
      disposed = true;
      clearTimeout(timer);
      player?.destroy();
    };
  }, [id, connect, onPlaying]);
  return (
    <div>
      <div className="singer-video" ref={host} />
      {failed && (
        <p role="status">
          YouTube playback is unavailable here. Use the pitch guide here, or open the reference and capture
          its tab audio.
        </p>
      )}
      <a target="_blank" rel="noreferrer" href={`https://youtu.be/${id}`}>
        Open this performance on YouTube ↗
      </a>
    </div>
  );
}

export function AudioPlayer({ url, connect, onPlaying, onEnded }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    el.preservesPitch = true;
    connect({
      time: () => el.currentTime,
      seek: (t) => {
        el.currentTime = t;
      },
      rate: (n) => {
        el.playbackRate = n;
      },
      rates: [0.5, 0.75, 1],
      currentRate: () => el.playbackRate,
      play: () => el.play(),
      pause: () => el.pause(),
    });
  }, [url, connect]);
  return (
    <audio
      controls
      ref={ref}
      src={url}
      onPlay={() => onPlaying(true)}
      onPause={() => onPlaying(false)}
      onEnded={onEnded}
    />
  );
}
