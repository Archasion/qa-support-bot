module.exports = {
	int2hex: int => int.toString(16).toUpperCase(),
	some: async (array, func) => {
		for (const element of array) {
			if (await func(element)) {
				return true;
			}
		}

		return false;
	},
	// eslint-disable-next-line no-promise-executor-return
	wait: time => new Promise(res => setTimeout(res, time))
};
