# Image Generation & Contextual Understanding Feature

## Overview

This document describes the advanced image generation and contextual understanding capabilities added to mstprmpt.zeidgeist.com.

## Features Implemented

### 1. Text-to-Image Generation
- **Multiple AI Providers**: OpenAI DALL-E 3, Stability AI (with automatic failover)
- **Styles**: Photorealistic, Artistic, Sketch, Abstract, Cartoon, 3D Render
- **Resolutions**: 1024x1024 (Square), 1024x1792 (Portrait), 1792x1024 (Landscape)
- **Daily Quota**: 3 generations per user per day
- **Automatic Watermarking**: Small mstprmpt.zeidgeist.com logo at top-left corner (20% opacity)
- **Real-time Progress**: Live progress updates during generation

### 2. Image Upload & Storage
- **Supported Formats**: JPEG, PNG, WebP
- **Max File Size**: 10MB
- **Virus Scanning**: VirusTotal API integration for security
- **Storage**: Cloudflare R2 with CDN distribution
- **Daily Quota**: 10 uploads per user per day

### 3. Contextual Understanding
- **Analysis Types**:
  - Caption: Detailed image descriptions
  - Scene: Setting and atmosphere analysis
  - Objects: Object detection with locations
  - Q&A: Answer questions about images
- **AI Providers**: GPT-4 Vision, Claude 3.5 Sonnet, Gemini 1.5 Pro (with automatic failover)
- **Daily Quota**: 20 analyses per user per day

### 4. Image-to-Image Transformation
- **Operations**: Style transfer, object removal, color adjustment
- **Provider**: Stability AI
- **Watermarking**: Applied to all transformed images

## Architecture

### Backend Components

#### Database Schema (`app/lib/db/schema.ts`)
- **images**: Image metadata and R2 storage keys
- **imageGenerations**: Generation requests and results
- **imageAnalyses**: Analysis results
- **imageQuotas**: Daily usage tracking

#### Storage Layer (`functions/_shared/image-storage.ts`)
- R2 upload/download/delete operations
- File validation (type, size, headers)
- Automatic dimension extraction

#### Security (`functions/_shared/virus-scanner.ts`)
- VirusTotal API integration
- Quick header validation (malware detection)
- Executable file detection

#### Watermarking (`functions/_shared/watermark.ts`)
- Canvas API-based image overlay
- mstprmpt.zeidgeist.com logo application
- Configurable opacity and positioning

#### Vision Providers (`functions/_shared/vision-providers.ts`)
- Multi-provider architecture mirroring llm-enhancer.ts
- Automatic failover and load balancing
- **Generation Providers**:
  - OpenAI DALL-E 3
  - Stability AI (Stable Diffusion XL)
- **Analysis Providers**:
  - OpenAI GPT-4 Vision
  - Claude 3.5 Sonnet Vision
  - Google Gemini 1.5 Pro Vision

#### Progress Tracking (`functions/_shared/progress-tracker.ts`)
- Cloudflare KV-based real-time updates
- 15-minute TTL for progress data
- Polling-based frontend integration

#### Quota Management (`functions/_shared/quota-manager.ts`)
- Daily limits: 3 generations, 10 uploads, 20 analyses
- Automatic midnight UTC reset
- User-isolated quota tracking

#### GDPR Compliance (`functions/_shared/gdpr-image-compliance.ts`)
- Image data export (Article 15)
- Image data deletion (Article 17)
- Image data anonymization
- Data portability (Article 20)

### API Endpoints

#### POST `/api/images/upload`
Upload an image with virus scanning.

**Request**: `multipart/form-data` with file
**Response**:
```json
{
  "success": true,
  "imageId": "uuid",
  "publicUrl": "https://images.mstprmpt.zeidgeist.com/...",
  "dimensions": { "width": 1024, "height": 1024 }
}
```

#### POST `/api/images/generate`
Generate an image from text prompt.

