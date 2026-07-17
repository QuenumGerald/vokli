# Knowledge Base guide

Vokli can validate local business documents, track their SHA-256 hashes, and
synchronize only new or changed files through a Vapi client supplied by the
application.

## Organize documents

Keep static, reviewed information in a dedicated directory:

```text
knowledge/
├── faq.md
├── services.md
├── procedures.txt
└── warranty.pdf
```

Vokli accepts `.md`, `.txt`, `.pdf`, `.doc`, and `.docx` during local preflight.
The configured Vapi client and the current Vapi API may impose additional
limits. Do not use this directory for secrets or frequently changing operational
data.

Suitable content includes FAQs, services, warranties, procedures, and general
business information. Appointments, availability, current prices, stock, and CRM
records are dynamic data and must eventually be obtained through Tools, not RAG.

## Configure an agent

```ts
import { receptionist, vapiKnowledge } from "@vokli/sdk";

const agent = receptionist({
  id: "garage-martin",
  business: {
    name: "Garage Martin",
    language: "fr-FR",
    timezone: "Europe/Paris",
  },
  greeting: "Bonjour, comment puis-je vous aider ?",
  knowledge: vapiKnowledge({
    sources: [
      "./knowledge/services.md",
      "./knowledge/faq.md",
      "./knowledge/warranty.pdf",
    ],
    assistantId: "the-existing-vapi-assistant-id",
  }),
});
```

`assistantId` is optional. When present, synchronization attaches a newly
created Knowledge Base to that existing assistant. Vokli never fabricates this
remote ID.

## Supply the Vapi boundary

The repository does not yet contain authentication or an official Vapi
server-SDK adapter. Supply an implementation of `VapiKnowledgeApi` when creating
Vokli:

```ts
const vokli = createVokli({
  vapi: {
    model: { provider: "your-model-provider", model: "your-model" },
    voice: { provider: "your-voice-provider", voiceId: "your-voice" },
  },
  knowledge: {
    client: myVapiKnowledgeApi,
    cwd: process.cwd(),
  },
});

const validation = await vokli.knowledge.validate(agent);
if (!validation.success) {
  console.error(validation.errors);
} else {
  console.log(await vokli.knowledge.status(agent));
  console.log(await vokli.knowledge.sync(agent));
}
```

The client contract exposes four explicit operations: upload a file, create a
Knowledge Base, update its file list, and attach it to an assistant. Wrap the
current official Vapi SDK in that boundary rather than spreading SDK-specific
calls throughout application code.

## Incremental synchronization

For each source Vokli:

1. verifies the extension and that the path is an accessible file;
2. computes a SHA-256 hash;
3. compares it with `.vokli/state.json`;
4. uploads only new or modified documents;
5. creates or updates the Knowledge Base when its contents changed;
6. attaches it when a new `assistantId` needs association;
7. atomically records hashes, Vapi file IDs, the Knowledge Base ID, and sync
   time.

The state file never stores document content and `.vokli/` is ignored by Git.
Back it up only if retaining remote resource IDs matters to your workflow.

A modified file creates a new remote file through the injected client. Vokli
does not delete the superseded remote file in this phase because deletion
semantics have not been introduced into the provider contract.
