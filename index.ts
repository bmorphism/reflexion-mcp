#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
// Fixed chalk import for ESM (though not used in ReflexionServer yet)
// import chalk from 'chalk';

/**
 * Represents the data structure for a single trial in the Reflexion process.
 * This interface is for conceptual clarity; trial data is handled by ReflexionServer's parameters and trialHistory.
 */
interface ReflexionTrialData {
  trialNumber: number;
  actorOutput: string;
  evaluatorScore: string | number;
  reflectionText: string;
  maxTrials: number;
  lastStepType: 'actor' | 'evaluator' | 'self-reflection';
}

/**
 * Server for managing the Reflexion process.
 */
class ReflexionServer {
  private trialHistory: {
    trialNumber: number;
    actorOutput: string;
    evaluatorScore: string | number;
    reflectionText: string;
  }[] = [];
  private memory: string[] = [];
  private maxMemoryDepth = 3;

  /**
   * Validates and processes a step in the Reflexion process.
   * @param stepData The data for the current step, expected to be an object.
   * @returns A result object indicating the next step or completion.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public validateAndProcessStep(stepData: unknown): any {
    if (typeof stepData !== 'object' || stepData === null) {
      return { error: "Invalid input: stepData must be an object." };
    }

    const params = stepData as Record<string, unknown>;

    const {
      stepType,
      trialNumber,
      maxTrials,
      actorInputText,
      actorOutputText,
      evaluatorScore,
      reflectionText, // Will be used in 'self-reflection'
      memoryOverride,
    } = params;

    if (typeof trialNumber !== 'number' || trialNumber < 1) {
      return { error: "Invalid 'trialNumber': must be a positive integer." };
    }
    if (typeof maxTrials !== 'number' || maxTrials < 1) {
      return { error: "Invalid 'maxTrials': must be a positive integer." };
    }
    if (trialNumber > maxTrials) {
        return { error: "'trialNumber' cannot exceed 'maxTrials'."};
    }

    if (memoryOverride && Array.isArray(memoryOverride)) {
        this.memory = memoryOverride.filter(item => typeof item === 'string');
    }

    switch (stepType) {
      case 'actor':
        if (typeof actorInputText !== 'string') {
          return { error: "Invalid 'actorInputText': must be a string for 'actor' step." };
        }
        // Logic for actor step
        return {
          nextStep: 'evaluator',
          prompt_for_actor: actorInputText,
          current_memory: this.memory,
          trialNumber,
          maxTrials,
        };

      case 'evaluator':
        if (typeof actorOutputText !== 'string') {
          return { error: "Invalid 'actorOutputText': must be a string for 'evaluator' step." };
        }
        // Logic for evaluator step
        return {
          nextStep: 'self-reflection',
          content_to_evaluate: actorOutputText,
          trialNumber,
          maxTrials,
        };

      case 'self-reflection':
        if (typeof actorOutputText !== 'string') {
          return { error: "Invalid 'actorOutputText': must be a string for 'self-reflection' step." };
        }
        if (typeof evaluatorScore !== 'string' && typeof evaluatorScore !== 'number') {
          return { error: "Invalid 'evaluatorScore': must be a string or number for 'self-reflection' step." };
        }
        if (typeof reflectionText !== 'string') {
            // In a real scenario, this step might *prepare a prompt* for an LLM to generate reflectionText.
            // For this implementation, we'll assume reflectionText is provided as input to complete the trial.
            return {
                nextStep: 'self-reflection', // Or a new step type like 'generate-reflection'
                prompt_for_reflection_llm: {
                    task_description: "Based on the actor's output and the evaluator's score, generate a concise reflection on what can be improved. Consider the provided memory of past reflections.",
                    actor_output: actorOutputText,
                    evaluator_score: evaluatorScore,
                    current_memory: this.memory,
                },
                trialNumber,
                maxTrials,
                message: "Self-reflection step initiated. LLM should generate reflectionText based on provided prompt components."
            };
        }

        // Store the reflection
        this.memory.unshift(reflectionText);
        if (this.memory.length > this.maxMemoryDepth) {
          this.memory.pop();
        }

        // Store completed trial
        this.trialHistory.push({
          trialNumber,
          actorOutput: actorOutputText,
          evaluatorScore,
          reflectionText,
        });

        const nextTrialNeeded = trialNumber < maxTrials;
        return {
          trialCompleted: trialNumber,
          reflection_added_to_memory: reflectionText,
          memory: this.memory,
          next_trial_needed: nextTrialNeeded,
          trial_history_length: this.trialHistory.length,
        };

      default:
        return { error: `Unknown stepType: '${stepType}'. Must be 'actor', 'evaluator', or 'self-reflection'.` };
    }
  }
}

const REFLEXION_TOOL: Tool = {
  name: "reflexion-thinking",
  description:
    "A tool for iterative refinement using the Reflexion framework (Actor, Evaluator, Self-Reflection). It guides the process of generating output, evaluating it, and then reflecting on the feedback to improve in subsequent trials. Memory of past reflections is maintained to aid learning.",
  inputSchema: {
    type: "object",
    properties: {
      stepType: {
        type: "string",
        enum: ["actor", "evaluator", "self-reflection"],
        description: "The current step in the Reflexion process.",
      },
      trialNumber: {
        type: "integer",
        minimum: 1,
        description: "Current trial number.",
      },
      maxTrials: {
        type: "integer",
        minimum: 1,
        description: "Maximum number of trials planned.",
      },
      actorInputText: {
        type: "string",
        description: "(For actor step) The initial prompt or task for the Actor.",
      },
      actorOutputText: {
        type: "string",
        description: "(For evaluator & self-reflection steps) The output generated by the Actor in the current trial.",
      },
      evaluatorScore: {
        type: "string", // Can be string or number, string is simpler for JSON
        description: "(For self-reflection step) The evaluation score or feedback for the Actor's output.",
      },
      reflectionText: {
        type: "string",
        description: "(For self-reflection step, if providing directly) The reflection text generated to complete the trial.",
      },
      memoryOverride: {
        type: "array",
        items: { type: "string" },
        description: "Optional. Provide an initial list of reflections for the memory.",
      },
    },
    required: ["stepType", "trialNumber", "maxTrials"],
  },
   outputSchema: { // Conceptual, actual output is dynamic based on step
    type: "object",
    properties: {
        // Actor step output
        nextStep: { type: "string", enum: ["evaluator", "self-reflection"] },
        prompt_for_actor: { type: "string" },
        current_memory: { type: "array", items: { type: "string" } },
        // Evaluator step output
        content_to_evaluate: { type: "string" },
        // Self-reflection step output (when reflectionText is provided)
        trialCompleted: { type: "integer" },
        reflection_added_to_memory: { type: "string" },
        memory: { type: "array", items: { type: "string" } },
        next_trial_needed: { type: "boolean" },
        trial_history_length: { type: "integer" },
        // Self-reflection step output (when reflectionText is NOT provided)
        prompt_for_reflection_llm: { type: "object" },
        // Common fields
        trialNumber: { type: "integer" },
        maxTrials: { type: "integer" },
        message: { type: "string" },
        error: { type: "string" },
    },
  },
};

const server = new Server(
  {
    name: "reflexion-thinking-server", // Updated server name
    version: "0.1.0", // Initial version for Reflexion server
  },
  {
    capabilities: {
      tools: {}, // tools are registered via setRequestHandler for ListTools
    },
  }
);

const reflexionServer = new ReflexionServer();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [REFLEXION_TOOL], // Return the new Reflexion tool
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "reflexion-thinking") {
    // The arguments are already parsed by the SDK into an object
    const result = reflexionServer.validateAndProcessStep(request.params.arguments);
    return {
      // id: request.id, // SDK handles this
      // toolName: request.params.name, // SDK handles this
      // type: 'tool-response', // SDK handles this
      content: [{
        type: "text",
        text: JSON.stringify(result), // Result from validateAndProcessStep
      }],
      // isError can be set if the entire step is an operational failure,
      // but business logic errors are within the JSON result.
    };
  }

  // Handle unknown tools
  return {
    content: [{
      type: "text",
      text: JSON.stringify({ error: `Unknown tool: ${request.params.name}` })
    }],
    isError: true // Indicate that the tool call itself failed
  };
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Updated console log message
  console.error("Reflexion Thinking MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
