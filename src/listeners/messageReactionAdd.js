/* eslint-disable prefer-destructuring */
const EventListener = require("../modules/listeners/listener");

module.exports = class MessageReactionAddEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "messageReactionAdd" });
	}

	async execute(reaction, user) {
		const guild = reaction.message.guild;
		const moderationChannel = guild.channels.cache.get(config.channels.moderation.chat);

		if (reaction.message.channel.id === config.channels.moderation.requests) {
			if (!utils.isStaff(guild.members.cache.get(user.id))) return;
			if (reaction.emoji.name === "📅" || reaction.emoji.name === "🗓️") {
				try {
					await reaction.message.channel.messages
						.fetch(reaction.message.id)
						.then(async message => {
							// ANCHOR Variables
							const timestampRegex = new RegExp(/⏰ <t:(\d+):F>/gims);
							const platformsRegex = new RegExp(/🖥(.+)/gims);

							const embed = message.embeds[0];
							const timestamp = timestampRegex.exec(embed.description)[1] * 1000;
							const platforms = platformsRegex.exec(embed.description)[1];

							const usernameRegex = new RegExp(/Username:\s([\w\d_]+),/gims);
							const username = usernameRegex.exec(embed.footer.text)[1];
							let member = await guild.members.search({ query: username });
							member = member.first();

							// ANCHOR Check if event exists
							const events = message.guild.scheduledEvents.cache.map(event => ({
								startTime: event.scheduledStartTimestamp,
								name: event.name,
								id: event.id
							}));

							let check = false;

							await events.forEach(event => {
								if (event.name === embed.author.name && event.startTime === timestamp) {
									moderationChannel.send(
										`${user} Test already scheduled for <t:${
											timestamp / 1000
										}:F>\nhttps://discord.com/events/${guild.id}/${event.id}`
									);
									check = true;
								}
							});

							if (check) return;

							// ANCHOR Create event
							let channel = config.vcs.public.testing;
							if (embed.author.name === "NDA Test") channel = config.vcs.nda.testing;

							const testingSession = await guild.scheduledEvents.create({
								privacyLevel: "GUILD_ONLY",
								entityType: "VOICE",
								name: embed.author.name,
								channel: guild.channels.cache.get(channel),
								scheduledStartTime: new Date(timestamp).toISOString(),
								scheduledEndTime: new Date(timestamp + 6000000).toISOString(),
								description: `🖥 Platforms:**${platforms}**\n\n*Subject to change*`
							});

							// ANCHOR Update pinned message
							moderationChannel.messages.fetch(config.messages.testing_requests).then(m =>
								m.edit({
									content: `${m.content}\n\n> ${
										embed.author.name === "NDA Test" ? "🔒 " : ""
									}**${embed.title}** <t:${timestamp / 1000}:F>\n> ${message.url}`
								})
							);

							// ANCHOR Structure message
							const messageToSend = `Hey there ${member}, we've reviewed your request for **${
								embed.title
							}** to be tested by our **${embed.author.name.split(" ")[0]} team** on <t:${
								timestamp / 1000
							}:F> (Local Time) and have decided to approve the request, feel free to **contact** a staff member if you have any questions regarding your testing session.\n\nEvent URL:\nhttps://discord.com/${
								guild.id
							}/${testingSession.id}`;

							// ANCHOR Notify author
							try {
								await member.send(messageToSend);
								moderationChannel.send(
									`${user} The \`${embed.author.name}\` for **${
										embed.title
									}** has been scheduled for <t:${
										timestamp / 1000
									}:F>\nhttps://discord.com/events/${guild.id}/${testingSession.id}`
								);

								message.react("✅");
							} catch {
								const channel = message.guild.channels.cache.get(
									config.channels.public.request
								);
								channel.threads
									.create({
										name: embed.title,
										autoArchiveDuration: 1440,
										type: "GUILD_PRIVATE_THREAD",
										reason: "Unable to message author regarding a testing request."
									})
									.then(thread => {
										thread.send(messageToSend);

										moderationChannel.send(
											`${user} The \`${embed.author.name}\` for **${
												embed.title
											}** has been scheduled for <t:${
												timestamp / 1000
											}:F> (messaged the user through a private thread: <#${
												thread.id
											}>)\nhttps://discord.com/events/${guild.id}/${
												testingSession.id
											}`
										);
									});

								message.react("❌");
							}
						});
				} catch {
					await moderationChannel.send(`${user} could not accept the test.`);
				}
			}
		}
	}
};
