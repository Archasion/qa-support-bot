const Command = require("../modules/commands/command");

module.exports = class RoleCommand extends Command {
	constructor(client) {
		super(client, {
			name: "role",
			description: "Add/Remove a role to the specified users",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			manager_only: true,
			moderator_only: true,
			options: [
				{
					name: "action",
					description: "Add or remove the role",
					required: true,
					type: Command.option_types.STRING,
					choices: [
						{
							name: "Add Role",
							value: "Added"
						},
						{
							name: "Remove Role",
							value: "Removed"
						},
						{
							name: "View Members with Role",
							value: "view"
						}
					]
				},
				{
					name: "role",
					description: "The role to add/remove",
					required: true,
					type: Command.option_types.STRING,
					choices: [
						{
							name: "Developer",
							value: config.roles.developer
						},
						{
							name: "Image Perms",
							value: config.roles.image_perms
						}
					]
				},
				{
					name: "users",
					description:
						"A comma/space seperated list of users that the action is used on (Mention, username, or ID)",
					required: false,
					type: Command.option_types.STRING
				}
			]
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		const selectedRole = interaction.options.getString("role");
		const action = interaction.options.getString("action");
		let users = interaction.options.getString("users");

		if (action === "view" && selectedRole === config.roles.image_perms) {
			interaction.reply({
				content: "You cannot view the members of this role",
				ephemeral: true
			});
			return;
		}

		if (
			action === "Removed" &&
			users.match(/^all|everyone|\*$/gi) &&
			selectedRole === config.roles.image_perms
		) {
			interaction.reply({
				content: "This role cannot be removed from everyone",
				ephemeral: true
			});
			return;
		}

		if (action !== "view" && !users) {
			interaction.reply({
				content: "You must specify a list of users to add or remove the role from",
				ephemeral: true
			});
			return;
		}

		if (action === "view" && !users) users = "temporary";

		const unknown = [];
		const success = [];

		// Remove the developer role from all users
		if (users.match(/^all|everyone|\*$/gi) || action === "view") {
			if (action === "Added") {
				// Prevent adding the developer role to everyone
				interaction.reply({ content: "Cannot add the role to everyone", ephemeral: true });
				return;
			}

			let members = await interaction.guild.members.fetch();
			members = members.filter(member => member.roles.cache.has(selectedRole));

			// Go through each user with the developer role and remove it
			for (const member of members.values()) {
				try {
					if (action === "Removed") member.roles.remove(selectedRole);
					success.push(member.id);
				} catch {
					unknown.push(member.id);
				}
			}
		}

		// Go through each inputted user and give/remove their developer role
		else {
			users = users
				.replaceAll(",", " ")
				.replace(/[<@!>]/gi, "")
				.replace(/\s+/gi, " ")
				.split(" ");

			// Filter the input by ID and/or username
			for (const user of users) {
				try {
					if (user.match(/^\d{17,19}$/gi)) {
						const developer = await interaction.guild.members.fetch(user);
						toggleRole(developer, action);
					} else if (user.match(/^(?=^[^_]+_?[^_]+$)\w{3,20}$/gi)) {
						let developer = await interaction.guild.members.search({ query: user });
						developer = developer.first();
						toggleRole(developer, action);
					}
				} catch {
					unknown.push(user);
				}
			}
		}

		if (action === "view") {
			if (success.length === 0) {
				interaction.reply({
					content: `There are no users with the <@&${selectedRole}> role`,
					ephemeral: true
				});
				return;
			}

			interaction.reply({
				content: `There ${success.length === 1 ? "is" : "are"} **${success.length}** member${
					success.length === 1 ? "" : "s"
				} with the <@&${selectedRole}> role: <@${success.join(">, <@")}>`,
				ephemeral: true
			});
			return;
		}

		// prettier-ignore
		// Send the confirmation message
		interaction.reply({
			content: `${
				success[0]
					? `${action} the <@&${selectedRole}> role ${action === "Added" ? "to" : "from"}: <@${success.join(">, <@")}>`
					: ""
			}${unknown[0] ? `\nCouldn't recognize the following input: ${unknown.join(", ")}` : ""}`,
			ephemeral: true
		});

		// Toggle the developer role for the specified user
		function toggleRole(member, action) {
			if (action === "Added") member.roles.add(selectedRole);
			else member.roles.remove(selectedRole);
			success.push(member.id);
		}
	}
};
