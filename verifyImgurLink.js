import axios from 'axios';

/**
 * Verifies if an Imgur link is shadowbanned by checking for title tags in the HTML
 * @returns {Promise<boolean>} - True if the link is valid (not shadowbanned), false otherwise
 * @param {string} imgurId
 */
async function verifyImgurLink(imgurId) {
    try {
        if (!imgurId) {
            throw new Error('Invalid Imgur id');
        }

        // Make a GET request to the Imgur page
        const response = await axios.get(`https://imgur.com/${imgurId}`, {
            headers: {
                // Set a user agent to mimic a browser request
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const htmlContent = response.data;

        // For normal videos, the HTML page should contain a <title> tag
        // For shadowbanned videos, the <title> tag will be missing
        const hasTitleTag = htmlContent.includes('<title>') && htmlContent.includes('</title>');
        if (!hasTitleTag) {
            console.log(`${imgurId} is banned.`);
        }

        return hasTitleTag;
    } catch (error) {
        console.error('Error verifying Imgur link:', error.message);
        return false;
    }
}

export {verifyImgurLink};
