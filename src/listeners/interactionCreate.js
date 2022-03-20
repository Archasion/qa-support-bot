const EventListener = require("../modules/listeners/listener");
const Tests = require("./../mongodb/models/tests");

const { MessageAttachment } = require("discord.js");
const { MemberBlacklist, RoleBlacklist } = require("./../mongodb/models/blacklist");

module.exports = class InteractionCreateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "interactionCreate" });
	}

	/**
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const customID = interaction.customId;
		log.debug(interaction);

		const blacklist = {
			roles: Object.values(await RoleBlacklist.find()).map(obj => obj.id),
			members: Object.values(await MemberBlacklist.find()).map(obj => obj.id)
		};

		// Check if the user is blacklisted
		const blacklisted =
			blacklist.members.includes(interaction.user.id) ||
			interaction.member?.roles.cache?.some(role => blacklist.roles.includes(role));
		if (blacklisted) {
			return interaction.reply({
				content: "You are blacklisted",
				ephemeral: true
			});
		}

		// Check if the interaction is a slash command
		if (interaction.isCommand()) {
			this.client.commands.handle(interaction);
		}

		// Check if the interaction is a button
		else if (interaction.isButton()) {
			// Delete the message
			if (customID === "delete_message") {
				// Check if the user is a staff member
				if (!(await utils.isStaff(interaction.member))) {
					interaction.reply({
						content: "Only staff are able to interact with this",
						ephemeral: true
					});
					return;
				}

				await interaction.message.delete();
			}

			// Timeout the user (if used by staff)
			else if (customID.endsWith("_timeout_mod_alert")) {
				// Check if the user is a staff member
				if (!(await utils.isStaff(interaction.member))) {
					interaction.reply({
						content: "Only staff are able to interact with moderation alerts",
						ephemeral: true
					});
					return;
				}

				// Get the member ID from the embed footer
				const memberID = interaction.message.embeds[0].author.name.slice(0, -1).split("(")[1];

				// Fetch the member in the guild
				let member;
				try {
					member = await interaction.guild.members.fetch(memberID);
				} catch {
					interaction.reply({ content: "Cannot find user by ID", ephemeral: true });
					return;
				}

				// Check if the client is able to timeout the member
				if (!member.moderatable) {
					interaction.reply({
						content: "I do not have permission to timeout this user",
						ephemeral: true
					});
					return;
				}

				// Check if the member is already timed out
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

				const duration = parseInt(customID.slice(0, 2));
				const reason = `(By ${interaction.user.tag} (${
					interaction.user.id
				})) Reason: "${interaction.message.embeds[0].fields[0].value.replaceAll("```", "")}"`;

				try {
					// Timeout the member
					member.timeout(duration * 60000, reason);

					// Send the confirmation message
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
			}

			// Download a .csv file with the testing data
			else if (customID.startsWith("download_test_csv_")) {
				// Check if the user is a staff member
				if (!(await utils.isStaff(interaction.member))) {
					interaction.reply({
						content: "Only staff are able to download testing data",
						ephemeral: true
					});
					return;
				}

				const type = `${customID.split("_")[3]}_${customID.split("_")[4]}`;

				let timeGreaterThan = new Date();
				let timeLowerThan = new Date();

				let date = new Date();

				switch (type) {
					// Get the data from the current year
					case "current_year":
						timeGreaterThan = new Date(timeGreaterThan.getFullYear(), 0, 0);
						timeLowerThan = new Date(timeLowerThan.getFullYear() + 1, 0, 1);

						date = date.getFullYear();
						break;

					// Get the data from all time
					case "all_time":
						timeGreaterThan = new Date(0);
						timeLowerThan = new Date(100 ** 7);

						date = "all_time";
						break;

					// Get the data from the current month
					default:
						timeLowerThan = new Date(
							timeLowerThan.getFullYear(),
							timeLowerThan.getMonth() + 1,
							1
						);
						timeGreaterThan = new Date(
							timeGreaterThan.getFullYear(),
							timeGreaterThan.getMonth(),
							0
						);

						date = `${date.toLocaleString("default", {
							month: "long"
						})}_${date.getFullYear()}`.toLowerCase();
						break;
				}

				timeGreaterThan = timeGreaterThan.toISOString();
				timeLowerThan = timeLowerThan.toISOString();

				const tests = await Tests.find({ date: { $gt: timeGreaterThan, $lt: timeLowerThan } });
				const data = [];

				// Write the formatted data to a .csv file
				tests.forEach(game => {
					const testData = data.findIndex(item => item.game_all.includes(`;"${game.name}")`));
					if (testData !== -1) {
						switch (game.type) {
							case "public":
								data[testData].amount_public++;
								data[testData].amount_all++;
								break;
							case "nda":
								data[testData].amount_nda++;
								data[testData].amount_all++;
								break;
							case "accelerator":
								data[testData].amount_accelerator++;
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

				// Create the .csv file with the formatted data
				const attachment = new MessageAttachment(
					Buffer.from(csvContent, "utf8"),
					`testing_sessions_${date}.csv`
				);

				// Send the .csv file to the user
				interaction.reply({
					content: "Import into **Google Sheets** or **Microsoft Excel**",
					files: [attachment],
					ephemeral: true
				});
			}
		}
	}
};
