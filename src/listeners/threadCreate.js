const EventListener = require("../modules/listeners/listener");

module.exports = class ThreadCreateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "threadCreate" });
	}

	async execute(thread) {
		// Check if the public thread is created in session announcements
		if (thread.parent.id === config.channels.sessions && thread.type === "GUILD_PUBLIC_THREAD") {
			// Change the cooldown and send the opening message
			setTimeout(() => {
				thread.setRateLimitPerUser(120);
				thread
					.send(
						"Please do not talk in this thread unless you're reporting bugs or providing feedback/suggestions."
					)
					.then(message => message.pin());
			}, 1000);
		}
	}
};
