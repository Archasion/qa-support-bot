const Command = require("../modules/commands/command");

const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } = require("discord.js");

module.exports = class EmbedCommand extends Command {
	constructor(client) {
		super(client, {
			name: "embed",
			description: "Build a customized embed",
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
					name: "color",
					description: "The color of the embed",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "content",
					description: "The raw message content",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "author",
					description: "The author text",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "author_url",
					description: "The author text hyperlink",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "author_icon",
					description: "The author icon",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "title",
					description: "The title of the embed",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "title_url",
					description: "The title hyperlink",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "description",
					description: "The description of the embed",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "thumbnail",
					description: "The thumbnail URL",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "field_name_1",
					description: "The name of the field",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "field_value_1",
					description: "The value of the field",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "field_inline_1",
					description: "Whether the field is inline",
					required: false,
					type: Command.option_types.BOOLEAN
				},
				{
					name: "field_name_2",
					description: "The name of the field",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "field_value_2",
					description: "The value of the field",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "field_inline_2",
					description: "Whether the field is inline",
					required: false,
					type: Command.option_types.BOOLEAN
				},
				{
					name: "field_name_3",
					description: "The name of the field",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "field_value_3",
					description: "The value of the field",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "field_inline_3",
					description: "Whether the field is inline",
					required: false,
					type: Command.option_types.BOOLEAN
				},
				{
					name: "image",
					description: "The image URL",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "footer",
					description: "The footer text",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "footer_icon",
					description: "The footer icon",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "timestamp",
					description: "Whether or not a timestamp is included",
					required: false,
					type: Command.option_types.BOOLEAN
				},
				{
					name: "button",
					description: "The button text",
					required: false,
					type: Command.option_types.STRING
				},
				{
					name: "button_url",
					description: "The URL that the button will redirect to",
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
		const embed = new EmbedBuilder();

		// Preset values
		const customEmbed = {
			color: null,
			content: null,
			author: null,
			author_url: null,
			author_icon: null,
			title: null,
			title_url: null,
			description: null,
			thumbnail: null,
			field_name_1: null,
			field_value_1: null,
			field_inline_1: null,
			field_name_2: null,
			field_value_2: null,
			field_inline_2: null,
			field_name_3: null,
			field_value_3: null,
			field_inline_3: null,
			image: null,
			footer: null,
			footer_icon: null,
			timestamp: null,
			button: null,
			button_url: null
		};

		// Set each value as the input
		for (const key of Object.keys(customEmbed)) {
			try {
				customEmbed[key] = interaction.options.getString(key);
			} catch {
				customEmbed[key] = interaction.options.getBoolean(key);
			}
		}

		const {
			author,
			author_url,
			author_icon,
			title,
			title_url,
			description,
			thumbnail,
			field_name_1,
			field_value_1,
			field_name_2,
			field_value_2,
			field_name_3,
			field_value_3,
			image,
			footer,
			footer_icon,
			timestamp,
			button,
			button_url
		} = customEmbed;

		let { content, color, field_inline_1, field_inline_2, field_inline_3 } = customEmbed;

		// Validate the input
		if (color) {
			if (!color.match(/(#|(0x))?([a-f]|[0-9]){6}/gi)) {
				return interaction.reply({
					content: "Invalid HEX Color",
					ephemeral: true
				});
			}
		} else {
			color = config.colors.default;
		}

		if (author_url) {
			if (!author_url.match(/^https?:\/\/.+\..+$/gi)) {
				return interaction.reply({
					content: "Invalid author URL",
					ephemeral: true
				});
			}
		}

		if (title_url) {
			if (!title_url.match(/^https?:\/\/.+\..+$/gi)) {
				return interaction.reply({
					content: "Invalid title URL",
					ephemeral: true
				});
			}
		}

		if (thumbnail) {
			if (!thumbnail.match(/^https?:\/\/.+\..+$/gi)) {
				return interaction.reply({
					content: "Invalid thumbnail URL"
				});
			}
		}

		if (image) {
			if (!image.match(/^https?:\/\/.+\..+$/gi)) {
				return interaction.reply({
					content: "Invalid thumbnail URL"
				});
			}
		}

		const actionRow = [];

		if (button_url && button) {
			if (!button_url.match(/^https?:\/\/.+\..+$/gi)) {
				return interaction.reply({
					content: "Invalid URL (URL Button)",
					ephemeral: true
				});
			}

			// Add the button onto the message
			actionRow.push(
				new ActionRowBuilder().addComponents(
					new ButtonBuilder({}).setLabel(button).setStyle(ButtonStyle.Link).setURL(button_url)
				)
			);
		}

		field_inline_1 ??= false;
		field_inline_2 ??= false;
		field_inline_3 ??= false;

		// Errors
		if (
			!author &&
			!title &&
			!description &&
			!thumbnail &&
			!image &&
			!footer &&
			!field_name_1 &&
			!field_value_1 &&
			!field_name_2 &&
			!field_value_2 &&
			!field_name_3 &&
			!field_value_3
		) {
			return interaction.reply({
				content: "You must provide some kind of embed content",
				ephemeral: true
			});
		}

		if (author_icon && !author) {
			return interaction.reply({
				content: "You must provide author text if you want to attach an author image",
				ephemeral: true
			});
		}

		if (author_url && !author) {
			return interaction.reply({
				content: "You must provide author text if you want to use an author hyperlink",
				ephemeral: true
			});
		}

		if (title_url && !title) {
			return interaction.reply({
				content: "You must provide a title if you want to use a title hyperlink",
				ephemeral: true
			});
		}

		if (
			(field_name_1 && !field_value_1) ||
			(field_name_2 && !field_value_2) ||
			(field_name_3 && !field_value_3)
		) {
			return interaction.reply({
				content: "You must provide field value if you want to create a field",
				ephemeral: true
			});
		}

		if (
			(field_value_1 && !field_name_1) ||
			(field_value_2 && !field_name_2) ||
			(field_value_3 && !field_name_3)
		) {
			return interaction.reply({
				content: "You must provide field name if you want to create a field",
				ephemeral: true
			});
		}

		if (footer_icon && !footer) {
			return interaction.reply({
				content: "You must provide footer text if you want to attach a footer image",
				ephemeral: true
			});
		}

		if (button && !button_url) {
			return interaction.reply({
				content: "You must use the `button_url` option when creating a button",
				ephemeral: true
			});
		}

		if (!button && button_url) {
			return interaction.reply({
				content: "You must use the `button` option when creating a button",
				ephemeral: true
			});
		}

		// Build the embed
		embed.setColor(color);
		embed.setURL(title_url);
		embed.setThumbnail(thumbnail);
		embed.setImage(image);

		if (content) {
			content = content.format();
		}

		if (author) {
			embed.setAuthor({ name: author, url: author_url, iconURL: author_icon });
		}

		if (title) {
			embed.setTitle(title);
		}

		if (description) {
			embed.setDescription(description.format());
		}

		if (field_name_1 && field_value_1) {
			embed.addFields({
				name: field_name_1,
				value: field_value_1.format(),
				inline: field_inline_1
			});
		}

		if (field_name_2 && field_value_2) {
			embed.addFields({
				name: field_name_2,
				value: field_value_2.format(),
				inline: field_inline_2
			});
		}

		if (field_name_3 && field_value_3) {
			embed.addFields({
				name: field_name_3,
				value: field_value_3.format(),
				inline: field_inline_3
			});
		}

		if (footer) {
			embed.setFooter({ text: footer, iconURL: footer_icon });
		}

		if (timestamp) {
			embed.setTimestamp();
		}

		// Send the confirmation message
		await interaction.reply({
			content: "The embed has been created",
			ephemeral: true
		});

		// Send the embed
		await interaction.channel.send({
			content,
			embeds: [embed],
			components: actionRow
		});
	}
};
