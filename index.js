require('dotenv').config();

const express = require('express');
const app = express();
const PORT = process.env.port || 3000;

app.use(express.urlencoded({ extended: true }))
app.use(express.json());

const twilioClient = require('twilio')(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
);

const dialogflow = require('@google-cloud/dialogflow');
const sessionClient = new dialogflow.SessionsClient();

app.post('/whatsapp', async function(req, res) {

	const from = req.body.From;

	const to = req.body.To;
	const body = req.body.Body;

	console.log(`Got message ${body} from ${from}`);

	const projectId = await sessionClient.getProjectId();
	const sessionPath = sessionClient.projectAgentSessionPath(projectId, from);

	const response = await sessionClient.detectIntent({
		session: sessionPath,
		queryInput: {
			text: {
				text: body,
				languageCode: 'id-ID',
			}
		}
	});

	if(response[0].queryResult.action == 'emi.due-date') {
		let dueDate = new Date();
		dueDate.setTime(dueDate.getTime() + 5*24*60*60*1000);
		let dueAmount = "$200";

		await twilioClient.messages.create({
			from: to,
			to: from,
			body: `Your next emi of ${dueAmount} is on ${dueDate.toDateString()}.`
		});

		res.status(200).end();
		return
	}

	const messages = response[0].queryResult.fulfillmentMessages;
	for (const message of messages) {

		if(message.text) {
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: message.text.text[0],
			});
		}
	}

	res.status(200).end();
});

app.listen(PORT, () => {
	console.log(`Listening on ${PORT}`);
});