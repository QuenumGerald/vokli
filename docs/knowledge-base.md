# Knowledge Base guide

Use `vapiKnowledge({ sources })` for reviewed static `.md`, `.txt`, `.pdf`,
`.doc`, or `.docx` documents. Dynamic appointments, stock, prices, and CRM
records belong in future business Tools.

`await vokli.knowledge.validate(agent)` checks files; `status()` compares
SHA-256 hashes; `sync()` uploads changes and manages the real Vapi Query Tool
structure. Vapi's `knowledgeBases` here are embedded Query Tool configuration
objects (`name`, `provider: "google"`, `description`, `fileIds`), not
independently created remote Knowledge Base resources. The Tool ID is associated
through `assistant.model.toolIds`.

Normally deploy first and sync uses its saved assistant ID automatically.
`vapiKnowledge({ sources, assistantId })` remains available for an existing
assistant. An injected `knowledge.client` remains available for tests/advanced
integration, including deprecated legacy method names.

State is `.vokli/state.json` format v2. It stores hashes, remote IDs, timestamps
and pending operations—not content, prompts, or credentials—and is written
atomically. Version 1 is validated and migrated. Corrupt state is rejected
rather than overwritten. Keep/backup this file: without it Vokli does not guess
remote identity by assistant name.

A changed document produces a new remote file; remote file deletion is not
implemented. Calls, webhooks, transfers, business Tools and real-time data are
also outside the current scope.
