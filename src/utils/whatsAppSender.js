
function sendTextMessage(to, subject, text) {

	console.log(`Sending message from whatsapp...`);
	console.log(to);
	console.log(subject);
	console.log(text);
	
}

module.exports = {
    send: sendTextMessage
}