const EventListener = require("../modules/listeners/listener");

module.exports = class MessageUpdateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "messageUpdate" });
	}

	async execute(oldMessage, newMessage) {
		if (newMessage.partial) {
			try {
				await newMessage.fetch();
			} catch (error) {
				return log.error(error);
			}
		}

		if (!newMessage.guild) return;
	}
};
