import "dotenv/config";
import { createVokli, receptionist, vapiKnowledge } from "@vokli/sdk";

const agent = receptionist({
  id: "secretariat-medical-dupont",
  business: {
    name: "Cabinet Médical Dupont & Martin",
    description: "Cabinet médical de médecine générale et pédiatrie.",
    language: "fr-FR",
    timezone: "Europe/Paris",
    openingHours: {
      monday: ["08:30-12:00", "14:00-18:30"],
      tuesday: ["08:30-12:00", "14:00-18:30"],
      wednesday: ["08:30-12:00", "14:00-18:30"],
      thursday: ["08:30-12:00", "14:00-18:30"],
      friday: ["08:30-12:00", "14:00-17:30"],
    },
  },
  greeting: "Bonjour, secrétariat médical des Docteurs Dupont et Martin. Comment puis-je vous aider ?",
  collect: {
    patientName: {
      label: "Nom du patient",
      description: "Nom et prénom du patient pour lequel le rendez-vous est demandé.",
      type: "string",
      required: true,
    },
    phoneNumber: {
      label: "Numéro de téléphone",
      description: "Numéro de téléphone pour recontacter le patient.",
      type: "string",
      required: true,
    },
    reason: {
      label: "Motif de consultation",
      description: "Description courte du motif (fièvre, certificat, renouvellement, etc.).",
      type: "string",
      required: true,
    },
    isExistingPatient: {
      label: "Déjà patient du cabinet",
      description: "Indique si le patient a déjà consulté dans ce cabinet (oui/non).",
      type: "string",
      required: true,
    },
    preferredPractitioner: {
      label: "Médecin souhaité",
      description: "Choix du médecin souhaité (Dr. Dupont, Dr. Martin ou indifférent).",
      type: "string",
      required: false,
    },
  },
  knowledge: vapiKnowledge({ sources: ["./knowledge/cabinet.md"] }),
  rules: [
    "En cas d'urgence vitale, interrompre le patient et lui dire d'appeler le 15 immédiatement.",
    "Expliquer qu'aucun rendez-vous n'est confirmé directement : une secrétaire humaine rappellera sous 24h pour fixer le rendez-vous.",
    "Ne jamais inventer d'information tarifaire ou médicale qui n'est pas dans la base de connaissances.",
    "Pour valider/confirmer les informations collectées, faites-le une seule et unique fois. Par exemple : 'J'ai bien noté vos informations...'. Ne répétez plus jamais ces informations par la suite.",
    "Après avoir confirmé les informations, demandez immédiatement s'il y a une autre question. Si le patient dit non ou valide, dites simplement au revoir de manière polie et concise, puis cessez de parler en attendant qu'il raccroche.",
    "Collectez les informations requises de manière progressive : posez TOUJOURS une seule question à la fois.",
    "Ne demandez jamais plusieurs informations en même temps (ex: ne demandez pas le nom ET le numéro dans la même phrase). Attendez la réponse du patient à chaque question avant de passer à l'information suivante.",
  ],
});

const vokli = createVokli({
  ...(process.env.VAPI_API_KEY ? {
    provider: {
      type: "vapi",
      apiKey: process.env.VAPI_API_KEY,
    }
  } : {}),
  vapi: {
    model: { provider: "openai", model: "gpt-4o" },
    voice: { provider: "azure", voiceId: "fr-FR-DeniseNeural" },
  },
});

console.log("=== 1. Validation de l'agent ===");
const validation = vokli.validate(agent);
if (!validation.success) {
  console.error("Erreur de validation :", validation.errors);
  process.exit(1);
}
console.log("L'agent est valide !\n");

console.log("=== 2. Validation des fichiers de connaissances ===");
const knowledgeValidation = await vokli.knowledge.validate(validation.data);
if (!knowledgeValidation.success) {
  console.error("Erreur de connaissances :", knowledgeValidation.errors);
  process.exit(1);
}
console.log("Les fichiers de connaissances sont valides !\n");

console.log("=== 3. Génération du prompt système ===");
const generated = vokli.generate(validation.data);
console.log(generated.prompt);

console.log("=== 4. Configuration Vapi générée ===");
console.dir(generated.providerConfig, { depth: null });

if (process.env.VAPI_API_KEY) {
  console.log("\n=== 5. Déploiement et Synchronisation de l'agent ===");
  const deployment = await vokli.deploy(validation.data);
  console.log("Déploiement réussi ! Assistant ID :", deployment.assistantId);

  console.log("Synchronisation de la base de connaissances...");
  await vokli.knowledge.sync(validation.data);
  console.log("Base de connaissances synchronisée avec succès !");
} else {
  console.log("\n[INFO] process.env.VAPI_API_KEY non défini. Remplissez le fichier .env pour déployer et synchroniser réellement avec Vapi.");
}

