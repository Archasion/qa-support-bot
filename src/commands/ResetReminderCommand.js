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
			dev_only: true,
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

		if (!reminderIDs.match(/\*|all/gi)) {
			// Remove specific reminders
			reminderIDs = reminderIDs
				.replaceAll(",", " ")
				.replace(/[<@!>]/gi, "")
				.replace(/\s+/gi, " ")
				.split(" ");

			reminderIDs.forEach(async reminderID => {
				const reminder = await Reminders.findOne({
					author: interaction.user.id,
					id: reminderID
				});

				if (!reminder) {
					interaction.reply({
						content: `Cannot resolve the reminder ID: ${reminderID}`,
						ephemeral: true
					});
					return;
				}

				clearTimeout(global[`reminder_${interaction.user.id}_${reminderID}`]);
				delete global[`reminder_${interaction.user.id}_${reminderID}`];

				await Reminders.deleteOne({ id: reminderID });
			});

			await interaction.reply({
				content: `The following reminder${reminderIDs.length > 1 ? "s" : ""} ha${
					reminderIDs.length > 1 ? "ve" : "s"
				} been reset: \`${reminderIDs.join("`, `")}\``,
				ephemeral: true
			});
		} else {
			// Remove all reminders
			const reminders = await Reminders.find({ author: interaction.user.id });

			reminders.forEach(async reminder => {
				clearTimeout(global[`reminder_${interaction.user.id}_${reminder.id}`]);
				delete global[`reminder_${interaction.user.id}_${reminder.id}`];
			});

			await Reminders.deleteMany({ author: interaction.user.id });
			await interaction.reply({
				content: "All reminders have been reset",
				ephemeral: true
			});
		}
	}
};
