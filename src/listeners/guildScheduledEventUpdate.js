/* eslint-disable no-useless-escape */
const EventListener = require("../modules/listeners/listener");

const { MODERATION_CHAT, ACTIVE_TESTING_REQUESTS } = process.env;
const { GuildScheduledEventStatus } = require("discord.js");

module.exports = class GuildScheduledEventUpdateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "guildScheduledEventUpdate" });
	}

	async execute(oldEvent, newEvent) {
		if (
			newEvent.status === GuildScheduledEventStatus.Active ||
			newEvent.status === GuildScheduledEventStatus.Completed
		) {
			// prettier-ignore
			newEvent.guild.channels.cache.get(MODERATION_CHAT).messages.fetch(ACTIVE_TESTING_REQUESTS)
				.then(async message => {
					// Get the test in the message
					// prettier-ignore
					const replaceRegex = new RegExp(`\\n\\n>\\s[^\\n]+<t:${newEvent.scheduledStartTimestamp / 1000}:F>\\n>\\shttps:\/\/discord\.com\/channels(?:\/\\d{17,19}){3}`, "gmis");

					// Remove the test from the message
					message.edit({ content: message.content.replace(replaceRegex, "") });
				});
		}
	}
};
