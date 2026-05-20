/**
 * EduNest Recommendation Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Hybrid weighted scoring system for University & Program recommendations.
 *
 * Score = (InterestMatch × 50%) + (LocationProximity × 30%) + (RatingStrength × 20%)
 */

// ─── Interest → Keywords Semantic Dictionary ──────────────────────────────────
// Maps each AI-identified interest category to relevant program title keywords.
export const INTEREST_KEYWORDS = {
    'Computer Science': [
        'computer', 'software', 'cs', 'it', 'information technology',
        'coding', 'web', 'ai', 'artificial intelligence', 'data science',
        'cyber', 'network', 'computing', 'programming', 'systems',
        'database', 'cloud', 'machine learning', 'algorithm',
    ],
    'Mathematics': [
        'math', 'mathematics', 'statistics', 'actuarial', 'algebra',
        'calculus', 'quantitative', 'financial math',
    ],
    'Biology': [
        'bio', 'biology', 'medical', 'mbbs', 'bds', 'pharma', 'biotech',
        'zoology', 'botany', 'dentistry', 'genetics', 'microbiology',
        'physiology', 'biochemistry', 'life science', 'nursing', 'pharm',
    ],
    'Chemistry': [
        'chem', 'chemistry', 'chemical', 'biochem', 'pharmacy',
        'pharm-d', 'pharmaceutical', 'materials',
    ],
    'Psychology': [
        'psychology', 'psych', 'behavior', 'behavioral', 'counseling',
        'mental', 'social science', 'sociology', 'cognitive',
    ],
    'Graphics / Design': [
        'graphic', 'design', 'visual', 'fine arts', 'fashion',
        'interior', 'architecture', 'animation', 'media', 'film',
        'arts', 'communication design', 'advertising',
    ],
    'Physics': [
        'physics', 'physical', 'electronics', 'astrophysics',
        'geophysics', 'electrical', 'mechanical', 'civil', 'engineering',
        'telecommunication', 'aerospace',
    ],
};

// ─── Mathematical Haversine Distance Formula (km) ─────────────────────────────
export const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's Radius in Kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in Kilometers
};

// ─── Core Interest Match Function ─────────────────────────────────────────────
export const getInterestMatchType = (programTitle, studentInterest) => {
    if (!studentInterest || !programTitle) return 'none';
    const keywords = INTEREST_KEYWORDS[studentInterest];
    if (!keywords) return 'none';
    const titleLower = programTitle.toLowerCase();
    return keywords.some((kw) => titleLower.includes(kw)) ? 'direct' : 'none';
};

// ─── Location Match Function ──────────────────────────────────────────────────
export const isLocationMatch = (uniLocation, studentCity) => {
    if (!uniLocation || !studentCity) return false;
    return uniLocation.toLowerCase().includes(studentCity.toLowerCase()) ||
        studentCity.toLowerCase().includes(uniLocation.toLowerCase());
};

// Helper: Calculate exact Proximity score using distance
const getProximityScore = (uniLat, uniLng, uniLocation, studentCity, studentCoords = null) => {
    // If student live GPS coordinates are retrieved from browser dynamically, calculate physical distance in KM!
    if (studentCoords && typeof studentCoords.lat === 'number' && typeof studentCoords.lng === 'number' &&
        typeof uniLat === 'number' && typeof uniLng === 'number') {
        
        const distance = getHaversineDistance(studentCoords.lat, studentCoords.lng, uniLat, uniLng);
        
        if (distance <= 15) return 30;  // 0-15 km: 30 Points (Nearest / Same area)
        if (distance <= 50) return 20;  // 15-50 km: 20 Points (Close)
        if (distance <= 150) return 15; // 50-150 km: 15 Points (Moderate distance)
        return 10;                      // 150+ km: 10 Points (Far)
    }

    // Fallback: If browser GPS is denied/unavailable, fallback to simple city-name string matching
    if (!studentCity) return 10;
    return isLocationMatch(uniLocation, studentCity) ? 30 : 10;
};

// ─── University Recommendation Score ─────────────────────────────────────────
/**
 * Calculates a 0–100 recommendation score for a university.
 * @param {object} uni - University data object (with calculatedRating, location, degrees []).
 * @param {object} userProfile - Logged-in student's profile.
 * @param {object} studentCoords - Student's live GPS coordinates { lat, lng } (optional).
 * @returns {{ score: number, interestScore: number, locationScore: number, ratingScore: number, matchingCount: number }}
 */
export const getUniversityScore = (uni, userProfile, studentCoords = null) => {
    if (!userProfile) return { score: 0, interestScore: 0, locationScore: 0, ratingScore: 0, matchingCount: 0 };

    const degrees = uni._degrees || [];

    // ── 1. Interest Score (max 50 pts) ────────────────────────────────────────
    const matchingPrograms = degrees.filter(
        (d) => getInterestMatchType(d.title || d.programName || '', userProfile.interest) === 'direct'
    );
    const matchingCount = matchingPrograms.length;
    let interestScore = 0;
    if (matchingCount >= 3) interestScore = 50;
    else if (matchingCount === 2) interestScore = 45;
    else if (matchingCount === 1) interestScore = 40;

    // ── 2. Location Score (max 30 pts) ────────────────────────────────────────
    const locationScore = getProximityScore(uni.latitude, uni.longitude, uni.location, userProfile.city, studentCoords);

    // ── 3. Rating Score (max 20 pts) ──────────────────────────────────────────
    const ratingVal = parseFloat(uni.calculatedRating) || 3.5;
    const ratingScore = Math.round((ratingVal / 5) * 20);

    const score = Math.round(interestScore + locationScore + ratingScore);

    return { score, interestScore, locationScore, ratingScore, matchingCount };
};

// ─── Program Recommendation Score ────────────────────────────────────────────
/**
 * Calculates a 0–100 recommendation score for a degree program.
 * @param {object} prog - Program data object (with uniData nested).
 * @param {object} userProfile - Logged-in student's profile.
 * @param {object} studentCoords - Student's live GPS coordinates { lat, lng } (optional).
 * @returns {{ score: number, isInterestMatch: boolean, isLocalMatch: boolean }}
 */
export const getProgramScore = (prog, userProfile, studentCoords = null) => {
    if (!userProfile) return { score: 0, isInterestMatch: false, isLocalMatch: false };

    const title = prog.title || prog.programName || prog.name || '';

    // ── 1. Interest Score (max 50 pts) ────────────────────────────────────────
    const matchType = getInterestMatchType(title, userProfile.interest);
    const isInterestMatch = matchType === 'direct';
    const interestScore = isInterestMatch ? 50 : 0;

    // ── 2. Location Score (max 30 pts) ────────────────────────────────────────
    const uniLocation = prog.uniData?.location || '';
    const locationScore = getProximityScore(
        prog.uniData?.latitude, 
        prog.uniData?.longitude, 
        uniLocation, 
        userProfile.city,
        studentCoords
    );
    const isLocalMatch = locationScore >= 20; // 20 points means it is close (<= 50km)

    // ── 3. Rating Score (max 20 pts) ──────────────────────────────────────────
    const ratingVal = parseFloat(prog.uniData?.calculatedRating) || 3.5;
    const ratingScore = Math.round((ratingVal / 5) * 20);

    const score = Math.round(interestScore + locationScore + ratingScore);

    return { score, isInterestMatch, isLocalMatch };
};

// ─── Minimum score to be featured in "Recommended for You" ───────────────────
export const RECOMMENDATION_THRESHOLD = 50;
