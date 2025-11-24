const config = require('@config');
const twilio = require("twilio");
// Never hardcode credentials — use environment variables

/**
 * Convert any Brazilian phone number to E.164 format.
 * Ex: 51 98412-0669 -> +5551984120669
 */
function toE164Brazil(number) {
    const digits = number.replace(/\D/g, "");

    // Valid Brazilian mobile numbers have 11 digits: DDD(2) + 9 + XXXX-XXXX
    if (digits.length !== 11) return null;

    return `+55${digits}`;
}

/**
 * Sends an SMS using Twilio
 * @param {string} to - Brazilian phone number
 * @param {string} subject - SMS subject/title
 * @param {string} message - SMS body text
 */
async function sendSms(to, subject, message) {
    const accountSid = config.twilio.sid;
    const authToken = config.twilio.token;
    const twilioNumber = config.twilio.from;

    if (!accountSid || !authToken || !twilioNumber) {
        throw new Error("Missing Twilio environment variables.");
    }

    const client = twilio(accountSid, authToken);
    const formattedNumber = toE164Brazil(to);

    if (!formattedNumber) {
        console.error(`Invalid phone number: ${to}`);
        return;
    }

    try {
        const fullMessage = `${subject}: ${message}`;

        const response = await client.messages.create({
            body: fullMessage,
            from: twilioNumber,
            to: formattedNumber
        });

        console.log("SMS enviado:", response.sid);
        return response;
    } catch (error) {
        console.error("Erro ao enviar SMS:", error.message);
    }
}

module.exports = {
    send: sendSms,
};
