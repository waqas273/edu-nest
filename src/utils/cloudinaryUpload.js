/**
 * Cloudinary Upload Utility
 * Uploads images to Cloudinary and returns the secure URL
 */

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a single file to Cloudinary
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadToCloudinary = async (file) => {
    if (!file) {
        throw new Error('No file provided');
    }

    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary configuration missing. Check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET environment variables.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
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
 * Upload multiple files to Cloudinary concurrently using Promise.all
 * @param {File[]} files - An array of files to upload
 * @returns {Promise<string[]>} - An array of secure URLs
 */
export const uploadMultipleToCloudinary = async (files) => {
    try {
        const uploadPromises = files.map(file => uploadToCloudinary(file));
        const urls = await Promise.all(uploadPromises);
        return urls;
    } catch (error) {
        console.error('Multiple upload error:', error);
        throw error;
    }
};

/**
 * Validate an image file before upload
 * @param {File} file - The file to validate
 * @returns {{isValid: boolean, error: string|null}} - validation result
 */
export const validateImageFile = (file) => {
    if (!file) {
        return { isValid: false, error: "No file selected." };
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
        return { isValid: false, error: "Please upload a valid image file." };
    }

    // Check file size (e.g., max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        return { isValid: false, error: "Image size must be less than 5MB." };
    }

    return { isValid: true, error: null };
};
