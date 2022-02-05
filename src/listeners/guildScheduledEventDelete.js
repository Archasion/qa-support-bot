/* eslint-disable no-useless-escape */
const EventListener = require("../modules/listeners/listener");
const { MODERATION_CHAT, ACTIVE_TESTING_REQUESTS, NDA_TESTING_VC } = process.env;

module.exports = class GuildScheduledEventDeleteEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "guildScheduledEventDelete" });
	}

	async execute(event) {
		event.guild.channels.cache
			.get(MODERATION_CHAT)
			.messages.fetch(ACTIVE_TESTING_REQUESTS)
			.then(async message => {
				const replaceRegex = new RegExp(
					`\n\n>\\s${event.channel.id === NDA_TESTING_VC ? "🔒" : ""}.+<t:${
						event.scheduledStartTimestamp / 1000
					}:F>\n>\\shttps:\/\/discord\.com\/channels(?:\/\\d{17,19}){3}`,
					"gmis"
				);

				message.edit({ content: message.content.replace(replaceRegex, "") });
			});
	}
};
