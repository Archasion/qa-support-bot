/* eslint-disable no-useless-escape */
const EventListener = require("../modules/listeners/listener");
const Reminders = require("../mongodb/models/reminders");

const { TESTING_REQUESTS, ACTIVE_TESTING_REQUESTS } = process.env;
const { EmbedBuilder } = require("discord.js");

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

		this.client.commands.load();
		this.client.commands.publish();

		// Presence
		if (config.presence.options.length > 1) {
			const { selectPresence } = require("../utils/discord");
			setInterval(() => {
				const presence = selectPresence();
				this.client.user.setPresence(presence);
			}, config.presence.duration * 1000);
		}

		// Update tests
		const guild = this.client.guilds.cache.get(config.guild);
		guild.channels.cache
			.get(TESTING_REQUESTS)
			.messages.fetch(ACTIVE_TESTING_REQUESTS)
			.then(async message => {
				const newTestMessage = [];
				const messageContent = message.content;
				const events = guild.scheduledEvents.cache.map(event => ({
					startTime: event.scheduledStartTimestamp
				}));

				// Go through each event and add missing events to the message
				// prettier-ignore
				events.forEach(event => {
					const regex = new RegExp(`\\n\\n>\\s[^\\n]+<t:${event.startTime / 1000}:F>\\n>\\shttps:\/\/discord\.com\/channels(?:\/\\d{17,19}){3}`, "gmis");
					const match = regex.exec(messageContent);
					if (match) newTestMessage.push(match[0]);
				});

				// Add the new tests to the message
				message.edit({
					content: `__**Upcoming Tests!**__\n• Times displayed are when the test begins (announce tests an hour before times below)\n• If you would like to be added to a Google Calendar with test times (notifications 5 minutes before announcement time & 5 minutes before test starts), DM <@166694144310247424>${newTestMessage.join(
						""
					)}`
				});
			});

		// Check for missed reminders
		const reminders = await Reminders.find();

		reminders.forEach(async reminder => {
			const reminderTime = reminder.end_time * 1000;
			const now = Date.now();

			// Check if the reminder is overdue
			if (now >= reminderTime) {
				await guild.channels.cache.get(reminder.channel).send({
					content: `<@${reminder.author}>`,
					embeds: [
						new EmbedBuilder()
							.setColor(config.colors.error)
							.setTitle("Reminder [LATE]")
							.setDescription(
								`You asked me to give you a reminder <t:${reminder.start_time}:R> (<t:${reminder.start_time}:f>)`
							)
							.addFields({ name: "Reminder", value: reminder.text })
							.setFooter({ text: `${now - reminderTime}ms late` })
					]
				});

				// Remove reminder from the database
				await Reminders.deleteOne({ _id: reminder._id });
			}

			// Store the reminder after startup (not overdue)
			else {
				// Create the global variable for the reminder
				global[`reminder_${reminder.author}_${reminder.id}`] = setTimeout(async () => {
					await guild.channels.cache.get(reminder.channel).send({
						content: `<@${reminder.author}>`,
						embeds: [
							new EmbedBuilder()
								.setColor(config.colors.default)
								.setTitle("Reminder")
								.setDescription(
									`You asked me to give you a reminder <t:${reminder.start_time}:R> (<t:${reminder.start_time}:f>)`
								)
								.addFields({ name: "Reminder", value: reminder.text })
						]
					});

					// Remove reminder from the database
					await Reminders.deleteOne({ id: reminder.id });
				}, reminderTime - now);
			}
		});
	}
};
