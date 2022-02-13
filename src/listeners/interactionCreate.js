const EventListener = require("../modules/listeners/listener");
const { MessageAttachment } = require("discord.js");
const { MemberBlacklist, RoleBlacklist } = require("./../mongodb/models/blacklist");
const Tests = require("./../mongodb/models/tests");

module.exports = class InteractionCreateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "interactionCreate" });
	}

	/**
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const custom_id = interaction.customId;
		log.debug(interaction);

		const blacklist = {
			roles: Object.values(await RoleBlacklist.find()).map(obj => obj.id),
			members: Object.values(await MemberBlacklist.find()).map(obj => obj.id)
		};

		const blacklisted =
			blacklist.members.includes(interaction.user.id) ||
			interaction.member?.roles.cache?.some(role => blacklist.roles.includes(role));
		if (blacklisted) {
			return interaction.reply({
				content: "You are blacklisted",
				ephemeral: true
			});
		}

		if (interaction.isCommand()) {
			// Handle slash commands
			this.client.commands.handle(interaction);
		} else if (interaction.isButton()) {
			if (custom_id === "delete_message") {
				if (!(await utils.isStaff(interaction.member))) {
					interaction.reply({
						content: "Only staff are able to interact with this",
						ephemeral: true
					});
					return;
				}

				await interaction.message.delete();
			} else if (custom_id.endsWith("_timeout_mod_alert")) {
				if (!(await utils.isStaff(interaction.member))) {
					interaction.reply({
						content: "Only staff are able to interact with moderation alerts",
						ephemeral: true
					});
					return;
				}

				const member_id = interaction.message.embeds[0].footer.text.slice(0, -1).split("(")[1];

				let member;
				try {
					member = await interaction.guild.members.fetch(member_id);
				} catch {
					interaction.reply({ content: "Cannot find user by ID", ephemeral: true });
					return;
				}

				if (!member.moderatable) {
					interaction.reply({
						content: "I do not have permission to timeout this user",
						ephemeral: true
					});
					return;
				}

				if (member.communicationDisabledUntilTimestamp) {
					interaction.reply({
						content: `The user is already timed out until <t:${parseInt(
							member.communicationDisabledUntilTimestamp / 1000,
							10
						)}:f>`,
						ephemeral: true
					});
					return;
				}

				const duration = parseInt(custom_id.slice(0, 2));
				const reason = `(By ${interaction.user.tag} (${
					interaction.user.id
				})) Reason: "${interaction.message.embeds[0].fields[0].value.replaceAll("```", "")}"`;

				try {
					member.timeout(duration * 60000, reason);
					interaction.reply({
						content: `${member} (\`${member.id}\`) has been muted for **${duration} minutes**`,
						ephemeral: true
					});
					interaction.message.delete();
					return;
				} catch {
					interaction.reply({
						content: `${member} (\`${member.id}\`) couldn't be muted`,
						ephemeral: true
					});
				}
			} else if (custom_id.startsWith("download_test_csv_")) {
				const type = `${custom_id.split("_")[3]}_${custom_id.split("_")[4]}`;

				let time_period_gt = new Date();
				let time_period_lt = new Date();

				let date = new Date();

				switch (type) {
					case "current_year":
						time_period_gt = new Date(time_period_gt.getFullYear(), 0, 0);
						time_period_lt = new Date(time_period_lt.getFullYear() + 1, 0, 1);

						date = date.getFullYear();
						break;

					case "all_time":
						time_period_gt = new Date(0);
						time_period_lt = new Date(100 ** 7);

						date = "all_time";
						break;

					default:
						time_period_lt = new Date(
							time_period_lt.getFullYear(),
							time_period_lt.getMonth() + 1,
							1
						);
						time_period_gt = new Date(
							time_period_gt.getFullYear(),
							time_period_gt.getMonth(),
							0
						);

						date = `${date.toLocaleString("default", {
							month: "long"
						})}_${date.getFullYear()}`.toLowerCase();
						break;
				}

				time_period_gt = time_period_gt.toISOString();
				time_period_lt = time_period_lt.toISOString();

				const tests = await Tests.find({ date: { $gt: time_period_gt, $lt: time_period_lt } });
				const data = [];

				tests.forEach(game => {
					const obj = data.findIndex(item => item.game_all.includes(`;"${game.name}")`));
					if (obj !== -1) {
						switch (game.type) {
							case "public":
								data[obj].amount_public++;
								data[obj].amount_all++;
								break;
							case "nda":
								data[obj].amount_nda++;
								data[obj].amount_all++;
								break;
							case "accelerator":
								data[obj].amount_accelerator++;
								break;
						}
					} else {
						data.push({
							game_all: `=HYPERLINK("${game.url}";"${game.name}")`,
							amount_all: 0,
							blank_all: "",
							game_public: `=HYPERLINK("${game.url}";"${game.name}")`,
							amount_public: game.type === "public" ? 1 : 0,
							blank_public: "",
							game_nda: `=HYPERLINK("${game.url}";"${game.name}")`,
							amount_nda: game.type === "nda" ? 1 : 0,
							blank_nda: "",
							game_accelerator: `=HYPERLINK("${game.url}";"${game.name}")`,
							amount_accelerator: game.type === "accelerator" ? 1 : 0
						});
					}
				});

				let csvContent =
					"Game,Amount [ALL],,Game,Amount [PUBLIC],,Game,Amount [NDA],,Game,Amount [ACCELERATOR]\n";

				data.forEach(rowArray => {
					const row = Object.values(rowArray).join(",");
					csvContent += `${row}\n`;
				});

				const attachment = new MessageAttachment(
					Buffer.from(csvContent, "utf8"),
					`testing_sessions_${date}.csv`
				);

				interaction.reply({
					content: "Import into **Google Sheets** or **Microsoft Excel**",
					files: [attachment],
					ephemeral: true
				});
			}
		}
	}
};
