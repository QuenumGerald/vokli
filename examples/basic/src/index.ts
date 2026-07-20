import { createVokli, agent, vapiKnowledge } from "vokli-sdk";

const definition = agent({
  id: "garage-martin",
  business: {
    name: "Garage Martin",
    description:
      "Garage automobile spécialisé dans l’entretien et la réparation.",
    language: "fr-FR",
    timezone: "Europe/Paris",
    openingHours: {
      monday: ["08:00-12:00", "14:00-18:00"],
      tuesday: ["08:00-12:00", "14:00-18:00"],
      wednesday: ["08:00-12:00", "14:00-18:00"],
      thursday: ["08:00-12:00", "14:00-18:00"],
      friday: ["08:00-12:00", "14:00-17:00"],
    },
  },
  greeting:
    "Bonjour, vous êtes bien au Garage Martin. Comment puis-je vous aider ?",
  collect: {
    customerName: {
      label: "Nom du client",
      description: "Nom et prénom du client",
      type: "string",
      required: true,
    },
    phoneNumber: {
      label: "Numéro de téléphone",
      description: "Numéro auquel le client peut être rappelé",
      type: "string",
      required: true,
    },
    vehicle: {
      label: "Véhicule",
      description: "Marque, modèle et immatriculation si disponibles",
      type: "string",
      required: false,
    },
    request: {
      label: "Motif de l’appel",
      description: "Résumé précis de la demande",
      type: "string",
      required: true,
    },
  },
  knowledge: vapiKnowledge({ sources: ["./knowledge/services.md"] }),
  rules: [
    "Ne jamais inventer un prix.",
    "Ne jamais confirmer un rendez-vous.",
    "Proposer un rappel lorsque l’information est indisponible.",
  ],
});

const vokli = createVokli({
  vapi: {
    model: { provider: "your-model-provider", model: "your-model" },
    voice: { provider: "your-voice-provider", voiceId: "your-voice" },
  },
});

const validation = vokli.validate(definition);
if (!validation.success) {
  console.error(validation.errors);
  process.exitCode = 1;
} else {
  const knowledgeValidation = await vokli.knowledge.validate(validation.data);
  console.log(knowledgeValidation);

  const generated = vokli.generate(validation.data);
  console.log(generated.prompt);
  console.dir(generated.providerConfig, { depth: null });
}
