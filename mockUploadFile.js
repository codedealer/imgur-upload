import path from 'path';
import fs from 'fs';

async function mockUploadFile(filePath, progressBars) {
    const bar = progressBars.create(100, 0, {
        filename: path.basename(filePath),
        uploadedMB: 0,
        fileSizeMB: 0
    });

    try {
        // Get actual file size for realistic progress simulation
        const stats = fs.statSync(filePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        // Simulate upload progress
        for (let percent = 0; percent <= 100; percent += 10) {
            bar.update(percent, {
                uploadedMB: (percent / 100 * fileSizeMB).toFixed(2),
                fileSizeMB: fileSizeMB
            });

            // Add delay to simulate network activity
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        bar.stop();

        // Generate mock response data
        const mockId = `mock_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

        return {
            success: true,
            link: `https://i.imgur.com/${mockId}.mp4`,
            id: mockId,
            deletehash: `mock_deletehash_${mockId}`,
            file: filePath
        };
    } catch (error) {
        bar.stop();
        return {
            success: false,
            error: `Mock upload error: ${error.message}`,
            file: filePath
        };
    }
}

export {mockUploadFile};
