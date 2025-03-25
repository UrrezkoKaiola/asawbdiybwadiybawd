/*:
 * @plugindesc Displays a popup, whenever a new achievement is completed.
 * <Iavra Achievement Popup>
 * @author Iavra
 *
 * @param Popup Width
 * @desc Width of the popup window. Default: 500
 * @default 500
 *
 * @param Fade In
 * @desc How long it takes for the popup to fade in, in frames. Default: 30
 * @default 30
 *
 * @param Fade Out
 * @desc How long it takes for the popup to fade out, in frames. Default: 100
 * @default 100
 *
 * @param Duration
 * @desc How long the popup is visible after fading in and before starting to fade out. Default: 200
 * @default 200
 *
 * @param Font Size
 * @desc The font size to be used. Leave empty to use the global default. Default: (empty)
 * @default
 *
 * @param Font Name
 * @desc The font to be used. Leave empty to use the global default. Default: (empty)
 * @default
 *
 * @param Padding
 * @desc Window padding to be used. Leave empty to use the global default. Default: (empty)
 * @default
 *
 * @param Windowskin
 * @desc The windowskin to be used. Leave empty to use the global default. Default: (empty)
 * @default
 *
 * @help
 * This adds simple popups to the game, that get displayed, whenever an achievement gets completed.
 *
 * Everything about the popups is available for public, so it's easy to modify it or simple create new ones, since the whole
 * achievement logic itself is contained in the core plugin.
 */
 
var Imported = Imported || {};
if(!Imported.iavra_achievement_core) { throw new Error("This plugin needs 'Iavra Achievement - Core' to work."); }
Imported.iavra_achievement_popup = true;

//=============================================================================
// namespace IAVRA
//=============================================================================

var IAVRA = IAVRA || {};

