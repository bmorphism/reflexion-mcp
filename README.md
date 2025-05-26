# Actor-Critic Thinking MCP Server

A dual-perspective thinking analysis server based on Model Context Protocol (MCP), providing comprehensive performance evaluation through Actor-Critic methodology.

## Features

- **Dual-perspective Analysis**: Alternates between actor (creator/performer) and critic (analyzer/evaluator) perspectives
- **Round Tracking**: Tracks rounds of dual-perspective analysis
- **Balanced Assessment**: Combines empathetic understanding with objective analysis
- **Multi-dimensional Evaluation**: Generates nuanced, multi-dimensional assessments
- **Actionable Feedback**: Provides constructive improvement suggestions

## Use Cases

- Evaluating artistic performances, creative works, or strategic decisions
- Analyzing the gap between intention and execution
- Providing constructive feedback that considers both creative vision and technical execution
- Reviewing complex scenarios that require both empathy and objectivity
- Situations requiring balanced assessment of subjective and objective criteria
- Performance reviews that need both self-reflection and external evaluation
- Creative processes that benefit from iterative refinement

## Parameters

### Required Parameters

- `content` (string): Current analysis content from the specified role perspective
- `role` (string): Perspective role, options:
  - `"actor"`: Actor perspective (empathetic/creative viewpoint)
  - `"critic"`: Critic perspective (analytical/evaluative viewpoint)
- `nextRoundNeeded` (boolean): Whether another round of actor-critic dialogue is needed
- `thoughtNumber` (integer): Current thought number in the sequence (minimum: 1)
- `totalThoughts` (integer): Total number of thoughts planned (must be odd and >= 3)

### Role Perspective Guidelines

**Actor perspective should include:**
- Understanding intentions, creative choices, emotional context, challenges faced
- Self-reflection on performance and decision-making process
- Explanation of creative vision and goals

**Critic perspective should include:**
- Technical execution analysis, effectiveness evaluation
- Audience impact assessment, comparative analysis
- Objective feedback and improvement suggestions

## How to use

```json
{
  "mcpServers": {
    "actor-critic-thinking": {
      "command": "npx",
      "args": ["-y", "mcp-server-actor-critic-thinking"]
    }
  }
}

```



## Installation and Running

```bash
# Build the project
npm run build

# Run the server
node dist/index.js
```

## Example Usage

```json
{
  "content": "As a designer, I believe this interface design is clean and elegant, meeting users' aesthetic needs.",
  "role": "actor",
  "nextRoundNeeded": true,
  "thoughtNumber": 1,
  "totalThoughts": 5
}
```

```json
{
  "content": "From a user experience perspective, while the interface is clean, it may lack necessary functional hints, which could confuse new users.",
  "role": "critic", 
  "nextRoundNeeded": false,
  "thoughtNumber": 2,
  "totalThoughts": 5
}
```

## Best Practices

1. Start with either actor or critic perspective
2. Alternate between perspectives to maintain balance
3. Continue rounds until comprehensive analysis is achieved
4. Focus on relevant performance aspects
5. Generate balanced assessments that honor both perspectives
6. Provide constructive, actionable feedback
7. Only set `nextRoundNeeded` to false when analysis is complete
