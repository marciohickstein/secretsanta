const config = require('../config');
const nodemailer = require('nodemailer');

// Inicialize smtp-transport
var smtpTransport = require('nodemailer-smtp-transport');

const transporter = nodemailer.createTransport(smtpTransport({
    service: config.email.service,
    host: config.email.host,
    port: config.email.port,
    tls: {
        rejectUnauthorized: false
    },
    auth: {
        user: config.email.user,
        pass: config.email.pass
    }
}));

function sendEmail(to, subject, text) {
    // sendemail
    const from = config.email.from;

    let mailOptions = {
        from,
        to,
        subject,
        html: text
    }

    transporter.sendMail(mailOptions, (err, info) => {
        if (err){
            return ({ error: 1, massage: `Ocorreu um no envio do email para : ${to}. Detalhes: ${err}` });
        }
        console.log(info);
    })

}

module.exports = { send: sendEmail };