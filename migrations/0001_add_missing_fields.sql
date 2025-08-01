-- Add missing fields to enhancement_logs table
ALTER TABLE "enhancement_logs" 
ADD COLUMN "original_prompt" text,
ADD COLUMN "enhanced_prompt" text,
ADD COLUMN "enhancement_model" text,
ADD COLUMN "response_time" integer,
ADD COLUMN "context" text,
ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;

-- Add missing fields to feedback table
ALTER TABLE "feedback" 
ADD COLUMN "enhancement_id" uuid,
ADD COLUMN "score" integer DEFAULT 0;

-- Add missing fields to training_examples table
ALTER TABLE "training_examples"
ADD COLUMN "category" text,
ADD COLUMN "keywords" text,
ADD COLUMN "metadata" jsonb,
ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;