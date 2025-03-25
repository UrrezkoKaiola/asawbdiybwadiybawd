/*:
 * @plugindesc CGMV Title System
 * @author Casper Gaming
 * @help
 * ==============================================================================
 * For terms and conditions using this plugin in your game please visit:
 * https://www.caspergaming.com/terms-of-use/
 * ==============================================================================
 * Become a Patron to get access to a demo for this plugin as well as beta plugins
 * https://www.patreon.com/CasperGamingRPGM
 * ==============================================================================
 * Version: 1.0
 * ------------------------------------------------------------------------------
 * Compatibility: Only tested with my CGMV plugins.
 * Made for RPG Maker MV 1.6.0
 * ------------------------------------------------------------------------------
 * Description: This plugin modifies the title scene to include maps as  the
 * background. It cycles through images/maps.
 * ------------------------------------------------------------------------------
 * Documentation:
 * Title images should be placed in img/titles1 and img/titles2
 *
 * Version History:
 * 1.0 - Initial Release
 * 
 * @param Maps
 * @type struct<Map>[]
 * @default []
 * @desc Set of maps/images to cycle through
 *
 * @param Fade Speed
 * @type number
 * @min 1
 * @max 255
 * @default 16
 * @desc Speed to fade out. Amount of opacity change per frame. Default 16
*/
/*~struct~Map:
 * @param Image1
 * @type file
 * @dir img/titles1
 * @desc Image1 to display. If this option is used, the map option will not be used for this entry.
 *
 * @param Image2
 * @type file
 * @dir img/titles2
 * @desc Image2 to display. If this option is used, the map option will not be used for this entry.
 * 
 * @param Map
 * @type number
 * @default 0
 * @min 0
 * @desc Map to display. If this option is used, the image option will not be used for this entry.
 * 
 * @param DisplayTime
 * @type number
 * @min 1
 * @default 600
 * @desc Amount of frames to display the map/image.
 */
