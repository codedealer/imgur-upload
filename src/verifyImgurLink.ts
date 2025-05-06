import axios from "axios";

/**
 * Verifies if an Imgur link is valid by checking its status
 */
async function verifyImgurLink (imageId: string): Promise<boolean> {
  try {
    // Call the Imgur API to check if the image exists
    const response = await axios.get(`https://api.imgur.com/3/image/${imageId}`, {
      headers: {
        'Authorization': `Client-ID ${process.env.CLIENT_ID}`
      }
    });

    return response.status === 200 && response.data.success;
  } catch (error) {
    // If we get an error, the image is likely invalid
    return false;
  }
}

export { verifyImgurLink };
