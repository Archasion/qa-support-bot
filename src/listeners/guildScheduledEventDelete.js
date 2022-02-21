/* eslint-disable no-useless-escape */
const EventListener = require("../modules/listeners/listener");

const { MODERATION_CHAT, ACTIVE_TESTING_REQUESTS } = process.env;

module.exports = class GuildScheduledEventDeleteEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "guildScheduledEventDelete" });
	}

	async execute(event) {
		// prettier-ignore
		event.guild.channels.cache.get(MODERATION_CHAT).messages.fetch(ACTIVE_TESTING_REQUESTS)
			.then(async message => {
				// Get the test in the message
				// prettier-ignore
				const replaceRegex = new RegExp(`\\n\\n>\\s[^\\n]+<t:${event.scheduledStartTimestamp / 1000}:F>\\n>\\shttps:\/\/discord\.com\/channels(?:\/\\d{17,19}){3}`, "gmis");

				// Remove the test from the message
				message.edit({ content: message.content.replace(replaceRegex, "") });
			});
	}
};
