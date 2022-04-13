const EventListener = require("../modules/listeners/listener");
const Tickets = require("../mongodb/models/tickets");
const Tests = require("./../mongodb/models/tests");

const { MessageAttachment, EmbedBuilder } = require("discord.js");
const { MODERATION_CHAT, BOT_FEEDBACK, TICKET_LOGS } = process.env;
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
		if (interaction.isChatInputCommand()) {
			this.client.commands.handle(interaction);
		} else if (interaction.isModalSubmit()) {
			switch (interaction.customId) {
				case "bot_suggestion":
					const suggestion = interaction.fields.getTextInputValue("suggestion");
					const thread = interaction.guild.channels.cache
						.get(MODERATION_CHAT)
						.threads.cache.get(BOT_FEEDBACK);

					const embed = new EmbedBuilder()

						.setColor(config.colors.default)
						.setAuthor({
							name: `${interaction.user.tag} (${interaction.member.displayName})`,
							iconURL: interaction.member.displayAvatarURL({ dynamic: true })
						})
						.setTitle("QA Utility Bot Feedback")
						.setDescription(suggestion)
						.setFooter({ text: `ID: ${interaction.user.id}` })
						.setTimestamp();

					thread
						.send({
							content: `<@&${config.roles.bot_developer}>`,
							embeds: [embed]
						})
						.then(message => {
							message.react("284099057348247562");
							message.react("284099017414148096");
						});

					interaction.reply({
						content: "We have received your suggestion!",
						ephemeral: true
					});

					break;

				case "ticket_topic_change":
					// Get the ticket
					const ticket = await Tickets.findOne({
						author: interaction.user.id,
						active: true
					});

					// Check if the ticket exists
					if (!ticket) {
						interaction.reply({
							content: "You do not have any active tickets",
							ephemeral: true
						});
						return;
					}

					const info = interaction.fields.getTextInputValue("new_topic").format();

					// Check if the topic is the same
					if (ticket.topic === info) {
						interaction.reply({
							content: "The topic is already set to this",
							ephemeral: true
						});
						return;
					}

					const ticketThread = await interaction.guild.channels.cache
						.get(config.channels.tickets)
						.threads.cache.get(ticket.thread);

					// Update first message
					let message;
					try {
						message = await ticketThread.messages.fetch(ticket.first_message);
					} catch {
						interaction.reply({
							content: "The original message with the topic could not be edited",
							ephemeral: true
						});
						return;
					}

					const oldTopic = message.embeds[0].data.fields[0].value;

					// Update the message embed
					message.embeds[0].data.fields[0].value = info;
					message.edit({ content: message.content, embeds: message.embeds });

					const logging_embed = new EmbedBuilder()

						.setColor(config.colors.change_topic)
						.setAuthor({
							name: `${interaction.user.tag} (${interaction.member.displayName})`,
							iconURL: interaction.user.displayAvatarURL({ dynamic: true })
						})
						.setDescription(
							`Changed the topic of a ticket: <#${ticket.thread}> (\`${ticketThread.name}\`)`
						)
						.addFields(
							{ name: "Old Topic", value: `\`\`\`${oldTopic}\`\`\`` },
							{ name: "New Topic", value: `\`\`\`${info}\`\`\`` }
						)
						.setFooter({ text: `ID: ${interaction.user.id}` })
						.setTimestamp();

					// Log the action
					interaction.guild.channels.cache.get(TICKET_LOGS).send({
						embeds: [logging_embed]
					});

					// Update database
					await Tickets.updateOne({ _id: ticket._id }, { $set: { topic: info } });

					// Send the confirmation message
					interaction.reply({
						content: `Set the topic of <#${ticket.thread}> to:\n\`\`\`${info}\`\`\``,
						ephemeral: true
					});
					break;
			}
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
				const memberID = interaction.message.embeds[0].data.author.name
					.slice(0, -1)
					.split("(")[1];

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
				})) Reason: "${interaction.message.embeds[0].data.fields[0].value.replaceAll(
					"```",
					""
				)}"`;

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
