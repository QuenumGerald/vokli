/**
 * Vapi Evals — helpdesk-telecom-b2b
 *
 * Simule des conversations avec l'agent et valide les comportements via l'API
 * Vapi Evals (mock conversation + juge IA).
 *
 * Workflow :
 *   1. POST /eval        → crée l'évaluation
 *   2. POST /eval/run    → lance l'évaluation contre l'assistant
 *   3. GET  /eval/run/:id → poll jusqu'à la fin
 *
 * Usage : npm run eval -w examples/secretariat
 */

import "dotenv/config";

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = "f4b77329-0008-4ca6-ae4b-e125dfdd6d0f";
const BASE_URL = "https://api.vapi.ai";

if (!VAPI_API_KEY) {
  console.error("❌  VAPI_API_KEY manquante dans .env");
  process.exit(1);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type JudgePlan = {
  type: "ai";
  model: {
    provider: string;
    model: string;
    messages: Array<{ role: "system"; content: string }>;
  };
};

interface MockMessage {
  role: "user" | "assistant";
  content?: string | undefined;
  judgePlan?: JudgePlan | undefined;
}

interface Scenario {
  name: string;
  description: string;
  messages: MockMessage[];
}

interface EvalResult {
  scenario: string;
  status: "pass" | "fail" | "error" | "pending";
  details: string;
}

// ─── Helpers de critère ───────────────────────────────────────────────────────

function aiJudge(prompt: string): JudgePlan {
  return {
    type: "ai",
    model: {
      provider: "openai",
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            `Tu es un évaluateur strict d'un agent de support téléphonique francophone.\n` +
            `Voici le critère à évaluer :\n\n${prompt}\n\n` +
            `Consulte le message le plus récent de l'assistant dans la conversation ({{messages[-1]}}).\n` +
            `Réponds UNIQUEMENT par "pass" ou "fail" (en minuscules, sans ponctuation).`,
        },
      ],
    },
  };
}

// ─── Scénarios ────────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    name: "Auto-résolution — Redémarrage suffit",
    description:
      "Tonalité absente. Après redémarrage, ça marche. L'agent ne doit pas ouvrir de ticket.",
    messages: [
      {
        role: "assistant",
        content:
          "Bonjour, bienvenue au support technique. Comment puis-je vous aider aujourd'hui ?",
      },
      {
        role: "user",
        content: "Bonjour, mon téléphone n'a plus de tonalité depuis ce matin.",
      },
      {
        role: "assistant",
        judgePlan: aiJudge(
          "L'agent propose-t-il comme première étape de redémarrer électriquement le téléphone, sans ouvrir directement un ticket ?"
        ),
      },
      {
        role: "user",
        content:
          "Oui, j'ai redémarré... et ça remarche, la tonalité est revenue !",
      },
      {
        role: "assistant",
        judgePlan: aiJudge(
          "Le problème est résolu. L'agent conclut-il l'appel poliment, sans ouvrir de ticket ni demander des informations supplémentaires inutiles ?"
        ),
      },
    ],
  },

  {
    name: "Escalade technicien — Une info à la fois",
    description:
      "Écran noir persistant. L'agent doit collecter nom, numéro, équipement un par un, sans répéter ce que le client a déjà donné.",
    messages: [
      {
        role: "assistant",
        content:
          "Bonjour, bienvenue au support technique. Comment puis-je vous aider aujourd'hui ?",
      },
      {
        role: "user",
        content:
          "Bonjour, je suis Marie Leblanc. Mon Yealink T46U a un écran complètement noir depuis hier.",
      },
      {
        role: "assistant",
        judgePlan: aiJudge(
          "Le client a déjà donné son nom (Marie Leblanc) et son équipement (Yealink T46U). " +
          "L'agent pose-t-il UNE SEULE question sans redemander ces informations déjà fournies ? " +
          "(La question attendue est : avez-vous tenté un redémarrage ?)"
        ),
      },
      {
        role: "user",
        content: "Oui, j'ai déjà essayé de redémarrer plusieurs fois.",
      },
      {
        role: "assistant",
        judgePlan: aiJudge(
          "L'agent demande-t-il le numéro de rappel, et seulement cette information ?"
        ),
      },
      { role: "user", content: "Mon numéro c'est le 06 12 34 56 78." },
      {
        role: "assistant",
        judgePlan: aiJudge(
          "L'agent récapitule-t-il les informations collectées de façon synthétique UNE SEULE FOIS " +
          "(Marie Leblanc, 06 12 34 56 78, Yealink T46U, redémarrage tenté), puis demande-t-il s'il y a autre chose ?"
        ),
      },
    ],
  },

  {
    name: "Anti-répétition — Infos données dès le début",
    description:
      "Le client donne nom, numéro et équipement spontanément. L'agent ne doit pas les redemander.",
    messages: [
      {
        role: "assistant",
        content:
          "Bonjour, bienvenue au support technique. Comment puis-je vous aider aujourd'hui ?",
      },
      {
        role: "user",
        content:
          "Bonjour, je suis Pierre Durand, mon numéro c'est le 01 23 45 67 89, j'ai un Yealink T46U qui ne s'allume plus du tout.",
      },
      {
        role: "assistant",
        judgePlan: aiJudge(
          "Pierre Durand a fourni son nom, son numéro (01 23 45 67 89) et l'équipement (Yealink T46U) dès le premier message. " +
          "L'agent évite-t-il de redemander ces informations et se concentre-t-il uniquement sur ce qui manque (ex: redémarrage tenté ?) ?"
        ),
      },
      {
        role: "user",
        content: "Oui, j'ai débranché et rebranché plusieurs fois, rien ne change.",
      },
      {
        role: "assistant",
        judgePlan: aiJudge(
          "L'agent récapitule-t-il les informations (Pierre Durand, 01 23 45 67 89, Yealink T46U, redémarrage tenté) " +
          "et propose-t-il un ticket technicien, sans redemander d'informations déjà fournies ?"
        ),
      },
    ],
  },
];

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function vapiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text) as T;
}

