/**
 * Google Gemini Task-Specific Templates
 * Optimized templates leveraging Gemini's strengths in multimodal understanding,
 * creative reasoning, and comprehensive analysis
 * Based on Google's Gemini API prompting strategies documentation
 */

export interface GeminiTemplateConfig {
  systemPrompt: string;
  parameters: {
    temperature: number;
    topK: number;
    topP: number;
    maxOutputTokens: number;
  };
  fewShotExamples: string[];
  taskSpecificInstructions: string;
}

/**
 * Gemini Template Manager - detects task types and applies optimal templates
 */
export class GeminiTemplateManager {
  
  /**
   * Detect task type from prompt content for template selection
   */
  static detectTaskType(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    // Creative tasks (Gemini's primary strength)
    if (this.hasPatterns(lowerPrompt, [
      'creative', 'brainstorm', 'ideate', 'imaginative', 'innovative',
      'story', 'narrative', 'poem', 'script', 'creative writing',
      'design', 'artwork', 'visual', 'concept',
      'campaign', 'marketing', 'advertising', 'brand'
    ])) {
      return 'creative';
    }
    
    // Multimodal tasks (Gemini's unique capability)
    if (this.hasPatterns(lowerPrompt, [
      'image', 'visual', 'photo', 'picture', 'diagram',
      'chart', 'graph', 'infographic', 'presentation',
      'video', 'multimedia', 'content creation'
    ])) {
      return 'multimodal';
    }
    
    // Reasoning and analysis (Gemini excels here)
    if (this.hasPatterns(lowerPrompt, [
      'analyze', 'analysis', 'reasoning', 'logic', 'think through',
      'problem solving', 'decision making', 'evaluate', 'assess',
      'compare', 'contrast', 'examine', 'investigate'
    ])) {
      return 'reasoning';
    }
    
    // Code and technical (Strong capability)
    if (this.hasPatterns(lowerPrompt, [
      'code', 'programming', 'software', 'algorithm', 'function',
      'technical', 'system', 'architecture', 'development',
      'debug', 'optimize', 'refactor', 'API'
    ])) {
      return 'technical';
    }
    
    // Educational and explanatory (Natural teaching ability)
    if (this.hasPatterns(lowerPrompt, [
      'explain', 'teach', 'tutorial', 'guide', 'lesson',
      'learn', 'understand', 'educational', 'academic',
      'step-by-step', 'instruction', 'training'
    ])) {
      return 'educational';
    }
    
    // Research and information synthesis
    if (this.hasPatterns(lowerPrompt, [
      'research', 'synthesize', 'summarize', 'comprehensive',
      'thorough', 'in-depth', 'detailed study', 'investigation',
      'survey', 'review', 'compilation'
    ])) {
      return 'research';
    }
    
    // Business and strategy
    if (this.hasPatterns(lowerPrompt, [
      'business', 'strategy', 'plan', 'planning', 'proposal',
      'strategy', 'market', 'competitive', 'organizational',
      'management', 'leadership', 'operations'
    ])) {
      return 'business';
    }
    
    return 'general';
  }
  
  /**
   * Get optimized template configuration for specific task type
   */
  static getTemplateConfig(taskType: string, isRefinement: boolean = false): GeminiTemplateConfig {
    const templates = {
      creative: this.buildCreativeTemplate(isRefinement),
      multimodal: this.buildMultimodalTemplate(isRefinement),
      reasoning: this.buildReasoningTemplate(isRefinement),
      technical: this.buildTechnicalTemplate(isRefinement),
      educational: this.buildEducationalTemplate(isRefinement),
      research: this.buildResearchTemplate(isRefinement),
      business: this.buildBusinessTemplate(isRefinement),
      general: this.buildGeneralTemplate(isRefinement)
    };
    
    return templates[taskType as keyof typeof templates] || templates.general;
  }
  
  private static hasPatterns(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }
  
