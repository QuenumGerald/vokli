import type { AgentDefinition } from "@vokli/core";

export interface DeploymentResult {
  readonly provider: "vapi";
  readonly externalId: string;
}

export interface VoiceProvider {
  deploy(agent: AgentDefinition): Promise<DeploymentResult>;
}
