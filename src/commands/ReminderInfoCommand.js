const Reminders = require("../mongodb/models/reminders");
const Command = require("../modules/commands/command");

const { MessageEmbed } = require("discord.js");

module.exports = class ReminderInfoCommand extends Command {
	constructor(client) {
		super(client, {
			name: "reminder-info",
			description: "Get information about your reminder",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			manager_only: true,
			moderator_only: true,
			options: [
				{
					name: "reminder_id",
					description: "The ID of the reminder to view",
					required: true,
					type: Command.option_types.STRING
				}
			]
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		const reminderID = interaction.options.getString("reminder_id");

		// Get the specified reminder
		const reminder = await Reminders.findOne({
			author: interaction.user.id,
			id: reminderID
		});

		// Check if the reminder exists
		if (!reminder) {
			interaction.reply({
				content: `The reminder ID could not be resolved (\`${reminderID}\`).`,
				ephemeral: true
			});
			return;
		}

		// Construct the embed with the reminder information
		const embed = new MessageEmbed()
			.setColor(config.colors.default)
			.setAuthor({
				name: interaction.member.displayName,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			.setFields([
				{ name: "Channel", value: `<#${reminder.channel}>`, inline: true },
				{ name: "Set On", value: `<t:${reminder.start_time}:f>`, inline: true },
				{ name: "Alert On", value: `<t:${reminder.end_time}:f>`, inline: true },
				{ name: "Reminder", value: reminder.text, inline: false }
			])
			.setFooter({ text: `Reminder ID: ${reminder.id}` });

		// Send the information
		await interaction.reply({
			embeds: [embed],
			ephemeral: true
		});
	}
};
