/* eslint-disable new-cap, no-empty-pattern */
const yaml = require("js-yaml");
const fs = require("fs");

const { path } = require("./../../utils/fs");
const { DataTypes } = require("sequelize");

const fileContents = fs.readFileSync(path("/src/config.yaml"), "utf8");
const config = yaml.load(fileContents);

module.exports = ({}, sequelize) => {
	const { DB_TABLE_PREFIX } = process.env;

	sequelize.define(
		"Guild",
		{
			blacklist: {
				defaultValue: {
					members: [],
					roles: []
				},
				get() {
					const raw_value = this.getDataValue("blacklist");
					return raw_value
						? typeof raw_value === "string"
							? JSON.parse(raw_value)
							: raw_value
						: null;
				},
				type: DataTypes.JSON
			},
			close_button: {
				defaultValue: false,
				type: DataTypes.BOOLEAN
			},
			colour: {
				defaultValue: config.colors.default_color,
				type: DataTypes.STRING
			},
			error_colour: {
				defaultValue: "RED",
				type: DataTypes.STRING
			},
			footer: {
				defaultValue: "QA Support by archasion",
				type: DataTypes.STRING
			},
			id: {
				allowNull: false,
				primaryKey: true,
				type: DataTypes.CHAR(19)
			},
			success_colour: {
				defaultValue: "GREEN",
				type: DataTypes.STRING
			},
			tags: {
				defaultValue: {},
				get() {
					const raw_value = this.getDataValue("tags");
					return raw_value
						? typeof raw_value === "string"
							? JSON.parse(raw_value)
							: raw_value
						: null;
				},
				type: DataTypes.JSON
			}
		},
		{
			tableName: DB_TABLE_PREFIX + "guilds"
		}
	);
};
