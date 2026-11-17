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

  function generateDirection({ groups }, direction) {
    const scale = SCALES[direction];
    const farSa = direction === "ascending" ? "S'" : "S";
    const finalShift = groups.reduce((limit, group) => Math.min(limit, getGroupRowLimit(group)), scale.length);
    const rows = [];

    for (let shift = 0; shift <= finalShift; shift += 1) {
      rows.push(groups.map((group) => {
        let notes = "";
        for (const token of group) {
          if (token === "-") {
            notes += "-";
          } else {
            const index = Number(token) - 1 + shift;
            const degree = index % scale.length;
            notes += degree === 0 && index > 0 ? farSa : scale[degree];
          }
        }
        return notes;
      }).join(" "));
    }
    return rows;
  }

  function generateAscending(pattern) {
    return generateDirection(parsePalta(pattern), "ascending");
  }

  function generateDescending(pattern) {
    return generateDirection(parsePalta(pattern), "descending");
  }

  function generateBoth(pattern) {
    const parsed = parsePalta(pattern);
    return {
      formula: parsed.raw,
      ascending: generateDirection(parsed, "ascending"),
      descending: generateDirection(parsed, "descending")
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
    const focused = document.activeElement;
    try {
      helper.select();
      if (!document.execCommand("copy")) throw new Error("Clipboard copy failed.");
    } finally {
      helper.remove();
      focused?.focus({ preventScroll: true });
    }
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