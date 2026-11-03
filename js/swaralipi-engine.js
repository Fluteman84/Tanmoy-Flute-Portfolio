/* ================================================================
   Swaralipi — Hindustani Classical Music Notation Engine
   Core data model, validation, parsing, measure computation,
   serialization, and TXT generation.
   ================================================================ */
(function () {
  "use strict";

  var S = (window.Swaralipi = {});

  /* ── Constants ──────────────────────────────────── */
  S.VALID_SWARAS = ["S", "r", "R", "g", "G", "M", "m", "P", "d", "D", "n", "N"];
  S.VALID_MODIFIERS = ["-", "'", ",", ":"];
  S.SCALES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  S.TIME_SIGNATURES = ["3/4", "4/4", "5/4", "7/4"];
  S.POSITIONS_PER_MEASURE = { "3/4": 3, "4/4": 4, "5/4": 5, "7/4": 7 };
  S.DEFAULT_SECTIONS = ["Sthayi", "Antara", "Sanchari", "Abhog"];
  S.BARS_PER_BLOCK = 4;
  S.BARS_PER_ROW = 4;

  /* ── ID generation ─────────────────────────────── */
  var _idCounter = 0;
  S.uid = function () {
    return "sw" + ++_idCounter + "_" + Date.now().toString(36);
  };

  /* ── Validation & Normalization ────────────────── */
  S.normalizeSwara = function (ch) {
    if (ch === "s") return "S";
    if (ch === "p") return "P";
    return ch;
  };

  S.normalizeNotationText = function (text) {
    if (typeof text !== "string") return text;
    return text.replace(/s/g, "S").replace(/p/g, "P");
  };

  S.isSwara = function (ch) {
    return S.VALID_SWARAS.indexOf(ch) !== -1;
  };

  S.isModifier = function (ch) {
    return S.VALID_MODIFIERS.indexOf(ch) !== -1;
  };

  S.isValidChar = function (ch) {
    return S.isSwara(ch) || S.isModifier(ch);
  };

  /* ── Token ─────────────────────────────────────── */
  S.createToken = function (base, prefix, suffix) {
    return {
      base: base,
      prefix: prefix ? prefix.slice() : [],
      suffix: suffix ? suffix.slice() : [],
    };
  };

  S.tokenToText = function (tok) {
    return tok.prefix.join("") + tok.base + tok.suffix.join("");
  };

  S.cloneToken = function (tok) {
    return S.createToken(tok.base, tok.prefix.slice(), tok.suffix.slice());
  };

  /* ── Position ──────────────────────────────────── */
  S.createPosition = function (tokens) {
    return { id: S.uid(), tokens: tokens ? tokens.map(S.cloneToken) : [] };
  };

  S.positionToText = function (pos) {
    return pos.tokens.map(S.tokenToText).join("");
  };

  S.positionCharCount = function (pos) {
    return S.positionToText(pos).length;
  };

  S.clonePosition = function (pos) {
    return S.createPosition(pos.tokens);
  };

  /* ── Parse position text → tokens ──────────────── */
  S.parsePositionText = function (text) {
    if (typeof text !== "string" || !text.length) {
      return { valid: false, error: "Empty input", tokens: [] };
    }
    text = S.normalizeNotationText(text);
    var tokens = [];
    var i = 0;
    while (i < text.length) {
      var prefix = [];
      while (i < text.length && S.isModifier(text[i])) {
        prefix.push(text[i]);
        i++;
      }
      if (i < text.length && S.isSwara(text[i])) {
        var base = text[i];
        i++;
        var suffix = [];
        while (i < text.length && S.isModifier(text[i])) {
          suffix.push(text[i]);
          i++;
        }
        tokens.push(S.createToken(base, prefix, suffix));
      } else if (prefix.length > 0) {
        return {
          valid: false,
          error: "Modifier without associated swara at position " + (i - prefix.length),
          tokens: [],
        };
      } else if (i < text.length) {
        return {
          valid: false,
          error: "Invalid character: " + text[i],
          tokens: [],
        };
      }
    }
    if (tokens.length === 0) {
      return { valid: false, error: "No valid swaras found", tokens: [] };
    }
    return { valid: true, tokens: tokens };
  };

  /* ── Check if a string has at least one complete swara ── */
  S.bufferHasSwara = function (buf) {
    for (var i = 0; i < buf.length; i++) {
      if (S.isSwara(buf[i])) return true;
    }
    return false;
  };

  /* ── Section ───────────────────────────────────── */
  S.createSection = function (name) {
    return { id: S.uid(), name: name || "Untitled", positions: [] };
  };

  S.cloneSection = function (sec) {
    var clone = S.createSection(sec.name);
    clone.positions = sec.positions.map(S.clonePosition);
    return clone;
  };

  /* ── Song ──────────────────────────────────────── */
  S.createSong = function (name, scale, timeSignature) {
    return {
      name: name || "",
      scale: scale || "C",
      timeSignature: timeSignature || "4/4",
      sections: [S.createSection("Sthayi")],
    };
  };

  S.cloneSong = function (song) {
    return {
      name: song.name,
      scale: song.scale,
      timeSignature: song.timeSignature,
      sections: song.sections.map(S.cloneSection),
    };
  };

  /* ── Measure computation ───────────────────────── */
  S.getPositionsPerMeasure = function (timeSig) {
    return S.POSITIONS_PER_MEASURE[timeSig] || 4;
  };

  S.buildMeasures = function (positions, timeSig) {
    var ppm = S.getPositionsPerMeasure(timeSig);
    var measures = [];
    for (var i = 0; i < positions.length; i += ppm) {
      measures.push({
        positions: positions.slice(i, i + ppm),
        startIndex: i,
      });
    }
    if (measures.length === 0) {
      measures.push({ positions: [], startIndex: 0 });
    }
    return measures;
  };

  S.buildBlocks = function (measures, barsPerRow) {
    var bpr = barsPerRow || S.BARS_PER_ROW || 4;
    var bpb = Math.max(S.BARS_PER_BLOCK || 4, bpr);
    var blocks = [];
    for (var i = 0; i < measures.length; i += bpb) {
      var blockMeasures = measures.slice(i, i + bpb);
      var rows = [];
      for (var r = 0; r < blockMeasures.length; r += bpr) {
        rows.push(blockMeasures.slice(r, r + bpr));
      }
      blocks.push({ rows: rows, startMeasure: i });
    }
    if (blocks.length === 0) {
      blocks.push({ rows: [[{ positions: [], startIndex: 0 }]], startMeasure: 0 });
    }
    return blocks;
  };

  /* ── Serialization (.swar) ─────────────────────── */
  S.serialize = function (song) {
    return {
      format: "swaralipi",
      version: 1,
      song: {
        name: song.name,
        scale: song.scale,
        timeSignature: song.timeSignature,
        sections: song.sections.map(function (sec) {
          return {
            name: sec.name,
            positions: sec.positions.map(function (pos) {
              return {
                tokens: pos.tokens.map(function (tok) {
                  return { base: tok.base, prefix: tok.prefix, suffix: tok.suffix };
                }),
              };
            }),
          };
        }),
      },
    };
  };

  S.deserialize = function (data) {
    if (!data || data.format !== "swaralipi") {
      return { valid: false, error: "Not a valid Swaralipi project file." };
    }
    if (data.version !== 1) {
      return { valid: false, error: "Unsupported file version: " + data.version };
    }
    var s = data.song;
    if (!s) return { valid: false, error: "Missing song data." };

    if (s.scale && S.SCALES.indexOf(s.scale) === -1) {
      return { valid: false, error: "Invalid scale: " + s.scale };
    }
    if (s.timeSignature && S.TIME_SIGNATURES.indexOf(s.timeSignature) === -1) {
      return { valid: false, error: "Invalid time signature: " + s.timeSignature };
    }

    var song = S.createSong(s.name || "", s.scale || "C", s.timeSignature || "4/4");
    song.sections = [];

    if (!Array.isArray(s.sections) || s.sections.length === 0) {
      song.sections.push(S.createSection("Sthayi"));
      return { valid: true, song: song };
    }

    for (var si = 0; si < s.sections.length; si++) {
      var sec = s.sections[si];
      var section = S.createSection(sec.name || "Untitled");

      if (Array.isArray(sec.positions)) {
        for (var pi = 0; pi < sec.positions.length; pi++) {
          var p = sec.positions[pi];
          if (!Array.isArray(p.tokens) || p.tokens.length === 0) continue;

          var tokens = [];
          var tokenError = null;
          for (var ti = 0; ti < p.tokens.length; ti++) {
            var t = p.tokens[ti];
            if (!S.isSwara(t.base)) {
              tokenError = "Invalid swara in section \"" + sec.name + "\": " + t.base;
              break;
            }
            var pre = Array.isArray(t.prefix) ? t.prefix : [];
            var suf = Array.isArray(t.suffix) ? t.suffix : [];
            for (var mi = 0; mi < pre.length; mi++) {
              if (!S.isModifier(pre[mi])) {
                tokenError = "Invalid prefix modifier: " + pre[mi];
                break;
              }
            }
            if (tokenError) break;
            for (var mj = 0; mj < suf.length; mj++) {
              if (!S.isModifier(suf[mj])) {
                tokenError = "Invalid suffix modifier: " + suf[mj];
                break;
              }
            }
            if (tokenError) break;
            tokens.push(S.createToken(t.base, pre, suf));
          }
          if (tokenError) return { valid: false, error: tokenError };
          section.positions.push(S.createPosition(tokens));
        }
      }
      song.sections.push(section);
    }

    if (song.sections.length === 0) {
      song.sections.push(S.createSection("Sthayi"));
    }
    return { valid: true, song: song };
  };

  /* ── Parse pasted notation string → positions ── */
  S.parseNotationString = function (text) {
    if (!text || typeof text !== "string") {
      return { valid: false, error: "Empty input", positions: [] };
    }
    text = S.normalizeNotationText(text);
    var cleaned = text.replace(/\|/g, " ").replace(/\[.*?\]/g, " ").trim();
    if (!cleaned) return { valid: true, positions: [] };

    for (var ci = 0; ci < cleaned.length; ci++) {
      var ch = cleaned[ci];
      if (ch !== " " && !S.isValidChar(ch)) {
        return { valid: false, error: "Invalid character: " + ch, positions: [] };
      }
    }

    var groups = cleaned.split(/\s+/).filter(function (g) { return g.length > 0; });
    var positions = [];
    for (var gi = 0; gi < groups.length; gi++) {
      var parsed = S.parsePositionText(groups[gi]);
      if (!parsed.valid) {
        return { valid: false, error: parsed.error + " in \"" + groups[gi] + "\"", positions: [] };
      }
      positions.push(S.createPosition(parsed.tokens));
    }
    return { valid: true, positions: positions };
  };

  /* ── TXT export ────────────────────────────────── */
  S.toTxt = function (song, barsPerRow) {
    var lines = [];
    lines.push("Song Name: " + (song.name || "(Untitled)"));
    lines.push("Scale: " + song.scale);
    lines.push("Music Bars: " + song.timeSignature);
    lines.push("");

    var ppm = S.getPositionsPerMeasure(song.timeSignature);

    for (var si = 0; si < song.sections.length; si++) {
      var sec = song.sections[si];
      lines.push("[" + sec.name + "]");
      lines.push("");

      if (sec.positions.length === 0) {
        lines.push("(empty)");
        lines.push("");
        continue;
      }

      var measures = S.buildMeasures(sec.positions, song.timeSignature);
      var blocks = S.buildBlocks(measures, barsPerRow || 4);

      for (var bi = 0; bi < blocks.length; bi++) {
        for (var ri = 0; ri < blocks[bi].rows.length; ri++) {
          var rowMeasures = blocks[bi].rows[ri];
          var parts = [];
          for (var mi = 0; mi < rowMeasures.length; mi++) {
            var measure = rowMeasures[mi];
            var posTexts = [];
            for (var pi = 0; pi < measure.positions.length; pi++) {
              posTexts.push(S.positionToText(measure.positions[pi]));
            }
            parts.push(posTexts.join(" "));
          }
          lines.push(parts.join(" | "));
        }
        lines.push("");
      }
    }
    return lines.join("\n");
  };

  /* ── Deep-compare two songs (for dirty check) ── */
  S.songsEqual = function (a, b) {
    return JSON.stringify(S.serialize(a)) === JSON.stringify(S.serialize(b));
  };
})();
