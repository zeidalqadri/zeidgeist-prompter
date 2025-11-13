-- Migration: Add Image Generation and Analysis Tables
-- Created: 2025-01-13
-- Description: Adds tables for image storage, generation, analysis, and quota management

-- Images table: stores metadata for uploaded and generated images
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  metadata TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  virus_scan_status TEXT DEFAULT 'pending',
  virus_scan_result TEXT,
  has_watermark BOOLEAN DEFAULT false,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Image generations table: tracks text-to-image and image-to-image generations
CREATE TABLE IF NOT EXISTS image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  style TEXT,
  resolution TEXT,
  aspect_ratio TEXT,
  model TEXT,
  provider TEXT,
  parameters TEXT,
  source_image_id UUID REFERENCES images(id),
  result_image_id UUID REFERENCES images(id),
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processing_time INTEGER,
  progress_percent INTEGER DEFAULT 0,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Image analyses table: stores results of image understanding operations
CREATE TABLE IF NOT EXISTS image_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  prompt TEXT,
  result TEXT NOT NULL,
  confidence INTEGER,
  model TEXT,
  provider TEXT,
  processing_time INTEGER,
  metadata TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Image quotas table: tracks daily usage limits per user
CREATE TABLE IF NOT EXISTS image_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  generations_used INTEGER NOT NULL DEFAULT 0,
  uploads_used INTEGER NOT NULL DEFAULT 0,
  analyses_used INTEGER NOT NULL DEFAULT 0,
  last_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_r2_key ON images(r2_key);
CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_generations_user_id ON image_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_image_generations_status ON image_generations(status);
CREATE INDEX IF NOT EXISTS idx_image_generations_created_at ON image_generations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_analyses_image_id ON image_analyses(image_id);
CREATE INDEX IF NOT EXISTS idx_image_analyses_user_id ON image_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_image_analyses_created_at ON image_analyses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_quotas_user_id_date ON image_quotas(user_id, date);

-- Add comments for documentation
COMMENT ON TABLE images IS 'Stores metadata for uploaded and AI-generated images';
COMMENT ON TABLE image_generations IS 'Tracks AI image generation requests and results';
COMMENT ON TABLE image_analyses IS 'Stores AI-powered image analysis results (captions, objects, etc.)';
COMMENT ON TABLE image_quotas IS 'Enforces daily usage limits per user (3 generations, 10 uploads, 20 analyses)';

COMMENT ON COLUMN images.r2_key IS 'Cloudflare R2 storage path for the image file';
COMMENT ON COLUMN images.virus_scan_status IS 'VirusTotal scan result: pending, clean, infected';
COMMENT ON COLUMN images.has_watermark IS 'Whether mstprmpt.zeidgeist.com watermark has been applied';

COMMENT ON COLUMN image_generations.prompt IS 'Text prompt used for image generation';
COMMENT ON COLUMN image_generations.provider IS 'AI provider: openai, stability, google';
COMMENT ON COLUMN image_generations.source_image_id IS 'Source image for image-to-image transformations';

COMMENT ON COLUMN image_analyses.analysis_type IS 'Analysis type: caption, scene, objects, qa, similarity';
COMMENT ON COLUMN image_analyses.confidence IS 'AI confidence score (0-100)';

COMMENT ON COLUMN image_quotas.date IS 'Date in YYYY-MM-DD format (UTC)';
COMMENT ON COLUMN image_quotas.generations_used IS 'Number of images generated today (max 3)';
COMMENT ON COLUMN image_quotas.uploads_used IS 'Number of images uploaded today (max 10)';
COMMENT ON COLUMN image_quotas.analyses_used IS 'Number of analyses performed today (max 20)';
