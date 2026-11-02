/* ================================================================
   Swaralipi — Automated Test Suite
   Validates Test Groups A through J as defined in Part 19 of the Master Prompt.
   ================================================================ */
(function () {
  "use strict";

  var S = window.Swaralipi;
  if (!S) {
    console.error("Swaralipi engine not loaded before tests.");
    return;
  }

  var results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  function assert(testId, description, condition) {
    results.total++;
    if (condition) {
      results.passed++;
      results.details.push({ id: testId, desc: description, status: "PASS" });
    } else {
      results.failed++;
      results.details.push({ id: testId, desc: description, status: "FAIL" });
      console.error("FAIL [" + testId + "]: " + description);
    }
  }

  function runTests() {
    /* ────────────────────────────────────────────────────────
       TEST GROUP A — SWARA VALIDATION
       Allowed base swaras: [S, r, R, g, G, M, m, P, d, D, n, N]
       Case sensitivity must be strictly preserved.
       Invalid: X, A, S#, S@, etc.
       ──────────────────────────────────────────────────────── */
    var swaras = ["S", "r", "R", "g", "G", "M", "m", "P", "d", "D", "n", "N"];
    for (var i = 0; i < swaras.length; i++) {
      var s = swaras[i];
      var p = S.parsePositionText(s);
      assert("A" + (i < 9 ? "0" + (i + 1) : (i + 1)), "Swara " + s + " is valid", S.isSwara(s) && p.valid && p.tokens.length === 1 && p.tokens[0].base === s);
    }
    assert("A13", "X is invalid", !S.isSwara("X") && !S.parsePositionText("X").valid);
    assert("A14", "A is invalid", !S.isSwara("A") && !S.parsePositionText("A").valid);
    assert("A15", "S# is invalid", !S.parsePositionText("S#").valid);
    assert("A16", "S@ is invalid", !S.parsePositionText("S@").valid);

    // Case sensitivity checks
    assert("A_case1", "Lowercase s is invalid base", !S.isSwara("s") && !S.parsePositionText("s").valid);
    assert("A_case2", "Lowercase p is invalid base", !S.isSwara("p") && !S.parsePositionText("p").valid);

    /* ────────────────────────────────────────────────────────
       TEST GROUP B — MODIFIER VALIDATION
       Allowed: - (sustain), ' (upper), , (lower), : (additional)
       Can appear before or after.
       Standalone modifiers cannot become completed position.
       ──────────────────────────────────────────────────────── */
    assert("B01", "S' is valid", S.parsePositionText("S'").valid);
    assert("B02", "r, is valid", S.parsePositionText("r,").valid);
    assert("B03", "G- is valid", S.parsePositionText("G-").valid);
    assert("B04", "m: is valid", S.parsePositionText("m:").valid);
    assert("B05", "-S is valid", S.parsePositionText("-S").valid);
    assert("B06", "S'- is valid", S.parsePositionText("S'-").valid);
    assert("B07", "r,: is valid", S.parsePositionText("r,:").valid);
    assert("B08", "G'M is valid", S.parsePositionText("G'M").valid);
    assert("B09", "Standalone - is invalid completed position", !S.parsePositionText("-").valid);
    assert("B10", "Standalone ' is invalid completed position", !S.parsePositionText("'").valid);
    assert("B10b", "Standalone , is invalid completed position", !S.parsePositionText(",").valid);
    assert("B10c", "Standalone : is invalid completed position", !S.parsePositionText(":").valid);
    assert("B11", "S# is invalid", !S.parsePositionText("S#").valid);

    // Modifier association checks
    var gm_parsed = S.parsePositionText("G'M-");
    assert("B_assoc1", "G'M- preserves G' association", gm_parsed.valid && gm_parsed.tokens[0].base === "G" && gm_parsed.tokens[0].suffix[0] === "'");
    assert("B_assoc2", "G'M- preserves M- association", gm_parsed.valid && gm_parsed.tokens[1].base === "M" && gm_parsed.tokens[1].suffix[0] === "-");

    /* ────────────────────────────────────────────────────────
       TEST GROUP C — GROUPING SYSTEM
       Caps Lock OFF -> separate positions
       Caps Lock ON -> single position
       Spaces ignored in Group Mode
       Modifiers preserved in group
       ──────────────────────────────────────────────────────── */
    // C01: Normal mode parsing
    var c01 = S.parseNotationString("S R G M");
    assert("C01", "S R G M results in 4 positions", c01.valid && c01.positions.length === 4);

    // C02: Group Mode GM
    var c02 = S.parsePositionText("GM");
    assert("C02", "GM occupies 1 position with 2 swara tokens", c02.valid && c02.tokens.length === 2 && c02.tokens[0].base === "G" && c02.tokens[1].base === "M");

    // C03: Group Mode GMPM
    var c03 = S.parsePositionText("GMPM");
    assert("C03", "GMPM occupies 1 position with 4 swara tokens", c03.valid && c03.tokens.length === 4);

    // C04: Spaces ignored in Group Mode
    var c04_text = "G M P M".replace(/\s+/g, "");
    var c04 = S.parsePositionText(c04_text);
    assert("C04", "G M P M with spaces ignored forms GMPM (1 position)", c04.valid && c04.tokens.length === 4);

    // C06: S | R | G | GMPM
    var c06 = S.parseNotationString("S R G GMPM");
    assert("C06", "S R G GMPM has 4 positions (GMPM is 1 position)", c06.valid && c06.positions.length === 4 && S.positionToText(c06.positions[3]) === "GMPM");

    // C07: Group with multiple modifiers: G'M-
    var c07 = S.parsePositionText("G'M-");
    assert("C07", "G'M- tokens preserve individual modifiers", c07.valid && c07.tokens.length === 2 && S.tokenToText(c07.tokens[0]) === "G'" && S.tokenToText(c07.tokens[1]) === "M-");

    // C09: Long group never split
    var longGroup = "GMPMGMPMGMPM";
    var c09 = S.parsePositionText(longGroup);
    assert("C09", "Long group GMPMGMPMGMPM is 1 position with 12 tokens", c09.valid && c09.tokens.length === 12);

    /* ────────────────────────────────────────────────────────
       TEST GROUP D — RHYTHMIC MEASURES
       4/4 -> 4 positions/measure
       3/4 -> 3 positions/measure
       5/4 -> 5 positions/measure
       Automatic barline generation
       ──────────────────────────────────────────────────────── */
    var pos8 = S.parseNotationString("S R G M P D N S").positions;
    var m_4_4 = S.buildMeasures(pos8, "4/4");
    assert("D01", "4/4: 8 positions give 2 measures of 4 positions", m_4_4.length === 2 && m_4_4[0].positions.length === 4 && m_4_4[1].positions.length === 4);

    var pos9 = S.parseNotationString("S R G M P D N S R").positions;
    var m_3_4 = S.buildMeasures(pos9, "3/4");
    assert("D02", "3/4: 9 positions give 3 measures of 3 positions", m_3_4.length === 3 && m_3_4[0].positions.length === 3 && m_3_4[1].positions.length === 3 && m_3_4[2].positions.length === 3);

    var pos10 = S.parseNotationString("S R G M P D N S R G").positions;
    var m_5_4 = S.buildMeasures(pos10, "5/4");
    assert("D03", "5/4: 10 positions give 2 measures of 5 positions", m_5_4.length === 2 && m_5_4[0].positions.length === 5 && m_5_4[1].positions.length === 5);

    var pos_multi = S.parseNotationString("S R GM GMP").positions;
    var m_multi = S.buildMeasures(pos_multi, "4/4");
    assert("D04", "Multi-swara: S R GM GMP occupies 4 positions in 4/4 (1 complete measure)", m_multi.length === 1 && m_multi[0].positions.length === 4);

    // D05: Insert position -> automatic barline recalculation
    pos8.splice(2, 0, S.createPosition(S.parsePositionText("g").tokens));
    var m_recalc = S.buildMeasures(pos8, "4/4");
    assert("D05", "Inserting a position recalculates barlines (now 3 measures)", m_recalc.length === 3 && m_recalc[0].positions.length === 4 && m_recalc[1].positions.length === 4 && m_recalc[2].positions.length === 1);

    // D06: Delete position -> automatic barline recalculation
    pos8.splice(2, 1);
    var m_del = S.buildMeasures(pos8, "4/4");
    assert("D06", "Deleting a position returns to 2 measures", m_del.length === 2 && m_del[0].positions.length === 4);

    /* ────────────────────────────────────────────────────────
       TEST GROUP E — FOUR-BAR BLOCK LAYOUT
       E01: 4 measures -> Row 1 has Bar 1 & 2; Row 2 has Bar 3 & 4
       E02: 5 measures -> New block starts for Bar 5
       E03: 3/4 uses same 4-bar block architecture
       E04: 5/4 uses same 4-bar block architecture
       ──────────────────────────────────────────────────────── */
    var pos16 = S.parseNotationString("S R G M P D N S S R G M P D N S").positions;
    var m16 = S.buildMeasures(pos16, "4/4"); // 4 measures
    var b4 = S.buildBlocks(m16);
    assert("E01a", "4 measures yield 1 block", b4.length === 1);
    assert("E01b", "Block 1 has 2 rows", b4[0].rows.length === 2);
    assert("E01c", "Row 1 has 2 bars", b4[0].rows[0].length === 2);
    assert("E01d", "Row 2 has 2 bars", b4[0].rows[1].length === 2);

    var pos20 = S.parseNotationString("S R G M P D N S S R G M P D N S S R G M").positions;
    var m20 = S.buildMeasures(pos20, "4/4"); // 5 measures
    var b5 = S.buildBlocks(m20);
    assert("E02", "5 measures begin a second block on a new line", b5.length === 2 && b5[1].rows[0].length === 1);

    var m_3_4_blocks = S.buildBlocks(S.buildMeasures(pos20, "3/4"));
    assert("E03", "3/4 follows 4-bar block architecture", m_3_4_blocks[0].rows[0].length === 2);

    var m_5_4_blocks = S.buildBlocks(S.buildMeasures(pos20, "5/4"));
    assert("E04", "5/4 follows 4-bar block architecture", m_5_4_blocks[0].rows[0].length === 2);

    /* ────────────────────────────────────────────────────────
       TEST GROUP G — COPY AND PASTE
       G08: Paste invalid notation atomically rejected
       ──────────────────────────────────────────────────────── */
    var invalidPaste = S.parseNotationString("S R X M");
    assert("G08", "Paste containing 'X' is atomically rejected", !invalidPaste.valid);

    var validPaste = S.parseNotationString("S R GM GMP");
    assert("G09", "Paste preserves multi-swara groups", validPaste.valid && validPaste.positions.length === 4 && S.positionToText(validPaste.positions[2]) === "GM");

    /* ────────────────────────────────────────────────────────
       TEST GROUP H — SECTION MANAGEMENT
       H01: Section creation
       H04: Reorder sections
       ──────────────────────────────────────────────────────── */
    var song = S.createSong("Test Composition", "D#", "4/4");
    assert("H01", "Default song has 1 Sthayi section", song.sections.length === 1 && song.sections[0].name === "Sthayi");

    song.sections.push(S.createSection("Antara"));
    assert("H01b", "New Antara section added independently", song.sections.length === 2 && song.sections[1].name === "Antara");

    // Reorder
    var tmp = song.sections[0];
    song.sections[0] = song.sections[1];
    song.sections[1] = tmp;
    assert("H04", "Sections can be reordered while preserving content", song.sections[0].name === "Antara" && song.sections[1].name === "Sthayi");

    /* ────────────────────────────────────────────────────────
       TEST GROUP I — PROJECT SERIALIZATION & DESERIALIZATION (.swar & TXT)
       I01: Export .swar
       I02: Import .swar
       I03: Corrupted file rejected
       I04: Unsupported version rejected
       I06: Export TXT
       ──────────────────────────────────────────────────────── */
    song.sections[0].positions = S.parseNotationString("S R G GM").positions;
    song.sections[1].positions = S.parseNotationString("P D N S'").positions;

    var serialized = S.serialize(song);
    assert("I01", ".swar serialized has format swaralipi version 1", serialized.format === "swaralipi" && serialized.version === 1);

    var deserialized = S.deserialize(serialized);
    assert("I02", ".swar deserialized restores song accurately", deserialized.valid && deserialized.song.name === "Test Composition" && deserialized.song.scale === "D#" && deserialized.song.sections.length === 2);
    assert("I02b", ".swar preserves multi-swara GM token", S.positionToText(deserialized.song.sections[0].positions[3]) === "GM");

    assert("I03", "Corrupted file without format rejected", !S.deserialize({ foo: "bar" }).valid);
    assert("I04", "Unsupported version 99 rejected", !S.deserialize({ format: "swaralipi", version: 99 }).valid);

    var txt = S.toTxt(song);
    assert("I06a", "TXT includes Song Name", txt.indexOf("Song Name: Test Composition") !== -1);
    assert("I06b", "TXT includes Scale", txt.indexOf("Scale: D#") !== -1);
    assert("I06c", "TXT includes Music Bars", txt.indexOf("Music Bars: 4/4") !== -1);
    assert("I06d", "TXT includes [Antara] heading", txt.indexOf("[Antara]") !== -1);
    assert("I06e", "TXT includes [Sthayi] heading", txt.indexOf("[Sthayi]") !== -1);

    /* ────────────────────────────────────────────────────────
       TEST GROUP J — RESET
       ──────────────────────────────────────────────────────── */
    var resetSong = S.createSong();
    assert("J04a", "Reset song has empty name", resetSong.name === "");
    assert("J04b", "Reset song has default scale C", resetSong.scale === "C");
    assert("J04c", "Reset song has default time signature 4/4", resetSong.timeSignature === "4/4");
    assert("J04d", "Reset song has 1 default Sthayi section", resetSong.sections.length === 1 && resetSong.sections[0].name === "Sthayi");
    assert("J04e", "Reset Sthayi has 0 positions", resetSong.sections[0].positions.length === 0);

    return results;
  }

  // Run automatically
  try {
    window.SwaralipiTests = runTests();
    console.info("Swaralipi Tests Completed: " + window.SwaralipiTests.passed + "/" + window.SwaralipiTests.total + " passed (" + window.SwaralipiTests.failed + " failed).");
  } catch (err) {
    console.error("Swaralipi Tests Execution Error:", err);
    window.SwaralipiTests = { error: err.message };
  }
})();
