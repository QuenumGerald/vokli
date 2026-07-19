# Guide Complet de Dépannage et d'Utilisation - Téléphonie IP & Internet B2B

Ce guide regroupe les procédures de dépannage et d'utilisation pour les téléphones Yealink (T46U / T48U), la téléphonie Microsoft Teams et les liaisons internet d'entreprise.

---

## 1. Téléphonie IP Yealink (T46U / T48U)

### A. Comment transférer un appel
1. **Transfert accompagné (Supervisé)** : Vous parlez au destinataire avant de finaliser.
   - Pendant l'appel, appuyez sur la touche **TRAN** (ou *Transfert*). Le correspondant est mis en attente.
   - Composez le numéro de poste (ex: 102) ou le numéro externe.
   - Attendez que le destinataire réponde pour lui annoncer l'appel.
   - Appuyez à nouveau sur la touche **TRAN** pour finaliser.
   - Si le destinataire refuse l'appel ou ne répond pas, appuyez sur la touche **Annuler** puis sur **Reprendre** pour récupérer le correspondant.
2. **Transfert aveugle (Sans supervision)** : L'appel est envoyé directement.
   - Pendant l'appel, appuyez sur la touche **TRAN**.
   - Composez le numéro de poste ou le numéro externe.
   - Appuyez immédiatement sur la touche **TRAN** pour finaliser.

### B. Problèmes et Pannes Courantes - Yealink
*   **Le téléphone affiche "Pas de réseau" ou "Pas d'enregistrement"** :
    1. Vérifier que le câble réseau (RJ45) est branché sur le port **Internet** (et non le port *PC*) sous le téléphone.
    2. S'assurer que l'autre extrémité du câble est bien connectée à la prise murale RJ45 ou au switch PoE.
    3. Effectuer un redémarrage électrique : Débrancher le câble d'alimentation (ou le câble réseau si le poste est alimenté en PoE), attendre 15 secondes, puis rebrancher.
*   **Le téléphone ne sonne plus et affiche un icône de sens interdit (DND / Ne pas déranger)** :
    - La fonction "Ne pas déranger" (DND ou MDN en français) a été activée par erreur.
    - Appuyez sur la touche logicielle **DND** (ou **MDN**) située directement sous l'écran pour la désactiver. L'icône de sens interdit doit disparaître.
*   **Qualité d'appel médiocre (voix hachée, écho, grésillements)** :
    1. Si vous utilisez un casque, vérifiez ses branchements et testez avec le combiné classique.
    2. Assurez-vous que personne ne réalise de gros téléchargements sur le réseau de l'entreprise.
    3. Si le téléphone est connecté derrière un ordinateur (pont réseau), débranchez-le et connectez le téléphone directement à une prise murale dédiée.
*   **L'interlocuteur ne vous entend pas (Microphone inactif)** :
    - Vérifiez si le voyant de la touche **Muet** (icône de microphone barré, situé en bas à droite) est allumé en rouge. Si oui, appuyez dessus pour réactiver le micro.
*   **Code PIN de messagerie vocale oublié** :
    - Le code PIN par défaut est généralement le `0000` ou le numéro de votre poste. Si vous l'avez modifié et oublié, contactez votre administrateur réseau pour le réinitialiser depuis le portail de gestion.

---

## 2. Téléphonie Microsoft Teams

*   **Impossible de passer ou recevoir des appels depuis Teams** :
    1. Vérifiez que votre application Teams est bien connectée avec votre compte professionnel.
    2. Si le mot de passe de votre compte Office 365 a expiré, l'application Teams peut être partiellement bloquée. Déconnectez-vous puis reconnectez-vous.
*   **Pas de son ou micro non détecté** :
    1. Dans Teams, cliquez sur les trois points `...` en haut à droite, puis allez dans **Paramètres** > **Périphériques**.
    2. S'assurer que le bon périphérique (Casque USB, haut-parleur ou micro) est sélectionné dans les menus déroulants.

---

## 3. Accès Internet et Routeurs

*   **Perte de connexion générale (Coupure Internet complète)** :
    1. **Redémarrage du routeur** : Éteignez le routeur principal de l'entreprise, attendez 30 secondes, puis rallumez-le.
    2. **Vérifier le boîtier Fibre (ONT)** :
       - Le boîtier ONT est relié à la prise optique.
       - Voyant **Power** : doit être vert fixe.
       - Voyant **PON / Link** : doit être vert fixe. S'il clignote ou est éteint, le signal optique est perdu (câble fibre plié ou coupé).
       - Voyant **LOS** : s'il clignote en rouge, il y a une panne sur le réseau de l'opérateur.
*   **Connexion lente ou débits instables** :
    1. Éviter d'utiliser le Wi-Fi ou des boîtiers CPL pour les tâches critiques. Faites un test en connectant un ordinateur directement en Ethernet sur le routeur.
    2. Vérifier que la jarretière optique (câble jaune très fin reliant la prise murale au boîtier fibre) n'est pas pliée, pincée sous un meuble ou enroulée de manière trop serrée. La fibre optique est en verre et se brise facilement à l'intérieur.
