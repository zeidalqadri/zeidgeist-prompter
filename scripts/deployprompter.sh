#!/bin/bash
set -e

echo "Reorganizing project structure..."

# Step 1: Ensure backend and frontend-new are correctly set up
if [ ! -d "backend" ] || [ ! -d "frontend-new" ]; then
  echo "Error: backend or frontend-new directories not found. Run setup commands first."
  exit 1
fi

# Step 2: Back up original package.json
cp package.json package.json.original

# Step 3: Set up monorepo structure
mv package.json.monorepo package.json

# Step 4: Set up .gitignore
cat << EOF > .gitignore
node_modules
.env
.env.local
.next
dist
build
.DS_Store
*.log
EOF

# Step 5: Create README.md
cat << EOF > README.md
# Zeidgeist Prompter

A self-optimizing prompt enhancement system.

## Project Structure

- **backend/**: API server and prompt enhancement engine
- **frontend-new/**: Next.js web application

## Getting Started

\`\`\`bash
# Install dependencies for the monorepo
npm install

# Run both frontend and backend in development mode
npm run dev
\`\`\`

## Development

- **Frontend only**: \`npm run frontend:dev\`
- **Backend only**: \`npm run backend:dev\`
- **Build for production**: \`npm run build\`
- **Start in production mode**: \`npm start\`
EOF

echo "Reorganization complete. You can now run the project with: npm run dev" 