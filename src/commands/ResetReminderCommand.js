const Reminders = require("../mongodb/models/reminders");
const Command = require("../modules/commands/command");

module.exports = class ResetReminderCommand extends Command {
	constructor(client) {
		super(client, {
			name: "reset-reminder",
			description: "Reset your reminder",
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
					description:
						"The ID of the reminder to remove (seperate using commas/spaces to reset multiple reminders)",
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
		let reminderIDs = interaction.options.getString("reminder_id");

		// Remove specific reminders
		if (!reminderIDs.match(/\*|all/gi)) {
			reminderIDs = reminderIDs
				.replaceAll(",", " ")
				.replace(/[<@!>]/gi, "")
				.replace(/\s+/gi, " ")
				.split(" ");

			// Go through each given ID
			reminderIDs.forEach(async reminderID => {
				const reminder = await Reminders.findOne({
					author: interaction.user.id,
					id: reminderID
				});

				// Check if the reminder exists
				if (!reminder) {
					interaction.reply({
						content: `Cannot resolve the reminder ID: ${reminderID}`,
						ephemeral: true
					});
					return;
				}

				// Reset the reminder
				clearTimeout(global[`reminder_${interaction.user.id}_${reminderID}`]);
				delete global[`reminder_${interaction.user.id}_${reminderID}`];

				// Remove the reminder from the database
				await Reminders.deleteOne({ id: reminderID });
			});

			// Respond with the confirmation
			await interaction.reply({
				content: `The following reminder${reminderIDs.length > 1 ? "s" : ""} ha${
					reminderIDs.length > 1 ? "ve" : "s"
				} been reset: \`${reminderIDs.join("`, `")}\``,
				ephemeral: true
			});
		}

		// Remove all reminders
		else {
			// Get all reminders belonging to the user
			const reminders = await Reminders.find({ author: interaction.user.id });

			// Go through each reminder and delete them
			reminders.forEach(async reminder => {
				clearTimeout(global[`reminder_${interaction.user.id}_${reminder.id}`]);
				delete global[`reminder_${interaction.user.id}_${reminder.id}`];
			});

			// Remove all reminders from the database
			await Reminders.deleteMany({ author: interaction.user.id });

			// Respond with confirmation
			await interaction.reply({
				content: "All reminders have been reset",
				ephemeral: true
			});
		}
	}
};
