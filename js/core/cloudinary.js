const CLOUD_NAME = 'dc6d0tiuk';
const UPLOAD_PRESET = 'trackly';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

/**
 * Uploads a string (Base64 data URI) or File object to Cloudinary.
 * @param {string|Blob|File} fileOrBase64 - The file data to upload.
 * @param {string} [customFilename=null] - Optional filename if uploading a Blob/Base64.
 * @returns {Promise<string>} The secure URL of the uploaded file.
 */
export async function uploadFile(fileOrBase64, customFilename = null) {
    const formData = new FormData();

    if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
        // Convert base64 data URI into a Blob
        const res = await fetch(fileOrBase64);
        const blob = await res.blob();
        // Try to guess extension from mime type
        const mimeMatch = fileOrBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
        let ext = '';
        if (mimeMatch && mimeMatch[1]) {
            const mime = mimeMatch[1];
            if (mime === 'image/jpeg') ext = '.jpg';
            else if (mime === 'image/png') ext = '.png';
            else if (mime === 'application/pdf') ext = '.pdf';
            // Add more if needed or rely on Cloudinary's auto detection
        }
        const filename = customFilename || `upload_${Date.now()}${ext}`;
        formData.append('file', blob, filename);
    } else {
        formData.append('file', fileOrBase64);
    }

    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Cloudinary upload failed');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}

export default { uploadFile };
