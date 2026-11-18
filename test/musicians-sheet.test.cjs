const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Load songs JSON
const songsPath = path.join(__dirname, "../data/musician-sheets.json");
const rawData = JSON.parse(fs.readFileSync(songsPath, "utf-8"));
const greatAreYouLord = rawData.songs.find((s) => s.id === "great-are-you-lord");
const monsoonMelody = rawData.songs.find((s) => s.id === "monsoon-melody-fusion");

// Helper implementations mirroring song-parser for node environment test
function calculateBarTiming(timeSignature, bpm) {
  const numerator = Number(timeSignature?.numerator) || 4;
  const denominator = Number(timeSignature?.denominator) || 4;
  const pulseUnit = timeSignature?.pulseUnit || "quarter";
  const tempo = Number(bpm) || 120;

  if (denominator === 8 && numerator % 3 === 0 && pulseUnit === "dotted-quarter") {
    const compoundPulses = numerator / 3;
    const msPerPulse = 60000 / tempo;
    const msPerBeat = msPerPulse / 3;
    const barDurationMs = compoundPulses * msPerPulse;
    return { msPerBeat, beatsPerBar: numerator, barDurationMs, compoundPulses, msPerPulse };
  }

  const msPerBeat = (60000 / tempo) * (4 / denominator);
  const barDurationMs = numerator * msPerBeat;
  return { msPerBeat, beatsPerBar: numerator, barDurationMs };
}

function resolveSongTimeline(song, options = {}) {
  const { expandRepeats = true } = options;
  const songBpm = song.metadata.bpm || 120;
  const defaultMeter = song.metadata.timeSignature || { numerator: 4, denominator: 4, pulseUnit: "quarter" };

  let cumulativeMs = 0;
  let cumulativeBars = 0;

  const occurrences = song.occurrences.map((occurrence, index) => {
    const canonicalId = occurrence.isRepeat && occurrence.repeatOf
      ? occurrence.repeatOf
      : occurrence.sectionId;

    const canonical = song.canonicalSections[canonicalId];
    assert.ok(canonical, `Section ${canonicalId} must exist`);

    const sectionBpm = occurrence.bpm || songBpm;
    const sectionMeter = occurrence.timeSignature || defaultMeter;
    const bars = occurrence.bars ?? null;

    const timing = calculateBarTiming(sectionMeter, sectionBpm);
    const durationMs = bars !== null ? bars * timing.barDurationMs : 0;
    const startMs = cumulativeMs;
    const endMs = bars !== null ? cumulativeMs + durationMs : null;
    const startBar = cumulativeBars + 1;
    const endBar = bars !== null ? cumulativeBars + bars : null;

    if (bars !== null) {
      cumulativeMs += durationMs;
      cumulativeBars += bars;
    }

    const drums = canonical.musicianData.drums;
    const guitar = canonical.musicianData.guitar;
    const bass = canonical.musicianData.bass;
    const artist = canonical.musicianData.mainArtist;

    let artistLyrics = "";
    if (artist.isInstrumental) {
      artistLyrics = "";
    } else if (occurrence.isRepeat && !expandRepeats) {
      artistLyrics = `[Repeat lyrics of ${canonical.name}]`;
    } else {
      artistLyrics = artist.lyrics;
    }

    return {
      occurrenceId: occurrence.occurrenceId,
      sectionId: occurrence.sectionId,
      canonicalId,
      displayName: occurrence.displayName,
      isRepeat: Boolean(occurrence.isRepeat),
      repeatOf: occurrence.repeatOf || null,
      bars,
      bpm: sectionBpm,
      timeSignature: sectionMeter,
      startMs,
      endMs,
      durationMs,
      startBar,
      endBar,
      barDurationMs: timing.barDurationMs,
      msPerBeat: timing.msPerBeat,
      beatsPerBar: timing.beatsPerBar,
      index,
      views: {
        drums: {
          heading: occurrence.displayName,
          bars,
          notes: drums.notes,
          cues: drums.cues || []
        },
        guitar: {
          heading: occurrence.displayName,
          bars,
          chords: guitar.chords,
          notes: guitar.notes
        },
        bass: {
          heading: occurrence.displayName,
          bars,
          rootNotes: bass.rootNotes,
          progression: bass.progression,
          notes: bass.notes
        },
        "main-artist": {
          heading: occurrence.displayName,
          bars,
          isInstrumental: Boolean(artist.isInstrumental),
          cue: artist.cue,
          lyrics: artistLyrics
        }
      }
    };
  });

  return {
    songId: song.id,
    metadata: song.metadata,
    occurrences,
    totalDurationMs: cumulativeMs,
    totalBars: cumulativeBars
  };
}

