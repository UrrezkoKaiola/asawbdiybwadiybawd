/*:
 * @plugindesc Adds a new scene, that provides an overview over all achievements.
 * <Iavra Achievement Menu>
 * @author Iavra
 *
 * @param Title Menu Option
 * @desc Label to display in the title menu. If left empty, the menu won't be accessible from there. Default: Achievements
 * @default Achievements
 *
 * @param Game Menu Option
 * @desc Label to display in the game menu. If left empty, the menu won't be accessible from there. Default: Achievements
 * @default Achievements
 *
 * @param Secret Placeholder
 * @desc Placeholder to be used for titles of secret achievements. Leave empty to completely hide them. Default: ???
 * @default ???
 *
 * @param Variable Gauge Background
 * @desc Background Color to be used for the progress gauge of variable achievements, in hex: Default: #000
 * @default #000
 *
 * @param Variable Gauge Fill
 * @desc Color to be used for the filled part of the progress gauge of variable achievements, in hex. Default: #FF0000
 * @default #FF0000
 *
 * @help
 * This adds a simple menu to the game, that can be used to view achievement progress.
 *
 * Everything about the menu is available for public, so it's easy to modify it or simple create a new one, since the whole
 * achievement logic itself is contained in the core plugin.
 */
 
var Imported = Imported || {};
if(!Imported.iavra_achievement_core) { throw new Error("This plugin needs 'Iavra Achievement - Core' to work."); }
Imported.iavra_achievement_menu = true;

//=============================================================================
// namespace IAVRA
//=============================================================================

var IAVRA = IAVRA || {};

