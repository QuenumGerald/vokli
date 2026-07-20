# Vokli SDK

![Vokli logo](docs/vokli-logo.png)

> **Vokli** – a TypeScript SDK to build, configure and deploy voice‑bot assistants on Vapi.

## Badges

[![npm version](https://img.shields.io/npm/v/@vokli/sdk.svg)](https://www.npmjs.com/package/@vokli/sdk)
[![License](https://img.shields.io/github/license/QuenumGerald/vokli.svg)](https://github.com/QuenumGerald/vokli/blob/main/LICENSE)

## Install

```bash
npm install @vokli/sdk @vokli/core @vokli/vapi @vokli/knowledge
```

## Quick start

```ts
import { createVokli } from "@vokli/sdk";
import { receptionist } from "@vokli/core";
import { elevenMultilingualV2 } from "@vokli/vapi";
import { sonioxSttRtV5 } from "@vokli/vapi";

await createVokli({
  assistant: receptionist({
    model: "gpt-5-mini",
    voice: elevenMultilingualV2,
    transcriber: sonioxSttRtV5,
    collect: {
      nom: { type: "string", required: true },
      numero: { type: "string", required: true },
      equipment: { type: "string", required: true },
    },
    rules: [
      { type: "no-repetition", strict: true },
      { type: "no-spamming" },
    ],
  }),
});
```

## Documentation & Examples

- **README** (this file) – usage guide
- **Docs site** – https://github.com/QuenumGerald/vokli/tree/main/docs
- **Example project** – `examples/secretariat` demonstrates a fully‑functional Yealink help‑desk bot.

## License

MIT © Gerald Quenum
