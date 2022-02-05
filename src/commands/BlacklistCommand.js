const { MessageEmbed, Role } = require("discord.js");
const Command = require("../modules/commands/command");
const { RoleBlacklist, MemberBlacklist } = require("../mongodb/models/blacklist");

module.exports = class BlacklistCommand extends Command {
	constructor(client) {
		super(client, {
			name: "blacklist",
			description: "View or modify the blacklist",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			manager_only: true,
			moderator_only: false,
			nda_only: false,
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
		const blacklist = {
			roles: RoleBlacklist,
			members: MemberBlacklist
		};

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

				if (type === "member") {
					MemberBlacklist.create({
						name: member_or_role.user.tag,
						id: member_or_role.id
					});
				} else {
					RoleBlacklist.create({
						name: member_or_role.name,
						id: member_or_role.id
					});
				}

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

				break;
			}

			case "remove": {
				const member_or_role = interaction.options.getMentionable("member_or_role");
				const type = member_or_role instanceof Role ? "role" : "member";

				try {
					if (type === "member") {
						await MemberBlacklist.deleteMany({ id: member_or_role.id });
					} else {
						await RoleBlacklist.deleteMany({ id: member_or_role.id });
					}
				} catch (error) {
					console.log(error);
					return interaction.reply({
						content: `Could not remove <@${type === "member" ? "" : "&"}${
							member_or_role.id
						}> from the blacklist`,
						ephemeral: true
					});
				}

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

				const members = Object.values(await MemberBlacklist.find()).map(obj => `• <@${obj.id}>`);
				const roles = Object.values(await RoleBlacklist.find()).map(obj => `• <@&${obj.id}>`);

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