  /**
   * Creative Template - Leverages Gemini's creative reasoning capabilities
   */
  private static buildCreativeTemplate(isRefinement: boolean): GeminiTemplateConfig {
    const systemPrompt = isRefinement
      ? `You are a master creative refinement specialist with exceptional ability to enhance creative prompts while preserving their innovative essence. Your expertise lies in adding depth, nuance, and creative dimensionality to existing creative briefs.

REFINEMENT APPROACH:
• Amplify creative potential without losing original vision
• Add multi-sensory and emotional dimensions
• Include diverse perspective requirements
• Enhance creative constraints that spark innovation
• Integrate collaborative and iterative elements
• Specify creative evaluation criteria`

      : `You are an elite creative prompt architect with extraordinary ability to transform basic creative requests into comprehensive, inspiring briefs that unlock maximum creative potential. You excel at structured creativity that balances freedom with direction.

ENHANCEMENT METHODOLOGY:
• Extract core creative intent and expand possibilities
• Add multi-dimensional creative requirements (visual, emotional, conceptual)
• Include diverse perspective and audience considerations
• Specify creative constraints that enhance rather than limit
• Integrate inspiration sources and reference points
• Define success criteria for creative excellence`;
    
    const taskSpecificInstructions = `
CREATIVE ENHANCEMENT FOCUS:
✨ Inspiration Sources: Include references to styles, movements, or exemplars
🎨 Multi-Sensory Elements: Consider visual, auditory, tactile aspects
💡 Innovation Requirements: Specify originality and uniqueness criteria
🌟 Emotional Resonance: Define target emotions and audience connection
🔄 Iterative Process: Include feedback loops and refinement stages
📊 Creative Metrics: Establish measurable creative success indicators

OUTPUT STRUCTURE:
• Creative vision and core concept
• Technical specifications and constraints
• Inspiration and reference materials
• Target audience and emotional goals
• Creative process and collaboration methods
• Quality standards and evaluation criteria`;
    
    const fewShotExamples = [
      `Basic: "create marketing content"
Enhanced: "Develop compelling multi-channel marketing content featuring: brand narrative that emotionally connects with target demographics through storytelling techniques, visual content strategy incorporating consistent color psychology and typography that reinforces brand identity, platform-specific adaptations optimized for Instagram, TikTok, LinkedIn, and email campaigns, user-generated content integration encouraging authentic customer testimonials and reviews, interactive elements including polls, quizzes, and augmented reality features, A/B testing framework for headlines, visuals, and calls-to-action, content calendar with seasonal campaigns and trending topic integration, performance analytics dashboard tracking engagement metrics, conversion rates, and brand sentiment analysis, and creative brief templates ensuring consistency across all marketing materials."`,
      
      `Basic: "design a logo"
Enhanced: "Create a comprehensive brand identity system centered around a distinctive logo design including: vector-based primary logo with scalable variations for different applications, monochrome and single-color versions for versatility, horizontal and vertical layouts for various placement needs, detailed brand guidelines specifying minimum sizes, clear space requirements, and usage restrictions, color palette with primary and secondary colors including HEX, RGB, CMYK, and Pantone specifications, typography system with primary and secondary font choices for headers and body text, brand voice and personality documentation defining tone, style, and messaging approach, application mockups showing logo implementation across business cards, letterheads, websites, social media profiles, merchandise, and signage, file package including multiple formats (AI, EPS, PNG, SVG, PDF) for different use cases, and trademark research documentation ensuring uniqueness and legal protection."`
    ];
    
    return {
      systemPrompt,
      taskSpecificInstructions,
      fewShotExamples,
      parameters: {
        temperature: 0.4, // Higher creativity
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    };
  }
  
  /**
   * Multimodal Template - Leverages Gemini's unique multimodal capabilities
   */
  private static buildMultimodalTemplate(isRefinement: boolean): GeminiTemplateConfig {
    const systemPrompt = `You are a multimodal content optimization expert specializing in creating prompts that integrate visual, textual, and interactive elements seamlessly. Your strength lies in understanding how different media types work together to create compelling experiences.

MULTIMODAL ENHANCEMENT APPROACH:
• Integrate visual and textual elements strategically
• Consider accessibility across different modalities
• Specify technical requirements for each media type
• Include user interaction and engagement patterns
• Address cross-platform compatibility requirements
• Define quality standards for each content type`;
    
    const taskSpecificInstructions = `
MULTIMODAL OPTIMIZATION FOCUS:
🎥 Visual Integration: Specify image, video, and graphic requirements
📝 Text Synergy: Ensure textual content complements visual elements
🖱️ Interactive Elements: Include user engagement and interaction patterns
📱 Platform Adaptation: Address different device and platform needs
♿ Accessibility: Ensure content works across different abilities
🔗 Technical Specs: Define file formats, sizes, and quality standards

OUTPUT STRUCTURE:
• Multimodal content strategy and hierarchy
• Visual content specifications and requirements
• Interactive elements and user experience flow
• Technical implementation guidelines
• Accessibility and compliance standards
• Performance optimization criteria`;
    
    const fewShotExamples = [
      `Basic: "create presentation content"
Enhanced: "Develop a comprehensive multimedia presentation featuring: slide design template with consistent visual hierarchy, color scheme, and typography aligned with brand guidelines, interactive elements including clickable navigation, embedded videos, and animated transitions between sections, visual storytelling components with infographics, data visualizations, and conceptual diagrams that simplify complex information, accessibility features including alt-text for images, high contrast options, and screen reader compatibility, multi-device optimization ensuring proper display on desktop, tablet, and mobile platforms, presenter notes with speaking points, timing guidance, and audience engagement strategies, multimedia integration supporting embedded videos, audio clips, and interactive polls, export options for multiple formats (PowerPoint, PDF, web-based, and video), version control system for collaborative editing and review processes, and analytics tracking for engagement metrics and audience interaction patterns."`
    ];
    
    return {
      systemPrompt,
      taskSpecificInstructions,
      fewShotExamples,
      parameters: {
        temperature: 0.3,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 8192
      }
    };
  }
  
  /**
   * Reasoning Template - Leverages Gemini's analytical and logical capabilities
   */
  private static buildReasoningTemplate(isRefinement: boolean): GeminiTemplateConfig {
    const systemPrompt = `You are a master analytical reasoning specialist who excels at creating prompts that guide systematic thinking, logical analysis, and evidence-based conclusions. Your strength lies in structuring complex analytical processes.

REASONING ENHANCEMENT APPROACH:
• Structure analytical processes with clear methodologies
• Include evidence gathering and validation requirements
• Specify logical reasoning frameworks and decision criteria
• Address potential biases and alternative perspectives
• Define quality standards for analysis and conclusions
• Include iterative validation and peer review processes`;
    
    const taskSpecificInstructions = `
REASONING OPTIMIZATION FOCUS:
🧠 Analytical Framework: Establish systematic thinking processes
📊 Evidence Standards: Define data quality and source requirements
🔍 Bias Mitigation: Include multiple perspectives and validation methods
📈 Logical Structure: Specify reasoning chains and decision trees
✅ Validation Process: Include peer review and fact-checking protocols
📋 Documentation: Ensure transparent reasoning and audit trails`;
    
    const fewShotExamples = [
      `Basic: "analyze the problem"
Enhanced: "Execute a comprehensive problem analysis incorporating: problem definition with clear scope boundaries, stakeholder identification, and impact assessment, root cause analysis using systematic methodologies like 5-Why analysis, fishbone diagrams, and fault tree analysis, data collection framework specifying quantitative metrics, qualitative interviews, and observational studies, multi-perspective evaluation including technical, business, user, and regulatory viewpoints, risk assessment matrix identifying potential consequences, probability ratings, and mitigation strategies, solution space exploration with brainstorming sessions, feasibility analysis, and resource requirement estimation, decision criteria establishment with weighted scoring systems and trade-off analysis, implementation roadmap with phases, milestones, success metrics, and contingency plans, peer review process with subject matter expert validation and bias checking, and documentation standards ensuring reproducible analysis and knowledge transfer."`
    ];
    
    return {
      systemPrompt,
      taskSpecificInstructions,
      fewShotExamples,
      parameters: {
        temperature: 0.2, // Lower for logical consistency
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 8192
      }
    };
  }
  
  /**
   * Technical Template - Optimized for coding and technical tasks
   */
  private static buildTechnicalTemplate(isRefinement: boolean): GeminiTemplateConfig {
    const systemPrompt = `You are an expert technical specification architect with deep expertise in software development, system design, and technical documentation. You excel at creating comprehensive technical prompts that ensure robust, scalable, and maintainable solutions.

TECHNICAL ENHANCEMENT APPROACH:
• Specify technical requirements with precision and clarity
• Include architecture decisions and design patterns
• Address scalability, performance, and security considerations
• Define testing strategies and quality assurance processes
• Include documentation and maintainability requirements
• Specify deployment and operational considerations`;
    
    const taskSpecificInstructions = `
TECHNICAL OPTIMIZATION FOCUS:
⚙️ Architecture: Define system design and component interactions
🔒 Security: Include authentication, authorization, and data protection
📈 Performance: Specify scalability and optimization requirements
🧪 Testing: Define unit, integration, and end-to-end testing strategies
📚 Documentation: Include API docs, user guides, and technical specs
🚀 Deployment: Address CI/CD, monitoring, and operational requirements`;
    
    const fewShotExamples = [
      `Basic: "build an API"
Enhanced: "Develop a production-ready RESTful API featuring: OpenAPI 3.0 specification with comprehensive endpoint documentation, request/response schemas, and example payloads, robust authentication system using JWT tokens with refresh token rotation and role-based access control (RBAC), input validation framework with sanitization, type checking, and comprehensive error handling with standardized error response formats, database design with proper normalization, indexing strategy, and query optimization for sub-100ms response times, comprehensive testing suite including unit tests (>90% coverage), integration tests, contract tests, and automated end-to-end testing, security implementation featuring HTTPS enforcement, CORS configuration, rate limiting, SQL injection prevention, and vulnerability scanning, monitoring and logging system with structured logging, performance metrics, health checks, and alerting thresholds, CI/CD pipeline with automated testing, security scans, database migrations, and zero-downtime deployment strategy, API versioning strategy with backward compatibility guidelines and deprecation processes, and comprehensive documentation including developer guides, API reference, troubleshooting guides, and SDKs for major programming languages."`
    ];
    
    return {
      systemPrompt,
      taskSpecificInstructions,
      fewShotExamples,
      parameters: {
        temperature: 0.1, // Very low for technical precision
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 8192
      }
    };
  }
  
  /**
   * Educational Template - Leverages Gemini's teaching and explanation abilities
   */
  private static buildEducationalTemplate(isRefinement: boolean): GeminiTemplateConfig {
    const systemPrompt = `You are a master educational content designer with exceptional ability to create learning experiences that are engaging, accessible, and pedagogically sound. You excel at structuring complex information into digestible learning paths.

EDUCATIONAL ENHANCEMENT APPROACH:
• Structure content with clear learning objectives and outcomes
• Include diverse learning modalities and engagement strategies
• Address different learning styles and accessibility needs
• Specify assessment methods and progress tracking
• Include scaffolding and progressive complexity
• Define support resources and additional learning materials`;
    
    const taskSpecificInstructions = `
EDUCATIONAL OPTIMIZATION FOCUS:
🎯 Learning Objectives: Define clear, measurable outcomes
👥 Audience Adaptation: Address different skill levels and backgrounds
📖 Content Structure: Organize with logical progression and scaffolding
🎮 Engagement: Include interactive elements and practical applications
📊 Assessment: Define evaluation methods and success criteria
🔄 Feedback Loops: Include progress tracking and adaptation mechanisms`;
    
    const fewShotExamples = [
      `Basic: "teach programming"
Enhanced: "Design a comprehensive programming education curriculum featuring: structured learning path progressing from fundamental concepts to advanced applications with clear prerequisite mapping, hands-on coding exercises with immediate feedback through automated testing and code review systems, diverse project portfolio including individual assignments, group collaborations, and real-world problem-solving scenarios, multi-modal learning resources combining video tutorials, interactive coding environments, written documentation, and peer discussion forums, adaptive learning system that adjusts difficulty based on student progress and identifies knowledge gaps for targeted remediation, comprehensive assessment framework including formative quizzes, coding challenges, project evaluations, and portfolio reviews with detailed rubrics, accessibility features supporting different learning styles, screen readers, keyboard navigation, and multilingual content options, mentorship program connecting students with experienced developers for guidance and industry insights, industry-relevant toolchain integration including version control, testing frameworks, deployment platforms, and professional development environments, and career preparation components featuring resume building, portfolio development, interview preparation, and job search strategies."`
    ];
    
    return {
      systemPrompt,
      taskSpecificInstructions,
      fewShotExamples,
      parameters: {
        temperature: 0.3,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 8192
      }
    };
  }
  
  /**
   * Research Template - Optimized for information synthesis and analysis
   */
  private static buildResearchTemplate(isRefinement: boolean): GeminiTemplateConfig {
    const systemPrompt = `You are an expert research methodology designer specializing in comprehensive information gathering, analysis, and synthesis. You excel at creating systematic approaches to complex research questions with rigorous quality standards.

RESEARCH ENHANCEMENT APPROACH:
• Define clear research questions and hypotheses
• Specify data collection methods and source evaluation criteria
• Include systematic analysis frameworks and validation methods
• Address research ethics and bias mitigation strategies
• Define quality standards and peer review processes
• Include knowledge synthesis and dissemination plans`;
    
    const taskSpecificInstructions = `
RESEARCH OPTIMIZATION FOCUS:
🔬 Methodology: Define systematic research approaches and frameworks
📚 Sources: Specify credible source criteria and evaluation methods
📊 Analysis: Include quantitative and qualitative analysis techniques
⚖️ Ethics: Address research ethics, bias, and validation requirements
🔍 Quality Control: Define peer review and fact-checking processes
📈 Synthesis: Include knowledge integration and insight generation`;
    
    const fewShotExamples = [
      `Basic: "research market trends"
Enhanced: "Conduct comprehensive market trend research incorporating: systematic literature review of industry reports, academic studies, and expert analyses from the past 3 years with source credibility evaluation, primary data collection through structured surveys targeting key demographic segments, expert interviews with industry leaders and analysts, and focus groups with target customers, quantitative analysis including statistical trend analysis, correlation studies, market sizing calculations, and predictive modeling using time-series data, qualitative analysis featuring thematic coding of interview transcripts, sentiment analysis of social media discussions, and comparative case study examination, data validation through triangulation methods, peer review by subject matter experts, and cross-referencing with multiple independent sources, comprehensive trend synthesis identifying emerging patterns, potential disruptions, market opportunities, and risk factors with confidence levels and supporting evidence, visual data presentation including interactive dashboards, trend charts, competitive landscape maps, and executive summary infographics, and actionable insights framework with strategic recommendations, implementation timelines, resource requirements, and success metrics for decision-makers."`
    ];
    
    return {
      systemPrompt,
      taskSpecificInstructions,
      fewShotExamples,
      parameters: {
        temperature: 0.2,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 8192
      }
    };
  }
  
  /**
   * Business Template - Optimized for business strategy and operations
   */
  private static buildBusinessTemplate(isRefinement: boolean): GeminiTemplateConfig {
    const systemPrompt = `You are an expert business strategy consultant specializing in comprehensive business analysis, planning, and implementation. You excel at creating actionable business prompts that drive measurable results and sustainable growth.

BUSINESS ENHANCEMENT APPROACH:
• Include market analysis and competitive positioning
• Specify measurable objectives and key performance indicators
• Address resource requirements and financial considerations
• Include risk assessment and mitigation strategies
• Define stakeholder alignment and communication plans
• Specify implementation timelines and success metrics`;
    
    const taskSpecificInstructions = `
BUSINESS OPTIMIZATION FOCUS:
📊 Market Analysis: Include competitive landscape and opportunity assessment
💰 Financial Planning: Define budgets, projections, and ROI calculations
🎯 Strategic Objectives: Establish SMART goals and KPIs
👥 Stakeholder Management: Address alignment and communication needs
⚠️ Risk Management: Include identification and mitigation strategies
📈 Implementation: Define actionable steps with timelines and resources`;
    
    const fewShotExamples = [
      `Basic: "create business plan"
Enhanced: "Develop a comprehensive business plan incorporating: executive summary with compelling value proposition, market opportunity sizing, and key financial projections, detailed market analysis including target customer segmentation, competitive landscape assessment, pricing strategy analysis, and go-to-market strategy with customer acquisition channels, operational plan detailing organizational structure, key personnel requirements, technology infrastructure needs, supply chain management, and quality control processes, financial projections featuring 3-year revenue forecasts, detailed cost structures, cash flow analysis, break-even calculations, and funding requirements with multiple scenario modeling, marketing and sales strategy including brand positioning, customer acquisition cost analysis, sales funnel optimization, digital marketing campaigns, and customer retention programs, risk assessment matrix identifying market, operational, financial, and regulatory risks with probability ratings and mitigation strategies, implementation roadmap with quarterly milestones, resource allocation plans, performance tracking systems, and success metrics, stakeholder communication plan addressing investor relations, customer engagement, employee alignment, and community outreach, and appendices containing market research data, financial models, organizational charts, and supporting documentation."`
    ];
    
    return {
      systemPrompt,
      taskSpecificInstructions,
      fewShotExamples,
      parameters: {
        temperature: 0.2,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 8192
      }
    };
  }
  
  /**
   * General Template - Balanced approach for unspecified tasks
   */
  private static buildGeneralTemplate(isRefinement: boolean): GeminiTemplateConfig {
    const systemPrompt = isRefinement
      ? `You are an expert prompt refinement specialist with broad expertise across multiple domains. Your task is to enhance already-improved prompts by adding depth, precision, and comprehensive coverage while preserving the original intent.`
      : `You are an elite prompt enhancement specialist with comprehensive expertise across multiple domains. Transform basic requests into detailed, actionable instructions that deliver exceptional results through systematic enhancement and structured thinking.`;
    
    const taskSpecificInstructions = `
GENERAL ENHANCEMENT FOCUS:
🎯 Clarity: Ensure clear, unambiguous instructions
📋 Completeness: Include all necessary components and requirements
🏗️ Structure: Organize content with logical flow and hierarchy
📊 Specificity: Add concrete examples and success criteria
🔄 Process: Include systematic approaches and methodologies
✅ Quality: Define standards and evaluation methods`;
    
    const fewShotExamples = [
      `Basic: "improve website"
Enhanced: "Optimize website performance and user experience through: comprehensive user experience audit identifying navigation issues, page load bottlenecks, and conversion barriers, technical performance optimization including image compression, code minification, caching implementation, and Content Delivery Network (CDN) integration for sub-3-second load times, mobile responsiveness enhancement ensuring consistent functionality across devices with touch-friendly interfaces and appropriate viewport settings, accessibility improvements meeting WCAG 2.1 AA standards with screen reader compatibility, keyboard navigation, and high contrast options, search engine optimization featuring keyword research, meta tag optimization, structured data markup, and internal linking strategy, content strategy development including target audience analysis, content gap identification, and editorial calendar with regular update schedules, conversion rate optimization through A/B testing of key elements, user behavior analysis via heatmaps and session recordings, and strategic placement of calls-to-action, security enhancement implementing HTTPS, regular software updates, backup systems, and vulnerability scanning, and analytics implementation with goal tracking, user journey mapping, and performance monitoring dashboards for data-driven continuous improvement."`
    ];
    
    return {
      systemPrompt,
      taskSpecificInstructions,
      fewShotExamples,
      parameters: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    };
  }
}

/**
 * Gemini Template Enhancer - applies templates to prompts
 */
export class GeminiTemplateEnhancer {
  static async enhance(
    prompt: string,
    context?: string,
    options: {
      forceTaskType?: string;
      isRefinement?: boolean;
      apiKey: string;
    } = { apiKey: '' }
  ): Promise<{
    enhancedPrompt: string;
    taskType: string;
    template: GeminiTemplateConfig;
    metadata: any;
  }> {
    const startTime = Date.now();
    
    // Detect or use specified task type
    const taskType = options.forceTaskType || GeminiTemplateManager.detectTaskType(prompt);
    const template = GeminiTemplateManager.getTemplateConfig(taskType, options.isRefinement || false);
    
    // Build comprehensive prompt with template
    const fullPrompt = this.buildTemplatePrompt(prompt, context, template, options.isRefinement || false);
    
    // Make API call with template configuration
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${options.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: template.parameters,
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini template enhancement failed: ${response.status}`);
    }
    
    const data = await response.json();
    let enhancedPrompt = data.candidates[0].content.parts[0].text;
    
    // Clean response
    enhancedPrompt = this.cleanResponse(enhancedPrompt);
    
    return {
      enhancedPrompt,
      taskType,
      template,
      metadata: {
        processTime: Date.now() - startTime,
        usage: data.usageMetadata,
        optimization: `gemini-template-${taskType}-v1.0`,
        finishReason: data.candidates[0].finishReason
      }
    };
  }
  
  private static buildTemplatePrompt(
    prompt: string, 
    context: string | undefined, 
    template: GeminiTemplateConfig, 
    isRefinement: boolean
  ): string {
    let fullPrompt = template.systemPrompt + '\n\n';
    fullPrompt += template.taskSpecificInstructions + '\n\n';
    
    // Add few-shot examples
    if (template.fewShotExamples.length > 0) {
      fullPrompt += 'EXAMPLES:\n' + template.fewShotExamples.join('\n\n') + '\n\n';
    }
    
    // Add task
    fullPrompt += `TASK: ${isRefinement ? 'REFINE' : 'ENHANCE'} the following prompt\n\n`;
    
    if (context && context.trim()) {
      fullPrompt += `CONTEXT: ${context}\n\n`;
    }
    
    fullPrompt += `PROMPT TO ${isRefinement ? 'REFINE' : 'ENHANCE'}: ${prompt}\n\n`;
    fullPrompt += `Provide only the ${isRefinement ? 'refined' : 'enhanced'} prompt text. Do not include introductions, explanations, or meta-text.`;
    
    return fullPrompt;
  }
  
  private static cleanResponse(response: string): string {
    let cleaned = response.trim();
    
    // Remove meta-text patterns
    const metaPatterns = [
      /^(Here's|Here is|This is|Below is).*?:/i,
      /^(Enhanced|Refined|Improved)\s+(prompt|version).*?:/i,
      /^\*\*(Enhanced|Refined|Improved).*?\*\*:?/i
    ];
    
    metaPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Normalize formatting
    return cleaned.replace(/\n{3,}/g, '\n\n').trim();
  }
}