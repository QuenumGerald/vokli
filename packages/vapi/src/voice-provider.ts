import type { AgentDefinition } from "../../core/dist/index.js";

export interface DeploymentResult {
  readonly provider: "vapi";
  readonly externalId: string;
}

export interface VoiceProvider {
  deploy(agent: AgentDefinition): Promise<DeploymentResult>;
}
