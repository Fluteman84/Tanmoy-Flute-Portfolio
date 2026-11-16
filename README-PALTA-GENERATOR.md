# Hindustani Classical Palta Generator

## Open the tool

Choose **Tools → Palta Generator** on the portfolio. For local development, run `npm ci` and `npm run dev` from the repository root, then open `/notes.html`.

The tool runs in the browser without a backend or database.

## Using the generator

1. Select one of the eight supplied Paltas, or replace the formula with a custom one.
2. Use digits `1` through `8`, spaces to separate groups, and `-` for pauses.
3. Aroha and Avaroha update as you edit a valid formula.
4. Copy a whole direction, a single row, or download a TXT file.

## Files

- `notes.html`: Vite page entry.
- `css/notes.css`: generator-specific cinematic notebook styling.
- `js/palta-generator.js`: independent parser, Sargam generator, clipboard helper, and TXT export helper.
- `src/tools/palta.jsx`: React interface and export controls.
- `js/palta-tests.js`: automated rule-based validations.

## Mapping rules

For every digit, the generator uses its position relative to the row's starting swara. Ascending uses `S R G M P D N S'`; descending uses `S' N D P M G R S`. Groups and hyphens are preserved. A row stops when it reaches or would exceed the active octave boundary.

## Important source-brief inconsistency

Several supplied descending examples conflict with the brief's relative-position rule. For example, `1213` from upper Sa must calculate to `S'NS'D` using the stated descending scale, whereas the Palta 2 sample says `S'ND`. Similar conflicts occur in Paltas 5, 6, 7, and 8.

This project keeps the engine deterministic and rule-based, without formula-specific hardcoded output exceptions. The test suite validates that rule-based behavior. If you want the alternate sample notation instead, please provide the intended descending mapping rule and it can be applied consistently.
