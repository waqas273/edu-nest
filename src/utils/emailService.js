import emailjs from '@emailjs/browser';

// 1. EmailJS Configuration
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_dzmanwf';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_jog9fkk';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'iEulg0kduLfrsPIKg';

export const sendApplicationStatusEmail = async ({ to_name, to_email, status, reason }) => {
    try {
        const isApproved = status.toLowerCase() === 'approved';
        const emailSubject = isApproved
            ? 'Congratulations! Your University Application is Approved - EduNest'
            : 'Update regarding your University Application - EduNest';

        const emailMessage = isApproved
            ? `Dear ${to_name},\n\nWe are pleased to inform you that your university partnership application has been APPROVED.\n\nYou can now log in to your dashboard and start managing your university profile.\n\nWelcome to EduNest!`
            : `Dear ${to_name},\n\nThank you for your interest in EduNest. After reviewing your application, we regret to inform you that it has been declined at this time.\n\nReason: ${reason || 'Criteria not met'}\n\nIf you think this is a mistake, please contact support.`;

        const templateParams = {
            to_name: to_name,
            to_email: to_email,
            subject: emailSubject,
            message: emailMessage,
        };

        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        console.log('Email sent successfully:', response.status, response.text);
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
};

export const sendWarningEmail = async ({ to_name, to_email, warning_message, warning_count }) => {
    try {
        const isBanRisk = warning_count >= 3;
        const emailSubject = isBanRisk
            ? 'URGENT: Account Ban Warning - EduNest Administration'
            : 'Official Warning Notice - EduNest Administration';

        let bodyContent = `This is an official warning regarding your recent activity on the EduNest platform.\n\nReason for Warning:\n${warning_message}\n\nCurrent Warning Count: ${warning_count}`;

        if (isBanRisk) {
            bodyContent += `\n\n⚠️ IMPORTANT: Your account has reached ${warning_count} warnings. Your account is about to be BANNED. Immediate compliance with community guidelines is required.`;
        } else {
            bodyContent += `\n\nPlease adhere to our community guidelines. Further violations may result in account suspension.`;
        }

        const templateParams = {
            to_name: to_name,
            to_email: to_email,
            subject: emailSubject,
            message: bodyContent,
        };

        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        console.log('Warning email sent:', response.status);
        return true;
    } catch (error) {
        console.error('Failed to send warning email:', error);
        return false;
    }
};

export const sendBanEmail = async ({ to_name, to_email, reason }) => {
    try {
        const emailSubject = 'IMPORTANT: Your EduNest Account has been Banned';
        const bodyContent = `We regret to inform you that your EduNest account has been permanently banned from our platform due to non-compliance with our community guidelines.\n\nReason for Ban:\n${reason || 'Violation of community standards'}\n\nIf you believe this is a mistake, please reach out to EduNest support at edu.nest273@gmail.com.`;

        const templateParams = {
            to_name: to_name,
            to_email: to_email,
            subject: emailSubject,
            message: bodyContent,
        };

        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        console.log('Ban email sent:', response.status);
        return true;
    } catch (error) {
        console.error('Failed to send ban email:', error);
        return false;
    }
};

export const sendUnbanEmail = async ({ to_name, to_email }) => {
    try {
        const emailSubject = 'GOOD NEWS: Your EduNest Account has been Restored';
        const bodyContent = `We are writing to let you know that the ban on your EduNest account has been lifted after reviewing your case.\n\nYou can now log in and continue using our platform. We look forward to your positive contributions to the community!`;

        const templateParams = {
            to_name: to_name,
            to_email: to_email,
            subject: emailSubject,
            message: bodyContent,
        };

        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        console.log('Unban email sent:', response.status);
        return true;
    } catch (error) {
        console.error('Failed to send unban email:', error);
        return false;
    }
};

export const sendDeleteEmail = async ({ to_name, to_email, reason }) => {
    try {
        const emailSubject = 'NOTICE: Your EduNest Account has been Deleted';
        const bodyContent = `This email is to inform you that your EduNest account has been deleted by an administrator.\n\nReason for Deletion:\n${reason || 'Administrative Action'}\n\nIf you wish to rejoin the community, you are welcome to sign up for a new account using our registration page.`;

        const templateParams = {
            to_name: to_name,
            to_email: to_email,
            subject: emailSubject,
            message: bodyContent,
        };

        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        console.log('Delete email sent:', response.status);
        return true;
    } catch (error) {
        console.error('Failed to send delete email:', error);
        return false;
    }
};

export const sendStudentAdmissionEmail = async ({ to_name, to_email, status, universityName, programName, reason }) => {
    try {
        const isApproved = status.toLowerCase() === 'accepted';

        const emailSubject = isApproved
            ? `🎉 Admissions Update: Accepted at ${universityName}!`
            : `Admissions Update: Application Status for ${universityName}`;

        let bodyContent = `Dear ${to_name},\n\nWe are writing to update you on your application for the ${programName} program at ${universityName}.\n\n`;

        if (isApproved) {
            bodyContent += `Congratulations! We are thrilled to inform you that your application has been ACCEPTED. 🎉\n\n`;
            if (reason) {
                bodyContent += `Note from University: ${reason}\n\n`;
            }
            bodyContent += `Please log in to your EduNest Student Portal to view next steps and further instructions regarding your enrollment.`;
        } else {
            bodyContent += `After careful consideration, the admissions committee has decided not to move forward with your application at this time.\n\n`;
            if (reason) {
                bodyContent += `Reason for decision: ${reason}\n\n`;
            } else {
                bodyContent += `We receive many outstanding applications and unfortunately cannot offer admission to all qualified candidates.\n\n`;
            }
            bodyContent += `We wish you the best of luck in your academic journey and future endeavors.`;
        }

        const templateParams = {
            to_name: to_name,
            to_email: to_email,
            subject: emailSubject,
            message: bodyContent,
        };

        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        console.log(`Admission email sent (${status}):`, response.status);
        return true;
    } catch (error) {
        console.error('Failed to send admission email:', error);
        return false;
    }
};