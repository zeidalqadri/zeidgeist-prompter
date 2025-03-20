import { NextRequest, NextResponse } from "next/server";
import { exportTrainingData, getAllHistoryItems } from "../../../lib/training-utils";

/**
 * API endpoint for exporting prompt history as training data
 */
export async function GET(request: NextRequest) {
  try {
    // Get statistics about the available history
    const historyItems = getAllHistoryItems();
    
    return NextResponse.json({
      historyItems: historyItems.length,
      files: historyItems.length > 0 ? Math.ceil(historyItems.length / 10) : 0,
      oldestItem: historyItems.length > 0 
        ? new Date(Math.min(...historyItems.map(item => new Date(item.timestamp).getTime())))
        : null,
      newestItem: historyItems.length > 0
        ? new Date(Math.max(...historyItems.map(item => new Date(item.timestamp).getTime())))
        : null
    });
  } catch (error) {
    console.error("Error getting training statistics:", error);
    return NextResponse.json(
      { error: "Failed to get training statistics" },
      { status: 500 }
    );
  }
}

/**
 * API endpoint for triggering training data export
 */
export async function POST(request: NextRequest) {
  try {
    // Export training data
    const exportPath = exportTrainingData();
    
    // Return success with info about the export
    return NextResponse.json({
      success: true,
      exportPath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error exporting training data:", error);
    return NextResponse.json(
      { error: "Failed to export training data" },
      { status: 500 }
    );
  }
} 