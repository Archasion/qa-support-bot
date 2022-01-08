const EventListener = require("../modules/listeners/listener");

module.exports = class VoiceStateUpdateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "voiceStateUpdate" });
	}

	async execute(newMember, oldMember) {
		let oldVCState;
		let newVCState;

		if (oldMember.channelId) {
			oldVCState = oldMember.channelId;
		}

		if (newMember.channelId) {
			newVCState = newMember.channelId;
		}

		const textChannel = await this.client.channels.cache.get(config.ids.channels.public_no_mic);
		const voiceChannel = config.ids.voice_channels.public_testing;

		const user = await this.client.users.fetch(newMember.id);

		if (oldVCState === voiceChannel && !newVCState) {
			await textChannel.permissionOverwrites.create(user, {
				VIEW_CHANNEL: true,
				SEND_MESSAGES: true
			});
		} else {
			await textChannel.permissionOverwrites.delete(
				user,
				"User left VC, no-mic is no longer needed"
			);
		}
	}
};
