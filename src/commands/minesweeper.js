const Command = require("../modules/commands/command");

module.exports = class MinesweeperCommand extends Command {
	constructor(client) {
		super(client, {
			name: "minesweeper",
			description: "Links to the minesweeper website.",
			permissions: [],
			verified_only: true,
			ignored: {
				roles: [],
				channels: [],
				threads: []
			}
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		interaction.reply({
			content:
				"Feel free to use this website to play minesweeper (no mobile support):\nhttps://archasion.github.io/Minesweeper/",
			ephemeral: true
		});
	}
};