**Request**:
```json
{
  "prompt": "A serene mountain landscape at sunset",
  "style": "photorealistic",
  "resolution": "1024x1024"
}
```

**Response**:
```json
{
  "success": true,
  "taskId": "uuid",
  "imageId": "uuid",
  "imageUrl": "https://images.mstprmpt.zeidgeist.com/...",
  "model": "dall-e-3",
  "provider": "openai"
}
```

#### POST `/api/images/analyze`
Analyze an image with AI.

**Request**:
```json
{
  "imageId": "uuid",
  "analysisType": "caption",
  "prompt": "What is in this image?" // for Q&A type
}
```

**Response**:
```json
{
  "success": true,
  "result": "A beautiful sunset over mountains...",
  "confidence": 95,
  "model": "gpt-4-vision-preview",
  "provider": "openai"
}
```

#### GET `/api/images/progress/:taskId`
Poll generation progress.

**Response**:
```json
{
  "taskId": "uuid",
  "status": "processing",
  "percent": 75,
  "message": "Applying watermark...",
  "startedAt": "2025-01-13T...",
  "updatedAt": "2025-01-13T..."
}
```

#### GET `/api/images/quota`
Check daily quota status.

**Response**:
```json
{
  "userId": "uuid",
  "date": "2025-01-13",
  "generationsUsed": 1,
  "generationsRemaining": 2,
  "uploadsUsed": 3,
  "uploadsRemaining": 7,
  "analysesUsed": 5,
  "analysesRemaining": 15,
  "resetAt": "2025-01-14T00:00:00.000Z"
}
```

### Frontend Components

#### `/app/images/page.tsx`
Main image studio page with tabbed interface:
- Generate: Text-to-image generation
- Upload: Image upload with drag-drop
- Analyze: Image analysis

#### `components/images/image-generator.tsx`
- Prompt input with textarea
- Style selector (6 styles)
- Resolution selector
- Real-time progress bar
- Quota display
- Image preview with download/copy

#### `components/images/image-uploader.tsx`
- Drag-drop file upload
- File validation (client-side)
- Upload progress indicator
- Virus scan status display

#### `components/images/image-analyzer.tsx`
- Image ID input
- Analysis type selector
- Q&A prompt input (conditional)
- Results display with confidence

#### `components/ui/progress-bar.tsx`
- Animated progress visualization
- Status message display
- Color-coded status (processing/completed/failed)

#### `components/ui/style-selector.tsx`
- Grid layout with style cards
- Visual descriptions
- Active state highlighting

## Configuration

### Environment Variables

Add to Cloudflare Pages environment:

```bash
# AI Provider API Keys
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...
STABILITY_AI_KEY=sk-...
GOOGLE_API_KEY=...

# Security
VIRUSTOTAL_API_KEY=...  # Optional, falls back to header validation

# Storage
R2_PUBLIC_URL=https://images.mstprmpt.zeidgeist.com
```

### Cloudflare R2 Buckets

Create R2 buckets:
- **Production**: `zeidgeist-images-prod`
- **Preview**: `zeidgeist-images-dev`

Configure public access via custom domain `images.mstprmpt.zeidgeist.com`

### Cloudflare KV Namespaces

Create KV namespace:
- **Binding**: `PROGRESS_TRACKER`
- **Production**: `progress_tracker_prod`
- **Preview**: `progress_tracker_dev`

## Deployment

### 1. Database Migration

Run the migration SQL:
```bash
psql $DATABASE_URL < migrations/001_add_image_tables.sql
```

### 2. Generate Drizzle Schema

```bash
npm run db:generate
npm run db:push
```

### 3. Set Environment Variables

In Cloudflare Pages dashboard:
1. Go to Settings > Environment Variables
2. Add all required API keys
3. Deploy to activate

### 4. Deploy Application

```bash
npm run build
npx wrangler pages deploy
```

## Rate Limiting

Image endpoints have specific rate limits:

