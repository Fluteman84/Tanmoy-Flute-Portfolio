(() => {
  "use strict";

  function assertEqual(actual, expected, description) {
    if (actual !== expected) throw new Error(description + "\nExpected: " + expected + "\nReceived: " + actual);
  }

  function runPaltaTests() {
    const { PALTAS, generateAscending, generateDescending, parsePalta } = window.PaltaGenerator;
    const tests = [
      [generateAscending(PALTAS[0])[0], "SRG SRG SR SRGM MGRS", "Palta 1 ascending row 1"],
      [generateAscending(PALTAS[0])[1], "RGM RGM RG RGMP PMGR", "Palta 1 ascending row 2"],
      [generateDescending(PALTAS[0])[0], "S'ND S'ND S'N S'NDP PDNS'", "Palta 1 descending row 1"],
      [generateDescending(PALTAS[0])[1], "NDP NDP ND NDPM MPDN", "Palta 1 descending row 2"],
      [generateAscending(PALTAS[1])[0], "SRGM MGRS SRSG MGRS", "Palta 2 ascending"],
      [generateDescending(PALTAS[1])[0], "S'NDP PDNS' S'NS'D PDNS'", "Palta 2 descending"],
      [generateAscending(PALTAS[2])[0], "SRGMP- SRGMP- SRGM", "Palta 3 ascending"],
      [generateDescending(PALTAS[2])[0], "S'NDPM- S'NDPM- S'NDP", "Palta 3 descending"],
      [generateAscending(PALTAS[3])[0], "SR SR SR SRG SRG SRG-", "Palta 4 ascending"],
      [generateDescending(PALTAS[3])[0], "S'N S'N S'N S'ND S'ND S'ND-", "Palta 4 descending"],
      [generateAscending(PALTAS[4])[0], "SRGMG SRGMG SRG RGM", "Palta 5 ascending"],
      [generateDescending(PALTAS[4])[0], "S'NDPD S'NDPD S'ND NDP", "Palta 5 descending"],
      [generateAscending(PALTAS[5])[0], "SRG SRG SR SRSG RSSR", "Palta 6 ascending"],
      [generateDescending(PALTAS[5])[0], "S'ND S'ND S'N S'NS'D NS'S'N", "Palta 6 descending"],
      [generateAscending(PALTAS[6])[0], "SGPMGRS- SRGM MGRS", "Palta 7 ascending"],
      [generateDescending(PALTAS[6])[0], "S'DMPDNS'- S'NDP PDNS'", "Palta 7 descending"],
      [generateAscending(PALTAS[7])[0], "SR-G RGSR SRGR SRGM", "Palta 8 ascending"],
      [generateDescending(PALTAS[7])[0], "S'N-D NDS'N S'NDN S'NDP", "Palta 8 descending"]
    ];

    tests.forEach(([actual, expected, description]) => assertEqual(actual, expected, description));
    parsePalta("12-3 2312 1232 1234");
    let invalidWasRejected = false;
    try { parsePalta("123 X 4321"); } catch { invalidWasRejected = true; }
    if (!invalidWasRejected) throw new Error("Invalid input must be rejected.");
    return { passed: tests.length + 2 };
  }

  try {
    window.PaltaGeneratorTests = runPaltaTests();
    console.info("Palta validation passed: " + window.PaltaGeneratorTests.passed + " checks.");
  } catch (error) {
    console.error("Palta validation failed.", error);
    window.PaltaGeneratorTests = { error: error.message };
  }
})();