# Vokli

Vokli is an open-source TypeScript SDK for removing repetitive setup around Vapi
voice agents.

> Build production-ready Vapi agents in minutes.

## Current status: Phase 2

Vokli can now define and validate a reusable receptionist, generate a
deterministic system prompt, create a JSON Schema structured-output draft, and
transform these values into a local Vapi resource draft. Generation is
synchronous, deterministic, and performs no network request.

Vokli does **not** deploy to Vapi, place calls, execute tools, transfer calls,
serve webhooks, provide RAG, or synchronize documents. The generated Vapi shape
is an unverified local draft, not a claim of production compatibility.

## Example

```ts
import { createVokli, receptionist } from "@vokli/sdk";

const agent = receptionist({
  id: "example-company",
  business: {
    name: "Example Company",
    language: "en-US",
    timezone: "America/New_York",
    openingHours: { monday: ["09:00-17:00"] },
  },
  greeting: "Hello, how may I help you?",
  collect: {
    callerName: {
      label: "Caller name",
      description: "The caller's full name",
      type: "string",
      required: true,
    },
  },
});

const vokli = createVokli({
  vapi: {
    model: { provider: "your-model-provider", model: "your-model" },
    voice: { provider: "your-voice-provider", voiceId: "your-voice" },
  },
});

const validation = vokli.validate(agent);
if (validation.success) {
  const generated = vokli.generate(validation.data);
  console.log(generated.prompt);
  console.log(generated.providerConfig);
}
```

Model and voice values are supplied by the developer: Vokli does not select
pretend defaults. See the complete [garage example](examples/basic/README.md).

## Repository structure

- `packages/core`: provider-independent definitions, validation, prompts, and
  JSON Schema generation.
- `packages/vapi`: pure conversion to local assistant and structured-output
  drafts.
- `packages/knowledge`: future knowledge boundary; no RAG implementation.
- `packages/testing`: scenario types only; no conversation runner.
- `packages/sdk`: the selected public API.
- `examples/basic`: compilable garage receptionist.
- `docs`: architecture decisions.

## Development

Node.js 22+ and pnpm are required.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format
```

## Next minimal step

Verify the local draft types against the current official Vapi server SDK and
API documentation, then add a tested serializer if their shapes differ. Remote
resource creation remains out of scope.

## Knowledge Base

Add static business knowledge with `vapiKnowledge()` and inspect or synchronize
it through `vokli.knowledge`:

```ts
const agent = receptionist({
  // business, greeting, and other receptionist fields
  knowledge: vapiKnowledge({
    sources: ["./knowledge/services.md", "./knowledge/faq.md"],
    assistantId: "an-existing-vapi-assistant-id",
  }),
});

const validation = await vokli.knowledge.validate(agent);
const status = await vokli.knowledge.status(agent);
const result = await vokli.knowledge.sync(agent);
```

Synchronization hashes documents, uploads only new or modified files through the
configured `VapiKnowledgeApi`, and stores metadata—not document content—in
`.vokli/state.json`. An injected client is currently required because Vokli does
not yet own Vapi authentication or deployment. See the
[Knowledge Base guide](docs/knowledge-base.md) for supported formats, setup,
state, and the distinction between static knowledge and real-time Tool data.
