
// Helper to normalize strings for comparison
export const normalize = (str) => str?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

// Helper to parse grade (handle CGPA vs Percentage)
export const parseGrade = (value) => {
    if (!value) return 0;
    let num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return 0;

    // Heuristic: If value <= 5.0, assume it's CGPA (4.0 or 5.0 scale)
    // Convert to approximate percentage for eligibility check
    // Formula: (CGPA / 4.0) * 100 (Standard approximation)
    if (num <= 5.0) {
        return (num / 4.0) * 100;
    }
    // Otherwise assume percentage
    return num;
};

// Helper to check for degree match
export const isDegreeMatch = (criteriaTitle, studentDegree) => {
    const c = normalize(criteriaTitle);
    const s = normalize(studentDegree);

    // Simple inclusion check works because of standardized "System - Level - Group" format.
    // Student string will be equal to or longer (more specific) than criteria.
    return s.includes(c);
};

export const getBestScholarship = (scholarships, studentProfile) => {
    if (!scholarships || scholarships.length === 0) return null;
    if (!studentProfile?.educationHistory || studentProfile.educationHistory.length === 0) return null;

    let bestMatch = null;

    scholarships.forEach(scholarship => {
        const type = scholarship.type || 'merit';

        // Only evaluate merit-based automatically for "best match" calculations.
        if (type === 'merit') {
            const minReq = parseFloat(scholarship.minPercentage);
            if (isNaN(minReq)) return;
            const maxReq = scholarship.maxPercentage ? parseFloat(scholarship.maxPercentage) : Infinity;

            // Check against all student education records
            const hasQualifyingDegree = studentProfile.educationHistory.some(edu => {
                const studentPct = parseGrade(edu.percentage || edu.cgpa);
                if (studentPct === 0) return false;

                // Match degree type AND percentage range
                const degreeTitle = edu.degree || edu.degreeName;
                const titleMatch = isDegreeMatch(scholarship.criteriaTitle, degreeTitle);

                return titleMatch && (studentPct >= minReq && studentPct <= maxReq);
            });

            if (hasQualifyingDegree) {
                if (!bestMatch || parseFloat(scholarship.grantPercentage) > parseFloat(bestMatch.grantPercentage)) {
                    bestMatch = scholarship;
                }
            }
        }
    });

    return bestMatch;
};

// Helper to check if a specific single scholarship is eligible (for table rows)
export const isScholarshipEligible = (scholarship, studentProfile) => {
    const type = scholarship.type || 'merit';

    // Non-merit scholarships are conditionally eligible as they require manual verification
    if (type !== 'merit') return 'conditional';

    if (!studentProfile?.educationHistory || studentProfile.educationHistory.length === 0) return false;

    const minReq = parseFloat(scholarship.minPercentage);
    if (isNaN(minReq)) return false;
    const maxReq = scholarship.maxPercentage ? parseFloat(scholarship.maxPercentage) : Infinity;

    return studentProfile.educationHistory.some(edu => {
        const studentPct = parseGrade(edu.percentage || edu.cgpa);
        if (studentPct === 0) return false;

        const degreeTitle = edu.degree || edu.degreeName;
        const titleMatch = isDegreeMatch(scholarship.criteriaTitle, degreeTitle);

        return titleMatch && (studentPct >= minReq && studentPct <= maxReq);
    });
}
