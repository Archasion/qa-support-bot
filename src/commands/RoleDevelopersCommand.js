const Command = require("../modules/commands/command");

module.exports = class RoleDevelopersCommand extends Command {
	constructor(client) {
		super(client, {
			name: "role-developers",
			description: "Add the @Developer role to the specified users",
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
					name: "users",
					description:
						"A comma/space seperated list of users that the action is used on (Mention, username, or ID)",
					required: true,
					type: Command.option_types.STRING
				},
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
		const dev_role = config.roles.developer;
		const action = interaction.options.getString("action");
		let users = interaction.options.getString("users");

		const unknown = [];
		const success = [];

		if (users.match(/^all|everyone|\*$/gi)) {
			if (action === "Added") {
				interaction.reply({ content: "Cannot add the role to everyone", ephemeral: true });
				return;
			}

			let members = await interaction.guild.members.fetch();
			members = members.filter(member => member.roles.cache.has(dev_role));

			for (const member of members.values()) {
				try {
					member.roles.remove(dev_role);
					success.push(member.id);
				} catch {
					unknown.push(member.id);
				}
			}
		} else {
			users = users
				.replaceAll(",", " ")
				.replace(/[<@!>]/gi, "")
				.replace(/\s+/gi, " ")
				.split(" ");

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

		// prettier-ignore
		interaction.reply({
			content: `${
				success[0]
					? `${action} the developer role ${action === "Added" ? "to" : "from"}: <@${success.join(">, <@")}>`
					: ""
			}${unknown[0] ? `\nCouldn't recognize the following input: ${unknown.join(", ")}` : ""}`,
			ephemeral: true
		});

		function toggleRole(member, action) {
			if (action === "Added") member.roles.add(dev_role);
			else member.roles.remove(dev_role);
			success.push(member.id);
		}
	}
};