- `/api/images/generate`: 3 requests per 24 hours
- `/api/images/upload`: 10 requests per 24 hours
- `/api/images/analyze`: 20 requests per 24 hours
- `/api/images/quota`: 30 requests per minute

Rate limits are enforced at both application level (quota-manager.ts) and network level (rate-limiter.ts).

## Security Features

### 1. Virus Scanning
- VirusTotal API integration
- Fallback to header validation
- Quarantine infected files
- Comprehensive logging

### 2. Input Validation
- File type whitelist (JPEG, PNG, WebP)
- File size limits (10MB upload, unlimited generated)
- Executable file detection
- MIME type verification

### 3. Content Security Policy
Updated CSP headers to allow:
- `img-src 'self' data: https: images.mstprmpt.zeidgeist.com`
- `connect-src 'self' api.openai.com api.anthropic.com generativelanguage.googleapis.com api.stability.ai`

### 4. GDPR Compliance
- User-isolated data storage
- Right to access: Image data export
- Right to erasure: Complete deletion from R2 and database
- Right to restriction: Data anonymization
- Audit logging for all operations

## Testing

### Unit Tests
```bash
npm run test -- vision-providers.test.ts
npm run test -- image-storage.test.ts
npm run test -- quota-manager.test.ts
```

### Integration Tests
```bash
npm run test:integration -- image-generation.test.ts
npm run test:integration -- image-analysis.test.ts
```

### E2E Tests
```bash
npm run test:e2e -- image-workflow.spec.ts
```

## Performance Monitoring

### Metrics Tracked
- Total generations, uploads, analyses
- Success rate per provider
- Average processing time
- System uptime
- Quota usage per day

### Monitoring Endpoint
```bash
GET /api/images/stats
```

## Cost Estimation

### API Costs (per operation)
- DALL-E 3: $0.040 (standard) - $0.120 (HD)
- Stable Diffusion XL: ~$0.03
- GPT-4 Vision: ~$0.01-0.03
- Claude 3.5 Sonnet Vision: ~$0.01-0.02
- Gemini 1.5 Pro Vision: ~$0.01

### Monthly Cost Estimate
With 100 active users:
- Generations: 100 users × 3/day × 30 days × $0.04 = $360/month
- Analyses: 100 users × 5/day × 30 days × $0.02 = $300/month
- **Total**: ~$660/month

R2 Storage: ~$0.015/GB/month (negligible for images)

## Troubleshooting

### Common Issues

#### 1. "Quota exceeded" error
- **Cause**: User has reached daily limit
- **Solution**: Wait until midnight UTC or contact admin for reset

#### 2. "Generation failed" error
- **Cause**: All providers failed
- **Solution**: Check provider API keys and status
- **Logs**: Check console for specific provider errors

#### 3. "Virus scan failed" error
- **Cause**: Infected file or invalid VirusTotal key
- **Solution**: Use different file or check VirusTotal API key

#### 4. Progress stuck at 0%
- **Cause**: KV namespace not configured
- **Solution**: Verify PROGRESS_TRACKER binding in wrangler.toml

#### 5. Images not displaying
- **Cause**: R2 public URL not configured
- **Solution**: Set R2_PUBLIC_URL environment variable

## Future Enhancements

### Planned Features
1. ✅ Text-to-image generation
2. ✅ Image analysis
3. ⏳ Image gallery with search
4. ⏳ Batch processing queue
5. ⏳ Version control for generated images
6. ⏳ Image editing tools (crop, resize, filters)
7. ⏳ Social sharing integration
8. ⏳ Premium tier with higher quotas

### Provider Additions
- Midjourney API (when available)
- Adobe Firefly
- Runway ML

## Support

For issues or questions:
- Email: support@mstprmpt.zeidgeist.com
- GitHub: https://github.com/zeidgeist/prompter/issues

## License

All generated images include mstprmpt.zeidgeist.com watermark and are subject to the platform's terms of service.
