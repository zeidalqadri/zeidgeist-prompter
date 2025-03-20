import fs from 'fs';
import path from 'path';
import { trainingExamples, TrainingExample } from './training-data';

// Define the interface for history items
interface PromptHistoryItem {
  original: string;
  refined: string;
  context?: string;
  timestamp: Date;
}

// Path to the history directory
const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');

/**
 * Get all history files in the history directory
 */
export function getHistoryFiles(): string[] {
  if (!fs.existsSync(HISTORY_DIR)) {
    return [];
  }
  
  return fs.readdirSync(HISTORY_DIR)
    .filter(file => file.startsWith('prompt-history-') && file.endsWith('.json'))
    .map(file => path.join(HISTORY_DIR, file));
}

/**
 * Read a single history file
 */
export function readHistoryFile(filePath: string): PromptHistoryItem[] {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading history file ${filePath}:`, error);
    return [];
  }
}

/**
 * Read all history items from all files
 */
export function getAllHistoryItems(): PromptHistoryItem[] {
  const files = getHistoryFiles();
  return files.flatMap(file => readHistoryFile(file));
}

/**
 * Convert history items to training examples
 * This analyzes patterns in the history to create properly categorized training examples
 */
export function convertHistoryToTrainingExamples(): TrainingExample[] {
  const historyItems = getAllHistoryItems();
  const newExamples: TrainingExample[] = [];
  
  for (const item of historyItems) {
    // Try to determine domain from the content
    const domain = determineDomain(item.original, item.refined);
    
    // Create a new training example
    newExamples.push({
      rawPrompt: item.original,
      context: item.context,
      enhancedPrompt: item.refined,
      domain
    });
  }
  
  return newExamples;
}

/**
 * Determine the likely domain of a prompt based on content analysis
 */
function determineDomain(original: string, refined: string): string {
  const combinedText = (original + ' ' + refined).toLowerCase();
  
  // Check for domain-specific keywords
  const domainKeywords: Record<string, string[]> = {
    'website': ['website', 'webpage', 'design', 'ui', 'page', 'site'],
    'writing': ['write', 'essay', 'article', 'blog', 'content'],
    'programming': ['code', 'function', 'api', 'programming', 'algorithm'],
    'education': ['explain', 'teach', 'lesson', 'student', 'learning'],
    'healthcare': ['health', 'medical', 'treatment', 'patient', 'doctor'],
    'prompting': ['prompt', 'llm', 'ai', 'gpt', 'instruction'],
    'general': []
  };
  
  // Count keyword matches for each domain
  const domainScores: Record<string, number> = {};
  
  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    domainScores[domain] = keywords.filter(kw => combinedText.includes(kw)).length;
  }
  
  // Find the domain with the highest score
  let bestDomain = 'general';
  let bestScore = 0;
  
  for (const [domain, score] of Object.entries(domainScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }
  
  return bestDomain;
}

/**
 * Export all history and training examples to a single file for ML training
 */
export function exportTrainingData(): string {
  // Get existing training examples
  const baseExamples = [...trainingExamples];
  
  // Convert history to training examples
  const historyExamples = convertHistoryToTrainingExamples();
  
  // Combine examples
  const allExamples = [...baseExamples, ...historyExamples];
  
  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'data', 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create export filename with timestamp
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  const exportFile = path.join(outputDir, `training-export-${timestamp}.json`);
  
  // Write to file
  fs.writeFileSync(exportFile, JSON.stringify(allExamples, null, 2));
  
  console.log(`Exported ${allExamples.length} training examples to ${exportFile}`);
  
  return exportFile;
} 