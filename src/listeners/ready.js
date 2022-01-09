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

		const reminders = await db.models.Reminder.findAll();
		await reminders.forEach(async reminder => {
			const after = reminder.after * 1000;
			const now = Date.now();

			if (now >= after) {
				await this.client.channels.cache.get(reminder.channel_id).send({
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
					await this.client.channels.cache.get(reminder.channel_id).send({
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
