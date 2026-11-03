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

    // Case sensitivity & normalization checks for S and P
    assert("A_norm_s", "Lowercase s normalizes to canonical S", S.normalizeSwara("s") === "S" && S.parsePositionText("s").tokens[0].base === "S");
    assert("A_norm_p", "Lowercase p normalizes to canonical P", S.normalizeSwara("p") === "P" && S.parsePositionText("p").tokens[0].base === "P");
    assert("A_case_r", "r preserves lowercase", S.parsePositionText("r").tokens[0].base === "r");
    assert("A_case_R", "R preserves uppercase", S.parsePositionText("R").tokens[0].base === "R");
    assert("A_case_g", "g preserves lowercase", S.parsePositionText("g").tokens[0].base === "g");
    assert("A_case_G", "G preserves uppercase", S.parsePositionText("G").tokens[0].base === "G");
    assert("A_case_m", "m preserves lowercase", S.parsePositionText("m").tokens[0].base === "m");
    assert("A_case_M", "M preserves uppercase", S.parsePositionText("M").tokens[0].base === "M");
    assert("A_case_d", "d preserves lowercase", S.parsePositionText("d").tokens[0].base === "d");
    assert("A_case_D", "D preserves uppercase", S.parsePositionText("D").tokens[0].base === "D");
    assert("A_case_n", "n preserves lowercase", S.parsePositionText("n").tokens[0].base === "n");
    assert("A_case_N", "N preserves uppercase", S.parsePositionText("N").tokens[0].base === "N");

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

    var pos14 = S.parseNotationString("S R G M P D N S R G M P D N").positions;
    var m_7_4 = S.buildMeasures(pos14, "7/4");
    assert("D03b", "7/4: 14 positions give 2 measures of 7 positions", m_7_4.length === 2 && m_7_4[0].positions.length === 7 && m_7_4[1].positions.length === 7);

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
       E01: Desktop 4 bars per row -> 4 bars in 1 row
       E01b: 2 bars per row mode -> Row 1 has Bar 1 & 2; Row 2 has Bar 3 & 4
       E02: 5 measures -> New block starts for Bar 5 on a new line
       E03: 3/4 uses 4-bar block architecture
       E04: 5/4 uses 4-bar block architecture
       ──────────────────────────────────────────────────────── */
    var pos16 = S.parseNotationString("S R G M P D N S S R G M P D N S").positions;
    var m16 = S.buildMeasures(pos16, "4/4"); // 4 measures
    var b4 = S.buildBlocks(m16, 4);
    assert("E01a", "4 measures yield 1 block in 4-bar mode", b4.length === 1);
    assert("E01b", "Desktop 4-bar mode has 1 row with 4 bars", b4[0].rows.length === 1 && b4[0].rows[0].length === 4);

    var b4_2bar = S.buildBlocks(m16, 2);
    assert("E01c", "2-bar mode has 2 rows of 2 bars", b4_2bar[0].rows.length === 2 && b4_2bar[0].rows[0].length === 2 && b4_2bar[0].rows[1].length === 2);

    var pos20 = S.parseNotationString("S R G M P D N S S R G M P D N S S R G M").positions;
    var m20 = S.buildMeasures(pos20, "4/4"); // 5 measures
    var b5 = S.buildBlocks(m20, 4);
    assert("E02", "5 measures begin a second block on a new line", b5.length === 2 && b5[1].rows[0].length === 1);

    var m_3_4_blocks = S.buildBlocks(S.buildMeasures(pos20, "3/4"), 4);
    assert("E03", "3/4 follows 4-bar block architecture", m_3_4_blocks[0].rows[0].length === 4);

    var m_5_4_blocks = S.buildBlocks(S.buildMeasures(pos20, "5/4"), 4);
    assert("E04", "5/4 follows 4-bar block architecture", m_5_4_blocks[0].rows[0].length === 4);

    var m_7_4_blocks = S.buildBlocks(S.buildMeasures(pos14, "7/4"), 4);
    assert("E05", "7/4 follows 4-bar block architecture", m_7_4_blocks[0].rows[0].length === 2);

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

    /* ────────────────────────────────────────────────────────
       TEST GROUP K — SPECIAL S/P MAPPING & GROUPING EXAMPLES (Tests A–H)
       ──────────────────────────────────────────────────────── */
    // Test A — Normal Mode: s r G p -> S r G P (4 separate positions)
    var testA = S.parseNotationString("s r G p");
    assert("K_TestA", "Test A: 's r G p' parses to 4 positions 'S', 'r', 'G', 'P'",
      testA.valid && testA.positions.length === 4 &&
      S.positionToText(testA.positions[0]) === "S" &&
      S.positionToText(testA.positions[1]) === "r" &&
      S.positionToText(testA.positions[2]) === "G" &&
      S.positionToText(testA.positions[3]) === "P"
    );

    // Test B — Group Mode: GMPM -> 1 position
    var testB = S.parsePositionText("GMPM");
    assert("K_TestB", "Test B: 'GMPM' is 1 position with 4 swaras",
      testB.valid && testB.tokens.length === 4 && S.positionToText(S.createPosition(testB.tokens)) === "GMPM"
    );

    // Test C & D — Group Mode with s/p normalization: gMpS -> gMPS (1 position)
    var testD = S.parsePositionText("gMpS");
    assert("K_TestD", "Test D: 'gMpS' -> 'gMPS' (p->P, s->S, g and M preserved)",
      testD.valid && testD.tokens.length === 4 &&
      testD.tokens[0].base === "g" &&
      testD.tokens[1].base === "M" &&
      testD.tokens[2].base === "P" &&
      testD.tokens[3].base === "S" &&
      S.positionToText(S.createPosition(testD.tokens)) === "gMPS"
    );

    // Test H — Pasted notation normalization: s r g p -> S r g P
    var testH = S.parseNotationString("s r g p");
    assert("K_TestH", "Test H: Pasting 's r g p' normalizes s->S and p->P while keeping r and g lowercase",
      testH.valid && testH.positions.length === 4 &&
      S.positionToText(testH.positions[0]) === "S" &&
      S.positionToText(testH.positions[1]) === "r" &&
      S.positionToText(testH.positions[2]) === "g" &&
      S.positionToText(testH.positions[3]) === "P"
    );

    /* ────────────────────────────────────────────────────────
       TEST GROUP L — 7/4 TIME SIGNATURE (USER SPECIFIED TESTS A–E)
       ──────────────────────────────────────────────────────── */
    // Test A — Seven individual swaras: "S R G M P D N" -> 1 measure of 7 positions
    var test7A_pos = S.parseNotationString("S R G M P D N").positions;
    var test7A_m = S.buildMeasures(test7A_pos, "7/4");
    assert("L_TestA", "Test A (7/4): 'S R G M P D N' produces exactly 1 measure with 7 positions",
      test7A_m.length === 1 && test7A_m[0].positions.length === 7 &&
      test7A_m[0].positions.map(S.positionToText).join(" ") === "S R G M P D N"
    );

    // Test B — Continuous notation: "S R G M P D N S R G M P D N" -> 2 measures of 7 positions
    var test7B_pos = S.parseNotationString("S R G M P D N S R G M P D N").positions;
    var test7B_m = S.buildMeasures(test7B_pos, "7/4");
    assert("L_TestB", "Test B (7/4): 14 continuous positions produce exactly 2 measures of 7 positions each",
      test7B_m.length === 2 && test7B_m[0].positions.length === 7 && test7B_m[1].positions.length === 7 &&
      test7B_m[0].positions.map(S.positionToText).join(" ") === "S R G M P D N" &&
      test7B_m[1].positions.map(S.positionToText).join(" ") === "S R G M P D N"
    );

    // Test C — Multi-swara group: "S R GM P D N S" -> 1 measure of 7 positions ('GM' is 1 position)
    var test7C_pos = S.parseNotationString("S R GM P D N S").positions;
    var test7C_m = S.buildMeasures(test7C_pos, "7/4");
    assert("L_TestC", "Test C (7/4): 'S R GM P D N S' has 7 rhythmic positions with 'GM' counting as 1 position",
      test7C_m.length === 1 && test7C_m[0].positions.length === 7 &&
      S.positionToText(test7C_m[0].positions[2]) === "GM"
    );

    // Test D — Modifiers: "S' r, G- M: P D' N," -> 7 positions with modifiers attached
    var test7D_pos = S.parseNotationString("S' r, G- M: P D' N,").positions;
    var test7D_m = S.buildMeasures(test7D_pos, "7/4");
    assert("L_TestD", "Test D (7/4): 'S\\' r, G- M: P D\\' N,' has 7 positions with all modifiers preserved",
      test7D_m.length === 1 && test7D_m[0].positions.length === 7 &&
      test7D_m[0].positions.map(S.positionToText).join(" ") === "S' r, G- M: P D' N,"
    );

    // Test E — Existing signatures regression (3/4, 4/4, 5/4)
    var test7E_3 = S.buildMeasures(S.parseNotationString("S R G S R G").positions, "3/4");
    var test7E_4 = S.buildMeasures(S.parseNotationString("S R G M S R G M").positions, "4/4");
    var test7E_5 = S.buildMeasures(S.parseNotationString("S R G M P S R G M P").positions, "5/4");
    assert("L_TestE_34", "Test E: 3/4 generates measures with 3 positions each", test7E_3.length === 2 && test7E_3[0].positions.length === 3 && test7E_3[1].positions.length === 3);
    assert("L_TestE_44", "Test E: 4/4 generates measures with 4 positions each", test7E_4.length === 2 && test7E_4[0].positions.length === 4 && test7E_4[1].positions.length === 4);
    assert("L_TestE_54", "Test E: 5/4 generates measures with 5 positions each", test7E_5.length === 2 && test7E_5[0].positions.length === 5 && test7E_5[1].positions.length === 5);

    // Test F — Serialization & Deserialization of 7/4 project
    var song7 = S.createSong("Raag Yaman 7/4", "C", "7/4");
    song7.sections[0].positions = test7B_pos;
    var ser7 = S.serialize(song7);
    var deser7 = S.deserialize(ser7);
    assert("L_TestF_ser", "7/4 song serializes and deserializes without error", deser7.valid && deser7.song.timeSignature === "7/4");
    assert("L_TestF_measures", "Deserialized 7/4 song retains 2 measures of 7 positions",
      S.buildMeasures(deser7.song.sections[0].positions, deser7.song.timeSignature).length === 2
    );

    // Test G — TXT export contains "Music Bars: 7/4" and barlines
    var txt7 = S.toTxt(song7);
    assert("L_TestG_txt", "TXT export formats 7/4 properly with barlines",
      txt7.indexOf("Music Bars: 7/4") !== -1 && txt7.indexOf("S R G M P D N | S R G M P D N") !== -1
    );

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
