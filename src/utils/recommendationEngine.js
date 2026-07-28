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
    
    // Direct key lookup
    let keywords = INTEREST_KEYWORDS[studentInterest];

    // Fallback: If exact key not in dictionary, attempt fuzzy match against dictionary keys
    if (!keywords) {
        const interestLower = studentInterest.toLowerCase();
        for (const [catKey, catKeywords] of Object.entries(INTEREST_KEYWORDS)) {
            if (interestLower.includes(catKey.toLowerCase()) || catKey.toLowerCase().includes(interestLower)) {
                keywords = catKeywords;
                break;
            }
        }
    }

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

// Helper: Calculate exact Proximity score using distance in kilometers
const getProximityScore = (uniLat, uniLng, uniLocation, studentCity, studentCoords = null) => {
    // Safely parse coordinates to float numbers whether stored as numbers or string representations in DB
    const latNum = typeof uniLat === 'number' ? uniLat : parseFloat(uniLat);
    const lngNum = typeof uniLng === 'number' ? uniLng : parseFloat(uniLng);

    let distanceKm = null;

    // If student live GPS coordinates are retrieved from browser dynamically, calculate physical distance in KM!
    if (studentCoords && typeof studentCoords.lat === 'number' && typeof studentCoords.lng === 'number' &&
        !isNaN(latNum) && !isNaN(lngNum)) {
        
        const rawDistance = getHaversineDistance(studentCoords.lat, studentCoords.lng, latNum, lngNum);
        distanceKm = Math.round(rawDistance * 10) / 10; // Round to 1 decimal place (e.g. 3.4 km)

        let locationScore = 8;
        if (distanceKm <= 5) locationScore = 30;         // 0-5 km: 30 Points (Nearest / Same local area)
        else if (distanceKm <= 15) locationScore = 27;    // 5-15 km: 27 Points (Very close)
        else if (distanceKm <= 35) locationScore = 22;    // 15-35 km: 22 Points (Close city radius)
        else if (distanceKm <= 75) locationScore = 17;    // 35-75 km: 17 Points (Nearby region)
        else if (distanceKm <= 150) locationScore = 12;   // 75-150 km: 12 Points (Moderate distance)

        return { locationScore, distanceKm };
    }

    // Fallback: If browser GPS is denied/unavailable, fallback to simple city-name string matching
    if (!studentCity) return { locationScore: 10, distanceKm: null };
    const matched = isLocationMatch(uniLocation, studentCity);
    return { locationScore: matched ? 30 : 10, distanceKm: null };
};

// ─── University Recommendation Score ─────────────────────────────────────────
/**
 * Calculates a 0–100 recommendation score for a university.
 * @param {object} uni - University data object (with calculatedRating, location, degrees []).
 * @param {object} userProfile - Logged-in student's profile.
 * @param {object} studentCoords - Student's live GPS coordinates { lat, lng } (optional).
 * @returns {{ score: number, interestScore: number, locationScore: number, ratingScore: number, matchingCount: number, distanceKm: number|null }}
 */
export const getUniversityScore = (uni, userProfile, studentCoords = null) => {
    if (!userProfile) return { score: 0, interestScore: 0, locationScore: 0, ratingScore: 0, matchingCount: 0, distanceKm: null };

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

    // ── 2. Location Score (max 30 pts) & Distance in KM ───────────────────────
    const { locationScore, distanceKm } = getProximityScore(uni.latitude, uni.longitude, uni.location, userProfile.city, studentCoords);

    // ── 3. Rating Score (max 20 pts) ──────────────────────────────────────────
    const ratingVal = parseFloat(uni.calculatedRating) || 3.5;
    const ratingScore = Math.round((ratingVal / 5) * 20);

    const score = Math.round(interestScore + locationScore + ratingScore);

    return { score, interestScore, locationScore, ratingScore, matchingCount, distanceKm };
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
