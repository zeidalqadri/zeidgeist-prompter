/**
 * Multi-Provider Vision API Architecture
 * Supports multiple image generation and analysis providers with failover
 * Mirrors the llm-enhancer.ts pattern for consistency
 */

// Cloudflare KV Namespace type definition
interface KVPutOptions {
  expirationTtl?: number
  expiration?: number
  metadata?: any
}

interface KVNamespace {
  get<T = unknown>(key: string, options?: { type: 'json' }): Promise<T | null>
  get(key: string, options?: { type: 'text' }): Promise<string | null>
  get(key: string, options?: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>
  get(key: string, options?: { type: 'stream' }): Promise<ReadableStream | null>
  get(key: string): Promise<string | null>
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVPutOptions): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string; expiration?: number; metadata?: any }[]; list_complete: boolean; cursor?: string }>
}

export interface VisionEnv {
  OPENAI_API_KEY: string
  CLAUDE_API_KEY: string
  STABILITY_AI_KEY: string
  GOOGLE_API_KEY: string
  PROGRESS_TRACKER?: KVNamespace
}

// Generation Options
export interface GenerateOptions {
  prompt: string
  style?: string
  resolution?: string
  aspectRatio?: string
  quality?: 'standard' | 'hd'
  n?: number
  progressCallback?: (percent: number, message: string) => void
}

// Transformation Options
export interface TransformOptions {
  prompt: string
  operation?: 'style-transfer' | 'object-removal' | 'color-adjust' | 'upscale'
  strength?: number // 0-1
  progressCallback?: (percent: number, message: string) => void
}

// Analysis Options
export interface AnalysisOptions {
  type: 'caption' | 'scene' | 'objects' | 'qa' | 'similarity'
  prompt?: string // For Q&A type
  detailLevel?: 'low' | 'medium' | 'high'
}

// Results
export interface ImageResult {
  imageUrl: string
  imageData?: ArrayBuffer // Base64 or binary
  model: string
  provider: string
  processingTime: number
  metadata?: Record<string, any>
}

export interface AnalysisResult {
  result: string | object
  confidence?: number
  model: string
  provider: string
  processingTime: number
  metadata?: Record<string, any>
}

/**
 * Utility: Convert image to base64
 */
async function imageToBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  const buffer = await response.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
  const mimeType = response.headers.get('content-type') || 'image/jpeg'
  return `data:${mimeType};base64,${base64}`
}

/**
 * Utility: Shuffle array for random provider selection
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// ============================================================================
// GENERATION PROVIDERS
// ============================================================================

/**
 * OpenAI DALL-E 3 Image Generation
 */
async function generateWithOpenAI(
  options: GenerateOptions,
  env: VisionEnv
): Promise<ImageResult> {
  const startTime = Date.now()

  options.progressCallback?.(10, 'Initializing OpenAI DALL-E 3...')

  const size = options.resolution || '1024x1024'
  const quality = options.quality || 'standard'

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: options.prompt,
      size,
      quality,
      n: 1
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI generation failed: ${error}`)
  }

  options.progressCallback?.(80, 'Processing image...')

  const data = await response.json() as { data: Array<{ url: string }> }
  const imageUrl = data.data[0].url

  options.progressCallback?.(100, 'Complete!')

  return {
    imageUrl,
    model: 'dall-e-3',
    provider: 'openai',
    processingTime: Date.now() - startTime,
    metadata: {
      revisedPrompt: data.data[0].revised_prompt
    }
  }
}

/**
 * Stability AI Image Generation
 */
async function generateWithStability(
  options: GenerateOptions,
  env: VisionEnv
): Promise<ImageResult> {
  const startTime = Date.now()

  options.progressCallback?.(10, 'Initializing Stability AI...')

  // Parse resolution
  const [width, height] = (options.resolution || '1024x1024').split('x').map(Number)

  const response = await fetch(
    'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.STABILITY_AI_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: options.prompt,
            weight: 1
          }
        ],
        cfg_scale: 7,
        width,
        height,
        steps: 30,
        samples: 1
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Stability AI generation failed: ${error}`)
  }

  options.progressCallback?.(80, 'Processing image...')

  const data = await response.json() as { artifacts: Array<{ base64: string }> }
  const base64Image = data.artifacts[0].base64
  const imageUrl = `data:image/png;base64,${base64Image}`

  options.progressCallback?.(100, 'Complete!')

  return {
    imageUrl,
    model: 'stable-diffusion-xl-1024-v1-0',
    provider: 'stability',
    processingTime: Date.now() - startTime,
    metadata: {
      seed: data.artifacts[0].seed
    }
  }
}

