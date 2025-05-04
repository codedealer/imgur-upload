import path from "path";
import FormData from "form-data";
import fs from "fs";
import axios from "axios";

async function uploadFile(filePath, progressBars, TIMEOUT = 30000) {
    const bar = progressBars.create(100, 0, {
        filename: path.basename(filePath),
        uploadedMB: 0,
        fileSizeMB: 0
    });

    try {
        const form = new FormData();
        form.append('image', fs.createReadStream(filePath));
        form.append('type', 'file');

        const stats = fs.statSync(filePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        const response = await axios.post('https://api.imgur.com/3/image', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Client-ID ${process.env.CLIENT_ID}`
            },
            timeout: TIMEOUT,
            onUploadProgress: (progressEvent) => {
                const percent = Math.round(
                    (progressEvent.loaded / progressEvent.total) * 100
                );

                bar.update(percent, {
                    uploadedMB: (percent / 100 * fileSizeMB).toFixed(2),
                    fileSizeMB: fileSizeMB
                });
            }
        });

        bar.stop();
        return {
            success: true,
            link: response.data.data.link,
            id: response.data.data.id,
            deletehash: response.data.data.deletehash,
        };
    } catch (error) {
        bar.stop();

        let errorMessage;
        if (error.code === 'ECONNABORTED') {
            errorMessage = `Timeout after ${TIMEOUT / 1000}s`;
        } else {
            errorMessage = error.response?.data?.data?.error || error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

export {uploadFile};
