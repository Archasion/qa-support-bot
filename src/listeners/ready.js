/* eslint-disable no-useless-escape */
const EventListener = require("../modules/listeners/listener");
const { MessageEmbed } = require("discord.js");

module.exports = class ReadyEventListener extends EventListener {
	constructor(client) {
		super(client, {
			event: "ready",
			once: true
		});
	}

	async execute() {
		log.success(`Connected to Discord as "${this.client.user.tag}"`);

		log.info("Loading commands");
		this.client.commands.load(); // Load internal commands
		this.client.commands.publish(); // Send commands to discord

		if (config.presence.options.length > 1) {
			const { selectPresence } = require("../utils/discord");
			setInterval(() => {
				const presence = selectPresence();
				this.client.user.setPresence(presence);
			}, config.presence.duration * 1000);
		}

		const guild = this.client.guilds.cache.get(config.ids.guild);
		guild.channels.cache
			.get(config.ids.channels.moderation)
			.messages.fetch(config.ids.messages.testing_requests)
			.then(async message => {
				const newTestMessage = [];
				const messageContent = message.content;
				const events = guild.scheduledEvents.cache.map(event => ({
					channel: event.channel,
					startTime: event.scheduledStartTimestamp
				}));

				events.forEach(event => {
					const regex = new RegExp(
						`\n\n>\\s${
							event.channel.id === config.ids.voice_channels.nda_testing ? "🔒" : ""
						}.+<t:${
							event.startTime / 1000
						}:F>\n>\\shttps:\/\/discord\.com\/channels(?:\/\\d{17,19}){3}`,
						"gmis"
					);
					const match = regex.exec(messageContent);
					if (match) newTestMessage.push(match[0]);
				});

				message.edit({
					content: `__**Upcoming Tests!**__\n• Times displayed are when the test begins (announce tests an hour before times below)\n• If you would like to be added to a Google Calendar with test times (notifications 5 minutes before announcement time & 5 minutes before test starts), DM <@166694144310247424>${newTestMessage.join(
						""
					)}`
				});
			});

		const reminders = await db.models.Reminder.findAll();
		await reminders.forEach(async reminder => {
			const after = reminder.after * 1000;
			const now = Date.now();

			if (now >= after) {
				await guild.channels.cache.get(reminder.channel_id).send({
					content: `<@${reminder.user_id}>`,
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.error_color)
							.setTitle("Reminder [LATE]")
							.setDescription(
								`You asked me to give you a reminder <t:${reminder.before}:R> (<t:${reminder.before}:f>)`
							)
							.addField("Reminder", reminder.message)
							.setFooter({ text: `${now - after}ms late` })
					]
				});

				await reminder.destroy();
			} else {
				global[`reminder_${reminder.user_id}_${reminder.reminder_id}`] = setTimeout(async () => {
					await guild.channels.cache.get(reminder.channel_id).send({
						content: `<@${reminder.user_id}>`,
						embeds: [
							new MessageEmbed()
								.setColor(config.colors.default_color)
								.setTitle("Reminder")
								.setDescription(
									`You asked me to give you a reminder <t:${reminder.before}:R> (<t:${reminder.before}:f>)`
								)
								.addField("Reminder", reminder.message)
						]
					});

					await reminder.destroy();
				}, after - now);
			}
		});
	}
};
