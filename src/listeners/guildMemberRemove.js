const EventListener = require("../modules/listeners/listener");

const Tickets = require("../mongodb/models/tickets");

module.exports = class GuildMemberRemoveEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "guildMemberRemove" });
	}

	async execute(member) {
		const ticket = await Tickets.findOne({
			author: member.id,
			active: true
		});

		if (ticket) {
			member.guild.channels.cache
				.get(config.channels.tickets)
				.threads.cache.get(ticket.thread)
				.delete({ reason: "User left the server" });
		}
	}
};
