CREATE TABLE "enhancement_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_length" integer NOT NULL,
	"has_context" boolean NOT NULL,
	"is_refinement" boolean NOT NULL,
	"is_expansion" boolean NOT NULL,
	"repeat_count" integer DEFAULT 0,
	"source" text NOT NULL,
	"processing_time" integer,
	"was_identical" boolean DEFAULT false,
	"had_error" boolean DEFAULT false,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_prompt" text NOT NULL,
	"enhanced_prompt" text NOT NULL,
	"was_successful" boolean NOT NULL,
	"feedback_text" text,
	"user_agent" text,
	"ip_address" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original" text NOT NULL,
	"refined" text NOT NULL,
	"context" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_examples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_prompt" text NOT NULL,
	"enhanced_prompt" text NOT NULL,
	"context" text,
	"source" text NOT NULL,
	"quality" integer DEFAULT 0,
	"usage_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
