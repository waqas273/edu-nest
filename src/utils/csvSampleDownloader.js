/**
 * Utility to download sample CSV template files for University Managers.
 * Strictly escapes comma values with double quotes to ensure 100% column alignment in Excel.
 */

export const downloadSampleCSV = (type) => {
    let filename = '';
    let content = '';

    switch (type) {
        case 'programs':
            filename = 'edu_nest_programs_sample.csv';
            content = `Title,Degree Type,Duration,Total Semesters,Estimated Fee,Description,Scholarship Tags,Min_Inter_Pct,Min_Matric_Pct,Allowed_Streams,Require_Entry_Test,Entry_Tests,Allowed_Domicile,Max_Age_Limit,Min_Bachelor_CGPA,Required_Documents,Custom_Rules,Extra_Requirements
BS Computer Science,BS,4 Years,8,450000,"Comprehensive undergraduate program covering Software Engineering, AI and Data Science.","need-based, merit-based",60,50,"Pre-Engineering, ICS",Yes,"NTS NAT-IE:50|FAST Entry Test:50","Open Merit (All Pakistan)",24,0,"Matric Marksheet, FSc Marksheet, CNIC, Test Scorecard","Math Requirement:Must have studied Math in FSc|Attempt Limit:Clear pass in 1st attempt","FSc Pre-Engineering or ICS with Math. Punjab Domicile only."
MS Data Science,MS,2 Years,4,350000,"Advanced post-graduate program covering machine learning and big data analytics.","merit-based",60,50,"BS CS, BS SE, BS Math",Yes,"GAT General:50","Open Merit (All Pakistan)",35,2.5,"Matric Marksheet, FSc Marksheet, BS Transcript, GAT Card","Prior Degree:16-Year Bachelor Degree in CS/Math","16-Year Bachelor Degree in CS/Math with CGPA >= 2.5."
BS Electrical Engineering,BS,4 Years,8,500000,"State of the art engineering curriculum focusing on robotics and IoT.","need-based",60,50,"Pre-Engineering",Yes,"ECAT:50|University Entry Test:50","Punjab Only",24,0,"Matric Marksheet, FSc Marksheet, CNIC, ECAT Card","Engineering Stream:FSc Pre-Engineering mandatory","Clear pass in 1st attempt."
BS Business Administration,BBA,4 Years,8,400000,"Modern business administration degree focusing on marketing and finance.","sports-based",50,50,"Pre-Engineering, ICS, Pre-Medical, Commerce, Arts",No,"None:0","Open Merit (All Pakistan)",26,0,"Matric Marksheet, FSc Marksheet, CNIC","Open Eligibility:Open for Arts, Commerce and Science graduates","Open for all disciplines."`;
            break;

        case 'scholarships':
            filename = 'edu_nest_scholarships_sample.csv';
            content = `Title,Scope,Tag,Type,Min Requirement,Max Requirement,Grant Percentage
PEEF Merit Scholarship,global,,Merit-Based,3.5,4.0,100%
Need-Based Financial Assistance,global,,Need-Based,0,60000,50%
BSCS Academic Excellence Grant,specific,computer science,Merit-Based,3.8,4.0,75%
Sports Talent Scholarship,global,,Talent-Based,0,0,100%`;
            break;

        case 'admission_policies':
            filename = 'edu_nest_admission_policies_sample.csv';
            content = `Policy_Title,Scope,Tag,Prospectus_Prompt
Standard Engineering & CS Policy,global,,"Min 60% FSc Pre-Engineering or ICS with Math. Min 50% Matric. NTS NAT-IE score min 50% or FAST Test min 50%. Punjab Domicile only. Required documents: Matric, FSc, CNIC, Test Scorecard. Pass in 1st attempt required."
Medical & Dental Policy,specific,medical,"Min 70% FSc Pre-Medical and 60% Matric. MDCAT Entrance Test is mandatory with min 55% score. Open Merit Punjab Only. Documents: Matric Result, FSc Transcript, MDCAT Card, Domicile & CNIC. Biology Physics Chemistry mandatory in 1st attempt."
Business Administration Policy,specific,business,"Min 50% FSc or FA or I.Com. No Entry Test required. Open Merit all Pakistan. Documents: Matric, FSc, CNIC. All intermediate streams eligible."`;
            break;

        case 'faculty':
            filename = 'edu_nest_faculty_sample.csv';
            content = `Full Name,Designation,Email,Bio,Education,Expertise,Publications,LinkedIn,Instagram
Dr. Ali Raza,Professor & HOD,ali.raza@university.edu.pk,"Specialist in Artificial Intelligence with 15+ years experience.",Ph.D. Computer Science,"AI & Machine Learning",25 International Papers,https://linkedin.com/in/draliraza,
Dr. Sarah Ahmed,Associate Professor,sarah.ahmed@university.edu.pk,"Passionate researcher in Cloud Computing and Software Architecture.",Ph.D. Software Engineering,"Cloud & Software Systems",18 Research Journals,https://linkedin.com/in/drsarahahmed,
Engr. Usman Khan,Assistant Professor,usman.khan@university.edu.pk,"Expert in Embedded Systems and Internet of Things (IoT).",M.S. Electrical Engineering,"Embedded Systems & IoT",8 Conference Papers,,`;
            break;

        case 'transport':
            filename = 'edu_nest_transport_sample.csv';
            content = `Vehicle Number,Vehicle Model,Capacity,Route Name,Route Start,Route End,Departure Time,Arrival Time,Driver Name,Driver Phone,Manager Phone,Stops
LHR-1234,Hino Coaster 2024,50 Seats,Route 1 (North Campus),Model Town,University Main Campus,07:30 AM,08:30 AM,Muhammad Arshad,03001234567,03129876543,"Model Town, Gulberg, Kalma Chowk, Main Campus"
FSD-5678,Toyota Coaster 2023,45 Seats,Route 2 (South Express),Johar Town,University Main Campus,07:15 AM,08:15 AM,Tariq Mahmood,03218765432,03129876543,"Johar Town, Thokar Niaz Baig, Main Campus"`;
            break;

        default:
            return;
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
