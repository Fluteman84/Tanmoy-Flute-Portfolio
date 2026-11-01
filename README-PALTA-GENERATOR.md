# Hindustani Classical Palta Generator

## Open the tool

Open `notes.html` in any modern browser, or choose **Tools** in the main Tanmoy Flute site menu.

The tool runs entirely in the browser. It does not need a backend, database, or build command.

## Using the generator

1. Select one of the eight supplied Paltas, or replace the formula with a custom one.
2. Use digits `1` through `8`, spaces to separate groups, and `-` for pauses.
3. Generate Aroha, Avaroha, or both.
4. Copy a whole direction, a single row, or download a TXT file.

## Files

- `notes.html`: page structure.
- `css/notes.css`: generator-specific cinematic notebook styling.
- `js/palta-generator.js`: independent parser, Sargam generator, clipboard helper, and TXT export helper.
- `js/notes.js`: UI rendering and button interactions.
- `js/palta-tests.js`: automated rule-based validations.

## Mapping rules

For every digit, the generator uses its position relative to the row's starting swara. Ascending uses `S R G M P D N S'`; descending uses `S' N D P M G R S`. Groups and hyphens are preserved. A row stops when it reaches or would exceed the active octave boundary.

## Important source-brief inconsistency

Several supplied descending examples conflict with the brief's relative-position rule. For example, `1213` from upper Sa must calculate to `S'NS'D` using the stated descending scale, whereas the Palta 2 sample says `S'ND`. Similar conflicts occur in Paltas 5, 6, 7, and 8.

This project keeps the engine deterministic and rule-based, without formula-specific hardcoded output exceptions. The test suite validates that rule-based behavior. If you want the alternate sample notation instead, please provide the intended descending mapping rule and it can be applied consistently.
