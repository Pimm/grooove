/**
* @param {!Object=} options
* @return {!Object}
*/
export default function normalizeOptions(options) {
	var color;
	if (undefined !== options && undefined !== options.color) {
		let unparsedColor = options.color;
		if (false == /^#[0-9A-F]{6}$/i.test(unparsedColor)) {
			throw new Error('If the color option is set, it must be formatted in the #RRGGBB hexadecimal notation');
		}
		color = [parseInt(unparsedColor.substr(1, 2), 0x10), parseInt(unparsedColor.substr(3, 2), 0x10), parseInt(unparsedColor.substr(5, 2), 0x10)];
	} else /* if (undefined === options || undefined === options.color) */ {
		color = [255, 255, 255];
	}
	return {
		color
	};
}