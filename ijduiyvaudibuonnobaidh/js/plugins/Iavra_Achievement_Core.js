/*:
 * @plugindesc Adds global achievements to the game, which are tied to switches/variables.
 * <Iavra Achievement Core>
 * @author Iavra
 *
 * @param Configuration
 * @desc Name of an external configuration file to load at game start. Default: data/achievements.json
 * @default data/achievements.json
 *
 * @param Update Interval
 * @desc How often the plugin should check for completed achievements. 0 or lower disables automatic checking. Default: 1
 * @default 1
 *
 * @param Plugin Command
 * @desc Name of the plugin command, that can be used to manually reset or complete achievements. Default: Achievement
 * @default Achievement
 *
 * @help
 * To add achievements to your game, create a file name "achievements.json" in the "data" folder of your game. You can use
 * a different path, as long as you modify the plugin parameter "Configuration" accordingly. Each achievement consists of
 * multiple properties:
 * 
 * id           A unique id, that may not contain whitespaces. Used to identify the achievement during saving an loading 
 *              and for script calls / plugin commands.
 * title        Title of the plugin, that may be displayed in a menu or notification popup.
 * description  Description of the plugin, that may be displayed in a menu or notification popup.
 * icon         Index of an icon to be shown for this achievement.
 * secret       This may cause an achievement to be hidden from a menu, as long as it hasn't been completed.
 * trigger      This is an object containing multiple properties. It always contains a "type" value, that indicates, how
 *              the achievement can be completed. Depending on the type, it may or may not contain additional parameters.
 *
 * This is a sample file, containing one of each achievement types:
 * 
 * [
 *     {
 *         "id":"simpleAchievement", 
 *         "title":"Simple Achievement", 
 *         "description":"This achievement can only be completed via a direct script call or plugin command.", 
 *         "icon":1, 
 *         "secret":true, 
 *         "trigger":{
 *             "type":"none"
 *         }
 *     }, 
 *     {
 *         "id":"switchAchievement", 
 *         "title":"Switch Achievement", 
 *         "description":"This achievement automatically gets completed, once the given switch is set to ON.", 
 *         "icon":2, 
 *         "secret":true, 
 *         "trigger":{
 *             "type":"switch", 
 *             "switchId":1
 *         }
 *     }, 
 *     {
 *         "id":"variableAchievement", 
 *         "title":"Variable Achievement", 
 *         "description":"This achievement automatically gets completed, once the given variable reaches the given value.", 
 *         "icon":3, 
 *         "secret":false, 
 *         "trigger":{
 *             "type":"variable", 
 *             "variableId":1, 
 *             "variableValue":100
 *         }
 *     }
 * ]
 *
 * Additional achievement types can be added by other plugins. For instructions on how to do this, take a look at the 
 * variable "IAVRA.ACHIEVEMENT.triggerMappings", which has been made public.
 *
 * By default, achievement progress is checked every frame. If this causes lag in your game (for example, if you have a lot
 * of achievements or generally a lot of stuff going on), you can increase the "Update Interval" plugin parameter to have
 * the update function only being called every X frames. If you specify a value of 0 or lower, automatic checking will be
 * disabled and you'll need to manually do this via script call or plugin command.
 *
 * Once an achievement has been completed, its state will be stored in a global savefile, that's shared among all games.
 * It doesn't matter, if the condition is dropped afterwards (for example, if the given switch is set to OFF, again), as it
 * will stay completed from now on, until manually reset.
 *
 * If you want to manually reset or complete achievements, you can use the following script calls (note, that achievements
 * may immediately complete again after being reset, if their trigger condition is being met):
 *
 * IAVRA.ACHIEVEMENT.achievements();    Returns an array containing all achievements.
 * IAVRA.ACHIEVEMENT.check();           Checks all achievements for completion.
 * IAVRA.ACHIEVEMENT.reset(id);         Resets the achievement with the given id.
 * IAVRA.ACHIEMEMENT.resetAll();        Resets all achievements.
 * IAVRA.ACHIEVEMENT.complete(id);      Completes the achievement with the given id.
 * IAVRA.ACHIEVEMENT.completeAll();     Completes all achievements.
 * IAVRA.ACHIEVEMENT.isCompleted(id);   Returns true, if the given achievement has been completed.
 *
 * If you want to use plugin commands, instead, you can do so. This assumes, that the plugin parameter "Plugin Command" is
 * set to its default value:
 *
 * Achievement reset <id>               Resets the achievement with the given id.
 * Achievement reset                    Resets all achievements.
 * Achievement complete <id>            Completes the achievement with the given id.
 * Achievement complete                 Completes all achievements.
 * Achievement check                    Checks all achievements for completion.
 */

