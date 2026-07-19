# Vokli

![Kli mascot](./kli.png)

Vokli is an open-source TypeScript SDK for defining business agents,
generating deterministic Vapi assistant configuration, deploying it, and
synchronizing static documents. It is **not yet a complete production voice
platform**: calls, webhooks, business Tools, transfers, and remote-state
discovery are not implemented.

## Quick Demo

To run and deploy the included example agent to Vapi, ensure you have your `VAPI_API_KEY` defined in `examples/secretariat/.env` (see `examples/secretariat/.env.example`), then run from the root:

```bash
# Install all dependencies across workspaces
npm i volkli-sdk

# Compile the packages and example
npm run build

# Deploy and sync the agent
npm start -w examples/secretariat
```

---

## Local use and deployment (SDK)

```ts
import { createVokli, agent, vapiKnowledge } from "volkli-sdk";

// Initialize Vokli (uses Google Gemini and Azure BrigitteNeural defaults automatically)
const vokli = createVokli({
  provider: { type: "vapi", apiKey: process.env.VAPI_API_KEY! },
});

const definition = agent({
  id: "garage-martin",
  business: {
    name: "Garage Martin",
    language: "fr-FR",
    timezone: "Europe/Paris",
  },
  greeting: "Bonjour, comment puis-je vous aider ?",
  collect: {},
  knowledge: vapiKnowledge({ sources: ["./knowledge/services.md"] }),

  // Custom model, voice, and transcriber overrides
  model: { provider: "openai", model: "gpt-5-mini" },
  voice: { provider: "azure", voiceId: "fr-FR-JacquelineNeural" },
  transcriber: { provider: "soniox", model: "stt-rt-v5", language: "fr" },
});

const result = await vokli.deploy(definition);
await vokli.knowledge.sync(definition); // automatically uses result.assistantId
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

## Command Line Interface (CLI)

Vokli provides a command-line interface to validate, deploy, and synchronize agent configurations without writing deployment scripts.

Ensure your configuration file exports your agent(s) (either as a `default` export or a named export):

```ts
// vokli.config.ts
import { agent } from "volkli-sdk";

export const definition = agent({
  id: "helpdesk-telecom-b2b",
  // ... agent config
});
```

Deploy the agent directly:

```bash
npx vokli deploy vokli.config.ts
```

### Multiple Agents

If your configuration file exports multiple agents (either in an array or as separate named exports), the CLI handles this:
- **Interactive selection**: In interactive terminals, it prompts you to select the agent to deploy, deploy all, or cancel.
- **Specific agent selection**: Use `--agent <id>` or `-a <id>` to deploy only one agent:
  ```bash
  npx vokli deploy vokli.config.ts --agent helpdesk-telecom-b2b
  ```
- **Deploy all**: Use the `--all` flag to deploy all agents sequentially:
  ```bash
  npx vokli deploy vokli.config.ts --all
  ```

## Development

The project is structured as an npm monorepo. Use the following commands to build, format, lint, and test:

```bash
npm i volkli-sdk
npm run build
npm test
npm run lint
npm run format
```
