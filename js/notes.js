document.addEventListener("DOMContentLoaded", () => {
  const { PALTAS, generateBoth, formatOutput, copyPalta, exportPalta } = window.PaltaGenerator;
  const select = document.getElementById("paltaSelect");
  const formulaInput = document.getElementById("paltaFormula");
  const formulaError = document.getElementById("formulaError");
  const ascendingOutput = document.getElementById("ascendingOutput");
  const descendingOutput = document.getElementById("descendingOutput");
  const toast = document.getElementById("paltaToast");
  const downloadButton = document.getElementById("downloadButton");
  const resetButton = document.getElementById("resetButton");
  let current = null;
  let toastTimer = null;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function renderRows(container, rows, label) {
    if (!rows.length) {
      container.innerHTML = '<p class="empty-output">No valid notes can be formed within this octave.</p>';
      return;
    }
    container.innerHTML = rows.map((row, index) => '<article class="notation-row"><span class="row-number">' + String(index + 1).padStart(2, "0") + '</span><p class="row-notes">' + row + '</p><button class="copy-row" type="button" data-row-copy="' + label + '" data-row-index="' + index + '" aria-label="Copy row ' + (index + 1) + '">Copy</button></article>').join("");
  }

  function generate(mode = "both") {
    try {
      current = generateBoth(formulaInput.value);

      formulaError.textContent = "";
      if (mode === "both" || mode === "ascending") renderRows(ascendingOutput, current.ascending, "ascending");
      if (mode === "both" || mode === "descending") renderRows(descendingOutput, current.descending, "descending");
    } catch (error) {
      formulaError.textContent = error.message;
    }
  }

  function titleForExport() {
    const selected = Number(select.value);
    return Number.isInteger(selected) && PALTAS[selected] === (current && current.formula) ? "PALTA " + (selected + 1) : "CUSTOM PALTA";
  }

  function textFor(kind) {
    if (!current) return "";
    const header = titleForExport() + "\nFormula: " + current.formula;
    const ascending = "ASCENDING:\n" + formatOutput(current.ascending);
    const descending = "DESCENDING:\n" + formatOutput(current.descending);
    if (kind === "ascending") return header + "\n\n" + ascending;
    if (kind === "descending") return header + "\n\n" + descending;
    return header + "\n\n" + ascending + "\n\n" + descending;
  }

  async function copy(kind) {
    if (!current) return showToast("Generate a Palta first.");
    try {
      await copyPalta(textFor(kind));
      showToast("Notation copied to clipboard.");
    } catch {
      showToast("Copy was unavailable. Please select the notation manually.");
    }
  }

  select.addEventListener("change", () => {
    formulaInput.value = PALTAS[Number(select.value)];
    generate("both");
  });
  formulaInput.addEventListener("input", () => {
    select.selectedIndex = -1;
    generate("both");
  });

  document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", () => copy(button.dataset.copy)));
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-row-copy]");
    if (!button || !current) return;
    const row = current[button.dataset.rowCopy][Number(button.dataset.rowIndex)];
    try {
      await copyPalta(row);
      showToast("Row copied to clipboard.");
    } catch {
      showToast("Copy was unavailable. Please select the row manually.");
    }
  });
  downloadButton.addEventListener("click", () => {
    if (!current) return showToast("Generate a Palta first.");
    exportPalta(textFor("both"), "hindustani-classical-palta.txt");
    showToast("TXT download started.");
  });
  resetButton.addEventListener("click", () => {
    select.value = "0";
    formulaInput.value = PALTAS[0];
    formulaError.textContent = "";
    ascendingOutput.innerHTML = '<p class="empty-output">Choose a Palta and generate its ascending notes.</p>';
    descendingOutput.innerHTML = '<p class="empty-output">Choose a Palta and generate its descending notes.</p>';
    current = null;
    showToast("Generator reset.");
  });
  formulaInput.value = PALTAS[0];
  generate("both");
});