var Imported = Imported || {};
Imported.iavra_achievement_core = true;

//=============================================================================
// namespace IAVRA
//=============================================================================

var IAVRA = IAVRA || {};

(function() {
    "use strict";
    
    /**
     * Load plugin parameters independently from the plugin's file name.
     */
    var _params = $plugins.filter(function(p) { return p.description.contains('<Iavra Achievement Core>'); })[0].parameters;
    var _param_configuration = _params['Configuration'];
    var _param_interval = Math.max(0, parseInt(_params['Update Interval']) || 0);
    var _param_pluginCommand = _params['Plugin Command']; 
    
    /**
     * String used to mark the achievement savefile.
     */
    var _savefileId = '_iavra_achievement';
    
    /**
     * Stores all achievements.
     */
    var _achievements;
    
    /**
     * Indicates, if achievements are currently being saved.
     */
    var _isSaving = false;
    
    /**
     * Loads the given file and executes a callback after a successful load. If the file can't be loaded, throws an error.
     */
    var _loadFile = function(url, callback) {
        var request = new XMLHttpRequest();
        request.open('GET', _param_configuration);
        request.overrideMimeType('application/json');
        request.onload = function() { callback(JSON.parse(request.responseText)); }
        request.onerror = function() { throw new Error('There was an error loading the file ' + url); }
        request.send();
    };
    
    /**
     * Creates achievements from the given data and loads their current state, afterwards.
     */
    var _create = function(data) {
        var temp = [], entry, cls;
        for(var i = 0, max = data.length; i < max; ++i) {
            entry = data[i], cls = IAVRA.ACHIEVEMENT.triggerMappings[entry.trigger.type];
            if(cls) { temp.push(new cls(entry)); }
        }
        _achievements = temp;
        _load();
    };
    
    /**
     * Calls the test function, if the test interval has been met.
     */
    var _update = function() {
        if(Graphics.frameCount % _param_interval === 0) { _test(); };
    };
    
    /**
     * Updates all achievement, which causes them to mark as completed, if the trigger condition has been met.
     */
    var _test = function() {
        for(var i = 0, max = _achievements.length; i < max; ++i) { _achievements[i].update(); }
    };
    
    /**
     * Loads the current state of all achievements from the save file. We are using the private variable "_completed"
     * directly, because otherwise we would trigger a save every time we update an achievement.
     */
    var _load = function() {
        var loaded = StorageManager.exists(_savefileId) ? JSON.parse(StorageManager.load(_savefileId)) : [];
        var achievements = _achievements, achievement;
        for(var i = 0, max = achievements.length; i < max; ++i) {
            if(loaded.contains((achievement = achievements[i])._id)) { achievement._completed = true; }
        }
    };
    
    /**
     * Stores the current state of all achievements in the save file. This is done asynchronously, so the game flow won't
     * suddently be interrupted by the save. If another save is triggered during the meantime, it gets queued, so there
     * is only one save process at any given time.
     */
    var _save = function() {
        if(_isSaving) { setTimeout(_save, 5); return; }
        _isSaving = true;
        setTimeout(function() {
            var data = [], achievements = _achievements, achievement;
            for(var i = 0, max = achievements.length; i < max; ++i) {
                if((achievement = achievements[i])._completed) { data.push(achievement._id); }
            }
            StorageManager.save(_savefileId, JSON.stringify(data));
            _isSaving = false;
        }, 0);
    };
    
    /**
     * Sets a single achievement's completed variable to a given value, if it's different from its current state.
     */
    var _setSingle = function(id, value) {
        var achievements = _achievements, achievement;
        for(var i = 0, max = achievements.length; i < max; ++i) {
            if((achievement = achievements[i]).id === id && achievement.completed != value) { achievement.completed = value; }
        }
    };
    
    /**
     * Sets all achievements' completed variable to a given value.
     */
    var _setAll = function(value) {
        var achievements = _achievements, achievement;
        for(var i = 0, max = achievements.length; i < max; ++i) { achievements[i]._completed = value; }
        _save();
    };
    
    /**
     * Used to handle our plugin commands.
     */
    var _handlePluginCommand = function(args) {
        var cmd = args[0], id = args[1];
        switch(cmd) {
            case 'reset': if(id) { IAVRA.ACHIEVEMENT.reset(id); } else { IAVRA.ACHIEVEMENT.resetAll(); } break;
            case 'complete': if(id) { IAVRA.ACHIEVEMENT.complete(id); } else { IAVRA.ACHIEVEMENT.completeAll(); } break;
            case 'check': IAVRA.ACHIEVEMENT.check(); break;
        };
    };
    
    //=============================================================================
    // module IAVRA.ACHIEVEMENT
    //=============================================================================

    IAVRA.ACHIEVEMENT = {
        achievements: function() { return _achievements; }, 
        check: function() { _test(); }, 
        reset: function(id) { _setSingle(id, false); }, 
        resetAll: function() { _setAll(false); }, 
        complete: function(id) { _setSingle(id, true); },
        completeAll: function() { _setAll(true); },
        isCompleted: function(id) { return _achievements.some(function(a) { return a.id === id && a.completed; }); }, 
        /**
         * The basic achievement class, which contains core logic. Also used for the "none" trigger type. It will never
         * automatically mark as being completed, but can still be completed with a script call or plugin command.
         */
        Achievement: function() { this.initialize.apply(this, arguments); },
        /**
         * Checks a given switch and will automatically mark as completed, once the switch is set to true.
         */
        Achievement_Switch: function() { this.initialize.apply(this, arguments); }, 
        /**
         * Checks a given variable and will automatically mark as completed, once it reaches or surpasses a given value.
         */
        Achievement_Variable: function() { this.initialize.apply(this, arguments); }, 
    };
    
    /**
     * Can be extended by other plugins to register additional achievement classes. All of these should extend Achievement.
     */
    IAVRA.ACHIEVEMENT.triggerMappings = {
        'none': IAVRA.ACHIEVEMENT.Achievement, 
        'switch': IAVRA.ACHIEVEMENT.Achievement_Switch, 
        'variable': IAVRA.ACHIEVEMENT.Achievement_Variable
    };
    
    //=============================================================================
    // class IAVRA.ACHIEVEMENT.Achievement
    //=============================================================================

    (function($) {
        
        /**
         * Initializes all basic data, that is shared by all achievement classes. Those are:
         * - id: Used to load and store the current state and to identify the achievement in a script/plugin call.
         * - title: Title to be displayed in the achievement menu and notifications.
         * - description: Description to be displayed in the achievement menu.
         * - icon: Icon index to be used for the achievement menu and notifications.
         * - secret: Whether the achievement should be hidden in the menu, as long as it hasn't been completed.
         */
        $.prototype.initialize = function(data) {
            this._id = data.id;
            this._title = data.title;
            this._description = data.description;
            this._icon = data.icon;
            this._secret = data.secret;
            this._completed = false;
        };
        
        /**
         * If the achievement hasn't already been completed and it's "test" function returns true, mark it as completed
         * and invoke its "_onComplete" function.
         */
        $.prototype.update = function() {
            if(!this._completed && this.test()) { this.completed = true; this.onComplete(); }
        };
        
        /**
         * Tests, whether the trigger condition for this achievement has been completed. To be overridden in subclasses.
         */
        $.prototype.test = function() {};
        
        /**
         * What to do, when an achievement has been completed. May be overridden by other plugins, to display popups or
         * similar.
         */
        $.prototype.onComplete = function() {};
        
        /**
         * Define a bunch of properties, so our private variables don't have to be used directly.
         */
        Object.defineProperties($.prototype, {
            id: { get: function() { return this._id; } }, 
            title: { get: function() { return this._title; } }, 
            description: { get: function() { return this._description; } }, 
            icon: { get: function() { return this._icon; } }, 
            secret: { get: function() { return this._secret; } }, 
            completed: {
                get: function() { return this._completed; }, 
                set: function(value) { this._completed = value; _save(); }
            }
        });
        
    })(IAVRA.ACHIEVEMENT.Achievement);
    
    //=============================================================================
    // class IAVRA.ACHIEVEMENT.Achievement_Switch
    //=============================================================================

    (function($) {
        ($.prototype = Object.create(IAVRA.ACHIEVEMENT.Achievement.prototype)).constructor = $;
        
        /**
         * Takes an additional "trigger.switchId" parameter, which indicates the switch to check during the update.
         */
        $.prototype.initialize = function(data) {
            IAVRA.ACHIEVEMENT.Achievement.prototype.initialize.call(this, data);
            this._switchId = data.trigger.switchId;          
        };
        
        /**
         * Tests, whether the given switch is set to true.
         */
        $.prototype.test = function() { return $gameSwitches.value(this._switchId); };
        
    })(IAVRA.ACHIEVEMENT.Achievement_Switch);
    
    //=============================================================================
    // class IAVRA.ACHIEVEMENT.Achievement_Variable
    //=============================================================================

    (function($) {
        ($.prototype = Object.create(IAVRA.ACHIEVEMENT.Achievement.prototype)).constructor = $;
               
        /**
         * Takes additional "trigger.variableId" and "trigger.variableValue" parameters, which indicate the variable to
         * check and which value it should have.
         */
        $.prototype.initialize = function(data) {
            IAVRA.ACHIEVEMENT.Achievement.prototype.initialize.call(this, data);
            this._variableId = data.trigger.variableId;
            this._variableValue = data.trigger.variableValue;
        };
        
        /**
         * Tests, whether the given variable has reached or surpassed the given value.
         */
        $.prototype.test = function() { return $gameVariables.value(this._variableId) >= this._variableValue; };
        
    })(IAVRA.ACHIEVEMENT.Achievement_Variable);
    
    //=============================================================================
    // class Scene_Base
    //=============================================================================
    
    (function($) {
    
        /**
         * Disable automatic checking, if a value of 0 or less was specified for the interval.
         */
        if(!_param_interval) { return; }
    
        /**
         * During scene update also call our own update function to determine, whether achievements have been completed.
         */
        var alias_update = $.prototype.update;
        $.prototype.update = function() {
            alias_update.call(this);
            _update();
        };
    
    })(Scene_Base);
    
    //=============================================================================
    // class Scene_Boot
    //=============================================================================

    (function($) {
        
        /**
         * Load our achievement data at startup.
         */
        var alias_create = $.prototype.create;
        $.prototype.create = function() {
            alias_create.call(this);
            _loadFile(_param_configuration, _create);
        };
        
        /**
         * Check, whether all achievements have been initialized.
         */
        var alias_isReady = $.prototype.isReady;
        $.prototype.isReady = function() {
            return !!_achievements && alias_isReady.call(this);
        };
        
    })(Scene_Boot);
    
    //=============================================================================
    // class Game_Interpreter
    //=============================================================================
    
    (function($) {
    
        /**
         * Register our own plugin command with the game interpreter.
         */
        var alias_pluginCommand = $.prototype.pluginCommand;
        $.prototype.pluginCommand = function(cmd, args) {
            if(cmd === _param_pluginCommand) { return _handlePluginCommand(args); }
            alias_pluginCommand.call(this, cmd, args);
        };
    
    })(Game_Interpreter);
    
    //=============================================================================
    // module StorageManager
    //=============================================================================
    
    (function($) {
    
        /**
         * Return the path to our own save file, if our savefile id is supplied.
         */
        var alias_localFilePath = $.localFilePath;
        $.localFilePath = function(savefileId) {
            if(savefileId === _savefileId) {
                return this.localFileDirectoryPath() + 'achievements.rpgsave';
            }
            return alias_localFilePath.call(this, savefileId);
        };
        
        /**
         * Return the key to our local storage entry, if our savefile id is supplied.
         */
        var alias_webStorageKey = $.webStorageKey;
        $.webStorageKey = function(savefileId) {
            if(savefileId === _savefileId) {
                return 'RPG Achievements';
            }
            return alias_webStorageKey.call(this, savefileId);
        };
    
    })(StorageManager);
    
})();