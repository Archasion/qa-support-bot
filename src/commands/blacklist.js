const { MessageEmbed, Role } = require("discord.js");
const Command = require("../modules/commands/command");

module.exports = class BlacklistCommand extends Command {
	constructor(client) {
		super(client, {
			name: "blacklist",
			description: "View or modify the blacklist",
			permissions: [],
			manager_only: true,
			moderator_only: false,
			dev_only: false,
			options: [
				{
					name: "show",
					description: "Show the members and roles in the blacklist",
					type: Command.option_types.SUB_COMMAND
				},
				{
					name: "add",
					description: "Add a member or role to the blacklist",
					type: Command.option_types.SUB_COMMAND,
					options: [
						{
							description: "The member or role to add to the blacklist",
							name: "member_or_role",
							required: true,
							type: Command.option_types.MENTIONABLE
						}
					]
				},
				{
					name: "remove",
					description: "Remove a member or role from the blacklist",
					type: Command.option_types.SUB_COMMAND,
					options: [
						{
							description: "The member or role to remove from the blacklist",
							name: "member_or_role",
							required: true,
							type: Command.option_types.MENTIONABLE
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
		const settings = await utils.getSettings(interaction.guild.id);
		const blacklist = JSON.parse(JSON.stringify(settings.blacklist));

		switch (interaction.options.getSubcommand()) {
			case "add": {
				const member_or_role = interaction.options.getMentionable("member_or_role");
				const type = member_or_role instanceof Role ? "role" : "member";

				if (type === "member" && (await utils.isStaff(member_or_role))) {
					return interaction.reply({
						embeds: [
							new MessageEmbed()
								.setColor(config.colors.error_color)
								.setTitle("You can't blacklist this member")
								.setDescription(
									`${member_or_role.toString()} is a staff member and cannot be blacklisted.`
								)
								.setFooter({
									text: config.text.footer,
									iconURL: interaction.guild.iconURL()
								})
						],
						ephemeral: true
					});
				}

				blacklist[`${type}s`].push(member_or_role.id);

				const description = [];

				description.push(type === "member" ? "<@" : "<@&");
				description.push(member_or_role.id);
				description.push("> has been added to the blacklist. ");

				if (type === "member") {
					description.push("They will no longer be able to interact with the bot.");
				} else {
					description.push(
						"Members with this role will no longer be able to interact with the bot."
					);
				}

				await interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.success_color)
							.setTitle(`Added ${type} to blacklist`)
							.setDescription(description.join(""))
							.setFooter({
								text: config.text.footer,
								iconURL: interaction.guild.iconURL()
							})
					],
					ephemeral: true
				});

				await settings.update({ blacklist });
				break;
			}

			case "remove": {
				const member_or_role = interaction.options.getMentionable("member_or_role");
				const type = member_or_role instanceof Role ? "role" : "member";
				const index = blacklist[`${type}s`].findIndex(element => element === member_or_role.id);

				if (index === -1) {
					return interaction.reply({
						embeds: [
							new MessageEmbed()
								.setColor(config.colors.error_color)
								.setTitle("Error")
								.setDescription(
									"This member or role can not be removed from the blacklist as they are not blacklisted."
								)
								.setFooter({
									text: config.text.footer,
									iconURL: interaction.guild.iconURL()
								})
						],
						ephemeral: true
					});
				}

				blacklist[`${type}s`].splice(index, 1);

				const description = [];

				description.push(type === "member" ? "<@" : "<@&");
				description.push(member_or_role.id);
				description.push("> has been removed from the blacklist. ");

				if (type === "member") {
					description.push("They can now use the bot again.");
				} else {
					description.push("Members with this role can now use the bot again.");
				}

				await interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.success_color)
							.setTitle(`Removed ${type} from blacklist`)
							.setDescription(description.join(""))
							.setFooter({
								text: config.text.footer,
								iconURL: interaction.guild.iconURL()
							})
					],
					ephemeral: true
				});

				await settings.update({ blacklist });
				break;
			}

			case "show": {
				if (blacklist.members.length === 0 && blacklist.roles.length === 0) {
					return interaction.reply({
						embeds: [
							new MessageEmbed()
								.setColor(config.colors.default_color)
								.setTitle("Blacklisted members and roles")
								.setDescription(
									"There are no members or roles blacklisted. Type `/blacklist add` to add a member or role to the blacklist."
								)
								.setFooter({
									text: config.text.footer,
									iconURL: interaction.guild.iconURL()
								})
						],
						ephemeral: true
					});
				}

				const members = blacklist.members.map(id => `• <@${id}>`);
				const roles = blacklist.roles.map(id => `• <@&${id}>`);

				return interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.default_color)
							.setTitle("Blacklisted members and roles")
							.addField("Members", members.join("\n") || "None")
							.addField("Roles", roles.join("\n") || "None")
							.setFooter({
								text: config.text.footer,
								iconURL: interaction.guild.iconURL()
							})
					],
					ephemeral: true
				});
			}
		}
	}
};
