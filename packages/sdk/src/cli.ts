#!/usr/bin/env node
import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import readline from "node:readline";
import { createJiti } from "jiti";
import { createVokli } from "./create-vokli.js";
import type { ReceptionistDefinition } from "@vokli/core";

function promptUser(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command !== "deploy") {
    console.log("Usage: vokli deploy [config-file-path] [--agent <id>] [--all]");
    console.log("\nCommands:");
    console.log("  deploy  Deploy the agent configuration(s) to Vapi");
    console.log("\nOptions:");
    console.log("  -a, --agent <id>  Only deploy the agent with the specified ID");
    console.log("  --all             Deploy all agents in the configuration file without prompting");
    process.exit(1);
  }

  // Parse arguments
  let configPath = "";
  let agentFilter = "";
  let deployAll = false;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === "--agent" || arg === "-a") {
      const nextVal = args[i + 1];
      if (nextVal) {
        agentFilter = nextVal;
        i++;
      }
    } else if (arg === "--all") {
      deployAll = true;
    } else if (!arg.startsWith("-")) {
      configPath = arg;
    }
  }

  // Find config file
  if (!configPath) {
    if (fs.existsSync("vokli.config.ts")) {
      configPath = "vokli.config.ts";
    } else if (fs.existsSync("vokli.config.js")) {
      configPath = "vokli.config.js";
    } else {
      console.error("Error: Configuration file not found. Create a 'vokli.config.ts' file or specify a path.");
      process.exit(1);
    }
  }

  const absoluteConfigPath = path.resolve(configPath);
  console.log(`Loading agent configuration from: ${configPath}...`);

  try {
    const jiti = createJiti(import.meta.url);
    const module = await jiti.import(absoluteConfigPath) as any;
    
    // Collect all loaded agents from default or named exports
    let loadedAgents: any[] = [];

    if (Array.isArray(module.default)) {
      loadedAgents = module.default;
    } else if (module.default && module.default.kind) {
      loadedAgents.push(module.default);
    } else {
      // Look at all exports (including default if it's an object, and all named exports)
      const candidates = new Set<any>();
      if (module.default) candidates.add(module.default);
      for (const val of Object.values(module)) {
        candidates.add(val);
      }

      for (const candidate of candidates) {
        if (candidate && typeof candidate === "object") {
          if (candidate.kind === "receptionist") {
            loadedAgents.push(candidate);
          } else if (candidate.agent && candidate.agent.kind === "receptionist") {
            loadedAgents.push(candidate.agent);
          }
        }
      }
    }

    // Deduplicate agents by ID
    const agentMap = new Map<string, any>();
    for (const a of loadedAgents) {
      if (a && a.id) {
        agentMap.set(a.id, a);
      }
    }
    const allAgents = Array.from(agentMap.values());

    if (allAgents.length === 0) {
      console.error("Error: No Vokli agents found in the configuration file. Ensure you export agent definitions.");
      process.exit(1);
    }

    // Filter agents if requested
    let agentsToDeploy = allAgents;

    if (allAgents.length > 1) {
      if (agentFilter) {
        agentsToDeploy = allAgents.filter(a => a.id === agentFilter);
        if (agentsToDeploy.length === 0) {
          console.error(`Error: Agent with ID '${agentFilter}' not found in the configuration file.`);
          console.log("Available agents:", allAgents.map(a => a.id).join(", "));
          process.exit(1);
        }
      } else if (deployAll) {
        agentsToDeploy = allAgents;
      } else {
        // Multiple agents, no selection made. Prompt the user
        if (process.stdout.isTTY) {
          console.log("\nMultiple agents found in the configuration file:");
          allAgents.forEach((a, idx) => {
            console.log(`  [${idx + 1}] ${a.id} (${a.business.name})`);
          });
          console.log(`  [a] Deploy all agents`);
          console.log(`  [c] Cancel`);

          const choice = await promptUser("\nSelect an agent to deploy: ");
          const normalizedChoice = choice.trim().toLowerCase();

          if (normalizedChoice === "c") {
            console.log("Deployment cancelled.");
            process.exit(0);
          } else if (normalizedChoice === "a") {
            agentsToDeploy = allAgents;
          } else {
            const num = parseInt(normalizedChoice, 10);
            if (!isNaN(num) && num >= 1 && num <= allAgents.length) {
              agentsToDeploy = [allAgents[num - 1]];
            } else {
              console.error("Invalid selection. Operation cancelled.");
              process.exit(1);
            }
          }
        } else {
          // Non-interactive environment
          console.error("Error: Multiple agents found in the configuration file.");
          console.error("Please specify a target agent using '--agent <id>' or use the '--all' flag to deploy all agents.");
          console.log("Available agents:", allAgents.map(a => a.id).join(", "));
          process.exit(1);
        }
      }
    }

    console.log(`Preparing to deploy ${agentsToDeploy.length} agent(s)...`);

    const vokli = createVokli({
      ...(process.env.VAPI_API_KEY ? {
        provider: {
          type: "vapi",
          apiKey: process.env.VAPI_API_KEY,
        }
      } : {}),
    });

    for (const agent of agentsToDeploy) {
      console.log(`\n===========================================`);
      console.log(`Deploying Agent: ${agent.id}`);
      console.log(`===========================================`);

      console.log("=== 1. Validating Agent ===");
      const validation = vokli.validate(agent);
      if (!validation.success) {
        console.error(`Validation failed for agent '${agent.id}':`, validation.errors);
        process.exit(1);
      }
      console.log("Agent validation succeeded!\n");

      console.log("=== 2. Validating Knowledge Base ===");
      const knowledgeValidation = await vokli.knowledge.validate(validation.data);
      if (!knowledgeValidation.success) {
        console.error(`Knowledge base validation failed for agent '${agent.id}':`, knowledgeValidation.errors);
        process.exit(1);
      }
      console.log("Knowledge files are valid!\n");

      if (process.env.VAPI_API_KEY) {
        console.log("=== 3. Deploying & Synchronizing ===");
        const deployment = await vokli.deploy(validation.data);
        console.log(`Deploy succeeded for agent '${agent.id}'! Assistant ID:`, deployment.assistantId);

        console.log("Synchronizing knowledge files...");
        await vokli.knowledge.sync(validation.data);
        console.log("Knowledge files synchronized successfully!");
      } else {
        console.log("=== 3. Config preview (dry run) ===");
        const generated = vokli.generate(validation.data);
        console.log("Prompt preview:");
        console.log(generated.prompt);
        console.log("\n[INFO] VAPI_API_KEY environment variable is not defined. Set it to deploy to Vapi.");
      }
    }
  } catch (error: any) {
    console.error("Failed to execute deployment:", error.message || error);
    let current = error;
    while (current && current.cause) {
      console.error("Cause:", current.cause.message || current.cause);
      current = current.cause;
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
