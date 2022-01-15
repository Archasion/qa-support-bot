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

		const publicNoMic = await this.client.channels.cache.get(config.channels.public.no_mic);
		const ndaNoMic = await this.client.channels.cache.get(config.channels.nda.no_mic);

		const publicVC = config.vcs.public.chat;
		const ndaVC = config.vcs.nda.chat;

		const publicTestingVC = config.vcs.public.testing;
		const ndaTestingVC = config.vcs.nda.testing;

		const user = await this.client.users.fetch(newMember.id);

		async function hideChannel(channelTohide) {
			await channelTohide.permissionOverwrites.delete(
				user,
				"User left VC, no-mic is no longer needed"
			);
		}

		// No-mic for public VC
		if (
			(oldVCState === publicVC && newVCState !== publicVC) ||
			(oldVCState === publicTestingVC && newVCState !== publicTestingVC)
		) {
			await publicNoMic.permissionOverwrites.create(user, {
				VIEW_CHANNEL: true,
				SEND_MESSAGES: true
			});
		} else hideChannel(publicNoMic);

		// No-mic for NDA VC
		if (
			(oldVCState === ndaVC && newVCState !== ndaVC) ||
			(oldVCState === ndaTestingVC && newVCState !== ndaTestingVC)
		) {
			await ndaNoMic.permissionOverwrites.create(user, {
				VIEW_CHANNEL: true,
				SEND_MESSAGES: true
			});
		} else hideChannel(ndaNoMic);
	}
};
