/**
 * Zitar Tone Reference – Data Architecture & Presets Library
 * Supports multi-amplifier configuration with Gretex GT-15FX initial implementation.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ZitarData = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Converts clock-face string (e.g. "1:30", "10 o'clock", "10–11 o'clock", "8:30")
   * into a visual rotation angle in degrees where 12:00 is 0° (straight up)
   * Clockwise is positive, counter-clockwise is negative.
   * Arc range: 12:00 = 0°, 3:00 = +90°, 6:00 = +180°, 9:00 = -90° (270°), etc.
   *
   * @param {string|null} clockStr
   * @returns {number|null} Degrees from 12 o'clock (-180 to +180), or null if inactive/null.
   */
  function parseClockToDegrees(clockStr) {
    if (!clockStr || typeof clockStr !== "string") {
      return null;
    }

    var clean = clockStr.trim();
    if (clean === "N/A" || clean.toLowerCase() === "null") {
      return null;
    }

    // Check for range like "10–11 o'clock" or "9-10 o'clock" or "9–10"
    var rangeMatch = clean.match(/^(\d+(?::\d+)?)\s*[–—-]\s*(\d+(?::\d+)?)(?:\s*o['’]clock)?$/i);
    if (rangeMatch) {
      var deg1 = parseSingleClock(rangeMatch[1]);
      var deg2 = parseSingleClock(rangeMatch[2]);
      if (deg1 !== null && deg2 !== null) {
        // Compute midpoint angle
        // Handle wraparound if necessary (though our ranges are 9–10 and 10–11)
        var diff = deg2 - deg1;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;
        var mid = deg1 + diff / 2;
        if (mid > 180) mid -= 360;
        if (mid < -180) mid += 360;
        return Math.round(mid * 10) / 10;
      }
    }

    return parseSingleClock(clean);
  }

  /**
   * Helper to parse single clock position
   */
  function parseSingleClock(str) {
    if (!str) return null;
    var s = str.trim().toLowerCase();

    // Remove "o'clock" or "o’clock"
    s = s.replace(/\s*o['’]clock/g, "").trim();

    var hour = 0;
    var minute = 0;

    if (s.indexOf(":") !== -1) {
      var parts = s.split(":");
      hour = parseInt(parts[0], 10);
      minute = parseInt(parts[1], 10) || 0;
    } else {
      hour = parseInt(s, 10);
      minute = 0;
    }

    if (isNaN(hour)) return null;

    // Normalize hour into 12-hour clock (1..12)
    var totalMinutes = (hour % 12) * 60 + minute;
    // Each minute is 360 / (12 * 60) = 0.5 degrees
    var rawDeg = totalMinutes * 0.5;

    // Convert into -180 to +180 relative to 12 o'clock
    var deg = rawDeg > 180 ? rawDeg - 360 : rawDeg;
    return Math.round(deg * 10) / 10;
  }

  /**
   * Gretex GT-15FX Master Presets (20 Total)
   */
  var GRETEX_PRESETS = [
    {
      id: 1,
      patchNumber: "01",
      name: "Classical Clean Zitar",
      category: "Classical and Indian Music",
      character: "Pure, natural and articulate.",
      description: "A clean, pristine tone that preserves the natural acoustic resonance and delicate harmonics of the Zitar strings, offering crisp note clarity across all octaves.",
      applications: [
        "Classical melodies",
        "Fast taans",
        "Clear note articulation",
        "Alap"
      ],
      techniques: [
        "Clean right-hand strokes",
        "Precise finger placement",
        "Delicate gamaks",
        "Fast taan execution"
      ],
      settings: {
        masterVolume: "10–11 o'clock",
        overdrive: false,
        gain: null,
        overdriveVolume: null,
        treble: "1 o'clock",
        mid: "12 o'clock",
        bass: "10:30",
        reverb: true,
        reverbAmount: "9:30"
      }
    },
    {
      id: 2,
      patchNumber: "02",
      name: "Fusion Zitar – Niladri Kumar-inspired",
      category: "Classical and Indian Music",
      character: "Bright, expressive and forward.",
      description: "A bright and forward tone with enhanced midrange presence, suitable for expressive melodic passages.",
      applications: [
        "Contemporary Indian fusion",
        "Expressive bends",
        "Fast melodic phrases",
        "Instrumental solos"
      ],
      techniques: [
        "Expressive slides",
        "Controlled bends",
        "Fast picking",
        "Melodic phrasing"
      ],
      settings: {
        masterVolume: "10–11 o'clock",
        overdrive: false,
        gain: null,
        overdriveVolume: null,
        treble: "1:30",
        mid: "1:30",
        bass: "10:30",
        reverb: true,
        reverbAmount: "11 o'clock"
      }
    },
    {
      id: 3,
      patchNumber: "03",
      name: "Deep Alap Tone",
      category: "Classical and Indian Music",
      character: "Smooth, rounded and slightly darker.",
      description: "A rich, darker timbre emphasizing lower midrange and bass warmth with spacious reverb, designed for meditative exploration.",
      applications: [
        "Slow alap",
        "Lower-register melodies",
        "Meditative compositions"
      ],
      techniques: [
        "Slow meend (glissando)",
        "Deep string pulls",
        "Sustained resonance",
        "Subtle microtonal shifts"
      ],
      settings: {
        masterVolume: "10 o'clock",
        overdrive: false,
        gain: null,
        overdriveVolume: null,
        treble: "10 o'clock",
        mid: "12:30",
        bass: "1:30",
        reverb: true,
        reverbAmount: "1:30"
      }
    },
    {
      id: 4,
      patchNumber: "04",
      name: "Metallic Bright Sitar",
      category: "Classical and Indian Music",
      character: "Sharp attack with pronounced high frequencies.",
      description: "Accentuates the metallic jawari bite and high-frequency sparkle of traditional sitar strings, cutting through any rhythm section.",
      applications: [
        "Fast picking",
        "Rhythmic phrases",
        "Bright melodic passages"
      ],
      techniques: [
        "Firm mizrab/pick attack",
        "Jhala rhythms",
        "Crisp staccato plucking",
        "High register flourishes"
      ],
      settings: {
        masterVolume: "10 o'clock",
        overdrive: false,
        gain: null,
        overdriveVolume: null,
        treble: "2:30",
        mid: "12 o'clock",
        bass: "9 o'clock",
        reverb: true,
        reverbAmount: "9 o'clock"
      }
    },
    {
      id: 5,
      patchNumber: "05",
      name: "Vintage Warm Tone",
      category: "Classical and Indian Music",
      character: "Warm, mellow and rounded.",
      description: "A golden, nostalgic tone with rolled-off highs and gentle low-end presence reminiscent of classic 70s Bollywood studio recordings.",
      applications: [
        "Romantic melodies",
        "Old Bollywood-style instrumental passages",
        "Soft compositions"
      ],
      techniques: [
        "Gentle picking dynamics",
        "Smooth legato bends",
        "Fluid ornamentations",
        "Tender touch"
      ],
      settings: {
        masterVolume: "10 o'clock",
        overdrive: false,
        gain: null,
        overdriveVolume: null,
        treble: "10 o'clock",
        mid: "1:30",
        bass: "1 o'clock",
        reverb: true,
        reverbAmount: "10 o'clock"
      }
    },
    {
      id: 6,
      patchNumber: "06",
      name: "Meditative Drone Tone",
      category: "Classical and Indian Music",
      character: "Soft, warm and spacious.",
      description: "Expansive and enveloping ambiance with rolled-off treble and elevated bass, perfect for sustained drones and contemplative ragas.",
      applications: [
        "Slow phrases",
        "Meditative music",
        "Sustained notes"
      ],
      techniques: [
        "Continuous drone plucking",
        "Long sustained vibrations",
        "Slow breath-like dynamics",
        "Minimalistic ornamentation"
      ],
      settings: {
        masterVolume: "10 o'clock",
        overdrive: false,
        gain: null,
        overdriveVolume: null,
        treble: "10:30",
        mid: "12 o'clock",
        bass: "1:30",
        reverb: true,
        reverbAmount: "2 o'clock"
      }
    },
    {
      id: 7,
      patchNumber: "07",
      name: "Ambient Zitar",
      category: "Cinematic and Atmospheric",
      character: "Wide, floating and atmospheric.",
      description: "A wash of lush, cinematic reverb that blends string attacks into an ethereal sonic cloud, creating broad soundscapes.",
      applications: [
        "Background melodies",
        "Ambient compositions",
        "Slow instrumental music"
      ],
      techniques: [
        "Volume swells",
        "Sparse note choices",
        "Gentle sliding across frets",
        "Atmospheric ringing notes"
      ],
      settings: {
        masterVolume: "10 o'clock",
        overdrive: false,
        gain: null,
        overdriveVolume: null,
        treble: "12 o'clock",
        mid: "11:30",
        bass: "11 o'clock",
        reverb: true,
        reverbAmount: "3 o'clock"
      }
    },
    {
      id: 8,
      patchNumber: "08",
      name: "Cinematic Lead",
      category: "Cinematic and Atmospheric",
      character: "Focused, bright and spacious.",
      description: "Enhanced midrange clarity combined with healthy ambient reverb, designed to float gracefully over cinematic orchestral arrangements.",
      applications: [
        "Movie themes",
        "Emotional solos",
        "Dramatic melodic passages"
      ],
      techniques: [
        "Wide vibrato",
        "Passionate meend pulls",
        "Dynamic accentuation",
        "Climactic note sustains"
      ],
      settings: {
        masterVolume: "10 o'clock",
        overdrive: false,
        gain: null,
        overdriveVolume: null,
        treble: "1:30",
        mid: "2 o'clock",
        bass: "11 o'clock",
        reverb: true,
        reverbAmount: "2 o'clock"
      }
    },
    {
      id: 9,
      patchNumber: "09",
      name: "Dreamy Soft Tone",
      category: "Cinematic and Atmospheric",
      character: "Rounded highs with a soft ambient character.",
      description: "Deeply soaked in reverb with softened transients, creating a gentle, tranquil atmosphere ideal for peaceful soundscapes.",
      applications: [
        "Dreamy melodies",
        "Slow slides",
        "Soft background arrangements"
      ],
      techniques: [
        "Light finger touch",
        "Slow gliding transitions",
        "Harmonic tapping",
        "Soft note releases"
      ],
      settings: {
        masterVolume: "9:30",
        overdrive: false,
        gain: null,
        overdriveVolume: null,
        treble: "10 o'clock",
        mid: "11 o'clock",
        bass: "12:30",
        reverb: true,
        reverbAmount: "3:30"
      }
    },
    {
      id: 10,
      patchNumber: "10",
      name: "Sustained Lead Character",
      category: "Cinematic and Atmospheric",
      character: "Slightly saturated, smooth and expressive.",
      description: "Gentle overdrive adds singing sustain and harmonic overtones to leads without harsh distortion, retaining smooth articulation.",
      note: "Actual sustain depends on pickup, playing technique and amplifier response.",
      applications: [
        "Long melodic notes",
        "Expressive lead playing"
      ],
      techniques: [
        "Controlled multi-fret bends",
        "Circular vibrato",
        "Smooth string cross-overs",
        "Sustained emotional holds"
      ],
      settings: {
        masterVolume: "9:30",
        overdrive: true,
        gain: "9:30",
        overdriveVolume: "11 o'clock",
        treble: "11:30",
        mid: "2 o'clock",
        bass: "10:30",
        reverb: true,
        reverbAmount: "1:30"
      }
    },
    {
      id: 11,
      patchNumber: "11",
      name: "Rock Zitar",
      category: "Rock and Fusion",
      character: "Crunchy and aggressive.",
      description: "Punchy drive with biting upper harmonics and solid midrange bite, giving the Zitar an electric guitar-like rock attitude.",
      applications: [
        "Rock fusion",
        "Rhythmic riffs",
        "Energetic solos"
      ],
      techniques: [
        "Aggressive downstrokes",
        "Heavy palm-muting",
        "Rapid hammer-ons and pull-offs",
        "Power riffing"
      ],
      settings: {
        masterVolume: "9–10 o'clock",
        overdrive: true,
        gain: "10:30",
        overdriveVolume: "11 o'clock",
        treble: "1 o'clock",
        mid: "1:30",
        bass: "11 o'clock",
        reverb: true,
        reverbAmount: "9 o'clock"
      }
    },
    {
      id: 12,
      patchNumber: "12",
      name: "Singing Blues Lead",
      category: "Rock and Fusion",
      character: "Warm overdrive with focused mids.",
      description: "Touch-sensitive crunch with rich, vocal midrange emphasis that sings on long bends and expressive melodic phrases.",
      applications: [
        "Expressive bends",
        "Slides",
        "Blues-inspired Zitar solos"
      ],
      techniques: [
        "Blues curls and microtonal bends",
        "Rhythmic vibrato pulses",
        "Rake picking",
        "Call-and-response phrases"
      ],
      settings: {
        masterVolume: "9–10 o'clock",
        overdrive: true,
        gain: "9:30",
        overdriveVolume: "11 o'clock",
        treble: "11 o'clock",
        mid: "2 o'clock",
        bass: "11 o'clock",
        reverb: true,
        reverbAmount: "11 o'clock"
      }
    },
    {
      id: 13,
      patchNumber: "13",
      name: "High-Gain Fusion",
      category: "Rock and Fusion",
      character: "Strong distortion and aggressive attack.",
      description: "Saturated overdrive channel with high gain saturation, producing intense sustain, rich harmonics, and crushing modern fusion energy.",
      applications: [
        "Experimental rock",
        "Heavy fusion",
        "Distorted melodic passages"
      ],
      techniques: [
        "High-speed alternate picking",
        "Sweep tapping",
        "Controlled feedback manipulation",
        "Aggressive bends"
      ],
      settings: {
        masterVolume: "9 o'clock",
        overdrive: true,
        gain: "2 o'clock",
        overdriveVolume: "10 o'clock",
        treble: "12 o'clock",
        mid: "1 o'clock",
        bass: "11 o'clock",
        reverb: true,
        reverbAmount: "9:30"
      }
    },
    {
      id: 14,
      patchNumber: "14",
      name: "Classic Crunch",
      category: "Rock and Fusion",
      character: "Moderate breakup, less aggressive than high gain.",
      description: "Classic vintage breakup that stays responsive to pick attack—clean when picked softly, biting and gritty when struck hard.",
      applications: [
        "Rock melodies",
        "Rhythmic playing",
        "Fusion accompaniment"
      ],
      techniques: [
        "Dynamic velocity control",
        "Rhythmic chordal strumming",
        "Accented syncopated strikes",
        "Steady drive grooves"
      ],
      settings: {
        masterVolume: "9:30",
        overdrive: true,
        gain: "11 o'clock",
        overdriveVolume: "11 o'clock",
        treble: "12:30",
        mid: "1:30",
        bass: "12 o'clock",
        reverb: true,
        reverbAmount: "10 o'clock"
      }
    },
    {
      id: 15,
      patchNumber: "15",
      name: "Dark Distorted Zitar",
      category: "Rock and Fusion",
      character: "Darker highs and thick midrange.",
      description: "Heavy, brooding distortion with rolled-off treble and boosted bass and mid, creating a massive, wall-of-sound resonance.",
      applications: [
        "Dark rock melodies",
        "Heavy riffs",
        "Experimental sounds"
      ],
      techniques: [
        "Low-string riffing",
        "Slow heavy bending",
        "Aggressive chugging strokes",
        "Modal dark scales"
      ],
      settings: {
        masterVolume: "9 o'clock",
        overdrive: true,
        gain: "1:30",
        overdriveVolume: "10 o'clock",
        treble: "10:30",
        mid: "2 o'clock",
        bass: "1 o'clock",
        reverb: true,
        reverbAmount: "9 o'clock"
      }
    },
    {
      id: 16,
      patchNumber: "16",
      name: "Telephone / Radio Zitar",
      category: "Experimental and Special-Purpose",
      character: "Narrow, nasal, lo-fi character.",
      description: "Extreme bandpass EQ effect with stripped bass and boosted midrange, simulating vintage telephone or transistor radio audio.",
      applications: [
        "Lo-fi effects",
        "Radio-style transitions",
        "Experimental compositions"
      ],
      techniques: [
        "Dry staccato notes",
        "Short percussive phrases",
        "Minimalistic ornamentation",
        "Intro/outro effect flourishes"
      ],
      settings: {
        masterVolume: "9:30",
        overdrive: false,
        gain: null,
        overdriveVolume: null,
        treble: "2 o'clock",
        mid: "3 o'clock",
        bass: "8:30",
        reverb: false,
        reverbAmount: null
      }
    },
    {
      id: 17,
      patchNumber: "17",
      name: "Hollow / Thin Zitar",
      category: "Experimental and Special-Purpose",
      character: "Lightweight and slightly hollow.",
      description: "Mid-scooped EQ curve with light bass and crisp top end, producing a delicate, airy acoustic texture that layers cleanly in dense mixes.",
      applications: [
        "Thin melodic arrangements",
        "Contrasting layers"
      ],
      techniques: [
        "Light finger-plucking",
        "Rapid upper-register trills",
        "Delicate chord arpeggiation",
        "Airy melodic doubling"
      ],
      settings: {
        masterVolume: "10 o'clock",
        overdrive: false,
        gain: null,
        overdriveVolume: null,
        treble: "1:30",
        mid: "10 o'clock",
        bass: "9 o'clock",
        reverb: true,
        reverbAmount: "10 o'clock"
      }
    },
    {
      id: 18,
      patchNumber: "18",
      name: "Thick Midrange Zitar",
      category: "Experimental and Special-Purpose",
      character: "Concentrated, powerful and prominent.",
      description: "A punchy, mid-heavy tone with moderate overdrive that cuts right through dense band arrangements and heavy basslines.",
      applications: [
        "Lead melodies that need to stand out in a band mix"
      ],
      techniques: [
        "Punchy melodic attacks",
        "Sustained center-frequency bends",
        "Syncopated lead lines",
        "Articulate fast runs"
      ],
      settings: {
        masterVolume: "10 o'clock",
        overdrive: true,
        gain: "10 o'clock",
        overdriveVolume: "11 o'clock",
        treble: "11 o'clock",
        mid: "3 o'clock",
        bass: "10 o'clock",
        reverb: true,
        reverbAmount: "10 o'clock"
      }
    },
    {
      id: 19,
      patchNumber: "19",
      name: "Bright Percussive Zitar",
      category: "Experimental and Special-Purpose",
      character: "Sharp attacks and crisp rhythmic notes.",
      description: "High-definition treble with dry room response (reverb off), emphasizing the percussive click of the pick on the Chikari and main strings.",
      applications: [
        "Rhythmic picking",
        "Fast patterns",
        "Percussive compositions"
      ],
      techniques: [
        "Rapid jhala strokes",
        "Staccato muting",
        "Rhythmic chikari tapping",
        "Fast metric subdivisions"
      ],
      settings: {
        masterVolume: "10 o'clock",
        overdrive: false,
        gain: null,
        overdriveVolume: null,
        treble: "2 o'clock",
        mid: "1:30",
        bass: "9:30",
        reverb: false,
        reverbAmount: null
      }
    },
    {
      id: 20,
      patchNumber: "20",
      name: "Warm Overdriven Fusion",
      category: "Experimental and Special-Purpose",
      character: "Warmth combined with moderate saturation.",
      description: "Smooth, buttery saturation with elevated bass and low mids coupled with balanced reverb, creating a warm, singing fusion tone.",
      applications: [
        "Warm fusion solos",
        "Expressive slides",
        "Mellow distorted melodies"
      ],
      techniques: [
        "Fluid legato slides",
        "Warm sustained bends",
        "Nuanced pick dynamics",
        "Expressive microtonal ornamentations"
      ],
      settings: {
        masterVolume: "9:30",
        overdrive: true,
        gain: "10 o'clock",
        overdriveVolume: "11 o'clock",
        treble: "10:30",
        mid: "1:30",
        bass: "1 o'clock",
        reverb: true,
        reverbAmount: "12 o'clock"
      }
    }
  ];

  /**
   * Amplifiers Registry
   * Extensible architecture for future amplifier models
   */
  var AMPLIFIERS = {
    gretexGT15FX: {
      id: "gretexGT15FX",
      name: "Gretex GT-15FX",
      subtitle: "15-Watt Guitar Amplifier with Overdrive & Spring Reverb",
      controls: [
        {
          key: "masterVolume",
          label: "Master Volume",
          type: "dial",
          group: "clean",
          minClock: "7:00",
          maxClock: "5:00"
        },
        {
          key: "overdrive",
          label: "Overdrive",
          type: "switch",
          group: "drive",
          controlsLinked: ["gain", "overdriveVolume"]
        },
        {
          key: "gain",
          label: "Gain",
          type: "dial",
          group: "drive",
          dependsOn: "overdrive",
          minClock: "7:00",
          maxClock: "5:00"
        },
        {
          key: "overdriveVolume",
          label: "Overdrive Volume",
          type: "dial",
          group: "drive",
          dependsOn: "overdrive",
          minClock: "7:00",
          maxClock: "5:00"
        },
        {
          key: "treble",
          label: "Treble",
          type: "dial",
          group: "eq",
          minClock: "7:00",
          maxClock: "5:00"
        },
        {
          key: "mid",
          label: "Mid",
          type: "dial",
          group: "eq",
          minClock: "7:00",
          maxClock: "5:00"
        },
        {
          key: "bass",
          label: "Bass",
          type: "dial",
          group: "eq",
          minClock: "7:00",
          maxClock: "5:00"
        },
        {
          key: "reverb",
          label: "Reverb",
          type: "switch",
          group: "reverb",
          controlsLinked: ["reverbAmount"]
        },
        {
          key: "reverbAmount",
          label: "Reverb Amount",
          type: "dial",
          group: "reverb",
          dependsOn: "reverb",
          minClock: "7:00",
          maxClock: "5:00"
        }
      ],
      presets: GRETEX_PRESETS
    }
  };

  /**
   * Search and filter presets by query across name, category, character, and applications
   *
   * @param {string} query
   * @param {string} [ampKey="gretexGT15FX"]
   * @returns {Array} Filtered presets array
   */
  function searchPresets(query, ampKey) {
    var amp = AMPLIFIERS[ampKey || "gretexGT15FX"];
    if (!amp || !amp.presets) return [];

    var q = (query || "").trim().toLowerCase();
    if (!q) return amp.presets.slice();

    return amp.presets.filter(function (preset) {
      if (preset.name && preset.name.toLowerCase().indexOf(q) !== -1) return true;
      if (preset.category && preset.category.toLowerCase().indexOf(q) !== -1) return true;
      if (preset.character && preset.character.toLowerCase().indexOf(q) !== -1) return true;
      if (preset.description && preset.description.toLowerCase().indexOf(q) !== -1) return true;
      if (preset.patchNumber && preset.patchNumber.indexOf(q) !== -1) return true;
      if (
        preset.applications &&
        preset.applications.some(function (app) {
          return app.toLowerCase().indexOf(q) !== -1;
        })
      ) {
        return true;
      }
      return false;
    });
  }

  /**
   * Retrieve a preset by its ID
   */
  function getPresetById(id, ampKey) {
    var amp = AMPLIFIERS[ampKey || "gretexGT15FX"];
    if (!amp || !amp.presets) return null;
    var targetId = parseInt(id, 10);
    for (var i = 0; i < amp.presets.length; i++) {
      if (amp.presets[i].id === targetId) {
        return amp.presets[i];
      }
    }
    return null;
  }

  return {
    AMPLIFIERS: AMPLIFIERS,
    parseClockToDegrees: parseClockToDegrees,
    searchPresets: searchPresets,
    getPresetById: getPresetById
  };
});