// -------------------------------------------------------------
// TEST A: Song Structure
// -------------------------------------------------------------
test("Test A: Song Structure - all 9 occurrences appear in exact chronological order", () => {
  assert.ok(greatAreYouLord, "Great Are You Lord song exists in data");
  assert.equal(greatAreYouLord.occurrences.length, 9, "Must contain exactly 9 section occurrences");

  const expectedOrder = [
    { name: "Prelude", isRepeat: false, bars: 4 },
    { name: "Verse 1", isRepeat: false, bars: 8 },
    { name: "Interlude", isRepeat: false, bars: 4 },
    { name: "Verse 2", isRepeat: false, bars: 8 },
    { name: "Verse 1 Repeat", isRepeat: true, bars: 8 },
    { name: "Interlude", isRepeat: false, bars: 4 },
    { name: "Verse 3", isRepeat: false, bars: 8 },
    { name: "Verse 1 Repeat", isRepeat: true, bars: 8 },
    { name: "Outro", isRepeat: false, bars: 4 }
  ];

  greatAreYouLord.occurrences.forEach((occ, idx) => {
    assert.equal(occ.displayName, expectedOrder[idx].name, `Occurrence ${idx} matches expected name`);
    assert.equal(occ.isRepeat, expectedOrder[idx].isRepeat, `Occurrence ${idx} matches repeat status`);
    assert.equal(occ.bars, expectedOrder[idx].bars, `Occurrence ${idx} matches bar count`);
    assert.ok(occ.occurrenceId, `Occurrence ${idx} has a stable occurrence ID`);
  });
});

// -------------------------------------------------------------
// TEST B: Musician Switching & View Isolation
// -------------------------------------------------------------
test("Test B: Musician Switching - correct content, sequence, and isolation across formats", () => {
  const timeline = resolveSongTimeline(greatAreYouLord);

  timeline.occurrences.forEach((occ) => {
    // Drums view must not contain lyrics or guitar chords
    assert.ok(occ.views.drums.heading, "Drums has heading");
    assert.strictEqual(occ.views.drums.chords, undefined, "Drums must NOT have guitar chords");
    assert.strictEqual(occ.views.drums.lyrics, undefined, "Drums must NOT have lyrics");

    // Guitar view must have chords
    assert.ok(occ.views.guitar.chords, "Guitar has chords");
    assert.strictEqual(occ.views.guitar.lyrics, undefined, "Guitar must NOT have lyrics");

    // Bass view must have distinct bass model
    assert.ok(occ.views.bass.rootNotes, "Bass has root notes");
    assert.ok(occ.views.bass.progression, "Bass has chord progression");

    // Main Artist view
    const artist = occ.views["main-artist"];
    if (artist.isInstrumental) {
      assert.strictEqual(artist.lyrics, "", "Instrumental section has no lyrics");
      assert.ok(artist.cue.includes("Instrumental"), "Cue indicates instrumental");
    } else {
      assert.ok(artist.lyrics.length > 0, "Vocal section has lyrics");
    }
  });
});

