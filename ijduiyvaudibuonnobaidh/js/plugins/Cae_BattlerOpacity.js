//=========================================================
// Cae_BattlerOpacity.js
//=========================================================

/*:
 * @plugindesc v1.2 - Lets you set battle sprite opacity via notetags.
 * @author Caethyril
 *
 * @help Plugin Commands:
 *   None.
 *
 * Enemy/Actor/Class/State/Weapon/Armor notetag:
 *   <Battler Opacity: x>
 *     Replace x with the sprite opacity (0 ~ 255).
 *   Values from multiple sources combine multiplicatively.
 *
 * Compatibility:
 *   Aliases: Sprite_Battler: updateVisibility
 *
 * Terms of use:
 *   Free to use and modify.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * Update log:
 *   1.2: Patched conflicts with Appear Halfway and various sprite effects.
 *   1.1: Base battler opacity notetag should no longer count twice.
 *   1.0: Initial release.
 */

var Imported = Imported || {};			// Import namespace, var can redefine
Imported.Cae_BattlerOpacity = 1.2;		// Import declaration

var CAE = CAE || {};				// Author namespace, var can redefine
CAE.BattlerOpacity = CAE.BattlerOpacity || {};	// Plugin namespace

(function(_) {

'use strict';

// ============== Utility ============== //

	// True if something else is going on with the opacity (Appear Halfway, battler effects, etc)
	_.shouldSkip = function(sprite) {
		return sprite._appeared === false || sprite._effectDuration > 0;
	};

	// New function to retrieve/parse notetag values from database objects.
	_.getAlphaFromObj = function(obj) {
		if (!obj) return 255;						// Default if no object
		let a = obj.meta['Battler Opacity'];				// Get notetag
		if (isNaN(a) || a === true) return 255;				// Default if no tag/number
		return Number(a).clamp(0, 255);					// Else validate and return
	};

	// New function for modularity: calculates total alpha from battler and extra objects.
	_.getNetAlpha = function(trObjs) {
		let base = trObjs.pop();					// Get a base object
		let a = trObjs.reduce(function(acc, cur) {			// Go through all extras
			return acc *= _.getAlphaFromObj(cur) / 255;		// Multiply by ratio
		}, _.getAlphaFromObj(base));					// Start with base opacity
		return Math.round(a);						// Round and return result
	};

	// New method to refresh opacity when needed.
	_.refreshOpacity = function(sprite) {
		if (_.shouldSkip(sprite)) return;				// Ignore hidden/effecting sprites
		let batt = sprite._battler;					// Get associated battler
		if (!batt) return;						// Do nothing if no battler
		let trObjs = batt.traitObjects();				// Get all relevant notetag-bearers
		sprite.opacity = _.getNetAlpha(trObjs);				// Calculate and apply opacity
	};

// ============ Alterations ============ //

	// Alias for actual update trigger! In updateVisibility 'cause it makes as much sense as anywhere.
	_.Sprite_Battler_updateVisibility = Sprite_Battler.prototype.updateVisibility;
	Sprite_Battler.prototype.updateVisibility = function() {
		_.Sprite_Battler_updateVisibility.call(this);
		_.refreshOpacity(this);
	};

})(CAE.BattlerOpacity);