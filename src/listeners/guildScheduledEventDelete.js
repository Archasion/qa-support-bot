/* eslint-disable no-useless-escape */
const EventListener = require("../modules/listeners/listener");

module.exports = class GuildScheduledEventDeleteEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "guildScheduledEventDelete" });
	}

	async execute(event) {
		event.guild.channels.cache
			.get(config.ids.channels.moderation)
			.messages.fetch(config.ids.messages.testing_requests)
			.then(async message => {
				const replaceRegex = new RegExp(
					`\n\n>\\s${
						event.channel.id === config.ids.voice_channels.nda_testing ? "🔒" : ""
					}.+<t:${
						event.scheduledStartTimestamp / 1000
					}:F>\n>\\shttps:\/\/discord\.com\/channels(?:\/\\d{17,19}){3}`,
					"gmis"
				);

				message.edit({ content: message.content.replace(replaceRegex, "") });
			});
	}
};