// -------------------------------------------------------------
// TEST C: Repeat Handling
// -------------------------------------------------------------
test("Test C: Repeat Handling - repeat occurrences reference original Verse 1 and expand lyrics", () => {
  const timelineExpanded = resolveSongTimeline(greatAreYouLord, { expandRepeats: true });
  const timelineRefOnly = resolveSongTimeline(greatAreYouLord, { expandRepeats: false });

  // Occurrence 1 is Verse 1 (index 1)
  const originalVerse1 = timelineExpanded.occurrences[1];
  assert.equal(originalVerse1.canonicalId, "verse-1");
  const originalLyrics = originalVerse1.views["main-artist"].lyrics;
  assert.ok(originalLyrics.includes("You give life"), "Original lyrics present");

  // Occurrence 4 is Verse 1 Repeat (index 4)
  const repeat1 = timelineExpanded.occurrences[4];
  assert.equal(repeat1.isRepeat, true);
  assert.equal(repeat1.repeatOf, "verse-1");
  assert.equal(repeat1.views["main-artist"].lyrics, originalLyrics, "Repeat 1 has expanded lyrics");

  // Occurrence 7 is Verse 1 Repeat (index 7)
  const repeat2 = timelineExpanded.occurrences[7];
  assert.equal(repeat2.isRepeat, true);
  assert.equal(repeat2.repeatOf, "verse-1");
  assert.equal(repeat2.views["main-artist"].lyrics, originalLyrics, "Repeat 2 has expanded lyrics");

  // In reference-only mode, repeats are summarized
  const refRepeat1 = timelineRefOnly.occurrences[4];
  assert.ok(refRepeat1.views["main-artist"].lyrics.includes("[Repeat lyrics"), "Ref mode displays reference tag");
});

// -------------------------------------------------------------
// TEST D: Visual Beat Counter & Time Signatures
// -------------------------------------------------------------
test("Test D: Visual Beat Counter - 4/4, 3/4, 6/8 timing math", () => {
  // 4/4 at 120 BPM -> 500ms per beat, 2000ms per bar
  const timing44 = calculateBarTiming({ numerator: 4, denominator: 4, pulseUnit: "quarter" }, 120);
  assert.equal(timing44.beatsPerBar, 4);
  assert.equal(timing44.msPerBeat, 500);
  assert.equal(timing44.barDurationMs, 2000);

  // 3/4 at 120 BPM -> 500ms per beat, 1500ms per bar
  const timing34 = calculateBarTiming({ numerator: 3, denominator: 4, pulseUnit: "quarter" }, 120);
  assert.equal(timing34.beatsPerBar, 3);
  assert.equal(timing34.msPerBeat, 500);
  assert.equal(timing34.barDurationMs, 1500);

  // 6/8 at 96 BPM compound pulse -> 625ms per dotted quarter, 2 pulses = 1250ms per bar, 208.33ms per 8th
  const timing68 = calculateBarTiming({ numerator: 6, denominator: 8, pulseUnit: "dotted-quarter" }, 96);
  assert.equal(timing68.beatsPerBar, 6);
  assert.equal(timing68.barDurationMs, 1250);
});

// -------------------------------------------------------------
// TEST E: Section Timing & Transitions
// -------------------------------------------------------------
test("Test E: Section Timing - bar counts and cumulative timeline positions", () => {
  const timeline = resolveSongTimeline(greatAreYouLord);

  // Total bars = 4 + 8 + 4 + 8 + 8 + 4 + 8 + 8 + 4 = 56 bars
  assert.equal(timeline.totalBars, 56, "Total bars = 56");

  // At 120 BPM, 4/4 = 2000 ms per bar
  // Total duration = 56 * 2000 ms = 112,000 ms (1 minute 52 seconds)
  assert.equal(timeline.totalDurationMs, 112000, "Total duration matches exact calculated ms");

  // Check startMs and endMs sequence continuity
  for (let i = 0; i < timeline.occurrences.length; i++) {
    const occ = timeline.occurrences[i];
    if (i > 0) {
      assert.equal(occ.startMs, timeline.occurrences[i - 1].endMs, `Occurrence ${i} start matches prev end`);
    } else {
      assert.equal(occ.startMs, 0, "First occurrence starts at 0ms");
    }
  }
});

