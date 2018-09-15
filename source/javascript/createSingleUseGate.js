/**
 * Returns a function which forwards the first call to the passed function, but drops any subsequent calls.
 *
 * @param {!function(...*)=} target
 * @return {!function(...*)}
 */
export default function createSingleUseGate(target) {
	return function gate() {
		if (undefined !== target) {
			// Call the target, and remove forget about the target so it won't be called the next time around.
			target.apply(undefined, arguments);
			target = undefined;
		} else /* if (undefined === target) */ {
			// Don't do anything
		}
	};
	//   ↑
	// Once we're no longer targeting "ECMASCRIPT5", this can be written simpler:
	//   return function gate(...targetArguments) {
	//   	if (undefined !== target) {
	//   		// Call the target, and remove forget about the target so it won't be called the next time around.
	//   		target(...targetArguments);
	//   		target = undefined;
	//   	} else /* if (undefined === target) */ {
	//   		// Don't do anything
	//   	}
	//   };
	// Targeting "ECMASCRIPT5", spreading in function calls causes Closure Compiler to include a polyfill.
}