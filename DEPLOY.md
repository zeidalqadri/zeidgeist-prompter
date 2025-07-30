# 🚀 Deployment Guide - Zeidgeist Prompter

## 📋 Prerequisites

1. **Neon Database Account** (free tier available)
2. **Cloudflare Account** (free tier available)
3. **API Keys** for at least one LLM provider:
   - DeepSeek API Key
   - Mistral API Key
   - Gemini API Key

## 🗄️ Database Setup (Neon)

### 1. Create Neon Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Sign in with `zeidalqadri@gmail.com`
3. Create a new project: **"zeidgeist-prompter"**
4. Copy the connection string (starts with `postgresql://`)

### 2. Run Database Migrations

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="your_neon_connection_string_here"

# Generate migration files
npm run db:generate

# Apply migrations to database
npm run db:migrate
```

### 3. Verify Database Setup

```bash
# Optional: Launch Drizzle Studio to view database
npm run db:studio
```

## ☁️ Cloudflare Pages Deployment

### 1. Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **Create a project**
3. Connect to Git → Select this repository
4. Configure build settings:
   - **Framework preset**: None (use custom settings)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (or path to this directory)

### 2. Environment Variables

In Cloudflare Pages settings, add these environment variables:

```
DATABASE_URL=your_neon_connection_string
DEEPSEEK_API_KEY=your_deepseek_key (optional)
MISTRAL_API_KEY=your_mistral_key (optional)
GEMINI_API_KEY=your_gemini_key (optional)
NODE_ENV=production
```

**Note**: At least one AI API key is required for external enhancement.

### 3. Deploy

1. Click **Save and Deploy**
2. Cloudflare will automatically build and deploy
3. Your app will be available at: `https://your-project.pages.dev`

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your actual values
nano .env.local

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## 📊 Database Schema

The application uses these tables:

- **`prompt_history`**: Stores enhancement history for user interface
- **`feedback`**: Collects user ratings and comments for improvements  
- **`enhancement_logs`**: Analytics data for monitoring performance
- **`training_examples`**: Dynamic learning examples for local enhancement

## 🔍 Monitoring

### Analytics Available:
- Enhancement success rates by provider
- Processing times and performance metrics
- User feedback sentiment analysis
- Usage patterns and popular prompt types

### Database Queries:
```sql
-- View recent enhancements
SELECT * FROM enhancement_logs ORDER BY timestamp DESC LIMIT 10;

-- Check feedback sentiment
SELECT was_successful, COUNT(*) FROM feedback GROUP BY was_successful;

-- Performance by provider
SELECT source, AVG(processing_time) FROM enhancement_logs GROUP BY source;
```

## 🔐 Security Notes

- Database connection uses SSL by default
- API keys are stored as environment variables
- User IP addresses are partially masked in logs
- No personal information is stored permanently

## 🛠️ Advanced Configuration

### Custom Domain (Optional)
1. In Cloudflare Pages → Custom domains
2. Add your domain
3. Update DNS records as instructed

### Build Optimization
- Next.js automatically optimizes for production
- Static assets are cached via Cloudflare CDN
- Database queries are optimized with indexes

## 📞 Support

For deployment issues:
1. Check Cloudflare Pages build logs
2. Verify all environment variables are set
3. Ensure database connection string is correct
4. Test API keys independently

## 🔄 Updates

### Recent Deployment Fixes (July 2025)

The deployment configuration has been updated to fix 404 errors and routing issues:

1. **Build Output Directory**: Changed from `.next` to `dist`
   - Next.js exports to `out/` directory by default
   - Custom build script moves `out/` to `dist/` for Cloudflare

2. **Routing Configuration**: Updated `_routes.json`
   - API routes (`/api/*`) are handled by Cloudflare Functions
   - Static assets are served directly by Cloudflare CDN
   - Added specific exclusions for static file types

3. **Security Headers**: Added `_headers` file
   - X-Frame-Options, X-Content-Type-Options, Referrer-Policy
   - Cache control headers for optimal performance
   - Different caching strategies for static vs dynamic content

4. **Build Process**: Custom build script (`scripts/build-cloudflare.js`)
   - Ensures proper file structure for Cloudflare Pages
   - Copies routing and header configurations
   - Creates 404.html for proper error handling

5. **Key Configuration Files**:
   - `wrangler.toml`: Cloudflare Pages configuration
   - `_routes.json`: API routing rules
   - `_headers`: Security and caching headers
   - `next.config.js`: Static export configuration

To deploy updates:
1. Push changes to main branch
2. Cloudflare automatically rebuilds and deploys
3. Database migrations run automatically if needed