var Imported = Imported || {};
Imported.CGMV_TitleSystem = true;
var CGMV = CGMV || {};
CGMV.TitleSystem = CGMV.TitleSystem || {};
CGMV.TitleSystem.version = 1.0;
CGMV.TitleSystem.parameters = PluginManager.parameters('CGMV_TitleSystem');
CGMV.TitleSystem.cycle = JSON.parse(CGMV.TitleSystem.parameters["Maps"]);
CGMV.TitleSystem.fadeSpeed = Number(CGMV.TitleSystem.parameters["Fade Speed"]);
//=============================================================================
// Scene_Title
//-----------------------------------------------------------------------------
// Modify the title scene to cycle between different maps in the background
//=============================================================================
//-----------------------------------------------------------------------------
// Alias. Also initialize map variables
//-----------------------------------------------------------------------------
var alias_CGMV_TitleSystem_initialize = Scene_Title.prototype.initialize;
Scene_Title.prototype.initialize = function() {
    alias_CGMV_TitleSystem_initialize.call(this);
    this._mapLoaded = false;
	this._cycle = $cgmvTemp._titleCycle;
	$cgmvTemp._titleCycle = 0;
	this._maxCycle = CGMV.TitleSystem.cycle.length;
	if($gamePlayer._characterName !== "") {
		this.resetGamePlayer();
	}
};
//-----------------------------------------------------------------------------
// Alias. Only center sprite if sprite exists
//-----------------------------------------------------------------------------
var alias_CGMV_TitleSystem_centerSprite = Scene_Title.prototype.centerSprite;
Scene_Title.prototype.centerSprite = function(sprite) {
    if(sprite) {
		alias_CGMV_TitleSystem_centerSprite.call(this, sprite);
		sprite.x = 0;
		sprite.y = 0;
		sprite.anchor.x = 0;
		sprite.anchor.y = 0;
	}
};
//-----------------------------------------------------------------------------
// Alias. If not set up, use default title. Else use new title system.
//-----------------------------------------------------------------------------
var alias_CGMV_TitleSystem_createBackground = Scene_Title.prototype.createBackground;
Scene_Title.prototype.createBackground = function() {
    if(this._maxCycle === 0) alias_CGMV_TitleSystem_createBackground.call(this);
	else {
		this._backSprite1 = new Sprite(ImageManager.loadTitle1(""));
		this._backSprite2 = new Sprite(ImageManager.loadTitle1(""));
		this._backSpriteSet = new Sprite(ImageManager.loadTitle1(""));
		this._fadeSprite = new ScreenSprite();
		this.addChild(this._backSprite1);
		this.addChild(this._backSprite2);
		this.addChild(this._backSpriteSet);
        this.addChild(this._fadeSprite);
		this._fadeSprite.setBlack();
		this.setupCycle();
	}
};
//-----------------------------------------------------------------------------
// Advance to the next map/image in the cycle
//-----------------------------------------------------------------------------
Scene_Title.prototype.advanceCycle = function() {
    this._cycle++;
	if(this._cycle >= this._maxCycle) this._cycle = 0;
	this.setupCycle();
};
//-----------------------------------------------------------------------------
// Setup new map/image in the cycle.
//-----------------------------------------------------------------------------
Scene_Title.prototype.setupCycle = function() {
    this._currentDisplay = JSON.parse(CGMV.TitleSystem.cycle[this._cycle]);
	this._displayTime = Number(this._currentDisplay.DisplayTime);
	this._isImage = this._currentDisplay.Image1 !== "";
	this._mapLoaded = false;
	this.removeAllChildrenImages();
	if(this._isImage) this.handleImage();
	else this.handleMap();
	this._timer = 0;
	this._needsFadeIn = true;
	this._needsFadeOut = false;
};
//-----------------------------------------------------------------------------
// Remove all Children
//-----------------------------------------------------------------------------
Scene_Title.prototype.removeAllChildrenImages = function() {
	this._backSprite1.removeChild(this._sprite1);
	this._backSprite2.removeChild(this._sprite2);
	this._backSpriteSet.removeChild(this._spriteset);
};
//-----------------------------------------------------------------------------
// Handling for images
//-----------------------------------------------------------------------------
Scene_Title.prototype.handleImage = function() {
    this._sprite1 = new Sprite(ImageManager.loadTitle1(this._currentDisplay.Image1));
    this._sprite2 = new Sprite(ImageManager.loadTitle2(this._currentDisplay.Image2));
	this._backSprite1.addChild(this._sprite1);
	this._backSprite2.addChild(this._sprite2);
	this.centerSprite(this._sprite1);
	this.centerSprite(this._sprite2);
};
//-----------------------------------------------------------------------------
// Handle the map loading
//-----------------------------------------------------------------------------
Scene_Title.prototype.handleMap = function() {
	DataManager.loadMapData(Number(this._currentDisplay.Map));
};
//-----------------------------------------------------------------------------
// Alias. Update the title scene with fade in/out for maps/images.
//-----------------------------------------------------------------------------
var alias_CGMV_TitleSystem_update = Scene_Title.prototype.update;
Scene_Title.prototype.update = function() {
    alias_CGMV_TitleSystem_update.call(this);
	if(!this._isImage && this._mapLoaded) {
		$gameMap.update(true);
		$gamePlayer.update(false);
		$gameTimer.update(false);
		$gameScreen.update();
	}
	if(this._needsFadeIn && this.isReady()) {
			this.updateFadeIn();
		}
	else if(this._needsFadeOut) {
		this.updateFadeOut();
	}
	else if(!this._needsFadeIn && !this._needsFadeOut) {
		this._timer++;
		if(this._timer >= this._displayTime) this._needsFadeOut = true;
	}
};
//-----------------------------------------------------------------------------
// Update Fade In
//-----------------------------------------------------------------------------
Scene_Title.prototype.updateFadeIn = function() {
    this._fadeSprite.opacity -= CGMV.TitleSystem.fadeSpeed;
	if(this._fadeSprite.opacity <= 0) this._needsFadeIn = false;
};
//-----------------------------------------------------------------------------
// Update Fade Out
//-----------------------------------------------------------------------------
Scene_Title.prototype.updateFadeOut = function() {
    this._fadeSprite.opacity += CGMV.TitleSystem.fadeSpeed;
	if(this._fadeSprite.opacity >= 255) {
		this._needsFadeOut = false;
		this.advanceCycle();
	}
};
//-----------------------------------------------------------------------------
// Check if scene is ready to display new item in cycle
//-----------------------------------------------------------------------------
Scene_Title.prototype.isReady = function() {
	if(this._isImage) return Scene_Base.prototype.isReady.call(this);
	else {
		if (!this._mapLoaded && DataManager.isMapLoaded()) {
			this.onMapLoaded();
			this._mapLoaded = true;
		}
		return this._mapLoaded && Scene_Base.prototype.isReady.call(this);
	}
};
//-----------------------------------------------------------------------------
// After loading map, setup $gameMap and spriteset
//-----------------------------------------------------------------------------
Scene_Title.prototype.onMapLoaded = function() {
	$gameMap.setup(this._currentDisplay.Map);
    this._spriteset = new Spriteset_Map();
	this._backSpriteSet.addChild(this._spriteset);
};
//-----------------------------------------------------------------------------
// Set gamePlayer and followers to not display
//-----------------------------------------------------------------------------
Scene_Title.prototype.resetGamePlayer = function() {
	$gamePlayer._characterName = "";
	$gamePlayer._followers._data.forEach(function(follower) {
		follower._characterName = "";
	});
};
//-----------------------------------------------------------------------------
// Alias. Save cycle position.
//-----------------------------------------------------------------------------
var alias_CGMV_TitleSystem_commandContinue = Scene_Title.prototype.commandContinue;
Scene_Title.prototype.commandContinue = function() {
    $cgmvTemp._titleCycle = this._cycle;
	alias_CGMV_TitleSystem_commandContinue.call(this);
};
//-----------------------------------------------------------------------------
// Alias. Save cycle position.
//-----------------------------------------------------------------------------
var alias_CGMV_TitleSystem_commandOptions = Scene_Title.prototype.commandOptions;
Scene_Title.prototype.commandOptions = function() {
    $cgmvTemp._titleCycle = this._cycle;
	alias_CGMV_TitleSystem_commandOptions.call(this);
};
//=============================================================================
// CGMV_Temp
//-----------------------------------------------------------------------------
// Save position of title screen cycle (not included in save data)
//=============================================================================
//-----------------------------------------------------------------------------
// Save title system cycle position
//-----------------------------------------------------------------------------
var alias_CGMV_TitleSystem_createPluginData = CGMV_Temp.prototype.createPluginData;
CGMV_Temp.prototype.createPluginData = function() {
	this._titleCycle = 0;
};