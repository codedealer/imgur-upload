import fs from "fs";
import path from "path";
import { Metadata } from "./types";

function getMetadata (filePath: string): Metadata | null {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    // Check if at least one of the required fields exists
    if (!data.videoUrl && !data.videoTitle && !data.titleSuffix) {
      console.warn(`Warning: JSON file ${path.basename(filePath)} does not contain any of the expected fields (videoUrl, videoTitle, titleSuffix)`);
      return null;
    }

    return {
      videoUrl: data.videoUrl,
      videoTitle: data.videoTitle,
      titleSuffix: data.titleSuffix
    };
  } catch (error) {
    console.error(`Error parsing JSON file ${path.basename(filePath)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

export { getMetadata }
