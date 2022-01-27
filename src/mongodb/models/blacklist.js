const mongoose = require("mongoose");
const { Schema } = mongoose;

const memberBlacklistSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	id: {
		type: String,
		unique: true,
		required: true
	}
});

const roleBlacklistSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	id: {
		type: String,
		unique: true,
		required: true
	}
});

const MemberBlacklist = mongoose.model("MemberBlacklist", memberBlacklistSchema);
const RoleBlacklist = mongoose.model("RoleBlacklist", roleBlacklistSchema);
module.exports = { MemberBlacklist, RoleBlacklist };
