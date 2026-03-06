#!/usr/bin/env node

/**
 * Migration script to convert old playlist format to new layout-based format
 * 
 * Usage: tsx scripts/migrate-playlist-to-layouts.ts <path-to-playlist-file.json>
 * 
 * This script:
 * 1. Reads a playlist file in the old format
 * 2. Creates a backup of the original file
 * 3. Converts each playlist item to the new format:
 *    - Adds layout: "full" (default for single callback)
 *    - Converts callbackName + options to callbacks array with one element
 * 4. Writes the migrated playlist back to the file
 */

import fs from "node:fs/promises";
import path from "node:path";

interface OldPlaylistItem {
  id: string;
  callbackName: string;
  options?: Record<string, unknown>;
}

interface NewPlaylistItem {
  id: string;
  layout: "full" | "split";
  callbacks: Array<{
    name: string;
    options?: Record<string, unknown>;
  }>;
}

type OldPlaylist = OldPlaylistItem[];
type NewPlaylist = NewPlaylistItem[];

function migratePlaylistItem(oldItem: OldPlaylistItem): NewPlaylistItem {
  return {
    id: oldItem.id,
    layout: "full",
    callbacks: [
      {
        name: oldItem.callbackName,
        options: oldItem.options,
      },
    ],
  };
}

function migratePlaylist(oldPlaylist: OldPlaylist): NewPlaylist {
  return oldPlaylist.map(migratePlaylistItem);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("Error: Please provide a path to the playlist JSON file");
    console.error("Usage: tsx scripts/migrate-playlist-to-layouts.ts <path-to-playlist-file.json>");
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  try {
    // Check if file exists
    await fs.access(filePath);
  } catch (error) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    // Read the original file
    const fileContent = await fs.readFile(filePath, "utf-8");
    console.log(`Reading playlist from: ${filePath}`);

    // Parse the JSON
    let data: any;
    try {
      data = JSON.parse(fileContent);
    } catch (error) {
      console.error("Error: Invalid JSON in file");
      throw error;
    }

    // Handle both direct array and object with playlist property
    let oldPlaylist: OldPlaylist;
    if (Array.isArray(data)) {
      oldPlaylist = data;
    } else if (data.playlist && Array.isArray(data.playlist)) {
      oldPlaylist = data.playlist;
    } else {
      console.error("Error: Invalid playlist format. Expected an array or object with 'playlist' property");
      process.exit(1);
    }

    // Check if already migrated (has layout property)
    const hasNewFormat = oldPlaylist.some((item: any) => "layout" in item);
    if (hasNewFormat) {
      console.log("Warning: File appears to already be in the new format (has 'layout' property)");
      const response = await new Promise<string>((resolve) => {
        process.stdout.write("Continue anyway? (y/n): ");
        process.stdin.once("data", (data) => resolve(data.toString().trim()));
      });
      
      if (response.toLowerCase() !== "y") {
        console.log("Migration cancelled");
        process.exit(0);
      }
    }

    // Create backup
    const backupPath = `${filePath}.backup-${Date.now()}`;
    await fs.writeFile(backupPath, fileContent, "utf-8");
    console.log(`Created backup: ${backupPath}`);

    // Migrate the playlist
    const newPlaylist = migratePlaylist(oldPlaylist);
    console.log(`Migrated ${newPlaylist.length} playlist items`);

    // Prepare output data
    let outputData: any;
    if (Array.isArray(data)) {
      outputData = newPlaylist;
    } else {
      outputData = { ...data, playlist: newPlaylist };
    }

    // Write the migrated playlist
    const outputJson = JSON.stringify(outputData, null, 2);
    await fs.writeFile(filePath, outputJson, "utf-8");
    console.log(`Migration complete! Migrated playlist saved to: ${filePath}`);
    console.log("\nSummary:");
    console.log(`  - Items migrated: ${newPlaylist.length}`);
    console.log(`  - All items set to layout: "full"`);
    console.log(`  - Backup saved to: ${backupPath}`);

  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

main();
