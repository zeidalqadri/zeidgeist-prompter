// Training examples for prompt enhancement
// These examples help the AI understand the pattern of good prompt refinement

export interface TrainingExample {
  rawPrompt: string
  enhancedPrompt: string
  context?: string
}

export const trainingExamples: TrainingExample[] = [
  {
    rawPrompt: "website for a doctor",
    enhancedPrompt: "Design a professional medical website that includes: a clean, trustworthy homepage highlighting the doctor's expertise and credentials; detailed services pages describing treatments and procedures; an about section with the doctor's background, education, and specializations; patient resources including forms, preparation instructions, and educational materials; an easy-to-use appointment booking system; contact information with office hours, location, and directions; patient testimonials and reviews; insurance and payment information; and a mobile-responsive design that maintains professionalism and accessibility.",
    context: "Creating a medical practice website"
  },
  {
    rawPrompt: "write about climate change",
    enhancedPrompt: "Write a comprehensive analysis of climate change that covers: the fundamental science behind global warming and greenhouse gases; current evidence including temperature records, ice sheet data, and atmospheric measurements; primary causes such as fossil fuel emissions, deforestation, and industrial processes; observable impacts on weather patterns, sea levels, ecosystems, and human communities; economic implications for various industries and regions; potential future scenarios based on different emission pathways; viable mitigation strategies including renewable energy, carbon capture, and policy solutions; adaptation measures for communities and ecosystems; international cooperation efforts and agreements; and actionable steps individuals and organizations can take to address the crisis.",
    context: "Writing an informative article about climate change"
  },
  {
    rawPrompt: "help me plan a party",
    enhancedPrompt: "Create a comprehensive party planning guide that includes: defining the party's purpose, theme, and target guest count; establishing a realistic budget with cost breakdowns for venue, food, drinks, decorations, and entertainment; selecting an appropriate venue considering size, location, accessibility, and amenities; developing a guest list and sending invitations with clear RSVP instructions and event details; planning a menu that accommodates dietary restrictions and preferences; organizing entertainment, music, and activities suitable for your audience; coordinating decorations that match your theme and create the desired atmosphere; preparing a detailed timeline for setup, event flow, and cleanup; arranging for necessary supplies, equipment, and staffing; and creating contingency plans for potential issues like weather or last-minute changes.",
    context: "Planning a social event"
  },
  {
    rawPrompt: "create a mobile app",
    enhancedPrompt: "Develop a comprehensive mobile application strategy that encompasses: thorough market research to identify your target audience, competitors, and unique value proposition; detailed feature specification including core functionality, user interface design, and user experience flows; technical architecture decisions covering platform choice (iOS, Android, or cross-platform), backend infrastructure, database design, and third-party integrations; wireframing and prototyping to visualize the app's structure and navigation; development planning with sprint organization, milestone setting, and resource allocation; implementation of essential features like user authentication, data storage, push notifications, and analytics; rigorous testing procedures including unit testing, integration testing, and user acceptance testing; app store optimization with compelling descriptions, screenshots, and keyword optimization; launch strategy including marketing, press outreach, and user acquisition; and post-launch support planning for updates, bug fixes, and feature enhancements.",
    context: "Mobile app development project"
  },
  {
    rawPrompt: "learn programming",
    enhancedPrompt: "Create a structured programming learning path that includes: selecting an appropriate first programming language based on your goals (web development: JavaScript/Python, mobile: Swift/Kotlin, data science: Python/R); establishing foundational knowledge of programming concepts like variables, data types, control structures, functions, and object-oriented principles; setting up a proper development environment with code editors, version control (Git), and debugging tools; following hands-on tutorials and coding exercises that progress from basic syntax to complex problem-solving; building practical projects that demonstrate real-world applications and gradually increase in complexity; joining programming communities, forums, and coding groups for support and networking; utilizing quality learning resources including books, online courses, documentation, and coding platforms; practicing regularly with coding challenges and algorithmic problems; contributing to open-source projects to gain experience with collaborative development; and developing good coding habits including clean code practices, testing, and continuous learning mindset.",
    context: "Learning to program from scratch"
  },
  {
    rawPrompt: "start a business",
    enhancedPrompt: "Develop a comprehensive business launch strategy that covers: thorough market research to validate your business idea, identify target customers, analyze competitors, and assess market demand; creating a detailed business plan including executive summary, market analysis, organizational structure, service/product line, marketing strategies, funding requirements, and financial projections; legal considerations such as business structure selection (LLC, corporation, partnership), registration requirements, licensing, permits, and intellectual property protection; financial planning including startup costs estimation, funding source identification (personal savings, loans, investors), accounting system setup, and cash flow management; operational planning for location selection, supplier relationships, inventory management, and quality control processes; marketing and branding strategy development including brand identity, website creation, social media presence, and customer acquisition tactics; team building and human resources planning including hiring strategies, role definitions, and company culture development; risk management and insurance needs assessment; technology infrastructure setup; and launch timeline with milestone tracking and performance metrics.",
    context: "Starting a new business venture"
  },
  {
    rawPrompt: "workout routine",
    enhancedPrompt: "Design a personalized fitness program that includes: comprehensive fitness assessment covering current fitness level, health history, physical limitations, and specific goals (weight loss, muscle building, endurance, strength); structured workout schedule specifying training frequency, duration, and timing that fits your lifestyle and recovery needs; balanced exercise selection incorporating cardiovascular training, strength training, flexibility work, and functional movements; progressive overload principles to ensure continuous improvement through systematic increases in intensity, volume, or complexity; proper warm-up and cool-down protocols to prevent injury and enhance recovery; nutritional guidance aligned with fitness goals including macronutrient balance, meal timing, hydration strategies, and supplement considerations; recovery and rest planning including sleep optimization, active recovery days, and stress management techniques; progress tracking methods using measurements, photos, performance metrics, and workout logs; injury prevention strategies including proper form instruction, mobility work, and listening to your body; and program periodization with planned variations to prevent plateaus and maintain motivation.",
    context: "Creating a fitness plan"
  },
  {
    rawPrompt: "organize my home",
    enhancedPrompt: "Create a systematic home organization plan that encompasses: comprehensive assessment of each room's current state, identifying problem areas, clutter sources, and organizational challenges; decluttering strategy using methods like the KonMari approach or room-by-room sorting to decide what to keep, donate, sell, or discard; storage solution planning including appropriate containers, shelving systems, closet organizers, and space-maximizing furniture; room-by-room organization starting with high-impact areas and establishing logical storage zones based on item frequency of use; labeling systems for easy identification and maintenance of organized spaces; digital organization including file management, photo organization, and paperwork digitization; maintenance routines and habits to prevent future clutter accumulation; budget planning for organizational supplies and storage solutions; family involvement strategies to ensure everyone participates in maintaining the organized system; and timeline establishment with realistic goals and milestones for completing the organization project.",
    context: "Home organization project"
  },
  // Statement-type examples (I want to..., I need to..., etc.)
  // These are critical for preventing LLMs from answering instead of enhancing
  {
    rawPrompt: "i want to go to johor bahru next week",
    enhancedPrompt: "Create a comprehensive travel itinerary for a trip to Johor Bahru, Malaysia. Include: recommended duration and optimal timing for the visit; must-see attractions such as cultural landmarks, shopping destinations, and entertainment venues; local food recommendations with specific restaurant and hawker suggestions; accommodation options across different budget ranges with location considerations; transportation guidance including border crossing procedures if coming from Singapore, local transit options, and taxi/ride-sharing tips; day-by-day schedule suggestions with flexibility for personal interests; detailed budget breakdown with estimated costs in Malaysian Ringgit; cultural etiquette and local customs to be aware of; practical tips for first-time visitors including weather considerations, safety advice, and emergency contacts; and backup plans for rainy days or unexpected changes.",
    context: "Travel planning"
  },
  {
    rawPrompt: "i need to lose 10 pounds",
    enhancedPrompt: "Develop a personalized and sustainable weight loss plan targeting a 10-pound reduction. Include: realistic timeline based on healthy 1-2 pounds per week loss rate; calorie deficit calculation with specific daily calorie targets based on current weight, activity level, and metabolic rate; meal plan templates with macro-nutrient breakdowns covering protein, carbohydrates, and fats; healthy food substitution suggestions for common cravings; exercise recommendations combining cardiovascular training and strength training with specific workout frequencies and durations; progress tracking methods including weigh-in schedule, body measurements, and progress photos; strategies for handling plateaus and maintaining motivation during challenging periods; healthy snack alternatives and hydration guidelines; sleep and stress management considerations that impact weight loss; guidance on portion control and mindful eating practices; and warning signs requiring medical consultation before starting the program.",
    context: "Health and weight loss"
  },
  {
    rawPrompt: "my computer is running slow",
    enhancedPrompt: "Provide a systematic troubleshooting guide for diagnosing and resolving slow computer performance. Include: step-by-step diagnostic procedures to identify the root cause covering CPU usage, RAM utilization, disk activity, and potential malware; software optimization techniques including startup program management, browser cleanup, temporary file removal, and unnecessary application uninstallation; hardware assessment methods for identifying failing or bottlenecked components such as hard drive health checks and RAM testing; operating system maintenance tasks including disk defragmentation, system updates, and driver updates; malware and virus scanning recommendations with suggested tools; resource-heavy application identification and management strategies; consideration of hardware upgrades vs replacement with cost-benefit analysis; data backup procedures to perform before making major changes; performance benchmarking methods to verify improvements after each step; and guidance on when professional repair service is recommended.",
    context: "Technical troubleshooting"
  },
  {
    rawPrompt: "i'm thinking about changing careers",
    enhancedPrompt: "Create a comprehensive career transition planning guide. Include: self-assessment framework covering current skills, interests, values, and strengths; methods for identifying potential new career paths that align with your profile; industry research techniques to understand job market demand, salary ranges, and growth prospects; gap analysis comparing current qualifications with target role requirements; skill development roadmap including courses, certifications, and practical experience opportunities; networking strategies for entering a new field including informational interviews and professional associations; resume and LinkedIn profile optimization for career changers; financial planning considerations including income gap management during transition; timeline development with realistic milestones; strategies for leveraging transferable skills; interview preparation for explaining career change motivation; and risk mitigation approaches including testing new careers through freelancing or part-time work.",
    context: "Career planning"
  },
  {
    rawPrompt: "what should i cook for dinner",
    enhancedPrompt: "Generate a personalized dinner planning guide. Include: quick assessment questions to determine preferences (cuisine type, dietary restrictions, cooking skill level, available time, number of servings); recipe recommendations organized by cooking time (15 minutes, 30 minutes, 1 hour); ingredient-based suggestions for using what you already have; nutritionally balanced meal ideas incorporating protein, vegetables, and complex carbohydrates; batch cooking options for meal prep efficiency; budget-friendly meal suggestions with cost estimates per serving; kitchen tool requirements for each recipe category; complementary side dish and beverage pairings; leftover transformation ideas to minimize food waste; shopping list templates organized by grocery store section; seasonal ingredient suggestions for optimal freshness and flavor; and time-saving prep tips and cooking techniques.",
    context: "Meal planning"
  }
]