const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
const Command = require("../modules/commands/command");
const Tests = require("../mongodb/models/tests");

module.exports = class StatsCommand extends Command {
	constructor(client) {
		super(client, {
			name: "stats",
			description: "View the server's test statistics.",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			verified_only: true,
			options: [
				{
					name: "time_period",
					description: "The time period to view statistics for",
					type: Command.option_types.STRING,
					choices: [
						{
							name: "Current Month",
							value: "current_month"
						},
						{
							name: "Current Year",
							value: "current_year"
						},
						{
							name: "All Time",
							value: "all_time"
						}
					]
				}
			]
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		let option = interaction.options.getString("time_period");

		let timeGreaterThan = new Date();
		let timeLowerThan = new Date();

		let date = new Date();

		switch (option) {
			// Set the duration to the current year
			case "current_year":
				timeGreaterThan = new Date(timeGreaterThan.getFullYear(), 0, 0);
				timeLowerThan = new Date(timeLowerThan.getFullYear() + 1, 0, 1);

				date = date.getFullYear();
				break;

			// Set the duration to all time
			case "all_time":
				timeGreaterThan = new Date(0);
				timeLowerThan = new Date(100 ** 7);

				date = "All Time";
				break;

			// Set the duration to current month
			default:
				timeLowerThan = new Date(timeLowerThan.getFullYear(), timeLowerThan.getMonth() + 1, 1);
				timeGreaterThan = new Date(timeGreaterThan.getFullYear(), timeGreaterThan.getMonth(), 0);

				date = `${date.toLocaleString("default", { month: "long" })} ${date.getFullYear()}`;
				option = "current_month";
				break;
		}

		timeGreaterThan = timeGreaterThan.toISOString();
		timeLowerThan = timeLowerThan.toISOString();

		// Get the total number of public tests
		const public_tests = await Tests.countDocuments({
			type: "public",
			date: { $gt: timeGreaterThan, $lt: timeLowerThan }
		});

		const embed = new MessageEmbed()

			.setColor(config.colors.default_color)
			.setDescription(
				`There ha${public_tests === 1 ? "s" : "ve"} been **${public_tests.format()}** test${
					public_tests === 1 ? "" : "s"
				} run in this server (${date})`
			);

		// Get the total number of all tests (if used by NDA)
		if (await utils.isNDA(interaction.member)) {
			const total = await Tests.countDocuments({
				type: { $in: ["public", "nda"] },
				date: { $gt: timeGreaterThan, $lt: timeLowerThan }
			});

			// Number of NDA tests
			const NDATests = await Tests.countDocuments({
				type: "nda",
				date: { $gt: timeGreaterThan, $lt: timeLowerThan }
			});

			// Number of accelerator tests
			const acceleratorTests = await Tests.countDocuments({
				type: "accelerator",
				date: { $gt: timeGreaterThan, $lt: timeLowerThan }
			});

			embed.description = null;
			embed.setTitle(`Testing Statistics (${date})`);
			embed.addField("Public Tests", public_tests.format(), true);
			embed.addField("NDA Tests", NDATests.format(), true);
			embed.addField("Accelerator Tests", acceleratorTests.format(), true);
			embed.setFooter({ text: `Total Tests: ${total.format()}` });
		}

		let download = [];

		// Add the option to download a .csv file containing all of the information if used by staff
		if (await utils.isStaff(interaction.member)) {
			download = [
				new MessageActionRow().addComponents(
					new MessageButton()
						.setCustomId(`download_test_csv_${option}`)
						.setLabel("Download CSV")
						.setStyle("DANGER")
				)
			];
		}

		// Send the statistics
		interaction.reply({
			embeds: [embed],
			components: download,
			ephemeral: true
		});
	}
};
