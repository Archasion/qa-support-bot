const Command = require("../modules/commands/command");

const { RoleBlacklist, MemberBlacklist } = require("../mongodb/models/blacklist");
const { MessageEmbed, Role } = require("discord.js");

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
		// Set the blacklist to the input from the database
		const blacklist = {
			roles: RoleBlacklist,
			members: MemberBlacklist
		};

		switch (interaction.options.getSubcommand()) {
			// Add the member or role to the blacklist
			case "add": {
				const memberOrRole = interaction.options.getMentionable("member_or_role");
				const type = memberOrRole instanceof Role ? "role" : "member";

				// Check if the member is a staff member
				if (type === "member" && (await utils.isStaff(memberOrRole))) {
					return interaction.reply({
						embeds: [
							new MessageEmbed()
								.setColor(config.colors.error_color)
								.setTitle("You can't blacklist this member")
								.setDescription(
									`${memberOrRole.toString()} is a staff member and cannot be blacklisted.`
								)
						],
						ephemeral: true
					});
				}

				// Add the member to the database
				if (type === "member") {
					MemberBlacklist.create({
						name: memberOrRole.user.tag,
						id: memberOrRole.id
					});
				}

				// Add the role to the database
				else {
					RoleBlacklist.create({
						name: memberOrRole.name,
						id: memberOrRole.id
					});
				}

				// String builder
				const description = [];

				description.push(type === "member" ? "<@" : "<@&");
				description.push(memberOrRole.id);
				description.push("> has been added to the blacklist. ");

				// Update description based on input
				if (type === "member") {
					description.push("They will no longer be able to interact with the bot.");
				} else {
					description.push(
						"Members with this role will no longer be able to interact with the bot."
					);
				}

				// Send the confirmation message
				await interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.success_color)
							.setTitle(`Added ${type} to blacklist`)
							.setDescription(description.join(""))
					],
					ephemeral: true
				});

				break;
			}

			// Remove the member or role from the blacklist
			case "remove": {
				const memberOrRole = interaction.options.getMentionable("member_or_role");
				const type = memberOrRole instanceof Role ? "role" : "member";

				// Try to remove the member or role from the database
				try {
					if (type === "member") {
						await MemberBlacklist.deleteMany({ id: memberOrRole.id });
					} else {
						await RoleBlacklist.deleteMany({ id: memberOrRole.id });
					}
				} catch {
					return interaction.reply({
						content: `Could not remove <@${type === "member" ? "" : "&"}${
							memberOrRole.id
						}> from the blacklist`,
						ephemeral: true
					});
				}

				// String builder
				const description = [];

				description.push(type === "member" ? "<@" : "<@&");
				description.push(memberOrRole.id);
				description.push("> has been removed from the blacklist. ");

				// Update description based on input
				if (type === "member") {
					description.push("They can now use the bot again.");
				} else {
					description.push("Members with this role can now use the bot again.");
				}

				// Send the confirmation message
				await interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.success_color)
							.setTitle(`Removed ${type} from blacklist`)
							.setDescription(description.join(""))
					],
					ephemeral: true
				});
				break;
			}

			// Show a list of blacklisted members and/or roles
			case "show": {
				// Check if the blacklist is empty
				if (blacklist.members.length === 0 && blacklist.roles.length === 0) {
					return interaction.reply({
						embeds: [
							new MessageEmbed()
								.setColor(config.colors.default)
								.setTitle("Blacklisted members and roles")
								.setDescription(
									"There are no members or roles blacklisted. Type `/blacklist add` to add a member or role to the blacklist."
								)
						],
						ephemeral: true
					});
				}

				const members = Object.values(await MemberBlacklist.find()).map(obj => `• <@${obj.id}>`);
				const roles = Object.values(await RoleBlacklist.find()).map(obj => `• <@&${obj.id}>`);

				// Respond with the list of blacklisted members and/or roles
				return interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.default)
							.setTitle("Blacklisted members and roles")
							.addField("Members", members.join("\n") || "None")
							.addField("Roles", roles.join("\n") || "None")
					],
					ephemeral: true
				});
			}
		}
	}
};
