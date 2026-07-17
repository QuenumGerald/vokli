# Vokli

Vokli is an open-source TypeScript SDK for defining receptionist agents,
generating deterministic Vapi assistant configuration, deploying it, and
synchronizing static documents. It is **not yet a complete production voice
platform**: calls, webhooks, business Tools, transfers, and remote-state
discovery are not implemented.

## Local use and deployment

```ts
import { createVokli, receptionist, vapiKnowledge } from "@vokli/sdk";

const vokli = createVokli({
  provider: { type: "vapi", apiKey: process.env.VAPI_API_KEY! },
  vapi: {
    model: { provider: "openai", model: "gpt-4o" },
    voice: { provider: "vapi", voiceId: "Elliot" },
  },
});
const agent = receptionist({
  id: "garage-martin",
  business: {
    name: "Garage Martin",
    language: "fr-FR",
    timezone: "Europe/Paris",
  },
  greeting: "Bonjour, comment puis-je vous aider ?",
  collect: {},
  knowledge: vapiKnowledge({ sources: ["./knowledge/services.md"] }),
});
const result = await vokli.deploy(agent);
await vokli.knowledge.sync(agent); // automatically uses result.assistantId
```

`createVokli()` remains valid for `version` and `validate()`. `generate()` needs
explicit model and voice configuration; a real deployment/sync needs
`provider.apiKey` unless a client is injected. Vokli supplies no fictional
defaults.

`deploy(agent, { dryRun: true })` validates and returns the generated
configuration, canonical SHA-256 hash, and locally knowable plan. It performs no
HTTP request or state write and needs no API key. Without prior state it reports
a create plan, not a claim about remote differences.

## Idempotency and state

`.vokli/state.json` format v2 atomically stores assistant, Query Tool and file
IDs, deployment/document hashes, timestamps and pending recovery operations. It
never stores API keys, prompts, or document content. Valid v1 knowledge state is
migrated in memory and preserved on the next write; the historical
`knowledgeBaseId` is retained only as migration metadata.

Remote identity comes exclusively from local state or the compatibility
`assistantId` in `vapiKnowledge()`. Vokli deliberately does not search
assistants by name. If state is lost, it cannot safely rediscover an assistant
from the Vokli ID; restore the state or explicitly reconcile resources.

## Knowledge Query Tool

Synchronization uploads changed files, creates/updates a Vapi `query` Tool whose
`knowledgeBases` contain Google provider metadata and `fileIds`, then appends
its ID to the assistant model's `toolIds` while preserving existing IDs and
sending the complete fetched model. IDs are persisted after each successful
creation/upload so retries do not duplicate completed work.

The injected `knowledge.client` and explicit `vapiKnowledge({ assistantId })`
remain supported. The legacy `VapiKnowledgeApi` Knowledge Base methods are
deprecated compatibility shims; implement Query Tool methods for new clients.
See [the guide](docs/knowledge-base.md).

## Development

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```
