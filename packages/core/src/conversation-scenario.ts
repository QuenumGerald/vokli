export interface ConversationScenario {
  readonly name: string;
  readonly userTurns: readonly string[];
  readonly expectedOutcome: string;
}
