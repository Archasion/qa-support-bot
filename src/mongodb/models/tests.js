const mongoose = require("mongoose");
const { Schema } = mongoose;

const testSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	type: {
		type: String,
		required: true
	},
	url: {
		type: String,
		required: true
	},
	date: {
		type: Date,
		required: true
	}
});

const Tests = mongoose.model("Tests", testSchema);
module.exports = Tests;
