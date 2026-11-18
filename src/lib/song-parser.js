/**
 * Musician's Sheet — Song Parser and Presentation Model Resolver
 * Translates single Master Song JSON into format-specific representations:
 * 1. Drums
 * 2. Guitar
 * 3. Bass
 * 4. Main Artist (Vocalist)
 *
 * Core Principle: One master song structure, multiple musician-specific views,
 * one shared performance timeline.
 */

export const MUSICIAN_FORMATS = [
  { id: "drums", label: "Drums", description: "Structure, bar counts, and rhythmic cues" },
  { id: "guitar", label: "Guitar", description: "Chord progressions and structural changes" },
  { id: "bass", label: "Bass", description: "Root notes, bassline progressions, and groove" },
  { id: "main-artist", label: "Main Artist", description: "Full lyrics, cues, and expanded repeats" },
];

/**
 * Calculates milliseconds per beat and per bar according to meter and tempo.
 */
export function calculateBarTiming(timeSignature, bpm) {
  const numerator = Number(timeSignature?.numerator) || 4;
  const denominator = Number(timeSignature?.denominator) || 4;
  const pulseUnit = timeSignature?.pulseUnit || "quarter";
  const tempo = Number(bpm) || 120;

  let msPerBeat;
  let beatsPerBar = numerator;

  if (denominator === 8 && numerator % 3 === 0 && pulseUnit === "dotted-quarter") {
    // Compound meter (e.g. 6/8, 9/8, 12/8) with dotted-quarter pulse tempo
    const compoundPulses = numerator / 3;
    const msPerPulse = 60000 / tempo;
    msPerBeat = msPerPulse / 3; // duration of one eighth note
    const barDurationMs = compoundPulses * msPerPulse;
    return {
      msPerBeat,
      beatsPerBar: numerator,
      barDurationMs,
      compoundPulses,
      msPerPulse,
    };
  }

  // Standard simple meter
  msPerBeat = (60000 / tempo) * (4 / denominator);
  const barDurationMs = beatsPerBar * msPerBeat;

  return {
    msPerBeat,
    beatsPerBar,
    barDurationMs,
  };
}

/**
 * Resolves canonical song data and occurrences into a timeline-ready list
 * with format-specific projections.
 *
 * @param {object} song Master song object from JSON
 * @param {object} options
 * @param {boolean} options.expandRepeats Whether Main Artist view expands lyrics on repeat sections
 * @returns {object} Resolved song timeline model
 */
export function resolveSongTimeline(song, options = {}) {
  if (!song || !song.metadata || !song.occurrences || !song.canonicalSections) {
    throw new Error("Invalid song structure: missing metadata, occurrences, or canonicalSections.");
  }

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
    if (!canonical) {
      throw new Error(
        `Canonical section "${canonicalId}" referenced by occurrence "${occurrence.occurrenceId}" not found.`
      );
    }

    const sectionBpm = occurrence.bpm || songBpm;
    const sectionMeter = occurrence.timeSignature || defaultMeter;
    const bars = occurrence.bars ?? null;

    let barDurationMs = 0;
    let durationMs = 0;
    let msPerBeat = 0;
    let beatsPerBar = sectionMeter.numerator || 4;

    if (bars !== null && bars > 0) {
      const timing = calculateBarTiming(sectionMeter, sectionBpm);
      barDurationMs = timing.barDurationMs;
      msPerBeat = timing.msPerBeat;
      beatsPerBar = timing.beatsPerBar;
      durationMs = bars * barDurationMs;
    }

    const startMs = cumulativeMs;
    const endMs = bars !== null ? cumulativeMs + durationMs : null;
    const startBar = cumulativeBars + 1;
    const endBar = bars !== null ? cumulativeBars + bars : null;

    if (bars !== null) {
      cumulativeMs += durationMs;
      cumulativeBars += bars;
    }

    // Format Projections
    // 1. Drums
    const drumsData = canonical.musicianData?.drums || {};
    const drumsView = {
      heading: occurrence.displayName,
      sectionType: canonical.type,
      bars: occurrence.bars,
      bpm: sectionBpm,
      meter: sectionMeter,
      notes: drumsData.notes || "",
      cues: drumsData.cues || [],
      isRepeat: Boolean(occurrence.isRepeat),
      repeatOf: occurrence.repeatOf || null,
    };

    // 2. Guitar
    const guitarData = canonical.musicianData?.guitar || {};
    const guitarView = {
      heading: occurrence.displayName,
      sectionType: canonical.type,
      bars: occurrence.bars,
      bpm: sectionBpm,
      meter: sectionMeter,
      chords: guitarData.chords || "",
      notes: guitarData.notes || "",
      isRepeat: Boolean(occurrence.isRepeat),
      repeatOf: occurrence.repeatOf || null,
    };

    // 3. Bass (Distinct data model & configuration)
    const bassData = canonical.musicianData?.bass || {};
    const bassView = {
      heading: occurrence.displayName,
      sectionType: canonical.type,
      bars: occurrence.bars,
      bpm: sectionBpm,
      meter: sectionMeter,
      rootNotes: bassData.rootNotes || "",
      progression: bassData.progression || guitarData.chords || "",
      rhythm: bassData.rhythm || "",
      notes: bassData.notes || "",
      isRepeat: Boolean(occurrence.isRepeat),
      repeatOf: occurrence.repeatOf || null,
    };

    // 4. Main Artist (Vocalist)
    const artistData = canonical.musicianData?.mainArtist || {};
    let lyrics = "";
    let isReferenceOnly = false;

    if (artistData.isInstrumental) {
      lyrics = "";
    } else if (occurrence.isRepeat && !expandRepeats) {
      lyrics = `[Repeat lyrics of ${canonical.name}]`;
      isReferenceOnly = true;
    } else {
      lyrics = artistData.lyrics || "";
    }

    const mainArtistView = {
      heading: occurrence.displayName,
      sectionType: canonical.type,
      bars: occurrence.bars,
      bpm: sectionBpm,
      meter: sectionMeter,
      isInstrumental: Boolean(artistData.isInstrumental),
      cue: artistData.cue || (artistData.isInstrumental ? "Instrumental" : ""),
      lyrics,
      isReferenceOnly,
      isRepeat: Boolean(occurrence.isRepeat),
      repeatOf: occurrence.repeatOf || null,
    };

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
      performanceNotes: occurrence.performanceNotes || "",
      startMs,
      endMs,
      durationMs,
      startBar,
      endBar,
      barDurationMs,
      msPerBeat,
      beatsPerBar,
      index,
      views: {
        drums: drumsView,
        guitar: guitarView,
        bass: bassView,
        "main-artist": mainArtistView,
      },
    };
  });

  return {
    songId: song.id,
    metadata: song.metadata,
    occurrences,
    totalDurationMs: cumulativeMs,
    totalBars: cumulativeBars,
  };
}

