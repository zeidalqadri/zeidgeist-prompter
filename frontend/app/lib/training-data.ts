// Training dataset for supervised learning of prompt enhancement
// Each example includes a raw prompt, optional context, and the ideal enhanced output

export interface TrainingExample {
  rawPrompt: string
  context?: string
  enhancedPrompt: string
  domain: string
}

// Core training dataset with high-quality examples
export const trainingExamples: TrainingExample[] = [
  // Website examples
  {
    rawPrompt: "website for orthodontist cum associate professor",
    enhancedPrompt: "Design a professional website for an orthodontist who is also an associate professor. Include sections for dental services offered, academic research and publications, patient testimonials, before-and-after treatment galleries, professional credentials and academic appointments, and a user-friendly appointment scheduling system.",
    domain: "website"
  },
  {
    rawPrompt: "website for an orthodontist",
    context: "Dr Yasmin Kamarudin, associate professor at Universiti Malaya, mother of 2",
    enhancedPrompt: "Design a professional website for Dr. Yasmin Kamarudin, an orthodontist and associate professor at Universiti Malaya. Include sections for services/treatments offered, before/after patient galleries, professional credentials, and a patient-friendly appointment booking system.",
    domain: "website"
  },
  {
    rawPrompt: "build a website for a doctor",
    context: "pediatrician, specializes in allergy treatment",
    enhancedPrompt: "Build a website for a pediatrician who specializes in allergy treatment. Include sections for services, patient resources about common allergies, credentials, testimonials, and an appointment scheduling system.",
    domain: "website"
  },
  {
    rawPrompt: "create a professional webpage",
    context: "for a law firm specializing in immigration",
    enhancedPrompt: "Create a professional webpage for a law firm specializing in immigration. Include practice areas, attorney profiles, client testimonials, resources about immigration processes, and a contact form for consultations.",
    domain: "website"
  },
  
  // Writing examples
  {
    rawPrompt: "write an essay about climate change",
    context: "focus on economic impacts",
    enhancedPrompt: "Write a well-structured essay about climate change, focusing on its economic impacts. Include data on financial costs of extreme weather events, effects on agriculture and food prices, transition costs to renewable energy, and long-term economic benefits of climate action.",
    domain: "writing"
  },
  {
    rawPrompt: "help me write a cover letter",
    context: "software engineering position, 5 years experience, applying to Google",
    enhancedPrompt: "Write a compelling cover letter for a software engineering position at Google, highlighting 5 years of relevant experience. Focus on technical skills, accomplishments, and alignment with Google's mission and culture.",
    domain: "writing"
  },
  
  // Programming examples
  {
    rawPrompt: "write a function to sort an array",
    context: "in JavaScript, needs to handle numbers and strings",
    enhancedPrompt: "Write a JavaScript function that efficiently sorts an array, handling both numbers and strings appropriately. Include error handling, type checking, and performance considerations with time complexity analysis.",
    domain: "programming"
  },
  {
    rawPrompt: "create a REST API for user management",
    context: "using Node.js and Express",
    enhancedPrompt: "Create a RESTful API for user management using Node.js and Express. Implement endpoints for user registration, authentication, profile management, and permission control with proper error handling and security best practices.",
    domain: "programming"
  },
  
  // Education examples
  {
    rawPrompt: "explain photosynthesis",
    context: "to 10-year-old students",
    enhancedPrompt: "Explain photosynthesis in simple terms suitable for 10-year-old students. Use clear analogies, describe how plants use sunlight, water and carbon dioxide to make food, and explain why this process is important for all living things.",
    domain: "education"
  },
  
  // Healthcare examples
  {
    rawPrompt: "describe treatment options for diabetes",
    context: "recently diagnosed type 2 diabetes patient",
    enhancedPrompt: "Describe treatment options for a recently diagnosed type 2 diabetes patient. Include information about lifestyle modifications, medication options, blood glucose monitoring, and the importance of regular medical follow-ups.",
    domain: "healthcare"
  },
  
  // General examples with minimal context
  {
    rawPrompt: "tips for improving productivity",
    enhancedPrompt: "Provide practical tips for improving productivity. Include strategies for time management, prioritization techniques, minimizing distractions, optimizing work environment, and maintaining work-life balance.",
    domain: "general"
  },
  {
    rawPrompt: "how to prepare for a job interview",
    enhancedPrompt: "Explain comprehensive steps to prepare for a job interview. Cover researching the company, practicing common questions, preparing relevant examples of experience, planning professional attire, and following up effectively.",
    domain: "career"
  },
  
  // AI Assistant examples extracted from the provided templates
  {
    rawPrompt: "explain how an AI assistant works",
    enhancedPrompt: "Explain how an AI assistant works, covering its key capabilities and limitations. Describe how it processes user requests, utilizes various tools to complete tasks, and learns from feedback to improve performance over time.",
    domain: "ai"
  },
  {
    rawPrompt: "create a prompt for a coding assistant",
    context: "needs to help with debugging and code generation",
    enhancedPrompt: "Create a comprehensive prompt for a coding assistant that specializes in debugging and code generation. Define its capabilities clearly, include explicit instructions for understanding code context, specify output formatting requirements, and add constraints to ensure high-quality code with proper error handling.",
    domain: "prompting"
  },
  {
    rawPrompt: "write instructions for an AI agent",
    context: "needs to follow a specific workflow",
    enhancedPrompt: "Write clear, structured instructions for an AI agent that needs to follow a specific workflow. Define the agent's role, capabilities, and limitations. Include explicit step-by-step process descriptions, error handling protocols, and specify the exact format for inputs and outputs.",
    domain: "prompting"
  },
  
  // Agent-specific examples from the provided templates
  {
    rawPrompt: "design an agent system",
    context: "for handling research tasks",
    enhancedPrompt: "Design a comprehensive agent system for handling research tasks. Include modules for information gathering, fact-checking, data processing, and documentation. Specify how the agent should analyze requests, select appropriate tools, execute actions, and provide results to the user in a clear format.",
    domain: "agents"
  },
  {
    rawPrompt: "create instructions for tool usage",
    context: "for an AI coding assistant",
    enhancedPrompt: "Create detailed instructions for tool usage by an AI coding assistant. Specify when and how to use each tool, define clear schemas for tool calls, explain error handling procedures, and include guidelines for providing context to the user before tool execution.",
    domain: "prompting"
  },
  
  // Prompt engineering examples
  {
    rawPrompt: "write a system prompt",
    context: "for a customer service AI",
    enhancedPrompt: "Write a comprehensive system prompt for a customer service AI. Include clear role definition, specific capabilities and limitations, communication style guidelines, error handling protocols, and escalation procedures for handling complex customer issues beyond its capabilities.",
    domain: "prompting"
  },
  {
    rawPrompt: "improve this prompt",
    context: "tell me about the history of computers",
    enhancedPrompt: "Provide a comprehensive overview of computer history, covering major technological milestones, influential innovators, and the evolution of computing paradigms. Include information about early mechanical calculators, the development of electronic computers, the personal computing revolution, and the emergence of mobile and cloud computing.",
    domain: "prompting"
  },
  
  // Tool use examples
  {
    rawPrompt: "explain how to use tools",
    context: "in an AI agent context",
    enhancedPrompt: "Explain how an AI agent should effectively use tools. Detail the process of identifying appropriate tools based on task requirements, properly formatting tool parameters, handling errors and edge cases, processing tool outputs, and incorporating results into comprehensive responses. Include best practices for multi-step reasoning when using tools sequentially.",
    domain: "tools"
  }
];

