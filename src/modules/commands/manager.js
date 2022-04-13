const { Collection, EmbedBuilder, ApplicationCommandPermissionType } = require("discord.js");

const fs = require("fs");
const { path } = require("../../utils/fs");

const { MemberBlacklist, RoleBlacklist } = require("./../../mongodb/models/blacklist");
const { COMMAND_LOGS } = process.env;

/**
 * Manages the loading and execution of commands
 */
module.exports = class CommandManager {
	/**
	 * Create a CommandManager instance
	 * @param {import('../..').Bot} client
	 */
	constructor(client) {
		/** The Discord Client */
		this.client = client;

		/**
		 * A discord.js Collection (Map) of loaded commands
		 * @type {Collection<string, import('./command')>}
		 */
		this.commands = new Collection();

		/**
		 * A discord.js Collection (Map) of commands that are on cooldown
		 * @type {Collection<string, import('./command')>}
		 */
		this.cooldowns = new Collection();
	}

	load() {
		const files = fs.readdirSync(path("./src/commands")).filter(file => file.endsWith(".js"));

		for (let file of files) {
			try {
				file = require(`../../commands/${file}`);
				// eslint-disable-next-line no-new, new-cap
				new file(this.client);
			} catch (e) {
				log.warn("An error occurred whilst loading a command");
				log.error(e);
			}
		}
	}

	/** Register a command */
	register(command) {
		this.commands.set(command.name, command);
		log.commands(`Loaded "${command.name}" command`);
	}

	async publish(guild) {
		if (!guild) {
			return this.client.guilds.cache.forEach(guild => {
				this.publish(guild);
			});
		}

		try {
			const commands = await Promise.all(
				this.client.commands.commands.map(command => command.build(guild))
			);
			await this.client.application.commands.set(commands, guild.id);
			await this.updatePermissions(guild);
			log.success(`Published ${this.client.commands.commands.size} commands to "${guild.name}"`);
		} catch (error) {
			log.warn("An error occurred whilst publishing the commands");
			log.error(error);
		}
	}

	async updatePermissions(guild) {
		guild.commands.fetch().then(async commands => {
			const permissions = [];
			const memberBlacklist = await MemberBlacklist.find();
			const roleBlacklist = await RoleBlacklist.find();
			const blacklist = [];

			memberBlacklist.forEach(obj => {
				blacklist.push({
					id: obj.id,
					permission: false,
					type: ApplicationCommandPermissionType.User
				});
			});

			roleBlacklist.forEach(obj => {
				blacklist.push({
					id: obj.id,
					permission: false,
					type: ApplicationCommandPermissionType.Role
				});
			});

			const { developers } = config.users;

			commands.forEach(async g_cmd => {
				const cmd_permissions = [...blacklist];
				const command = this.client.commands.commands.get(g_cmd.name);

				if (
					command.nda_only ||
					command.moderator_only ||
					command.dev_only ||
					command.manager_only ||
					command.public_only ||
					command.active_only
				) {
					cmd_permissions.push({
						id: guild.roles.everyone.id,
						permission: false,
						type: ApplicationCommandPermissionType.Role
					});
				}

				if (command.nda_only) {
					cmd_permissions.push({
						id: config.roles.nda_verified,
						permission: true,
						type: ApplicationCommandPermissionType.Role
					});
				}

				if (command.moderator_only) {
					cmd_permissions.push({
						id: config.roles.moderator,
						permission: true,
						type: ApplicationCommandPermissionType.Role
					});
				}

				if (command.manager_only) {
					cmd_permissions.push({
						id: config.roles.manager,
						permission: true,
						type: ApplicationCommandPermissionType.Role
					});
				}

				if (command.dev_only) {
					developers.forEach(user_id => {
						cmd_permissions.push({
							id: user_id,
							permission: true,
							type: ApplicationCommandPermissionType.User
						});
					});
				}

				if (command.public_only) {
					cmd_permissions.push({
						id: config.roles.public,
						permission: true,
						type: ApplicationCommandPermissionType.Role
					});
				}

				if (command.active_only) {
					cmd_permissions.push({
						id: config.roles.active_tester,
						permission: true,
						type: ApplicationCommandPermissionType.Role
					});
				}

				permissions.push({
					id: g_cmd.id,
					permissions: cmd_permissions
				});
			});

			log.debug(
				`Command permissions for "${guild.name}"`,
				require("util").inspect(permissions, {
					colors: true,
					depth: 10
				})
			);

			try {
				await guild.commands.permissions.set({ fullPermissions: permissions });
			} catch (error) {
				log.warn("An error occurred whilst updating command permissions");
				log.error(error);
			}
		});
	}

	/**
	 * Execute a command
	 * @param {Interaction} interaction - Command message
	 */
	async handle(interaction) {
		if (!interaction.guild) {
			return log.debug("Ignoring non-guild command interaction");
		}

		const command = this.commands.get(interaction.commandName);
		if (!command) {
			return;
		}

		const bot_permissions = interaction.guild.me.permissionsIn(interaction.channel);
		const required_bot_permissions = [
			"AttachFiles",
			"EmbedLinks",
			"ManageChannels",
			"ManageMessages"
		];

		if (!bot_permissions.has(required_bot_permissions)) {
			const perms = required_bot_permissions.map(p => `\`${p}\``).join(", ");
			if (bot_permissions.has("EmbedLinks")) {
				await interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setColor("ORANGE")
							.setTitle("⚠️")
							.setDescription(`QA Support requires the following permissions:\n${perms}`)
					],
					ephermal: true
				});
			} else {
				await interaction.reply({
					content: `QA Support requires the following permissions:\n${perms}`
				});
			}

			return;
		}

		const missing_permissions =
			command.permissions instanceof Array &&
			!interaction.member.permissions.has(command.permissions);
		if (missing_permissions) {
			const perms = command.permissions.map(p => `\`${p}\``).join(", ");
			return interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setColor(config.colors.error)
						.setTitle("Error")
						.setDescription(
							`You do not have the permissions required to use this command:\n${perms}`
						)
				],
				ephemeral: true
			});
		}

		if (command.ignored) {
			const { ignored, name } = command;

			// Ignored roles
			if (ignored.roles) {
				if (interaction.member.roles.cache.some(role => ignored.roles.includes(role.id))) {
					return interaction.reply({
						content: `You cannot use \`/${name}\` due to role restrictions`,
						ephemeral: true
					});
				}
			}

			if (!(await utils.isStaff(interaction.member))) {
				// Ignored channels
				if (ignored.channels) {
					if (ignored.channels.includes(interaction.channel.id)) {
						return interaction.reply({
							content: `\`/${name}\` cannot be used in this channel`,
							ephemeral: true
						});
					}
				}

				// Ignored threads
				if (ignored.threads) {
					if (ignored.threads.includes(interaction.channel.id)) {
						return interaction.reply({
							content: `\`/${name}\` cannot be used in this thread`,
							ephemeral: true
						});
					}
				}
			}
		}

		if (command.cooldown) {
			if (!this.cooldowns.has(command.name)) {
				this.cooldowns.set(command.name, new Collection());
			}

			const current_time = Date.now();
			const time_stamps = this.cooldowns.get(command.name);
			const cooldown_time = command.cooldown * 1000; // Cooldowns are provided in seconds, converted to milliseconds

			if (time_stamps.has(interaction.channel.id)) {
				const expiration_time = time_stamps.get(interaction.channel.id) + cooldown_time;

				if (current_time < expiration_time) {
					const time_left = (expiration_time - current_time) / 1000;
					const cooldown_time_minutes = Math.trunc(cooldown_time / 60000);
					return interaction.reply({
						content: `The command has already been used by someone less than ${cooldown_time_minutes} minute${
							cooldown_time_minutes > 1 ? "s" : ""
						} ago. Try again in ${time_left.toFixed(1)} seconds.`,
						ephemeral: true
					});
				}
			}

			time_stamps.set(interaction.channel.id, current_time);
			setTimeout(() => {
				time_stamps.delete(interaction.channel.id);
			}, cooldown_time);
		}

		try {
			log.commands(`Executing "${command.name}" command (invoked by ${interaction.user.tag})`);
			await command.execute(interaction); // Execute the command

			const embed = new EmbedBuilder()

				.setColor(config.colors.default)
				.setAuthor({
					name: interaction.user.tag,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true })
				})
				.setDescription(
					`\`/${command.name}\` has been executed by **${interaction.member.displayName}** in <#${interaction.channel.id}>`
				)
				.setFooter({ text: `ID: ${interaction.user.id}` })
				.setTimestamp();

			const loggingChannel = interaction.guild.channels.cache.get(COMMAND_LOGS);
			loggingChannel.send({ embeds: [embed] });
		} catch (e) {
			log.warn(`An error occurred whilst executing the ${command.name} command`);
			log.error(e);
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setColor(config.colors.error)
						.setTitle("⚠️")
						.setDescription(
							"An unexpected error occurred during command execution.\nPlease ask an administrator to check the console output / logs for details."
						)
				],
				ephemeral: true
			});
		}
	}
};
