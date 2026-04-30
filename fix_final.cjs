const fs = require('fs');

try {
    const files = [
        'd:/FYP/EduNest/src/pages/student/UniversityDetails.jsx',
        'd:/FYP/EduNest/src/pages/student/Universities.jsx'
    ];

    const badUrl = 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&w=800&q=80';
    const goodUrl = 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80';

    for (const file of files) {
        if (fs.existsSync(file)) {
            let content = fs.readFileSync(file, 'utf8');
            content = content.split(badUrl).join(goodUrl);

            if (file.includes('UniversityDetails')) {
                // Move UserProfileModal out of AnimatePresence
                content = content.replace(
                    /<\/motion\.div>\r?\n\s+\) : null\}\r?\n\s+<UserProfileModal[\s\S]*?\/>\r?\n\s+<\/AnimatePresence>/,
                    (match) => {
                        return match.replace(/<UserProfileModal[\s\S]*?\/>\r?\n\s+<\/AnimatePresence>/,
                            "</AnimatePresence>\n                            <UserProfileModal\n                                isOpen={profileModal.isOpen}\n                                onClose={() => setProfileModal({ isOpen: false, userId: null })}\n                                userId={profileModal.userId}\n                                readOnly={currentUser?.role === 'admin'}\n                                hideChatButton={currentUser?.role === 'admin'}\n                            />");
                    }
                );
            }

            fs.writeFileSync(file, content);
            console.log(`Updated ${file}`);
        }
    }
} catch (e) {
    console.error(e);
}
