# Architecture

`@vokli/core` owns definitions, validation, prompts and schemas. `@vokli/vapi`
owns deterministic Vapi drafts plus the narrow official server-SDK adapter.
`@vokli/knowledge` owns files, Query Tool synchronization and unified state.
`volkli-sdk` is the published top-level package that composes these into
`createVokli`, `generate`, `deploy`, and `knowledge`.

The SDK-specific DTOs stop at `@vokli/vapi`; its small `VapiApi` boundary is
injected in offline tests and shared by deployment and knowledge
synchronization. There are no controller/service/factory layers.

Deployment hashes a key-sorted canonical representation, trusts only the
assistant ID in state, checkpoints a newly created ID immediately, and avoids
HTTP when the hash matches. Knowledge checkpoints every upload and Query Tool
creation. Atomic temp-file rename protects each v2 state write. A lost state
cannot be recovered by a fragile name lookup.

Attaching knowledge first fetches the assistant and resends its complete model
with the Query Tool ID appended, preserving other `toolIds`. The official SDK
types used at the adapter boundary are `CreateAssistantDto`,
`UpdateAssistantDto`, `Assistant`, `CreateQueryToolDto`, `UpdateQueryToolDto`,
`QueryTool`, `KnowledgeBase`, `CreateFileDto`, and `File_`.