(function() {
    "use strict";
    
    /**
     * Load plugin parameters independently from the plugin's file name.
     */
    var _params = $plugins.filter(function(p) { return p.description.contains('<Iavra Achievement Popup>'); })[0].parameters;
    var _param_width = Math.max(parseInt(_params['Popup Width']) || 0, 0);
    var _param_fadeIn = Math.max(parseInt(_params['Fade In']) || 0, 0);
    var _param_fadeOut = Math.max(parseInt(_params['Fade Out']) || 0, 0);
    var _param_duration = Math.max(parseInt(_params['Duration']) || 0, 0);
    var _param_fontSize = (function($) { return $ === '' ? null : parseInt($) || 0; })(_params['Font Size'].trim());
    var _param_fontName = _params['Font Name'];
    var _param_padding = (function($) { return $ === '' ? null : parseInt($) || 0; })(_params['Padding'].trim());
    var _param_windowskin = _params['Windowskin'];
    
    /**
     * Instance of Sprite_Container, that holds all currently displaying popups.
     */
    var _container;
    
    //=============================================================================
    // module IAVRA.ACHIEVEMENT.POPUP
    //=============================================================================
    
    IAVRA.ACHIEVEMENT.POPUP = {
        /**
         * A simple container used to group all popups together. Currently, that's just a simple Sprite, but i decided to make
         * it its own class, so it can be extended in other plugins.
         */
        Sprite_Container: function() { this.initialize.apply(this, arguments); },
        /**
         * Window used to display a popup.
         */
        Window_Popup: function() { this.initialize.apply(this, arguments); }
    };
    
    //=============================================================================
    // class IAVRA.ACHIEVEMENT.POPUP.Sprite_Container
    //=============================================================================

    (function($) {
        ($.prototype = Object.create(Sprite.prototype)).constructor = $;        
    })(IAVRA.ACHIEVEMENT.POPUP.Sprite_Container);
    
    //=============================================================================
    // class IAVRA.ACHIEVEMENT.POPUP.Window_Popup
    //=============================================================================
    
    (function($) {
        ($.prototype = Object.create(Window_Base.prototype)).constructor = $;
        
        /**
         * Cretae a new popup with the given achievement.
         */
        $.prototype.initialize = function(achievement) {
            Window_Base.prototype.initialize.call(this, 0, 0, _param_width, this.fittingHeight(1));
            this.drawAchievementIcon(achievement.icon);
            this.drawAchievementText(achievement.title);
            this._fadeIn = _param_fadeIn;
            this._fadeOut = _param_fadeOut;
            this._duration = _param_duration;
            this.opacity = this.contentsOpacity = 0;
        };
        
        /**
         * Draw the achievement icon.
         */
        $.prototype.drawAchievementIcon = function(icon) {
            this.drawIcon(icon, 2, 2);
        };
        
        /**
         * Draw the achievement title.
         */
        $.prototype.drawAchievementText = function(text) {
            this.drawText(text, 2 + this.textWidth(' ') + Window_Base._iconWidth, 0);
        };
        
        /**
         * On update, calculate the position of the popup. Afterwards, either fade in or out the popup or count down its
         * remaining duration. Once a popup duration has expired, it is removed from the container.
         */
        $.prototype.update = function() {
            Window_Base.prototype.update.call(this);
            this.updatePosition();
            this.updateFadeIn() || this.updateDuration() || this.updateFadeOut() || _container.removeChild(this);
        };
        
        /**
         * The position of a popup depends on all popups added afterwards. This way, new popups are added on top, pushing
         * older ones down, so they don't overlap.
         */
        $.prototype.updatePosition = function() {
            var children = _container.children, thisIndex = children.indexOf(this);
            this.y = children.filter(function(child, index) { return index > thisIndex; }).reduce(function(sum, child) {
                return sum + child.height; },
            0);
        };
        
        /**
         * Gradually fade in the popup over its fade in duration.
         */
        $.prototype.updateFadeIn = function() {
            if(this._fadeIn-- > 0) {
                this.opacity = this.contentsOpacity = 255 * (1 - (this._fadeIn / _param_fadeIn));
                return true;
            }
            return false;
        };
        
        /**
         * Wait, until the popup duration has been completed. Also set the popup's opacity to 255 in case the fade in
         * duration was specified as 0.
         */
        $.prototype.updateDuration = function() {
            return this._duration-- > 0 && (this.opacity = this.contentsOpacity = 255);  
        };
        
        /**
         * Gradually fade out the popup over its fade out duration.
         */
        $.prototype.updateFadeOut = function() {
            if(this._fadeOut-- > 0) {
                this.opacity = this.contentsOpacity = 255 - 255 * (1 - (this._fadeOut / _param_fadeOut));
                return true;
            }
            return false;
        };
        
        $.prototype.standardFontSize = function() {
            return _param_fontSize === null ? Window_Base.prototype.standardFontSize.call(this) : _param_fontSize;
        };
        
        $.prototype.standardFontFace = function() {
            return !_param_fontName ? Window_Base.prototype.standardFontFace.call(this) : _param_fontName;
        };
        
        $.prototype.standardPadding = function() {
            return _param_padding === null ? Window_Base.prototype.standardPadding.call(this) : _param_padding;
        };
        
        $.prototype.standardPadding = function() {
            return _param_padding === null ? Window_Base.prototype.standardPadding.call(this) : _param_padding;
        };
        
        $.prototype.loadWindowskin = function() {
            if(!_param_windowskin) { 
                Window_Base.prototype.loadWindowskin.call(this); 
            } else {
                this.windowskin = ImageManager.loadSystem(_param_windowskin);
            }
        };
        
    })(IAVRA.ACHIEVEMENT.POPUP.Window_Popup);
    
    //=============================================================================
    // class IAVRA.ACHIEVEMENT.Achievement
    //=============================================================================

    (function($) {
        
        /**
         * When an achievement gets completed, add a new popup to the container.
         */
        var alias_onComplete = $.prototype.onComplete;
        $.prototype.onComplete = function() {
            alias_onComplete.call(this);
            if(_container) { _container.addChild(new IAVRA.ACHIEVEMENT.POPUP.Window_Popup(this)); }
        };
        
    })(IAVRA.ACHIEVEMENT.Achievement);
    
    //=============================================================================
    // Scene_Base
    //=============================================================================
    
    (function($) {
        
        /**
         * Popups are displayed above the WindowLayer.
         */
        var alias_createWindowLayer = $.prototype.createWindowLayer;
        $.prototype.createWindowLayer = function() {
            alias_createWindowLayer.call(this);
            this.addChild(_container = new IAVRA.ACHIEVEMENT.POPUP.Sprite_Container);
        };
        
        /**
         * At the end of a scene, clear all popups.
         */
        var alias_terminate = $.prototype.terminate;
        $.prototype.terminate = function() {
            alias_terminate.call(this);
            if(_container) { _container.removeChildren(); }
        };
        
    })(Scene_Base);
    
})();