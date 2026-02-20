/**
 * Cloudinary Upload Utility
 * Uploads images to Cloudinary and returns the secure URL
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a single file to Cloudinary
 * @param {File} file - The file to upload
 * @param {string} folder - Optional folder name in Cloudinary
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadToCloudinary = async (file, folder = 'edunest') => {
    if (!file) {
        throw new Error('No file provided');
    }

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error('Cloudinary configuration missing. Check environment variables.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Upload failed');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};

/**
 * Upload multiple files to Cloudinary concurrently
 * @param {File[]} files - Array of files to upload
 * @param {string} folder - Optional folder name in Cloudinary
 * @param {function} onProgress - Optional callback for progress updates (index, total)
 * @returns {Promise<string[]>} - Array of secure URLs
 */
export const uploadMultipleToCloudinary = async (files, folder = 'edunest', onProgress = null) => {
    if (!files || files.length === 0) {
        return [];
    }

    const uploadPromises = files.map(async (file, index) => {
        const url = await uploadToCloudinary(file, folder);
        if (onProgress) {
            onProgress(index + 1, files.length);
        }
        return url;
    });

    return Promise.all(uploadPromises);
};

/**
 * Validate image file before upload
 * @param {File} file - The file to validate
 * @param {number} maxSizeMB - Maximum file size in MB (default 5MB)
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateImageFile = (file, maxSizeMB = 5) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.'
        };
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return {
            valid: false,
            error: `File too large. Maximum size is ${maxSizeMB}MB.`
        };
    }

    return { valid: true };
};

export default uploadToCloudinary;
