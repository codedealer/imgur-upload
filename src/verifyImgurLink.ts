import axios from "axios";

/**
 * Verifies if an Imgur link is valid by checking the actual webpage
 * @param imageId The Imgur image ID to verify
 * @returns Promise<boolean> indicating if the image is still valid
 */
async function verifyImgurLink (imageId: string): Promise<boolean> {
  try {
    // Request the actual webpage instead of using the API
    const response = await axios.get(`https://imgur.com/${imageId}`, {
      // Set timeout to avoid hanging on slow requests
      timeout: 10000
    });

    // Check if the status code is > 200 (not ideal)
    if (response.status > 200) {
      console.warn(`Warning: Imgur link ${imageId} returned status code ${response.status}`);
    }

    // Check if the page contains a title tag
    const html = response.data;
    const hasOgTitle = /<meta\s+property="og:title"[^>]*>/i.test(html);

    if (!hasOgTitle) {
      console.log(`${imageId} is removed`);
      return false;
    }

    return true;
  } catch (error: any) {
    // Log specific errors
    if (error.response) {
      console.error(`Error verifying imgur link: Status ${error.response.status}`);
    } else if (error.request) {
      console.error(`Error verifying imgur link: No response received`);
    } else {
      console.error(`Error verifying imgur link: ${error.message}`);
    }

    return false;
  }
}

export { verifyImgurLink };
