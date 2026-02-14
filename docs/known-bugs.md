# Known Bugs

## Critical
- **Stripe Checkout**: Fails to process transactions with invalid payment methods.

## Major
- **Chat Persistence**: Messages do not persist after page refresh under certain conditions.
- **Agent Switching**: `TypeError: Failed to fetch` when switching agents.

## Minor
- **PDF Parsing**: Fails to handle certain PDF formats, resulting in a 500 Internal Server Error.

## Trivial
- **Language Switching**: Language selection does not update UI immediately.
- **Voice Input**: `TypeError: Failed to fetch` when attempting to use voice input feature.