async function vapiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text) as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runScenario(scenario: Scenario): Promise<EvalResult> {
  try {
    // POST /eval/run — transient eval (messages inline, no pre-creation needed)
    const evalRun = await vapiPost<{ evalRunId: string }>("/eval/run", {
      type: "eval",
      eval: {
        type: "chat.mockConversation",
        name: scenario.name,
        messages: scenario.messages,
      },
      target: { type: "assistant", assistantId: ASSISTANT_ID },
    });

    const runId = evalRun.evalRunId;

    // Poll until done (max 5 min)
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      const run = await vapiGet<{
        status: string;
        results?: Array<{ result: string; reason?: string }>;
        error?: string;
      }>(`/eval/run/${runId}`);

      if (run.error) {
        return { scenario: scenario.name, status: "error", details: run.error };
      }
      if (run.status === "failed") {
        return {
          scenario: scenario.name,
          status: "error",
          details: "L'évaluation a échoué côté Vapi.",
        };
      }
      if (run.status === "completed" || run.status === "success") {
        const results = run.results ?? [];
        const failures = results.filter(
          (r) => r.result?.toLowerCase() === "fail"
        );
        if (failures.length > 0) {
          return {
            scenario: scenario.name,
            status: "fail",
            details:
              `${failures.length}/${results.length} critère(s) échoué(s):\n` +
              failures
                .map((f, i) => `  [Critère ${i + 1}] ${f.reason ?? "FAIL"}`)
                .join("\n"),
          };
        }
        return {
          scenario: scenario.name,
          status: "pass",
          details: `${results.length}/${results.length} critère(s) validé(s)`,
        };
      }
    }

    return {
      scenario: scenario.name,
      status: "pending",
      details: "Timeout — l'évaluation n'a pas terminé dans 90 secondes.",
    };
  } catch (err) {
    return {
      scenario: scenario.name,
      status: "error",
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(
    `\n🧪  Vapi Evals — helpdesk-telecom-b2b (${SCENARIOS.length} scénarios)\n`
  );
  console.log(`   Assistant ID : ${ASSISTANT_ID}`);
  console.log(`   Base URL     : ${BASE_URL}\n`);
  console.log("─".repeat(60));

  const results: EvalResult[] = [];

  for (const scenario of SCENARIOS) {
    process.stdout.write(
      `\n▶  ${scenario.name}\n   ${scenario.description}\n   En cours...`
    );
    const result = await runScenario(scenario);
    results.push(result);

    const icon =
      result.status === "pass" ? "✅" : result.status === "fail" ? "❌" : "⚠️ ";
    process.stdout.write(`\r   ${icon} ${result.status.toUpperCase()}     \n`);
    if (result.status !== "pass") {
      console.log(
        result.details
          .split("\n")
          .map((l) => `      ${l}`)
          .join("\n")
      );
    } else {
      console.log(`      ${result.details}`);
    }
  }

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const errors = results.filter(
    (r) => r.status !== "pass" && r.status !== "fail"
  ).length;

  console.log("\n" + "─".repeat(60));
  console.log(`\n📊  Résultats : ${passed} ✅  ${failed} ❌  ${errors} ⚠️`);

  if (passed === results.length) {
    console.log("🎉  Tous les scénarios sont validés !\n");
    process.exit(0);
  } else {
    console.log("⚠️   Certains scénarios ont échoué — revoyez les règles de l'agent.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erreur inattendue :", err);
  process.exit(1);
});