// ============================================================================
// ANALYSIS PROVIDERS
// ============================================================================

/**
 * OpenAI GPT-4 Vision Analysis
 */
async function analyzeWithOpenAI(
  imageUrl: string,
  options: AnalysisOptions,
  env: VisionEnv
): Promise<AnalysisResult> {
  const startTime = Date.now()

  // Build prompt based on analysis type
  let prompt: string
  switch (options.type) {
    case 'caption':
      prompt = 'Provide a detailed, descriptive caption for this image.'
      break
    case 'scene':
      prompt = 'Describe the scene in this image, including setting, atmosphere, and key elements.'
      break
    case 'objects':
      prompt = 'List all objects visible in this image with their locations.'
      break
    case 'qa':
      prompt = options.prompt || 'Describe this image.'
      break
    case 'similarity':
      prompt = 'Describe the visual characteristics of this image for similarity matching.'
      break
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: options.detailLevel === 'high' ? 1000 : 500
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI analysis failed: ${error}`)
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  const result = data.choices[0].message.content

  return {
    result,
    model: 'gpt-4-vision-preview',
    provider: 'openai',
    processingTime: Date.now() - startTime,
    metadata: {
      usage: data.usage
    }
  }
}

/**
 * Claude 3.5 Sonnet Vision Analysis
 */
async function analyzeWithClaude(
  imageUrl: string,
  options: AnalysisOptions,
  env: VisionEnv
): Promise<AnalysisResult> {
  const startTime = Date.now()

  // Convert image to base64
  const base64Image = await imageToBase64(imageUrl)
  const [, mimeType, base64Data] = base64Image.match(/data:(image\/[^;]+);base64,(.+)/) || []

  if (!base64Data) {
    throw new Error('Failed to convert image to base64')
  }

  // Build prompt based on analysis type
  let prompt: string
  switch (options.type) {
    case 'caption':
      prompt = 'Provide a detailed, descriptive caption for this image.'
      break
    case 'scene':
      prompt = 'Describe the scene in this image, including setting, atmosphere, and key elements.'
      break
    case 'objects':
      prompt = 'List all objects visible in this image with their locations.'
      break
    case 'qa':
      prompt = options.prompt || 'Describe this image.'
      break
    case 'similarity':
      prompt = 'Describe the visual characteristics of this image for similarity matching.'
      break
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: options.detailLevel === 'high' ? 2048 : 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType || 'image/jpeg',
                data: base64Data
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude analysis failed: ${error}`)
  }

  const data = await response.json() as { content: Array<{ text: string }> }
  const result = data.content[0].text

  return {
    result,
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    processingTime: Date.now() - startTime,
    metadata: {
      usage: data.usage
    }
  }
}

/**
 * Google Gemini Vision Analysis
 */
