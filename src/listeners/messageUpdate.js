const EventListener = require("../modules/listeners/listener");

module.exports = class MessageUpdateEventListener extends EventListener {
    constructor(client) {
        super(client, { event: "messageUpdate" });
    }

    async execute(oldm, newm) {
        if (newm.partial) {
            try {
                await newm.fetch();
            } catch (error) {
                return log.error(error);
            }
        }

        if (!newm.guild) return;
    }
};
