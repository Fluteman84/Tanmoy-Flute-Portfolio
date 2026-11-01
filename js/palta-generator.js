(() => {
  "use strict";

  const SCALES = {
    ascending: ["S", "R", "G", "M", "P", "D", "N"],
    descending: ["S'", "N", "D", "P", "M", "G", "R"]
  };

  const PALTAS = [
    "123 123 12 1234 4321",
    "1234 4321 1213 4321",
    "12345- 12345- 1234",
    "12 12 12 123 123 123-",
    "12343 12343 123 234",
    "123 123 12 1213 2112",
    "1354321- 1234 4321",
    "12-3 2312 1232 1234"
  ];

  function parsePalta(pattern) {
    if (typeof pattern !== "string") {
      throw new Error("Enter a Palta formula.");
    }

    const normalized = pattern.trim().replace(/\s+/g, " ");
    if (!normalized) {
      throw new Error("Enter a Palta formula.");
    }

    const groups = normalized.split(" ");
    groups.forEach((group) => {
      if (!/^[1-8-]+$/.test(group) || !/[1-8]/.test(group)) {
        throw new Error("Use only digits 1-8, spaces, and hyphens. Every group needs at least one digit.");
      }
    });

    return { raw: normalized, groups };
  }

  function digitIndex(token) {
    return (Number(token) - 1) % SCALES.ascending.length;
  }

  function getGroupRowLimit(group) {
    const finalDigit = [...group].reverse().find((token) => token !== "-");
    const finalIndex = digitIndex(finalDigit);
    const shiftsUntilSa = (SCALES.ascending.length - finalIndex) % SCALES.ascending.length;

    // The C++ generator always completes at least one cycle when a group ends on Sa.
    return shiftsUntilSa || SCALES.ascending.length;
  }

  function mapAscendingGroup(group, shift) {
    let output = "";

    for (const token of group) {
      if (token === "-") {
        output += "-";
        continue;
      }

      const originalIndex = digitIndex(token);
      const shiftedIndex = (originalIndex + shift) % SCALES.ascending.length;
      const reachedUpperSa = shiftedIndex === 0 && originalIndex + shift >= SCALES.ascending.length;

      output += reachedUpperSa ? "S'" : SCALES.ascending[shiftedIndex];
    }

    return output;
  }

  function mapDescendingGroup(group, shift) {
    let output = "";

    for (const token of group) {
      if (token === "-") {
        output += "-";
        continue;
      }

      const shiftedIndex = (digitIndex(token) + shift) % SCALES.descending.length;
      output += shiftedIndex === 0 && shift > 0 ? "S" : SCALES.descending[shiftedIndex];
    }

    return output;
  }

  function generateDirection(pattern, direction) {
    const parsed = parsePalta(pattern);
    const mapGroup = direction === "ascending" ? mapAscendingGroup : mapDescendingGroup;
    const finalShift = Math.min(...parsed.groups.map(getGroupRowLimit));
    const rows = [];

    for (let shift = 0; shift <= finalShift; shift += 1) {
      rows.push(parsed.groups.map((group) => mapGroup(group, shift)).join(" "));
    }

    return rows;
  }

  function generateAscending(pattern) {
    return generateDirection(pattern, "ascending");
  }

  function generateDescending(pattern) {
    return generateDirection(pattern, "descending");
  }

  function generateBoth(pattern) {
    return {
      formula: parsePalta(pattern).raw,
      ascending: generateAscending(pattern),
      descending: generateDescending(pattern)
    };
  }

  function formatOutput(rows) {
    return rows.join("\n");
  }

  async function copyPalta(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }

  function exportPalta(text, filename = "hindustani-palta.txt") {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  window.PaltaGenerator = {
    SCALES,
    PALTAS,
    parsePalta,
    generateAscending,
    generateDescending,
    generateBoth,
    formatOutput,
    copyPalta,
    exportPalta
  };
})();