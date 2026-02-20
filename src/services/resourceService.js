/**
 * Resource Service
 * Handles YouTube API integration and Coursera course filtering
 */

import { COURSERA_DATASET } from '../data/courseraData';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

/**
 * Fetch YouTube videos for a given skill and topic
 * Query: "${skill} ${topic} tutorial for beginners"
 * @param {string} topic - The topic title
 * @param {string} skill - The parent skill name
 * @returns {Promise<Array>} Array of video objects
 */
const FALLBACK_VIDEOS = [
    { id: '_uQrJ0TkZlc', title: 'Python Tutorial for Beginners (Full Course)', channel: 'Programming with Mosh', thumbnail: 'https://i.ytimg.com/vi/_uQrJ0TkZlc/hqdefault.jpg' },
    { id: 'bMknfKXIFA8', title: 'React Course - Beginner to Advanced', channel: 'FreeCodeCamp', thumbnail: 'https://i.ytimg.com/vi/bMknfKXIFA8/hqdefault.jpg' },
    { id: 'W6NZfCO5SIk', title: 'JavaScript Tutorial for Beginners', channel: 'Programming with Mosh', thumbnail: 'https://i.ytimg.com/vi/W6NZfCO5SIk/hqdefault.jpg' },
    { id: '8jLOx1hD3_o', title: 'C++ Tutorial for Beginners - Full Course', channel: 'FreeCodeCamp', thumbnail: 'https://i.ytimg.com/vi/8jLOx1hD3_o/hqdefault.jpg' },
    { id: 'nub_pCVPKzTk', title: 'System Design for Beginners Course', channel: 'FreeCodeCamp', thumbnail: 'https://i.ytimg.com/vi/m8Icp_Cid5o/hqdefault.jpg' },
];

export const fetchVideos = async (topic, skill = '') => {
    // 1. SMART QUERY: Strip "01. " numbers and strict 'tutorial'
    const cleanTopic = topic.replace(/^\d+\.\s*/, '').replace(/[^a-zA-Z0-9\s]/g, '');
    const searchQuery = `${skill} ${cleanTopic} complete tutorial`.trim();

    if (YOUTUBE_API_KEY) {
        try {
            const encodedQuery = encodeURIComponent(searchQuery);
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodedQuery}&type=video&key=${YOUTUBE_API_KEY}`
            );

            if (!res.ok) {
                console.warn(`YouTube API error: ${res.status} - Switching to fallback content.`);
                return FALLBACK_VIDEOS;
            }

            const data = await res.json();

            // Allow loose matching: if keywords match title
            const topicKeywords = cleanTopic.toLowerCase().split(/\s+/).filter(w => w.length > 3);

            if (data.items && data.items.length > 0) {
                const apiVideos = data.items.map(item => ({
                    id: item.id.videoId,
                    title: item.snippet.title,
                    channel: item.snippet.channelTitle,
                    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium.url,
                    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                    description: item.snippet.description?.slice(0, 100) + '...'
                }));

                // Strict filter often returns 0 if title is creative. 
                // We return ALL API results but prioritize matches if possible.
                // If API returns things, they are arguably better than Static Fallback.
                return apiVideos;
            }
        } catch (e) {
            console.warn("YouTube API Error:", e.message);
            return FALLBACK_VIDEOS;
        }
    }

    return FALLBACK_VIDEOS;
};

/**
 * Fetch Coursera courses matching topic and skill keywords
 * @param {string} topic - The topic title
 * @param {string} skill - The parent skill name
 * @returns {Array} Filtered array of course objects
 */
export const fetchCourses = (topic, skill = '') => {
    // Moved logic to component or keep strict logic here?
    // User logic is in Component useMemo currently, this is seemingly unused or secondary.
    // We will leave this helper but the main logic is in TopicResources.jsx
    return [];
};

/**
 * Get video embed URL for modal player
 * @param {string} videoId - YouTube video ID
 * @returns {string} Embed URL
 */
export const getVideoEmbedUrl = (videoId) => {
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
};
