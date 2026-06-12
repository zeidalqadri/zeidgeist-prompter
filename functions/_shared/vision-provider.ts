import { getClaudeConfig, getOpenAIConfig, getGeminiConfig, setEnvironmentSource } from '../../app/lib/llm/llm-config'

interface VisionResult {
  context: string
  provider: string
  processingTime: number
}

interface VisionProvider {
  name: string
  analyze: (imageBase64: string, mimeType: string) => Promise<string>
}

function buildClaudeVisionProvider(env: Record<string, string>): VisionProvider | null {
  setEnvironmentSource(env)
  const config = getClaudeConfig()
  if (!config.enabled) return null

  return {
    name: 'claude',
    analyze: async (imageBase64: string, mimeType: string): Promise<string> => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mimeType, data: imageBase64 },
              },
              {
                type: 'text',
                text: 'Describe this image in detail for use as context in prompt engineering. Focus on: subject matter, key elements, style/mood, text content (if any), and any notable details. Be concise but thorough.',
              },
            ],
          }],
        }),
        signal: AbortSignal.timeout(config.timeout ?? 30000),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Claude Vision API error ${response.status}: ${errorBody}`)
      }

      const data = await response.json() as { content: Array<{ type: string; text?: string }> }
      const textBlock = data.content.find(b => b.type === 'text')
      if (!textBlock?.text) throw new Error('No text in Claude Vision response')
      return textBlock.text
    },
  }
}

function buildOpenAIVisionProvider(env: Record<string, string>): VisionProvider | null {
  setEnvironmentSource(env)
  const config = getOpenAIConfig()
  if (!config.enabled) return null

  return {
    name: 'openai',
    analyze: async (imageBase64: string, mimeType: string): Promise<string> => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              {
                type: 'text',
                text: 'Describe this image in detail for use as context in prompt engineering. Focus on: subject matter, key elements, style/mood, text content (if any), and any notable details. Be concise but thorough.',
              },
            ],
          }],
        }),
        signal: AbortSignal.timeout(config.timeout ?? 30000),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`OpenAI Vision API error ${response.status}: ${errorBody}`)
      }

      const data = await response.json() as { choices: Array<{ message: { content: string } }> }
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('No content in OpenAI Vision response')
      return content
    },
  }
}

function buildGeminiVisionProvider(env: Record<string, string>): VisionProvider | null {
  setEnvironmentSource(env)
  const config = getGeminiConfig()
  if (!config.enabled) return null

  return {
    name: 'gemini',
    analyze: async (imageBase64: string, mimeType: string): Promise<string> => {
      const model = 'gemini-2.0-flash'
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: 'Describe this image in detail for use as context in prompt engineering. Focus on: subject matter, key elements, style/mood, text content (if any), and any notable details. Be concise but thorough.' },
            ],
          }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
        signal: AbortSignal.timeout(config.timeout ?? 30000),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Gemini Vision API error ${response.status}: ${errorBody}`)
      }

      const data = await response.json() as {
        candidates: Array<{ content: { parts: Array<{ text?: string }> } }>
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('No text in Gemini Vision response')
      return text
    },
  }
}

export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  env: Record<string, string>
): Promise<VisionResult> {
  const providers = [
    buildClaudeVisionProvider(env),
    buildOpenAIVisionProvider(env),
    buildGeminiVisionProvider(env),
  ].filter((p): p is VisionProvider => p !== null)

  if (providers.length === 0) {
    throw new Error('No vision-capable providers configured. Need CLAUDE_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY.')
  }

  const errors: string[] = []

  for (const provider of providers) {
    const start = Date.now()
    try {
      const context = await provider.analyze(imageBase64, mimeType)
      return {
        context,
        provider: provider.name,
        processingTime: Date.now() - start,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[Vision] ${provider.name} failed: ${msg}`)
      errors.push(`${provider.name}: ${msg}`)
    }
  }

  throw new Error(`All vision providers failed: ${errors.join('; ')}`)
}
