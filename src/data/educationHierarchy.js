export const EDUCATION_HIERARCHY = [
    {
        id: 'matric',
        label: 'Matriculation (Local Board)',
        levels: [
            {
                id: '9th',
                label: 'Matric Part I (9th)',
                groups: ['Science Group (Biology)', 'Science Group (Computer)', 'Arts Group']
            },
            {
                id: '10th',
                label: 'Matric Part II (10th)',
                groups: ['Science Group (Biology)', 'Science Group (Computer)', 'Arts Group']
            }
        ]
    },
    {
        id: 'inter',
        label: 'Intermediate (Local Board)',
        levels: [
            {
                id: '11th',
                label: 'Inter Part I (11th)',
                groups: [
                    'F.Sc Pre-Medical', 'F.Sc Pre-Engineering',
                    'ICS (Physics)', 'ICS (Statistics)', 'ICS (Economics)',
                    'General Science', 'I.Com', 'FA (General)', 'FA IT'
                ]
            },
            {
                id: '12th',
                label: 'Inter Part II (12th)',
                groups: [
                    'F.Sc Pre-Medical', 'F.Sc Pre-Engineering',
                    'ICS (Physics)', 'ICS (Statistics)', 'ICS (Economics)',
                    'General Science', 'I.Com', 'FA (General)', 'FA IT'
                ]
            }
        ]
    },
    {
        id: 'cambridge',
        label: 'Cambridge System (International)',
        levels: [
            {
                id: 'olevel',
                label: 'O-Level',
                groups: ['O-Level 1 (O1)', 'O-Level 2 (O2)', 'O-Level 3 (O3)']
            },
            {
                id: 'alevel',
                label: 'A-Level',
                groups: ['A-Level 1 (AS)', 'A-Level 2 (A2)']
            }
        ]
    }
];
