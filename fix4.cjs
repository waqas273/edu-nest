const fs = require('fs');

try {
    const file = 'd:/FYP/EduNest/src/pages/student/UniversityDetails.jsx';
    let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

    // Line numbers in editor are 1-based, array index is 0-based.
    // 355 -> index 354
    lines[354] = "                            ) : activeTab === 'programs' ? (";
    lines[357] = ""; // was {activeTab === 'programs' && (

    // 395 -> index 394
    lines[394] = "                            ) : activeTab === 'faculty' ? (";
    lines[397] = ""; // was {activeTab === 'faculty' && (

    // 539 -> index 538
    lines[538] = "                            ) : activeTab === 'transport' ? (";
    lines[541] = ""; // was {activeTab === 'transport' && (

    // 719 -> index 718
    lines[718] = "                            ) : activeTab === 'scholarships' ? (";
    lines[721] = ""; // was {activeTab === 'scholarships' && (

    // 809 -> index 808
    lines[808] = "                            ) : activeTab === 'reviews' ? (";
    lines[811] = ""; // was {activeTab === 'reviews' && (

    fs.writeFileSync(file, lines.join('\n'));
    console.log('Successfully fixed conditionals via exact line numbers.');
} catch (error) {
    console.error('Error applying fixes:', error);
}
