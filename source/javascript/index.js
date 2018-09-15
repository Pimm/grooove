import normalizeOptions from './normalizeOptions';
import createSingleUseGate from './createSingleUseGate';
import {interpolateAccelerateDecelerate, interpolateOvershoot, calculateTensionOvershoot} from './interpolation';

/**
 * @const {!string}
 */
const exportProperty = 'e';

/**
 * @param {!number} width
 * @param {!number} height
 * @return {!HTMLCanvasElement}
 */
function createCanvasElement(width, height) {
	const result = document.createElement('canvas');
	result.width = width;
	result.height = height;
	return /** @type {!HTMLCanvasElement} */ (result);
}

/**
 * @param {!HTMLCanvasElement} canvasElement
 * @return {!CanvasRenderingContext2D}
 */
function get2dRenderingContext(canvasElement) {
	return /** @type {!CanvasRenderingContext2D} */ (canvasElement.getContext('2d', {alpha: true}));
}

/**
 * Adds a circle to the path which has the passed centre coordinates and radius.
 *
 * @this {!CanvasRenderingContext2D}
 * @param {!number} centerX
 * @param {!number} centerY
 * @param {!number} radius
 * @return {undefined}
 */
const drawCircle = (() => {
	const twoPi = Math.PI * 2;
	return function drawCircle(centerX, centerY, radius) {
		this.arc(centerX, centerY, radius, 0, twoPi);
	};
})();

/**
 * Creates CSS colour string which looks like this:
 *   "rgba(255, 71, 138, 1)"
 *
 * @param {...!number} components
 * @return {!string}
 */
const composeCssColor = (() => {
	const template = ['rgba(', , ')'];
	return function composeCssColor(...components) {
		template[1] = components.join(/* ',' */);
		return template.join('');
	}
})();

/**
 * The speed. Set this to .5 or .25 to see the animation in more detail.
 * @const {!number}
 */
const speed = 1;

/**
 * The time it takes for the grooove to fade in (in milliseconds). A grooove could be started for an operation which
 * potentially takes a significant amount of time, but in this instance completes almost immediately. In that case,
 * having some weird dots appear on the screen for a fraction of a second can only cause confusion in the user. "What
 * were those dots?!"
 */
const fadeInDuration = 12 * 1000 / 60;

/**
 * The time it takes for a circle to move onto the spot where its neighbouring circle was (in milliseconds).
 * @const {!number}
 */
const circleMovementDuration = 920 / speed;

/**
 * The time it takes for the seeker to move from one circle to where its neighbouring circle was (in milliseconds).
 * @const {!number}
 */
const seekerMovenementDuration = 290 / speed;

/**
 * @const {!number}
 */
const seekerInfluenceWidth = 2.8;

/**
 * @const {!number}
 */
const edgesWidth = 2.3;

/**
 * @const {!number}
 */
const edgesRadiusOvershoot = 1.89230 /* calculateTensionOvershoot(.12) */;

/**
 * @param {!number} width
 * @param {!number} height
 * @param {!Node} root
 * @param {!Object=} options
 */
