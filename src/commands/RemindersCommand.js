const Reminders = require("../mongodb/models/reminders");
const Command = require("../modules/commands/command");

const { MessageEmbed } = require("discord.js");

module.exports = class RemindersCommand extends Command {
	constructor(client) {
		super(client, {
			name: "reminders",
			description: "View your reminders",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			manager_only: true,
			moderator_only: true,
			options: []
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		// Get all reminders belonging to the user
		const reminders = await Reminders.find({ author: interaction.user.id });
		const embed = new MessageEmbed().setColor(config.colors.default_color).setTitle("Reminders");

		// Response for no reminders
		if (reminders.length === 0) {
			embed.setDescription("You do not have any reminders set!");
		}

		// Add a field for each reminder
		else {
			reminders.forEach(reminder => {
				embed.addField(`\`${reminder.id}\` <t:${reminder.end_time}:f>`, reminder.text);
			});
		}

		// Respond with the list of reminders (if applicable)
		await interaction.reply({
			embeds: [embed],
			ephemeral: true
		});
	}
};