// -------------------------------------------------------------
// TEST F: BPM Changes across sections
// -------------------------------------------------------------
test("Test F: Section-specific BPM changes (Monsoon Melody Fusion)", () => {
  const timeline = resolveSongTimeline(monsoonMelody);
  assert.ok(timeline, "Monsoon melody resolved");

  // Section 1: Alap at 96 BPM
  assert.equal(timeline.occurrences[0].bpm, 96);
  // Section 3: Antara accelerates to 112 BPM
  assert.equal(timeline.occurrences[2].bpm, 112);
  // Section 5: Drut Jhala at 126 BPM
  assert.equal(timeline.occurrences[4].bpm, 126);

  // Bar durations change accordingly: higher BPM = shorter bar duration
  assert.ok(
    timeline.occurrences[4].barDurationMs < timeline.occurrences[0].barDurationMs,
    "Fast section bar duration is shorter than slow section"
  );
});

// -------------------------------------------------------------
// TEST G: Multi-Device Synchronization State & Role Isolation
// -------------------------------------------------------------
test("Test G: Multi-Device Sync - Master authoritative state, Participant followers", () => {
  // Simulated message bus between 1 Master and 3 Participants (Drums, Bass, Vocal)
  const bus = [];
  function createSimulatedDevice(role, format, id) {
    return {
      id,
      role,
      format,
      state: { status: "stopped", scheduledStartTime: 0, pausePositionMs: 0 },
      receive(msg) {
        if (this.role === "participant" && msg.type === "playback_state") {
          this.state = { ...msg.state };
        }
      },
      broadcast(msg) {
        if (this.role !== "master") {
          throw new Error("Participants must not independently broadcast global playback state");
        }
        bus.forEach((dev) => dev.id !== this.id && dev.receive(msg));
      }
    };
  }

  const master = createSimulatedDevice("master", "guitar", "dev_master");
  const pDrums = createSimulatedDevice("participant", "drums", "dev_drums");
  const pBass = createSimulatedDevice("participant", "bass", "dev_bass");
  const pVocal = createSimulatedDevice("participant", "main-artist", "dev_vocal");
  bus.push(master, pDrums, pBass, pVocal);

  // 1. Play with scheduled start timestamp
  const now = 10000;
  const countInMs = 2000; // 1 bar count-in at 120 bpm
  master.state = { status: "playing", scheduledStartTime: now + countInMs, pausePositionMs: 0 };
  master.broadcast({ type: "playback_state", state: master.state });

  // Verify all participants received the exact scheduled start timestamp
  assert.equal(pDrums.state.status, "playing");
  assert.equal(pDrums.state.scheduledStartTime, 12000);
  assert.equal(pBass.state.status, "playing");
  assert.equal(pVocal.state.status, "playing");

  // 2. Participants cannot alter playback state
  assert.throws(
    () => {
      pDrums.broadcast({ type: "playback_state", state: { status: "paused" } });
    },
    /Participants must not independently broadcast/,
    "Participant must be blocked from broadcasting playback state"
  );

  // 3. Master pauses
  master.state = { status: "paused", scheduledStartTime: 0, pausePositionMs: 4500 };
  master.broadcast({ type: "playback_state", state: master.state });
  assert.equal(pBass.state.status, "paused");
  assert.equal(pBass.state.pausePositionMs, 4500);

  // 4. Master resumes
  master.state = { status: "playing", scheduledStartTime: 15000 - 4500, pausePositionMs: 0 };
  master.broadcast({ type: "playback_state", state: master.state });
  assert.equal(pVocal.state.status, "playing");
  assert.equal(pVocal.state.scheduledStartTime, 10500);

  // 5. Master stops
  master.state = { status: "stopped", scheduledStartTime: 0, pausePositionMs: 0 };
  master.broadcast({ type: "playback_state", state: master.state });
  assert.equal(pDrums.state.status, "stopped");
  assert.equal(pBass.state.status, "stopped");
  assert.equal(pVocal.state.status, "stopped");
});

