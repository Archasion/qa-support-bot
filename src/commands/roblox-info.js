/* eslint-disable no-unused-expressions */
const Command = require("../modules/commands/command");
const roblox = require("noblox.js");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { MessageEmbed } = require("discord.js");

module.exports = class RobloxInfoCommand extends Command {
	constructor(client) {
		super(client, {
			name: "roblox-info",
			description: "Gets information about a Roblox user.",
			permissions: [],
			manager_only: true,
			moderator_only: true,
			nda_only: false,
			dev_only: false,
			options: [
				{
					description: "The Roblox username to get information about.",
					name: "username",
					required: true,
					type: Command.option_types.STRING
				},
				{
					description: "Whether the information is shown publicly.",
					name: "public",
					required: false,
					type: Command.option_types.BOOLEAN
				}
			]
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		const publicResult = interaction.options.getBoolean("public") ?? false;
		const username = interaction.options.getString("username");

		interaction.deferReply({ ephemeral: !publicResult });

		// Fetch the trust level of the user through the API
		const response = await fetch(`https://devforum.roblox.com/users/${username}.json`);
		const { user } = await response.json();

		/** @param {number} TL The user's trust level on the developer forum (https://roblox.devforum.com) */
		const TL = user ? user.trust_level : 0;

		try {
			const ID = await roblox.getIdFromUsername(username);
			const info = await roblox.getPlayerInfo(ID);
			const groups = await roblox.getGroups(ID);

			const inGroups = Object.keys(groups).length;
			const agknowledgements = [];
			let testerInGroups = 0;

			const accountCreationTimestamp = parseInt(Date.parse(info.joinDate) / 1000);

			if (info.displayName !== info.username) {
				info.displayName += ` (@${info.username})`;
			}

			// Add known group ranks to agknowledgements
			for (const group of groups) {
				if (group.Role.match(/(q\/?a|test)/gi)) {
					testerInGroups++;
				}

				switch (group.Id) {
					case 3055661:
						agknowledgements.push("NDA Verified Tester");
						break;
					case 1200769:
						group.Role !== "Intern" && agknowledgements.push("Roblox Employee");
						break;
					case 9420522:
						group.Role === "Event Organizers" && agknowledgements.push("Event Organizer");
						break;
					case 4199740:
						group.Role === "Member" && agknowledgements.push("Video Star Creator");
						break;
					case 2868472:
						switch (group.Role) {
							case "Former Intern":
								agknowledgements.push("Former Roblox Intern");
								break;
							case "Former Incubator":
								agknowledgements.push("Former Roblox Incubator");
								break;
							case "Former Accelerator":
								agknowledgements.push("Former Roblox Accelerator");
								break;
							case "Intern":
								agknowledgements.push("Roblox Intern");
								break;
							case "Incubator":
								agknowledgements.push("Roblox Incubator");
								break;
							case "Accelerator":
								agknowledgements.push("Roblox Accelerator");
								break;
						}

						break;
				}
			}

			// Add the user's trust level to agknowledgements (if 1+)
			switch (TL) {
				case 1:
					agknowledgements.push("DevForum Member");
					break;
				case 2:
					agknowledgements.push("DevForum Regular");
					break;
				case 3:
					agknowledgements.push("DevForum Editor");
					break;
				case 4:
					agknowledgements.push("DevForum Leader");
					break;
			}

			const embed = new MessageEmbed()

				.setColor(config.colors.default_color)
				.setTitle(info.displayName)
				.setURL(`https://www.roblox.com/users/${ID}/profile`)
				.setThumbnail(
					`https://www.roblox.com/headshot-thumbnail/image?userId=${ID}&width=420&height=420&format=png`
				)
				.setDescription(
					`${info.username} is a tester in \`${testerInGroups}\` group${
						testerInGroups !== 1 ? "s" : ""
					}`
				)
				.setFields([
					{ name: "Friends", value: info.friendCount.format(), inline: true },
					{ name: "Followers", value: info.followerCount.format(), inline: true },
					{ name: "Following", value: info.followingCount.format(), inline: true },
					{ name: "In Groups", value: inGroups.toString(), inline: true },
					{ name: "Creation Date", value: `<t:${accountCreationTimestamp}:d>`, inline: true },
					{ name: "Created", value: `<t:${accountCreationTimestamp}:R>`, inline: true }
				])
				.setFooter({ text: `ID: ${ID}` })
				.setTimestamp();

			// Add a description to a field (if there is one)
			if (info.blurb) {
				embed.fields.push({
					name: "Description",
					value: `${info.blurb.slice(0, 400)}...`,
					inline: false
				});
			}

			// Add the agknowledgements to a field (if there are any)
			if (agknowledgements[0]) {
				embed.fields.push({
					name: "Acknowledgements",
					value: `• ${agknowledgements.join("\n• ")}`,
					inline: true
				});
			}

			await interaction.editReply({ embeds: [embed] });
		} catch {
			interaction.editReply({
				content: "The username could not be resolved.",
				ephemeral: true
			});
		}
	}
};
