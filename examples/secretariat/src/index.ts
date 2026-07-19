import "dotenv/config";
import { createVokli, receptionist, vapiKnowledge } from "@vokli/sdk";

export const agent = receptionist({
  id: "helpdesk-telecom-b2b",
  business: {
    name: "Support Informatique et Téléphonie",
    description: "Service de support technique de premier niveau pour les téléphones IP Yealink et l'accès Internet d'entreprise.",
    language: "fr-FR",
    timezone: "Europe/Paris",
    openingHours: {
      monday: ["08:00-19:00"],
      tuesday: ["08:00-19:00"],
      wednesday: ["08:00-19:00"],
      thursday: ["08:00-19:00"],
      friday: ["08:00-19:00"],
    },
  },
  greeting: "Bonjour, bienvenue au support technique. Comment puis-je vous aider aujourd'hui ?",
  collect: {
    contactName: {
      label: "Nom du contact",
      description: "Nom et prénom de l'interlocuteur en ligne.",
      type: "string",
      required: true,
    },
    phoneNumber: {
      label: "Numéro de rappel",
      description: "Numéro de téléphone direct pour recontacter l'utilisateur ou le technicien sur place.",
      type: "string",
      required: true,
    },
    equipmentType: {
      label: "Équipement concerné",
      description: "Le type de matériel en panne (ex: Téléphone Yealink T46U, Routeur Internet, Wi-Fi).",
      type: "string",
      required: true,
    },
    issueDescription: {
      label: "Description de la panne",
      description: "Description du dysfonctionnement constaté par le client.",
      type: "string",
      required: true,
    },
    rebootAttempted: {
      label: "Redémarrage effectué",
      description: "Indique si l'utilisateur a tenté de redémarrer électriquement l'équipement en panne (oui/non).",
      type: "string",
      required: true,
    },
    needsTechnician: {
      label: "Intervention technicien requise",
      description: "Indique si la panne nécessite le déplacement d'un technicien sur site suite à l'échec de l'auto-dépannage (oui/non).",
      type: "string",
      required: true,
    },
  },
  knowledge: vapiKnowledge({
    sources: [
      "./knowledge/support.md",
      "./knowledge/guide-filaire-guide-yealink-t46u.pdf"
    ]
  }),
  model: {
    provider: "openai",
    model: "gpt-5-mini",
  },
  voice: {
    provider: "11labs",
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    model: "eleven_multilingual_v2",
  },
  transcriber: {
    provider: "soniox",
    model: "stt-rt-v5",
    language: "fr",
  },
  rules: [
    "Aider l'utilisateur en priorité en consultant la base de connaissances (ex: lui expliquer étape par étape comment effectuer un transfert d'appel Yealink, ou comment résoudre le message 'Pas de réseau').",
    "Si le problème est résolu directement grâce à vos explications (ex: l'utilisateur a réussi à faire son transfert d'appel ou son téléphone s'est reconnecté après reboot), terminez l'appel poliment sans demander d'autres informations et sans planifier de technicien. Indiquez 'non' for needsTechnician.",
    "Si le problème persiste (ex: câble réseau défectueux, pas de tonalité, écran noir, fibre coupée), proposez l'ouverture d'un ticket et le passage d'un technicien, et commencez à collecter les informations requises.",
    "Collectez les informations requises une seule question à la fois. Ne demandez jamais plusieurs informations en même temps (ex: ne demandez pas le nom ET le numéro dans la même phrase). Attendez la réponse à la question en cours avant de continuer.",
    "Ne reposez JAMAIS une question à laquelle l'utilisateur a déjà répondu dans la conversation (même sous une autre forme, ou si l'information a été donnée spontanément). Considérez-la comme acquise et passez à l'information suivante.",
    "Lors de la qualification pour le technicien, demandez systématiquement si un redémarrage électrique de l'appareil a été tenté, et notez-le dans rebootAttempted.",
    "Ne jamais promettre d'heure exacte de passage pour le technicien. Indiquer une plage horaire de 2 heures (ex: entre 14h et 16h).",
    "Pour valider/confirmer les informations collectées, faites-le une seule et unique fois à la fin de la qualification de manière synthétique. Ne répétez plus jamais ces informations par la suite.",
    "Après avoir confirmé les informations, demandez immédiatement s'il y a une autre question. Si le client dit non ou valide, dites simplement au revoir de manière polie et concise, puis cessez de parler en attendant qu'il raccroche.",
  ],
});
