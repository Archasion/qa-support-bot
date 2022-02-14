const Command = require("../modules/commands/command");
const Reminders = require("../mongodb/models/reminders");
const ms = require("ms");

const { MessageEmbed } = require("discord.js");

let isDuplicate = true;
let uniqueID;

module.exports = class RemindCommand extends Command {
	constructor(client) {
		super(client, {
			name: "remind",
			description: "Set a reminder",
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
					name: "duration",
					description: "The duration until the reminder is triggered",
					required: true,
					type: Command.option_types.STRING
				},
				{
					name: "message",
					description: "The message to send",
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
		const reminderProfile = await Reminders.find({ author: interaction.user.id });

		// Check if the user has reached the limit of 5 reminders
		if (reminderProfile.length >= 5) {
			return interaction.reply({
				content: "You have too many reminders, you can clear them using `/reset-reminders`",
				ephemeral: true
			});
		}

		// Generate random ID, regenerate if it already exists
		while (isDuplicate) {
			uniqueID = "";
			uniqueID = Math.random().toString(36).substring(2, 9);

			isDuplicate = await Reminders.findOne({
				id: uniqueID
			});
		}

		const duration = ms(interaction.options.getString("duration"));
		const message = interaction.options.getString("message");

		const start = parseInt(Date.now() / 1000);
		const end = parseInt((Date.now() + duration) / 1000);

		// Store reminder in database
		await Reminders.create({
			id: uniqueID,
			author: interaction.user.id,
			channel: interaction.channel.id,
			start_time: start,
			end_time: end,
			text: message
		});

		// Store timeout in a global variable
		global[`reminder_${interaction.user.id}_${uniqueID}`] = setTimeout(async () => {
			// Send the reminder
			await interaction.channel.send({
				content: interaction.member.toString(),
				embeds: [
					new MessageEmbed()
						.setColor(config.colors.default_color)
						.setTitle("Reminder")
						.setDescription(
							`You asked me to give you a reminder <t:${start}:R> (<t:${start}:f>)`
						)
						.addField("Reminder", message)
				]
			});

			// Reset the reminder once the timeout is done
			await Reminders.deleteOne({ id: uniqueID });
			delete global[`reminder_${interaction.user.id}_${uniqueID}`];
		}, duration);

		// Send confirmation message
		await interaction.reply({
			embeds: [
				new MessageEmbed()
					.setColor(config.colors.default_color)
					.setDescription(`Okay! I will remind you <t:${end}:R> (<t:${end}:f>)`)
					.addField("Reminder", message)
					.setFooter({ text: `Reminder ID: ${uniqueID}` })
			],
			ephemeral: true
		});
	}
};
