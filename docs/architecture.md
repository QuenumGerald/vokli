# Architecture

## Functional path

Phase 2 implements one direction only:

```text
receptionist input → explicit definition → validation → deterministic prompt
                   → provider-neutral JSON Schema → local Vapi drafts
```

Every step is synchronous and has no network or filesystem side effect.

Knowledge synchronization is the deliberate exception: `vokli.knowledge` reads
configured documents, writes `.vokli/state.json`, and calls an injected
`VapiKnowledgeApi`. Prompt and assistant generation remain pure.

## Package roles

- `@vokli/core` owns provider-independent business vocabulary, the receptionist
  template, validation, prompt rendering, and structured-output JSON Schema.
- `@vokli/vapi` converts a validated receptionist into local assistant and
  structured-output drafts. It does not authenticate, deploy, or create IDs.
- `@vokli/knowledge` owns document validation, hashing, incremental state, and
  the Vapi knowledge API boundary. It does not implement embeddings or
  retrieval.
- `@vokli/testing` still contains scenario types, not an execution engine.
- `@vokli/sdk` composes validation and generation behind `createVokli` and
  exposes only the user-facing types.

`testing` remains intentionally thin rather than inventing a conversation
engine.

## Knowledge synchronization

`core` stores only the serializable provider description on the agent. The
`knowledge` package performs filesystem work and calls the injected Vapi
boundary; this keeps provider I/O out of prompt generation. State is keyed by
agent ID and contains hashes and remote IDs, never document content. Writes use
a temporary file and atomic rename.

The Vapi client is injected because this repository has no
deployment/authentication layer or official server-SDK adapter yet. This also
makes network behavior directly testable without mocking global modules.

## Local Vapi drafts

Structured outputs are returned separately from the assistant because creating
and attaching remote resources would require server-generated IDs. Model and
voice are mandatory user configuration; Vokli provides no supposedly optimal
defaults.

The execution environment used for Phase 2 blocked access to official Vapi
sources. Consequently these interfaces are explicitly Vokli-owned local drafts
and are not claimed to be exact current Vapi SDK DTOs. They must be verified
before adding any network integration.

## Dependency rules

Allowed dependencies point inward: `vapi` and `knowledge` depend on `core`, and
`sdk` depends on those packages. `core` must never depend on a provider or
`sdk`; provider packages must not depend on each other. Circular package
dependencies are forbidden.

## Adding a feature

Start in the package that owns the behavior. Add the smallest public contract
only for a present consumer, implement it directly, and test observable
outcomes. Re-export from `sdk` only when it belongs in the main developer path.

An abstraction needs a present use case and a demonstrated point of variation.
Prefer a plain function while there is one implementation. Roadmap items alone
do not justify adapters, factories, managers, or shared helpers.
