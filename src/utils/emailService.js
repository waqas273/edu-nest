import emailjs from '@emailjs/browser';

// 1. Apni IDs yahan Confirm karein
const SERVICE_ID = 'service_dzmanwf'; // Aapka Service ID
const TEMPLATE_ID = 'template_jog9fkk'; // Yahan wo ID dalein jo Template save krne k baad mili
const PUBLIC_KEY = 'iEulg0kduLfrsPIKg'; // Aapki Public Key

export const sendApplicationStatusEmail = async ({ to_name, to_email, status, reason }) => {
    try {
        // Hum code se hi decide kar rahe hain ke message kya hoga, 
        // isliye alag alag Template ID ki zaroorat nahi hai.

        const isApproved = status.toLowerCase() === 'approved';

        // Subject aur Message prepare karna
        const emailSubject = isApproved
            ? 'Congratulations! Your University Application is Approved - EduNest'
            : 'Update regarding your University Application - EduNest';

        const emailMessage = isApproved
            ? `Dear ${to_name},\n\nWe are pleased to inform you that your university partnership application has been APPROVED.\n\nYou can now log in to your dashboard and start managing your university profile.\n\nWelcome to EduNest!`
            : `Dear ${to_name},\n\nThank you for your interest in EduNest. After reviewing your application, we regret to inform you that it has been declined at this time.\n\nReason: ${reason || 'Criteria not met'}\n\nIf you think this is a mistake, please contact support.`;

        // Parameters jo Template mein jayenge
        const templateParams = {
            to_name: to_name,
            to_email: to_email, // Ye ab Dashboard ke {{to_email}} se match karega
            subject: emailSubject, // Ye Dashboard ke {{subject}} mein jayega
            message: emailMessage, // Ye Dashboard ke {{message}} mein jayega
        };

        const response = await emailjs.send(
            SERVICE_ID,
            TEMPLATE_ID,
            templateParams,
            PUBLIC_KEY
        );

        console.log('Email sent successfully:', response.status, response.text);
        return true;

    } catch (error) {
        console.error('Failed to send email:', error);
        // Important: Yahan error throw mat karein taake UI crash na ho, bas false return karein
        return false;
    }
};

export const sendWarningEmail = async ({ to_name, to_email, warning_message, warning_count }) => {
    try {
        const isBanRisk = warning_count >= 3;
        const emailSubject = isBanRisk
            ? 'URGENT: Account Ban Warning - EduNest Administration'
            : 'Official Warning Notice - EduNest Administration';

        // Note: Template likely handles "Hello {{to_name}}" and "Regards" footer. 
        // We only provide the body content to avoid duplication.

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

        const response = await emailjs.send(
            SERVICE_ID,
            TEMPLATE_ID,
            templateParams,
            PUBLIC_KEY
        );
        console.log('Warning email sent:', response.status);
        return true;
    } catch (error) {
        console.error('Failed to send warning email:', error);
        return false;
    }
};