# Apps Script

This folder contains the Google Apps Script implementation for Focuna - Gmail Assistant.

## Intended modules

- `src/config.gs` static configuration and label names
- `src/classify.gs` rule-based classification
- `src/actions.gs` Gmail actions like labeling and archiving
- `src/digest.gs` digest generation
- `src/ai.gs` optional selective AI helpers
- `src/main.gs` scheduled entrypoints

## Notes

- rules-first design
- AI is optional and narrow
- no auto-send
- preserve user workflow labels
