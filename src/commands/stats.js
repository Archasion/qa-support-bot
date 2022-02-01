const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
const Command = require("../modules/commands/command");
const Tests = require("./../mongodb/models/tests");

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
			manager_only: false,
			moderator_only: false,
			nda_only: false,
			dev_only: false,
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

		let time_period_gt = new Date();
		let time_period_lt = new Date();

		let date = new Date();

		switch (option) {
			case "current_year":
				time_period_gt = new Date(time_period_gt.getFullYear(), 0, 0);
				time_period_lt = new Date(time_period_lt.getFullYear() + 1, 0, 1);

				date = date.getFullYear();
				break;

			case "all_time":
				time_period_gt = new Date(0);
				time_period_lt = new Date(100 ** 7);

				date = "All Time";
				break;

			default:
				time_period_lt = new Date(
					time_period_lt.getFullYear(),
					time_period_lt.getMonth() + 1,
					1
				);
				time_period_gt = new Date(time_period_gt.getFullYear(), time_period_gt.getMonth(), 0);

				date = `${date.toLocaleString("default", { month: "long" })} ${date.getFullYear()}`;
				option = "current_month";
				break;
		}

		time_period_gt = time_period_gt.toISOString();
		time_period_lt = time_period_lt.toISOString();

		const public_tests = await Tests.countDocuments({
			type: "public",
			date: { $gt: time_period_gt, $lt: time_period_lt }
		});

		const embed = new MessageEmbed()

			.setColor(config.colors.default_color)
			.setDescription(
				`There ha${public_tests === 1 ? "s" : "ve"} been **${public_tests.format()}** test${
					public_tests === 1 ? "" : "s"
				} run in this server (${date})`
			);

		if (await utils.isNDA(interaction.member)) {
			const total = await Tests.countDocuments({
				type: { $in: ["public", "nda"] },
				date: { $gt: time_period_gt, $lt: time_period_lt }
			});

			const nda_tests = await Tests.countDocuments({
				type: "nda",
				date: { $gt: time_period_gt, $lt: time_period_lt }
			});

			const accelerator_tests = await Tests.countDocuments({
				type: "accelerator",
				date: { $gt: time_period_gt, $lt: time_period_lt }
			});

			embed.description = null;
			embed.setTitle(`Testing Statistics (${date})`);
			embed.addField("Public Tests", public_tests.format(), true);
			embed.addField("NDA Tests", nda_tests.format(), true);
			embed.addField("Accelerator Tests", accelerator_tests.format(), true);
			embed.setFooter({ text: `Total Tests: ${total.format()}` });
		}

		let download = [];

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

		interaction.reply({
			embeds: [embed],
			components: download,
			ephemeral: true
		});
	}
};
