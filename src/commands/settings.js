const { MessageEmbed } = require("discord.js");
const Command = require("../modules/commands/command");

module.exports = class SettingsCommand extends Command {
	constructor(client) {
		super(client, {
			name: "settings",
			description: "Edit the settings of the bot",
			permissions: [],
			manager_only: true,
			moderator_only: false,
			dev_only: true,
			internal: true,
			options: [
				{
					name: "categories",
					description: "Manage your ticket categories",
					type: Command.option_types.SUB_COMMAND_GROUP,
					options: [
						{
							name: "list",
							description: "List categories",
							type: Command.option_types.SUB_COMMAND
						},
						{
							name: "create",
							description: "Create a new category",
							type: Command.option_types.SUB_COMMAND,
							options: [
								{
									name: "name",
									description: "The name of the category",
									required: true,
									type: Command.option_types.STRING
								},
								{
									name: "roles",
									description:
										"A comma-separated list of staff role IDs for this category",
									required: true,
									type: Command.option_types.STRING
								}
							]
						},
						{
							name: "delete",
							description: "Delete a category",
							type: Command.option_types.SUB_COMMAND,
							options: [
								{
									name: "id",
									description: "The ID of the category to delete",
									required: true,
									type: Command.option_types.STRING
								}
							]
						},
						{
							name: "edit",
							description: "Make changes to a category's configuration",
							type: Command.option_types.SUB_COMMAND,
							options: [
								{
									name: "id",
									description: "The ID of the category to edit",
									required: true,
									type: Command.option_types.STRING
								},
								{
									name: "claiming",
									description: "Enable ticket claiming?",
									required: false,
									type: Command.option_types.BOOLEAN
								},
								{
									name: "image",
									description: "An image URL",
									required: false,
									type: Command.option_types.STRING
								},
								{
									name: "max_per_member",
									description: "Maximum tickets per member",
									required: false,
									type: Command.option_types.INTEGER
								},
								{
									name: "name",
									description: "The name of the category",
									required: false,
									type: Command.option_types.STRING
								},
								{
									name: "name_format",
									description: "The ticket name format",
									required: false,
									type: Command.option_types.STRING
								},
								{
									name: "opening_message",
									description: "The message that gets sent when a ticket is created",
									required: false,
									type: Command.option_types.STRING
								},
								{
									name: "ping",
									description: "A comma-separated list of role IDs to ping",
									required: false,
									type: Command.option_types.STRING
								},
								{
									name: "roles",
									description: "A comma-separated list of staff role IDs",
									required: false,
									type: Command.option_types.STRING
								}
							]
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
		switch (interaction.options.getSubcommand()) {
			case "create": {
				const allowedPermissions = [
					"VIEW_CHANNEL",
					"READ_MESSAGE_HISTORY",
					"SEND_MESSAGES",
					"EMBED_LINKS",
					"ATTACH_FILES"
				];
				const roles = interaction.options.getString("roles").match(/\d{17,19}/g) ?? [];
				const name = interaction.options.getString("name");

				const categoryChannel = await interaction.guild.channels.create(name, {
					reason: `Tickets category created by ${interaction.user.tag}`,
					type: "GUILD_CATEGORY",
					position: 1,
					permissionOverwrites: [
						...[
							{
								deny: ["VIEW_CHANNEL"],
								id: interaction.guild.roles.everyone
							},
							{
								allow: allowedPermissions,
								id: this.client.user.id
							}
						],
						...roles.map(roleID => ({
							allow: allowedPermissions,
							id: roleID
						}))
					]
				});

				await db.models.Category.create({
					guild: interaction.guild.id,
					id: categoryChannel.id,
					name,
					roles
				});
				await this.client.commands.updatePermissions(interaction.guild);

				await interaction.reply({
					content: `The \`${name}\` ticket category has been created`,
					ephemeral: true
				});
				break;
			}

			case "delete": {
				const category = await db.models.Category.findOne({
					where: { id: interaction.options.getString("id") }
				});

				if (category) {
					const channel = this.client.channels.cache.get(interaction.options.getString("id"));
					if (channel) {
						channel.delete();
					}

					await category.destroy();

					await interaction.reply({
						content: `The \`${category.name}\` ticket category has been deleted`,
						ephemeral: true
					});
				} else {
					await interaction.reply({
						content: "No category exists with the provided ID",
						ephemeral: true
					});
				}

				break;
			}

			case "edit": {
				const category = await db.models.Category.findOne({
					where: { id: interaction.options.getString("id") }
				});

				if (!category) {
					return interaction.reply({
						content: "No category exists with the provided ID",
						ephemeral: true
					});
				}

				const editingProperties = {
					claiming: null,
					image: null,
					max_per_member: null,
					name: null,
					name_format: null,
					opening_message: null,
					ping: null,
					roles: null
				};

				for (const key of Object.keys(editingProperties)) {
					try {
						editingProperties[key] = interaction.options.getString(key);
					} catch {
						try {
							editingProperties[key] = interaction.options.get(key);
						} catch {
							editingProperties[key] = interaction.options.getBoolean(key);
						}
					}
				}

				const {
					name,
					name_format,
					max_per_member,
					opening_message,
					ping,
					roles,
					claiming,
					image
				} = editingProperties;

				if (claiming !== null) {
					category.set("claiming", claiming);
				}

				if (max_per_member !== null) {
					category.set("max_per_member", max_per_member);
				}

				if (image !== null) {
					category.set("image", image);
				}

				if (name !== null) {
					category.set("name", name);
				}

				if (name_format !== null) {
					category.set("name_format", name_format);
				}

				if (opening_message !== null) {
					category.set("opening_message", opening_message.replace(/\\n/g, "\n"));
				}

				if (ping !== null) {
					category.set("ping", ping.match(/\d{17,19}/g) ?? []);
				}

				if (roles !== null) {
					category.set("roles", roles.match(/\d{17,19}/g) ?? []);
				}

				await category.save();

				await interaction.reply({
					content: `The \`${category.name}\` ticket category has been updated`,
					ephemeral: true
				});
				break;
			}

			case "list": {
				const categories = await db.models.Category.findAll({
					where: { guild: interaction.guild.id }
				});

				await interaction.reply({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.default_color)
							.setTitle("Ticket Categories")
							.setDescription(
								categories
									.map(category => `• ${category.name} [\`${category.id}\`]`)
									.join("\n")
							)
					],
					ephemeral: true
				});
				break;
			}
		}
	}
};