/**
 * Finds the active occurrence, bar within section, beat within bar,
 * and current global bar for a given elapsed time in milliseconds.
 *
 * @param {object} timeline Resolved song timeline
 * @param {number} elapsedMs Playback position in milliseconds (after count-in)
 * @returns {object} Timing information
 */
export function getPlaybackPositionInfo(timeline, elapsedMs) {
  if (!timeline || !timeline.occurrences || timeline.occurrences.length === 0) {
    return {
      occurrence: null,
      occurrenceIndex: -1,
      barInSection: 1,
      totalBar: 1,
      beat: 1,
      fraction: 0,
      isFinished: false,
    };
  }

  if (elapsedMs < 0) {
    // Before song start / in count-in
    const first = timeline.occurrences[0];
    const timing = calculateBarTiming(first.timeSignature, first.bpm);
    const countInMs = Math.abs(elapsedMs);
    const countInBeatsRemaining = Math.ceil(countInMs / timing.msPerBeat);
    const beatIndex = (first.beatsPerBar - (countInBeatsRemaining % first.beatsPerBar)) || first.beatsPerBar;
    return {
      occurrence: first,
      occurrenceIndex: 0,
      isCountIn: true,
      countInMsRemaining: countInMs,
      barInSection: 0,
      totalBar: 0,
      beat: beatIndex,
      fraction: (countInMs % timing.msPerBeat) / timing.msPerBeat,
      isFinished: false,
    };
  }

  // Check if past total duration
  if (timeline.totalDurationMs > 0 && elapsedMs >= timeline.totalDurationMs) {
    const last = timeline.occurrences[timeline.occurrences.length - 1];
    return {
      occurrence: last,
      occurrenceIndex: timeline.occurrences.length - 1,
      barInSection: last.bars || 1,
      totalBar: timeline.totalBars,
      beat: last.beatsPerBar,
      fraction: 1,
      isFinished: true,
    };
  }

  // Find matching occurrence
  let matched = timeline.occurrences[0];
  let matchedIndex = 0;

  for (let i = 0; i < timeline.occurrences.length; i++) {
    const occ = timeline.occurrences[i];
    if (occ.endMs !== null && elapsedMs >= occ.startMs && elapsedMs < occ.endMs) {
      matched = occ;
      matchedIndex = i;
      break;
    }
  }

  const offsetInSection = elapsedMs - matched.startMs;
  const barInSection = matched.barDurationMs > 0
    ? Math.min(matched.bars, Math.floor(offsetInSection / matched.barDurationMs) + 1)
    : 1;

  const offsetInBar = matched.barDurationMs > 0
    ? offsetInSection % matched.barDurationMs
    : 0;

  const beat = matched.msPerBeat > 0
    ? Math.min(matched.beatsPerBar, Math.floor(offsetInBar / matched.msPerBeat) + 1)
    : 1;

  const fraction = matched.msPerBeat > 0
    ? (offsetInBar % matched.msPerBeat) / matched.msPerBeat
    : 0;

  const totalBar = matched.startBar + (barInSection - 1);

  return {
    occurrence: matched,
    occurrenceIndex: matchedIndex,
    barInSection,
    totalBar,
    beat,
    fraction,
    isFinished: false,
    isCountIn: false,
  };
}