// Extract patterns and templates from provided prompt examples
export interface PromptPattern {
  name: string
  description: string
  template: string
  examples: string[]
  domain: string
}

// Key patterns identified from the provided prompts
export const extractedPatterns: PromptPattern[] = [
  {
    name: "Role Definition",
    description: "Clearly defines what the AI is and its capabilities",
    template: "You are {role}, {capabilities}",
    examples: [
      "You are Manus, an AI agent created by the Manus team.",
      "You are a powerful agentic AI coding assistant, powered by Claude 3.7 Sonnet.",
      "You are v0, Vercel's AI-powered assistant."
    ],
    domain: "identity"
  },
  {
    name: "Capability Enumeration",
    description: "Lists specific capabilities in a structured format",
    template: "You excel at the following tasks:\n1. {capability_1}\n2. {capability_2}\n3. {capability_3}",
    examples: [
      "You excel at the following tasks:\n1. Information gathering, fact-checking, and documentation\n2. Data processing, analysis, and visualization\n3. Writing multi-chapter articles and in-depth research reports",
      "Key components include:\n1. AI SDK Core: This provides a standardized way to generate text, structured objects, and tool calls with Large Language Models (LLMs).\n2. AI SDK UI: This offers framework-agnostic hooks for building chat and generative user interfaces."
    ],
    domain: "capabilities"
  },
  {
    name: "Process Definition",
    description: "Defines a specific workflow or process to follow",
    template: "You are operating in {process_name}, iteratively completing tasks through these steps:\n1. {step_1}\n2. {step_2}\n3. {step_3}",
    examples: [
      "You are operating in an agent loop, iteratively completing tasks through these steps:\n1. Analyze Events: Understand user needs and current state through event stream\n2. Select Tools: Choose next tool call based on current state\n3. Wait for Execution: Selected tool action will be executed by sandbox environment",
      "When making code changes, NEVER output code to the USER, unless requested. Instead use one of the code edit tools to implement the change."
    ],
    domain: "process"
  },
  {
    name: "Constraint Definition",
    description: "Defines restrictions and constraints explicitly",
    template: "You MUST {requirement}. You MUST NOT {prohibition}.",
    examples: [
      "You MUST use the following format when citing code regions or blocks.",
      "NEVER assume that a given library is available, even if it is well known.",
      "You MUST NOT output shadcn components unless it needs to make modifications to them."
    ],
    domain: "constraints"
  },
  {
    name: "Tool Usage Instructions",
    description: "Explains how to use specific tools",
    template: "To use {tool_name}, follow these rules:\n1. {rule_1}\n2. {rule_2}\n3. {rule_3}",
    examples: [
      "You have tools at your disposal to solve the task. Follow these rules regarding tool calls:\n1. ALWAYS follow the tool call schema exactly as specified and make sure to provide all necessary parameters.\n2. The conversation may reference tools that are no longer available. NEVER call tools that are not explicitly provided.",
      "When using the browser tool:\n1. Must use browser tools to access and comprehend all URLs provided by users\n2. Actively explore valuable links for deeper information\n3. Browser tools only return elements in visible viewport by default"
    ],
    domain: "tools"
  }
];

// Additional structured extraction functions
export function extractPatternsFromText(text: string): string[] {
  // A simple implementation - in a real system this would be more sophisticated
  const patterns: string[] = [];
  
  // Look for numbered lists - using a simpler approach without lookbehind/lookahead
  const lines = text.split('\n');
  let currentList: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^\d+\.\s+/)) {
      currentList.push(line);
    } else if (currentList.length > 0) {
      patterns.push(currentList.join('\n'));
      currentList = [];
    }
  }
  
  if (currentList.length > 0) {
    patterns.push(currentList.join('\n'));
  }
  
  // Look for "You are" statements
  const roleDefinitions = text.match(/You are [^.]*\./g) || [];
  if (roleDefinitions.length > 0) {
    patterns.push(...roleDefinitions);
  }
  
  // Look for MUST/NEVER statements
  const constraints = text.match(/(?:MUST|NEVER|ALWAYS|DO NOT) [^.]*\./g) || [];
  if (constraints.length > 0) {
    patterns.push(...constraints);
  }
  
  return patterns;
} 