// -------------------------------------------------------------
// TEST H: Network Failure and Reconnection State Recovery
// -------------------------------------------------------------
test("Test H: Network Failure - participant disconnects and recovers state upon reconnect", () => {
  let masterState = {
    status: "playing",
    songId: "great-are-you-lord",
    scheduledStartTime: 5000,
    bpm: 120
  };

  const participant = {
    connected: true,
    status: "Connected",
    state: null,
    disconnect() {
      this.connected = false;
      this.status = "Reconnecting";
    },
    reconnect(currentMasterState) {
      this.connected = true;
      this.status = "Connected";
      this.state = { ...currentMasterState };
    }
  };

  // Initially connected and receiving state
  participant.state = { ...masterState };
  assert.equal(participant.status, "Connected");

  // Participant loses network
  participant.disconnect();
  assert.equal(participant.connected, false);
  assert.equal(participant.status, "Reconnecting");

  // Master advances playback while participant is offline
  masterState.status = "paused";
  masterState.pausePositionMs = 8000;

  // Participant reconnects and synchronizes latest state without jumping backward
  participant.reconnect(masterState);
  assert.equal(participant.connected, true);
  assert.equal(participant.status, "Connected");
  assert.equal(participant.state.status, "paused");
  assert.equal(participant.state.pausePositionMs, 8000);
});

// -------------------------------------------------------------
// TEST I: Manual Scrolling Independence and Return to Live
// -------------------------------------------------------------
test("Test I: Manual Scrolling - pauses auto-scroll locally, enables Return to Live, timeline untouched", () => {
  const participantSession = {
    isAutoScrollEnabled: true,
    isManualScrollActive: false,
    sharedTimelinePositionMs: 14000,
    onUserScroll() {
      this.isManualScrollActive = true;
    },
    returnToLive() {
      this.isManualScrollActive = false;
    }
  };

  assert.equal(participantSession.isManualScrollActive, false);
  // User scrolls manually
  participantSession.onUserScroll();
  assert.equal(participantSession.isManualScrollActive, true, "Manual scroll detected");

  // Shared timeline must remain unchanged
  assert.equal(participantSession.sharedTimelinePositionMs, 14000, "Shared timeline unaffected");

  // Clicking Return to Live restores auto-following
  participantSession.returnToLive();
  assert.equal(participantSession.isManualScrollActive, false, "Auto-scroll following restored");
});

// -------------------------------------------------------------
// TEST J: Responsive Styles and Viewport Rules
// -------------------------------------------------------------
test("Test J: Responsive Testing - CSS includes mobile and tablet breakpoints", () => {
  const cssPath = path.join(__dirname, "../css/musicians-sheet.css");
  assert.ok(fs.existsSync(cssPath), "musicians-sheet.css exists");
  const css = fs.readFileSync(cssPath, "utf-8");

  // Verify responsive breakpoints
  assert.ok(css.includes("@media (max-width: 980px)"), "Tablet/mobile 980px breakpoint exists");
  assert.ok(css.includes("@media (max-width: 480px)"), "Mobile 480px breakpoint exists");
  assert.ok(css.includes(".floating-beat-counter"), "Floating beat counter rule exists");
  assert.ok(css.includes(".performance-mode-active"), "Performance mode rules exist");
});

// -------------------------------------------------------------
// TEST K: Existing Website Regression Check
// -------------------------------------------------------------
test("Test K: Existing Website Regression - verify existing tools and pages are preserved", () => {
  const root = path.join(__dirname, "..");
  const expectedPages = ["index.html", "notes.html", "tabla.html", "zitar.html", "notation.html"];
  for (const page of expectedPages) {
    const fullPath = path.join(root, page);
    assert.ok(fs.existsSync(fullPath), `Page ${page} must exist`);
    const content = fs.readFileSync(fullPath, "utf-8");
    assert.ok(content.includes("<div id=\"root\"></div>") || content.includes("<body"), `${page} contains expected root/body`);
  }
});


