const EventListener = require("../modules/listeners/listener");
const { MessageActionRow, MessageButton, MessageEmbed, MessageAttachment } = require("discord.js");
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

		const settings = utils.getSettings(interaction.guild.id);

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

		const handlePanel = async id => {
			const caticket_row = await db.models.Category.findOne({ where: { id } });

			if (!caticket_row) {
				log.warn("Could not find a category with the ID given by a panel interaction");
				return interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.error_color)
							.setTitle("⚠️")
							.setDescription(
								"An unexpected error occurred during command execution.\nPlease ask an administrator to check the console output / logs for details."
							)
					],
					ephemeral: true
				});
			}

			const ticket_channels = await db.models.Ticket.findAndCountAll({
				where: {
					category: caticket_row.id,
					creator: interaction.user.id,
					open: true
				}
			});

			if (ticket_channels.count >= caticket_row.max_per_member) {
				if (caticket_row.max_per_member === 1) {
					return interaction.reply({
						embeds: [
							new MessageEmbed()
								.setColor(config.colors.error_color)
								.setAuthor({
									name: interaction.user.username,
									iconURL: interaction.user.displayAvatarURL()
								})
								.setTitle("Existing Ticket")
								.setDescription(
									`You already have an existing ticket: ${ticket_channels.rows[0].id}.`
								)
								.setFooter({
									text: config.text.footer,
									iconURL: interaction.guild.iconURL()
								})
						],
						ephemeral: true
					});
				}

				const list = ticket_channels.rows.map(row => {
					if (row.topic) {
						const description = row.topic.substring(0, 30);
						const ellipses = row.topic.length > 30 ? "..." : "";
						return `<#${row.id}>: \`${description}${ellipses}\``;
					}

					return `<#${row.id}>`;
				});
				return interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.error_color)
							.setAuthor({
								name: interaction.user.username,
								iconURL: interaction.user.displayAvatarURL()
							})
							.setTitle(
								`You already have ${ticket_channels.count} open ticket${
									ticket_channels.count === 1 ? "" : "s"
								}`
							)
							.setDescription(
								`Please use \`/close\` to close any unneeded tickets.\n\n${list.join(
									"\n"
								)}`
							)
							.setFooter({
								text: config.text.footer,
								iconURL: interaction.guild.iconURL()
							})
					],
					ephemeral: true
				});
			}

			try {
				const ticket_row = await tickets.create(interaction.guild.id, interaction.user.id, id);
				return interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.success_color)
							.setAuthor({
								name: interaction.user.username,
								iconURL: interaction.user.displayAvatarURL()
							})
							.setTitle("Ticket created")
							.setDescription(`Your ticket has been created: <#${ticket_row.id}>.`)
							.setFooter({
								text: config.text.footer,
								iconURL: interaction.guild.iconURL()
							})
					],
					ephemeral: true
				});
			} catch (error) {
				log.error(error);
				return interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.error_color)
							.setAuthor({
								name: interaction.user.username,
								iconURL: interaction.user.displayAvatarURL()
							})
							.setTitle("Error")
							.setDescription(error.message)
							.setFooter({
								text: config.text.footer,
								iconURL: interaction.guild.iconURL()
							})
					],
					ephemeral: true
				});
			}
		};

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
				const reason = `Reason: "${interaction.message.embeds[0].fields[0].value.replaceAll(
					"```",
					""
				)}"`;

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
			} else if (custom_id.startsWith("panel.single")) {
				// Handle single-category panels
				handlePanel(custom_id.split(":")[1]);
			} else if (custom_id.startsWith("ticket.claim")) {
				// Handle ticket claiming
				if (!(await utils.isStaff(interaction.member))) {
					return;
				}

				const ticket_row = await db.models.Ticket.findOne({
					where: { id: interaction.channel.id }
				});
				await ticket_row.update({ claimed_by: interaction.user.id });
				await interaction.channel.permissionOverwrites.edit(
					interaction.user.id,
					{ VIEW_CHANNEL: true },
					`Ticket claimed by ${interaction.user.tag}`
				);

				const caticket_row = await db.models.Category.findOne({
					where: { id: ticket_row.category }
				});

				for (const role of caticket_row.roles) {
					await interaction.channel.permissionOverwrites.edit(
						role,
						{ VIEW_CHANNEL: false },
						`Ticket claimed by ${interaction.user.tag}`
					);
				}

				log.info(
					`${interaction.user.tag} has claimed "${interaction.channel.name}" in "${interaction.guild.name}"`
				);

				await interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.default_color)
							.setAuthor({
								name: interaction.user.username,
								iconURL: interaction.user.displayAvatarURL()
							})
							.setTitle("Ticket Claimed")
							.setDescription(`${interaction.member.toString()} has claimed this ticket.`)
							.setFooter({
								text: config.text.footer,
								iconURL: interaction.guild.iconURL()
							})
					]
				});

				const components = new MessageActionRow();

				if (caticket_row.claiming) {
					components.addComponents(
						new MessageButton()
							.setCustomId("ticket.unclaim")
							.setLabel("Release")
							.setEmoji("♻️")
							.setStyle("SECONDARY")
					);
				}

				if (settings.close_button) {
					components.addComponents(
						new MessageButton()
							.setCustomId("ticket.close")
							.setLabel("Close")
							.setEmoji("✖️")
							.setStyle("DANGER")
					);
				}

				await interaction.message.edit({ components: [components] });
			} else if (custom_id.startsWith("ticket.unclaim")) {
				// Handle ticket unclaiming
				if (!(await utils.isStaff(interaction.member))) {
					return;
				}

				const ticket_row = await db.models.Ticket.findOne({
					where: { id: interaction.channel.id }
				});
				await ticket_row.update({ claimed_by: null });

				await interaction.channel.permissionOverwrites.delete(
					interaction.user.id,
					`Ticket released by ${interaction.user.tag}`
				);

				const caticket_row = await db.models.Category.findOne({
					where: { id: ticket_row.category }
				});

				for (const role of caticket_row.roles) {
					await interaction.channel.permissionOverwrites.edit(
						role,
						{ VIEW_CHANNEL: true },
						`Ticket released by ${interaction.user.tag}`
					);
				}

				log.info(
					`${interaction.user.tag} has released "${interaction.channel.name}" in "${interaction.guild.name}"`
				);

				await interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.default_color)
							.setAuthor({
								name: interaction.user.username,
								iconURL: interaction.user.displayAvatarURL()
							})
							.setTitle("Ticket Released")
							.setDescription(`${interaction.member.toString()} has released this ticket.`)
							.setFooter({
								text: config.text.footer,
								iconURL: interaction.guild.iconURL()
							})
					]
				});

				const components = new MessageActionRow();

				if (caticket_row.claiming) {
					components.addComponents(
						new MessageButton()
							.setCustomId("ticket.claim")
							.setLabel("Claim")
							.setEmoji("🙌")
							.setStyle("SECONDARY")
					);
				}

				if (settings.close_button) {
					components.addComponents(
						new MessageButton()
							.setCustomId("ticket.close")
							.setLabel("Close")
							.setEmoji("✖️")
							.setStyle("DANGER")
					);
				}

				await interaction.message.edit({ components: [components] });
			} else if (custom_id.startsWith("ticket.close")) {
				// Handle ticket close button
				const ticket_row = await db.models.Ticket.findOne({
					where: { id: interaction.channel.id }
				});
				await interaction.reply({
					components: [
						new MessageActionRow()
							.addComponents(
								new MessageButton()
									.setCustomId(`confirm_close:${interaction.id}`)
									.setLabel("Close")
									.setStyle("SUCCESS")
							)
							.addComponents(
								new MessageButton()
									.setCustomId(`cancel_close:${interaction.id}`)
									.setLabel("Cancel")
									.setStyle("SECONDARY")
							)
					],
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.default_color)
							.setTitle("Are you sure?")
							.setDescription("Please confirm your decision")
							.setFooter({
								text: `${config.text.footer} • Expires in 30 seconds`,
								iconURL: interaction.guild.iconURL()
							})
					],
					ephemeral: true
				});

				const filter = new_interaction =>
					new_interaction.user.id === interaction.user.id &&
					new_interaction.customId.includes(interaction.id);
				const collector = interaction.channel.createMessageComponentCollector({
					filter,
					time: 30000
				});

				collector.on("collect", async new_interaction => {
					await new_interaction.deferUpdate();

					if (new_interaction.customId === `confirm_close:${interaction.id}`) {
						await tickets.close(ticket_row.id, interaction.user.id, interaction.guild.id);
						await new_interaction.editReply({
							components: [],
							embeds: [
								new MessageEmbed()
									.setColor(config.colors.success_color)
									.setTitle("Ticket Closed")
									.setDescription(`Ticket ${ticket_row.number} has been closed`)
									.setFooter({
										text: config.text.footer,
										iconURL: interaction.guild.iconURL()
									})
							],
							ephemeral: true
						});
					} else {
						await new_interaction.editReply({
							components: [],
							embeds: [
								new MessageEmbed()
									.setColor(config.colors.error_color)
									.setTitle("Cancelled")
									.setDescription("The operation has been cancelled.")
									.setFooter({
										text: config.text.footer,
										iconURL: interaction.guild.iconURL()
									})
							],
							ephemeral: true
						});
					}

					collector.stop();
				});

				collector.on("end", async collected => {
					if (collected.size === 0) {
						await interaction.editReply({
							components: [],
							embeds: [
								new MessageEmbed()
									.setColor(config.colors.error_color)
									.setAuthor({
										name: interaction.user.username,
										iconURL: interaction.user.displayAvatarURL()
									})
									.setTitle("Timed out")
									.setDescription(
										"You did not respond in time. The operation has been cancelled."
									)
									.setFooter({
										text: config.text.footer,
										iconURL: interaction.guild.iconURL()
									})
							],
							ephemeral: true
						});
					}
				});
			}
		} else if (interaction.isSelectMenu()) {
			if (custom_id.startsWith("panel.multiple")) {
				// Handle multi-category panels and new command
				handlePanel(interaction.values[0]);
			}
		}
	}
};
