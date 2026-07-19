# Garage agent example

This example defines and validates an agent, validates one local knowledge
document, then generates its prompt, structured output, and local Vapi draft.
Placeholder model and voice values make configuration points visible. No API
key, network request, remote resource, or knowledge synchronization is involved.

The repository mascot is `kli`, and the main README now includes it as a banner.

From the repository root:

```bash
npm install
npm run build
npm start -w examples/basic
```

To perform a real knowledge synchronization, configure a `VapiKnowledgeApi`
client as described in the [Knowledge Base guide](../../docs/knowledge-base.md).
