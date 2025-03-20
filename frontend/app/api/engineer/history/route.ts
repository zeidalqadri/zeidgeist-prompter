import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

// Define the interface for history items
interface PromptHistoryItem {
  original: string;
  refined: string;
  context?: string;
  timestamp: Date;
}

// Storage directory for prompt history - ensure it uses app directory
const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');

// Ensure the directory exists - create it if it doesn't
function ensureDirectoryExists() {
  if (!fs.existsSync(HISTORY_DIR)) {
    try {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
      console.log(`Created history directory at ${HISTORY_DIR}`);
    } catch (error) {
      console.error(`Failed to create history directory: ${error}`);
      // Fall back to temp directory if we can't create the main one
      return path.join(process.cwd(), 'tmp');
    }
  }
  return HISTORY_DIR;
}

// Get the current history file path (rotating daily)
function getHistoryFilePath(): string {
  const historyDir = ensureDirectoryExists();
  const date = new Date();
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return path.join(historyDir, `prompt-history-${dateStr}.json`);
}

// Save a history item to the current file
async function saveHistoryItem(item: PromptHistoryItem) {
  const filePath = getHistoryFilePath();
  
  let historyItems: PromptHistoryItem[] = [];
  
  // Read existing file if it exists
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      historyItems = JSON.parse(fileContent);
    } catch (error) {
      console.error('Error parsing history file:', error);
    }
  }
  
  // Add the new item
  historyItems.push(item);
  
  // Write back to file
  try {
    fs.writeFileSync(filePath, JSON.stringify(historyItems, null, 2));
    console.log(`Added history item to ${filePath}`);
  } catch (error) {
    console.error(`Error writing to history file: ${error}`);
  }
  
  // If we have many items, notify for ML training
  if (historyItems.length % 10 === 0) {
    console.log(`Collected ${historyItems.length} prompt history items in ${filePath}`);
  }
  
  return historyItems.length;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const historyItem = await request.json();
    
    // Validate the history item
    if (!historyItem.original || !historyItem.refined) {
      return NextResponse.json(
        { error: "Invalid history item: missing required fields" },
        { status: 400 }
      );
    }
    
    // Store the history item
    const count = await saveHistoryItem(historyItem);
    
    // Return success
    return NextResponse.json({ 
      success: true,
      count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error storing prompt history:", error);
    return NextResponse.json(
      { error: "Failed to store prompt history" },
      { status: 500 }
    );
  }
}

// Also implement GET to retrieve history
export async function GET(request: NextRequest) {
  try {
    const filePath = getHistoryFilePath();
    let historyItems: PromptHistoryItem[] = [];
    
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        historyItems = JSON.parse(fileContent);
      } catch (error) {
        console.error('Error reading history file:', error);
      }
    }
    
    return NextResponse.json({ 
      items: historyItems,
      count: historyItems.length
    });
  } catch (error) {
    console.error("Error retrieving prompt history:", error);
    return NextResponse.json(
      { error: "Failed to retrieve prompt history" },
      { status: 500 }
    );
  }
} 