(function() {
    "use strict";
    
    /**
     * Load plugin parameters independently from the plugin's file name.
     */
    var _params = $plugins.filter(function(p) { return p.description.contains('<Iavra Achievement Menu>'); })[0].parameters;
    var _param_titleMenu = _params['Title Menu Option'];
    var _param_gameMenu = _params['Game Menu Option'];
    var _param_secretPlaceholder = _params['Secret Placeholder'];
    var _param_gaugeBackground = (/(#(?:[A-F0-9]{6}|[A-F0-9]{3}))/i.exec(_params['Variable Gauge Background']) || [])[1];
    var _param_gaugeFill = (/(#(?:[A-F0-9]{6}|[A-F0-9]{3}))/i.exec(_params['Variable Gauge Fill']) || [])[1];
    
    /**
     * Width and height of the gauge used to display the progress of certain achievements.
     */
    var _variableGauge = {w: 200, h: 10};
    
    //=============================================================================
    // module IAVRA.ACHIEVEMENT.MENU
    //=============================================================================
    
    IAVRA.ACHIEVEMENT.MENU = {
        /**
         * The scene used to display the menu on screen.
         */
        Scene_Menu: function() { this.initialize.apply(this, arguments); }, 
        /**
         * A window containing all achievements.
         */
        Window_AchievementList: function() { this.initialize.apply(this, arguments); }
    };
    
    //=============================================================================
    // class IAVRA.ACHIEVEMENT.MENU.Scene_Menu
    //=============================================================================
    
    (function($) {
        ($.prototype = Object.create(Scene_MenuBase.prototype)).constructor = $;
        
        /**
         * The scene consists of 2 windows: The achievement list and a help window displaying the achievement description.
         */
        $.prototype.create = function() {
            Scene_MenuBase.prototype.create.call(this);
            this.createHelpWindow();
            this.createAchievementWindow();
        };
        
        /**
         * The window is simple, since there is no action involved, so we only need to register the help window.
         */
        $.prototype.createAchievementWindow = function() {
            var window = new IAVRA.ACHIEVEMENT.MENU.Window_AchievementList(this._helpWindow.height);
            window.setHelpWindow(this._helpWindow);
            window.setHandler('cancel', this.popScene.bind(this));
            this.addWindow((this._windowAchievementList = window));
        };
    
    })(IAVRA.ACHIEVEMENT.MENU.Scene_Menu);
    
    //=============================================================================
    // class IAVRA.ACHIEVEMENT.MENU.Window_AchievementList
    //=============================================================================
    
    (function($) {
        ($.prototype = Object.create(Window_Command.prototype)).constructor = $;
        
        /**
         * Position the window relative to the help window, so they don't overlap.
         */
        $.prototype.initialize = function(offset) {
            this._offset = offset;
            Window_Command.prototype.initialize.call(this, 0, offset);
        };
        
        /**
         * Fill out the whole screen.
         */
        $.prototype.windowWidth = function() {
            return Graphics.boxWidth;
        };
        
        /**
         * Fill out the remaining screen.
         */
        $.prototype.windowHeight = function() {
            return Graphics.boxHeight - this._offset;
        };
        
        /**
         * Register a command for each achievement. I the parameter "Secret Placeholder" is empty, leave out secret, not
         * yet completed ones.
         */
        $.prototype.makeCommandList = function() {
            var achievements = IAVRA.ACHIEVEMENT.achievements(), achievement;
            for(var i = 0, max = achievements.length; i < max; ++i) {
                achievement = achievements[i];
                if(!_param_secretPlaceholder && achievement.secret && !achievement.completed) { continue; }
                this.addCommand(achievement.title, 'achievement', achievement.completed, achievement);
            };
        };
        
        /**
         * An achievement consists of an icon, a title and maybe a progress gauge, depending on the trigger type.
         */
        $.prototype.drawItem = function(index) {
            var rect = this.itemRectForText(index), achievement = this._list[index].ext;
            this.resetTextColor();
            this.changePaintOpacity(this.isCommandEnabled(index));
            this.drawAchievementIcon(achievement, rect);
            this.drawAchievementTitle(achievement, rect);
            this.drawAchievementProgress(achievement, rect);
        };
        
        /**
         * Simply draw the icon belonging to that achievement.
         */
        $.prototype.drawAchievementIcon = function(achievement, rect) {
            this.drawIcon(achievement.icon, rect.x + 2, rect.y + 2);
        };
        
        /**
         * Draw the achievement title or our placeholder text, if the achievement is secret and not yet completed.
         */
        $.prototype.drawAchievementTitle = function(achievement, rect) {
            var text = achievement.secret && !achievement.completed ? _param_secretPlaceholder : achievement.title;
            this.drawText(text, rect.x + 2 + this.textWidth(' ') + Window_Base._iconWidth, rect.y);
        };
        
        /**
         * If we are dealing with a non-secret, variable achievement, draw a progress gauge.
         */
        $.prototype.drawAchievementProgress = function(achievement, rect) {
            if(achievement.secret && !achievement.completed) { return; }
            if(achievement instanceof IAVRA.ACHIEVEMENT.Achievement_Variable) {
                var x = rect.width - _variableGauge.w, y = rect.y + (rect.height - _variableGauge.h) / 2;
                var progress = achievement.completed ? 1 : $gameVariables.value(achievement._variableId) / achievement._variableValue;
                this.contents.fillRect(x, y, _variableGauge.w, _variableGauge.h, _param_gaugeBackground);
                this.contents.fillRect(x, y, Math.floor(_variableGauge.w * progress), _variableGauge.h, _param_gaugeFill);
            }
        };
        
        /**
         * Display the description for the currently selected achievement or our placeholder, if it's secret and not yet completed.
         */
        $.prototype.updateHelp = function() {
            Window_Command.prototype.updateHelp.call(this);
            var achievement = this.currentExt();
            var text = achievement.secret && !achievement.completed ? _param_secretPlaceholder : achievement.description;
            if(this._helpWindow) { this._helpWindow.setText(text); }
        };
    
    })(IAVRA.ACHIEVEMENT.MENU.Window_AchievementList);
    
    //=============================================================================
    // class Scene_Title
    //=============================================================================
    
    (function($) {
    
        /**
         * If the parameter was left empty, we don't have to do anything, here.
         */
        if(!_param_titleMenu) { return; }
        
        /**
         * Register the command to show our menu scene.
         */
        var alias_createCommandWindow = $.prototype.createCommandWindow;
        $.prototype.createCommandWindow = function() {
            alias_createCommandWindow.call(this);
            this._commandWindow.setHandler('_iavra_achievement', this._iavra_commandAchievements.bind(this));
        };
        
        /**
         * The actual command function.
         */
        $.prototype._iavra_commandAchievements = function() {
            this._commandWindow.close();
            SceneManager.push(IAVRA.ACHIEVEMENT.MENU.Scene_Menu);
        };
    
    })(Scene_Title);
    
    //=============================================================================
    // class Window_TitleCommand
    //=============================================================================
    
    (function($) {
    
        /**
         * If the parameter was left empty, we don't have to do anything, here.
         */
        if(!_param_titleMenu) { return; }
        
        /**
         * Actually draw the command on-screen.
         */
        var alias_makeCommandList = $.prototype.makeCommandList;
        $.prototype.makeCommandList = function() {
            alias_makeCommandList.call(this);
            this.addCommand(_param_titleMenu, '_iavra_achievement');
        };
        
    })(Window_TitleCommand);
    
    //=============================================================================
    // class Scene_Menu
    //=============================================================================
    
    (function($) {
    
        /**
         * If the parameter was left empty, we don't have to do anything, here.
         */
        if(!_param_gameMenu) { return; }
    
        /**
         * Register the command to show our menu scene.
         */
        var alias_createCommandWindow = $.prototype.createCommandWindow;
        $.prototype.createCommandWindow = function() {
            alias_createCommandWindow.call(this);
            this._commandWindow.setHandler('_iavra_achievement', this._iavra_commandAchievements.bind(this));
        };
    
        /**
         * The actual command function.
         */
        $.prototype._iavra_commandAchievements = function() {
            SceneManager.push(IAVRA.ACHIEVEMENT.MENU.Scene_Menu);
        };
    
    })(Scene_Menu);
    
    //=============================================================================
    // Window_MenuCommand
    //=============================================================================
    
    (function($) {
    
        /**
         * If the parameter was left empty, we don't have to do anything, here.
         */
        if(!_param_gameMenu) { return; }
    
        /**
         * Actually draw the command on-screen.
         */
        var alias_addOptionsCommand = $.prototype.addOptionsCommand;
        $.prototype.addOptionsCommand = function() {
            alias_addOptionsCommand.call(this);
            this.addCommand(_param_gameMenu, '_iavra_achievement');
        };
    
    })(Window_MenuCommand);
    
})();