goog.global[exportProperty] = function startGrooove(width, height, root, options) {
	const {c0lor, ariaValueText} = normalizeOptions(options);
	// Create the <canvas /> element and get the context.
	const canvasElement = createCanvasElement(width, height);
	const context = get2dRenderingContext(canvasElement);
	// For users of assistive technologies, set the role and "value" of the <canvas /> element. (See
	// https://www.w3.org/TR/wai-aria-1.1/#progressbar.)
	canvasElement.setAttribute('role', 'progressbar');
	canvasElement.setAttribute('aria-valuetext', ariaValueText);
	// Inject the circle function into the context. This is… pretty safe. We're not modifying the prototype. For someone
	// to accidentally use or overwrite this function, they would have to call getContext on our "private" <canvas />
	// element.
	context.circle = drawCircle;
	// Create a function we can use to create the fill styles which already has the colour bound.
	const composeFillStyle = composeCssColor.bind(undefined, c0lor[0], c0lor[1], c0lor[2]);
	//                                                        ↑ This can be written as ...options.color. However, that
	//                                                          would cause Closure Compiler to include a bulky polyfill
	//                                                          when targeting "ECMASCRIPT5".
	// 
	// Calculate the playing field.
	const maximalRadius = height * .5;
	const leftEdgeLeft = 0;
	const leftEdgeRight = edgesWidth * maximalRadius;
	const rightEdgeLeft = width - edgesWidth * maximalRadius;
	const rightEdgeRight = width;
	const seekerTripDuration = (width / maximalRadius + 2) * seekerMovenementDuration;
	// Here goes: the fun stuff. Drawing!
	var animationFrameRequestIdentifier;
	var startTime /* = undefined */;
	function draw(timestamp) {
		// Determine the time (the number of milliseconds since the first frame in which this grooove was drawn), and clear
		// the canvas.
		var time;
		if (undefined === startTime) {
			startTime = timestamp;
			time = 0;
		} else /* if (undefined !== startTime) */ {
			time = timestamp - startTime;
			context.clearRect(0, 0, width, height);
		}
		// Determine the position of the seeker.
		const seekerTripTime = time % seekerTripDuration;
		const seekerPosition = (seekerTripTime / seekerTripDuration) * (width + 2 * maximalRadius) - 1 * maximalRadius;
		var clampedSeekerPosition = seekerPosition;
		if (clampedSeekerPosition > width) {
			clampedSeekerPosition = width;
		} else if (clampedSeekerPosition < 0) {
			clampedSeekerPosition = 0;
		}
		const clampedSeekerTripTimeSine = Math.sin(clampedSeekerPosition / width * Math.PI);
		const seekerInfluenceMultiplier = clampedSeekerTripTimeSine * clampedSeekerTripTimeSine;
		// Draw the circles.
		var currentPathAlpha /* = undefined */;
		for (
			let x = (1 - ((time / circleMovementDuration) % 1)) * (2 * maximalRadius);
			x <= width;
			x += 2 * maximalRadius
		) {
			let radiusMultiplier = 1;
			let alpha;
			if (time < fadeInDuration) {
				alpha = time / fadeInDuration;
			} else /* if (time >= fadeInDuration) */ {
				alpha = 1;
			}
			let xDisplacement = 0;
			// Influence the radius based on how far away from the seeker the circle is.
			let distanceToSeeker = Math.abs(x - seekerPosition);
			if (distanceToSeeker <= seekerInfluenceWidth * maximalRadius) {
				radiusMultiplier *= .5
						+ .5 * seekerInfluenceMultiplier
						* interpolateAccelerateDecelerate(1 - (distanceToSeeker / (seekerInfluenceWidth * maximalRadius)));
			} else /* if (distanceToSeeker > seekerInfluenceWidth * maximalRadius) */ {
				radiusMultiplier *= .5;
			}
			// Influence the radius and alpha based on whether the circle is in one of the edges.
			let leftEdgePosition;
			if (/* x >= leftEdgeLeft && */ x <= leftEdgeRight) {
				leftEdgePosition = 1 - ((x - leftEdgeLeft) / (leftEdgeRight - leftEdgeLeft));
			} else /* if (x < leftEdgeLeft || x > leftEdgeRight) */ {
				leftEdgePosition = Number.NEGATIVE_INFINITY;
			}
			let rightEdgePosition;
			if (x >= rightEdgeLeft /* && x <= rightEdgeRight */) {
				rightEdgePosition = (x - rightEdgeLeft) / (rightEdgeRight - rightEdgeLeft);
			} else /* if (x < rightEdgeLeft || x > rightEdgeRight) */ {
				rightEdgePosition = Number.NEGATIVE_INFINITY;
			}
			const edgePosition = Math.max(leftEdgePosition, rightEdgePosition);
			if (edgePosition > 0) {
				radiusMultiplier *= interpolateOvershoot(1 - edgePosition, edgesRadiusOvershoot);
				// Displace the circle away from the edge, to compensate for the change in radius.
				if (radiusMultiplier < .5) {
					if (leftEdgePosition == edgePosition) {
						xDisplacement = (.5 - radiusMultiplier);
					} else /* if (rightEdgePosition == edgePosition) */ {
						xDisplacement = -(.5 - radiusMultiplier);
					}
				}
				if (edgePosition > .5) {
					alpha *= 1 - (2 * (edgePosition - .5));
				}
			}
			// TODO Document
			if (currentPathAlpha != alpha) {
				if (undefined !== currentPathAlpha) {
					context.fill();
				}
				context.beginPath();
				context.fillStyle = composeFillStyle(alpha);
				currentPathAlpha = alpha;
			}
			context.circle(x + maximalRadius * xDisplacement, maximalRadius, maximalRadius * radiusMultiplier);
		}
		context.fill();
		animationFrameRequestIdentifier = window.requestAnimationFrame(draw);
	}
	animationFrameRequestIdentifier = window.requestAnimationFrame(draw);
	// Add the <canvas /> element to the passed root.
	root.appendChild(canvasElement);
	// Return a function which stops the grooove. Wrap the function in a single-use gate. Not only to shield the function
	// from being used twice, but also to make sure that keeping a reference to that function does not hinder garbage
	// collection. This way, the returned function after being used the first time loses its references. References to
	// the <canvas /> element and passed root node, to name two things.
	return createSingleUseGate(function stop() {
		// Break out of the drawing loop.
		window.cancelAnimationFrame(animationFrameRequestIdentifier);
		// Remove the <canvas /> element.
		root.removeChild(canvasElement);
	});
};