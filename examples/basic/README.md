# Garage receptionist example

This example defines and validates a receptionist, validates one local knowledge
document, then generates its prompt, structured output, and local Vapi draft.
Placeholder model and voice values make configuration points visible. No API
key, network request, remote resource, or knowledge synchronization is involved.

From the repository root:

```bash
pnpm install
pnpm build
pnpm --filter @vokli/example-basic start
```

To perform a real knowledge synchronization, configure a `VapiKnowledgeApi`
client as described in the [Knowledge Base guide](../../docs/knowledge-base.md).
