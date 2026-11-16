import { useEffect, useState } from "react";
import "../../js/palta-generator.js";
import { renderTool } from "./tool-shell";

const { PALTAS, generateBoth, formatOutput, copyPalta, exportPalta } = window.PaltaGenerator;

function NotationPanel({ title, direction, rows, onCopy, copyText, onCopyRow }) {
  const heading = `${direction}-title`;
  return (
    <section className="notation-panel" aria-labelledby={heading}>
      <div className="notation-heading">
        <div><p className="panel-kicker">{direction}</p><h2 id={heading}>{title}</h2></div>
        <button className="panel-copy" type="button" onClick={() => onCopy(copyText)} disabled={!rows}>Copy {title}</button>
      </div>
      <div className="notation-output" aria-live="polite">
        {rows?.length ? rows.map((row, index) => (
          <article className="notation-row" key={index}>
            <span className="row-number">{String(index + 1).padStart(2, "0")}</span>
            <p className="row-notes">{row}</p>
            <button className="copy-row" type="button" aria-label={`Copy ${title} row ${index + 1}`}
              onClick={() => onCopyRow(row)}>Copy</button>
          </article>
        )) : (
          <p className="empty-output">{rows ? "No valid notes can be formed within this octave." : `Enter a formula to generate ${direction} notes.`}</p>
        )}
      </div>
    </section>
  );
}

function Palta() {
  const [formula, setFormula] = useState(PALTAS[0]);
  const [preset, setPreset] = useState("0");
  const [reset, setReset] = useState(false);
  const [status, setStatus] = useState(null);
  let result;
  let error;
  if (!reset) {
    try {
      result = generateBoth(formula);
    } catch (exception) {
      error = exception.message;
    }
  }

  const announce = (text) => setStatus({ text });
  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(() => setStatus(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [status]);

  function updateFormula(value, selected = "") {
    setFormula(value);
    setPreset(selected);
    setReset(false);
  }

  function textFor(direction) {
    if (!result) return "";
    const title = preset === "" ? "CUSTOM PALTA" : `PALTA ${Number(preset) + 1}`;
    const header = `${title}\nFormula: ${result.formula}`;
    const ascending = `ASCENDING:\n${formatOutput(result.ascending)}`;
    const descending = `DESCENDING:\n${formatOutput(result.descending)}`;
    if (direction === "ascending") return `${header}\n\n${ascending}`;
    if (direction === "descending") return `${header}\n\n${descending}`;
    return `${header}\n\n${ascending}\n\n${descending}`;
  }

  async function copy(text, message = "Notation copied to clipboard.") {
    try {
      await copyPalta(text);
      announce(message);
    } catch {
      announce("Copy was unavailable. Select the notation to copy it manually.");
    }
  }

  return (
    <>
      <main className="notes-main">
        <section className="notes-hero">
          <div className="container">
            <h1>Hindustani Classical <span>Palta Generator</span></h1>
            <p className="notes-subtitle">Generate ascending and descending Sargam patterns.</p>
          </div>
        </section>
        <section className="container palta-workspace" aria-labelledby="paltaControlsTitle">
          <div className="formula-area">
            <div className="control-heading"><h2 id="paltaControlsTitle">Enter the Palta formula</h2></div>
            <div className="formula-controls">
              <label className="sr-only" htmlFor="paltaSelect">Choose predefined Palta</label>
              <select id="paltaSelect" className="palta-select" value={preset}
                onChange={(event) => updateFormula(PALTAS[Number(event.target.value)], event.target.value)}>
                <option value="" disabled>Custom Palta</option>
                {PALTAS.map((_, index) => <option value={index} key={index}>Palta {index + 1}</option>)}
              </select>
              <label className="sr-only" htmlFor="paltaFormula">Palta formula</label>
              <input id="paltaFormula" className="formula-input" type="text" autoComplete="off" spellCheck={false}
                value={formula} aria-describedby="formulaHelp formulaError" aria-invalid={Boolean(error)}
                onChange={(event) => updateFormula(event.target.value)} />
            </div>
            <p className="formula-help" id="formulaHelp">Use digits 1–8, spaces between groups, and hyphens for pauses. Example <code>123 123 12 1234 4321</code></p>
            <p className="formula-error" id="formulaError" role="alert">{error}</p>
          </div>
          <div className="output-grid">
            <NotationPanel title="Aroha" direction="ascending" rows={result?.ascending}
              onCopy={copy} copyText={textFor("ascending")} onCopyRow={(row) => copy(row, "Row copied to clipboard.")} />
            <NotationPanel title="Avaroha" direction="descending" rows={result?.descending}
              onCopy={copy} copyText={textFor("descending")} onCopyRow={(row) => copy(row, "Row copied to clipboard.")} />
          </div>
          <div className="utility-row">
            <button className="utility-button" type="button" disabled={!result} onClick={() => copy(textFor("both"))}>Copy Both</button>
            <button className="utility-button" type="button" disabled={!result} onClick={() => {
              exportPalta(textFor("both"), "hindustani-classical-palta.txt");
              announce("TXT download started.");
            }}>Download TXT</button>
            <button className="utility-button utility-reset" type="button" onClick={() => {
              updateFormula(PALTAS[0], "0");
              setReset(true);
              announce("Generator reset.");
            }}>Reset</button>
          </div>
        </section>
      </main>
      <div className={`palta-toast${status ? " is-visible" : ""}`} role="status">{status?.text}</div>
    </>
  );
}

renderTool(<Palta />);