async function analyzeWithGemini(
  imageUrl: string,
  options: AnalysisOptions,
  env: VisionEnv
): Promise<AnalysisResult> {
  const startTime = Date.now()

  // Convert image to base64
  const base64Image = await imageToBase64(imageUrl)
  const [, , base64Data] = base64Image.match(/data:image\/[^;]+;base64,(.+)/) || []

  if (!base64Data) {
    throw new Error('Failed to convert image to base64')
  }

  // Build prompt based on analysis type
  let prompt: string
  switch (options.type) {
    case 'caption':
      prompt = 'Provide a detailed, descriptive caption for this image.'
      break
    case 'scene':
      prompt = 'Describe the scene in this image, including setting, atmosphere, and key elements.'
      break
    case 'objects':
      prompt = 'List all objects visible in this image with their locations.'
      break
    case 'qa':
      prompt = options.prompt || 'Describe this image.'
      break
    case 'similarity':
      prompt = 'Describe the visual characteristics of this image for similarity matching.'
      break
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${env.GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }
        ]
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini analysis failed: ${error}`)
  }

  const data = await response.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> }
  const result = data.candidates[0].content.parts[0].text

  return {
    result,
    model: 'gemini-1.5-pro',
    provider: 'google',
    processingTime: Date.now() - startTime
  }
}

// ============================================================================
// MAIN ORCHESTRATION FUNCTIONS
// ============================================================================

/**
 * Generate image with provider failover
 */
export async function generateImage(
  options: GenerateOptions,
  env: VisionEnv
): Promise<ImageResult> {
  const providers = [
    { name: 'openai', fn: generateWithOpenAI, available: !!env.OPENAI_API_KEY },
    { name: 'stability', fn: generateWithStability, available: !!env.STABILITY_AI_KEY }
  ]

  const availableProviders = providers.filter(p => p.available)

  if (availableProviders.length === 0) {
    throw new Error('No image generation providers available')
  }

  // Shuffle for load balancing
  const shuffledProviders = shuffleArray(availableProviders)

  for (const provider of shuffledProviders) {
    try {
      console.log(`🎨 Attempting generation with ${provider.name}...`)
      const result = await provider.fn(options, env)
      console.log(`✅ Successfully generated with ${provider.name}`)
      return result
    } catch (error) {
      console.error(`❌ ${provider.name} generation failed:`, error)
      continue
    }
  }

  throw new Error('All image generation providers failed')
}

/**
 * Analyze image with provider failover
 */
export async function analyzeImage(
  imageUrl: string,
  options: AnalysisOptions,
  env: VisionEnv
): Promise<AnalysisResult> {
  const providers = [
    { name: 'openai', fn: analyzeWithOpenAI, available: !!env.OPENAI_API_KEY },
    { name: 'claude', fn: analyzeWithClaude, available: !!env.CLAUDE_API_KEY },
    { name: 'gemini', fn: analyzeWithGemini, available: !!env.GOOGLE_API_KEY }
  ]

  const availableProviders = providers.filter(p => p.available)

  if (availableProviders.length === 0) {
    throw new Error('No image analysis providers available')
  }

  // Shuffle for load balancing
  const shuffledProviders = shuffleArray(availableProviders)

  for (const provider of shuffledProviders) {
    try {
      console.log(`🔍 Attempting analysis with ${provider.name}...`)
      const result = await provider.fn(imageUrl, options, env)
      console.log(`✅ Successfully analyzed with ${provider.name}`)
      return result
    } catch (error) {
      console.error(`❌ ${provider.name} analysis failed:`, error)
      continue
    }
  }

  throw new Error('All image analysis providers failed')
}

/**
 * Transform image (image-to-image)
 * Note: Currently uses generation with modified prompt
 * For true I2I, integrate Stability AI's image-to-image endpoint
 */
export async function transformImage(
  sourceImageUrl: string,
  options: TransformOptions,
  env: VisionEnv
): Promise<ImageResult> {
  // For now, use generation with enhanced prompt
  // Future: Implement true image-to-image with Stability AI
  const enhancedPrompt = `Transform the image at ${sourceImageUrl} with: ${options.prompt}`

  return await generateImage(
    {
      prompt: enhancedPrompt,
      progressCallback: options.progressCallback
    },
    env
  )
}
