const fs = require('fs');

try {
    const file = 'd:/FYP/EduNest/src/pages/student/UniversityDetails.jsx';
    let content = fs.readFileSync(file, 'utf8');

    // Fix AnimatePresence structure
    content = content.replace(/\{activeTab === 'overview' && \(/, "{activeTab === 'overview' ? (");

    // The previous chunks end with:
    //                              </motion.div>
    //                          )}
    content = content.replace(/<\/motion\.div>\r?\n\s+\)\}\r?\n\s+\{\/\* Programs Tab \*\/\r?\n\s+\{activeTab === 'programs' && \(/g,
        "</motion.div>\n                            ) : activeTab === 'programs' ? (");

    content = content.replace(/<\/motion\.div>\r?\n\s+\)\}\r?\n\s+\{\/\* Faculty Tab \*\/\r?\n\s+\{activeTab === 'faculty' && \(/g,
        "</motion.div>\n                            ) : activeTab === 'faculty' ? (");

    content = content.replace(/<\/motion\.div>\r?\n\s+\)\}\r?\n\s+\{\/\* Transport Tab \*\/\r?\n\s+\{activeTab === 'transport' && \(/g,
        "</motion.div>\n                            ) : activeTab === 'transport' ? (");

    content = content.replace(/<\/motion\.div>\r?\n\s+\)\}\r?\n\s+\{\/\* Scholarships Tab \*\/\r?\n\s+\{activeTab === 'scholarships' && \(/g,
        "</motion.div>\n                            ) : activeTab === 'scholarships' ? (");

    content = content.replace(/<\/motion\.div>\r?\n\s+\)\}\r?\n\s+\{\/\* Reviews Tab \*\/\r?\n\s+\{activeTab === 'reviews' && \(/g,
        "</motion.div>\n                            ) : activeTab === 'reviews' ? (");

    // Fix the final closing bracket before UserProfileModal
    content = content.replace(/<\/motion\.div>\r?\n\s+\)\}\r?\n\s+<UserProfileModal/g,
        "</motion.div>\n                            ) : null}\n                            <UserProfileModal");

    // Fix image tags to prevent 404 broken image UI
    content = content.replace(/<img(.*?)>/gs, (match, attrs) => {
        if (attrs.includes('onError')) return match;
        const fallback = `onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&w=800&q=80'; }}`;

        if (attrs.trim().endsWith('/')) {
            return `<img${attrs.slice(0, attrs.lastIndexOf('/'))} ${fallback} />`;
        }
        return `<img${attrs} ${fallback}>`;
    });

    fs.writeFileSync(file, content);
    console.log('Successfully fixed UniversityDetails.jsx');
} catch (error) {
    console.error('Error applying fixes:', error);
}
