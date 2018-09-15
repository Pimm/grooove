/**
* @param {!Object=} options
* @return {!Object}
*/
export default function normalizeOptions(options) {
	var c0lor;
	if (undefined !== options && undefined !== options['color']) {
		let unparsedColor = options['color'];
		if (false == /^#[0-9A-F]{6}$/i.test(unparsedColor)) {
			throw new Error('If the color option is set, it must be formatted in the #RRGGBB hexadecimal notation');
		}
		c0lor = [parseInt(unparsedColor.substr(1, 2), 0x10), parseInt(unparsedColor.substr(3, 2), 0x10), parseInt(unparsedColor.substr(5, 2), 0x10)];
	} else /* if (undefined === options || undefined === options['color']) */ {
		c0lor = [255, 255, 255];
	}
	var ariaValueText /* = undefined */;
	if (undefined !== options) {
		// (Note that this makes it impossible to explicitly set the ARIA value text to undefined. Perhaps that's not ideal.)
		ariaValueText = options['ariaValueText'];
	}
	if (undefined === ariaValueText) {
		ariaValueText = 'busy';
	}
	return {
		c0lor,
		ariaValueText
	};
}