const EventListener = require("../modules/listeners/listener");

module.exports = class MessageDeleteEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "messageDelete" });
	}

	async execute(message) {
		// eslint-disable-next-line no-useless-return, curly
		if (!message.guild) return;
	}
};
