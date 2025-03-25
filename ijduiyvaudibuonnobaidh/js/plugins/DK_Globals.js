/*
Title: Globals
Author: DKPlugins
Site: https://dk-plugins.ru
E-mail: kuznetsovdenis96@gmail.com
Version: 2.0.0
Release: 22.08.2020
First release: 23.10.2017
*/

/*ru
Название: Глобальные данные
Автор: DKPlugins
Сайт: https://dk-plugins.ru
E-mail: kuznetsovdenis96@gmail.com
Версия: 2.0.0
Релиз: 22.08.2020
Первый релиз: 23.10.2017
*/

/*:
 * @plugindesc v.2.0.0 Allows you to specify variables and switches that will be "global" to all player saves
 * @author DKPlugins
 * @url https://dk-plugins.ru
 * @target MZ
 * @help

 ### Info about plugin ###
 Title: DK_Globals
 Author: DKPlugins
 Site: https://dk-plugins.ru
 Version: 2.0.0
 Release: 22.08.2020
 First release: 23.10.2017

 ###=========================================================================
 ## Compatibility
 ###=========================================================================
 RPG Maker MV: 1.5+
 RPG Maker MZ: 1.0+

 ###=========================================================================
 ## Instructions
 ###=========================================================================
 Note that the changes are saved to the file immediately
 when you change the “global” variable or switch!

 ###===========================================================================
 ## License and terms of use
 ###===========================================================================
 You can:
 -To use the plugin for your non-commercial projects
 -Change code of the plugin

 You cannot:
 -Delete or change any information about the plugin
 -Distribute the plugin and its modifications

 ## Commercial license ##
 To use the plugin in commercial projects, you must be my subscriber on patreon
 https://www.patreon.com/dkplugins

 ###=========================================================================
 ## Support
 ###=========================================================================
 Donate: https://dk-plugins.ru/donate
 Become a patron: https://www.patreon.com/dkplugins

 * @param Variables
 * @desc List of variables
 * @type variable[]
 * @default []

 * @param Switches
 * @desc List of switches
 * @type switch[]
 * @default []

*/

/*:ru
 * @plugindesc v.2.0.0 Позволяет указать переменные и переключатели, которые будут "глобальными" для всех сохранений игрока
 * @author DKPlugins
 * @url https://dk-plugins.ru
 * @target MZ
 * @help

 ### Информация о плагине ###
 Название: DK_Globals
 Автор: DKPlugins
 Сайт: https://dk-plugins.ru
 Версия: 2.0.0
 Релиз: 22.08.2020
 Первый релиз: 23.10.2017

 ###=========================================================================
 ## Совместимость
 ###=========================================================================
 RPG Maker MV: 1.5+
 RPG Maker MZ: 1.0+

 ###=========================================================================
 ## Инструкции
 ###=========================================================================
 Обратите внимание, что изменения сразу сохраняются в файл
 при изменении "глобальной" переменной или переключателя!

 ###===========================================================================
 ## Лицензия и правила использования плагина
 ###===========================================================================
 Вы можете:
 -Использовать плагин в некоммерческих проектах
 -Изменять код плагина

 Вы не можете:
 -Удалять или изменять любую информацию о плагине
 -Распространять плагин и его модификации

 ## Коммерческая лицензия ##
 Для использования плагина в коммерческих проектах необходимо быть моим подписчиком на патреоне
 https://www.patreon.com/dkplugins

 ###=========================================================================
 ## Поддержка
 ###=========================================================================
 Поддержать: https://dk-plugins.ru/donate
 Стать патроном: https://www.patreon.com/dkplugins

 * @param Variables
 * @text Переменные
 * @desc Список переменных
 * @type variable[]
 * @default []

 * @param Switches
 * @text Переключатели
 * @desc Список переключателей
 * @type switch[]
 * @default []

*/

'use strict';

var Imported = Imported || {};
Imported['DK_Globals'] = '2.0.0';

(function() {

    const parameters = PluginManager.parameters('DK_Globals');

    parameters['Variables'] = (JSON.parse(parameters['Variables']) || []).map(id => parseInt(id));
    parameters['Switches'] = (JSON.parse(parameters['Switches']) || []).map(id => parseInt(id));
    parameters._loadGlobals = false;

    // functions

    function getFileExtension() {
        if (Utils.RPGMAKER_NAME === 'MV') {
            return '.rpgsave';
        }

        return '.rmmzsave';
    }

    function decompressData(data) {
        if (data) {
            if (Utils.RPGMAKER_NAME === 'MV') {
                return JSON.parse(LZString.decompressFromBase64(data));
            } else {
                return JSON.parse(pako.inflate(data, { to: 'string' }));
            }
        }

        return data;
    }

    function compressData(data) {
        if (data) {
            const json = JSON.stringify(data);

            if (Utils.RPGMAKER_NAME === 'MV') {
                return LZString.compressToBase64(json);
            } else {
                return pako.deflate(json, { to: 'string', level: 1 });
            }
        }

        return null;
    }

    function fsReadFile(path) {
        const fs = require('fs');

        if (fs.existsSync(path)) {
            return fs.readFileSync(path, { encoding: 'utf8' });
        }

        return null;
    }

    function fsWriteFile(folder, filename, data) {
        const fs = require('fs');

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
        }

        fs.writeFileSync(folder + filename, data);
    }

    //===========================================================================
    // Game_Variables
    //===========================================================================

    const Globals_Game_Variables_setValue = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(variableId, value) {
        Globals_Game_Variables_setValue.apply(this, arguments);

        if (parameters._loadGlobals) {
            return;
        }

        if (parameters['Variables'].includes(variableId)) {
            DataManager.saveGlobals();
        }
    };

    //===========================================================================
    // Game_Switches
    //===========================================================================

    const Globals_Game_Switches_setValue = Game_Switches.prototype.setValue;
    Game_Switches.prototype.setValue = function(switchId, value) {
        Globals_Game_Switches_setValue.apply(this, arguments);

        if (parameters._loadGlobals) {
            return;
        }

        if (parameters['Switches'].includes(switchId)) {
            DataManager.saveGlobals();
        }
    };

    //===========================================================================
    // DataManager
    //===========================================================================

    DataManager.loadGlobals = function() {
        let result = {};

        if (Utils.isNwjs()) {
            result = fsReadFile('save/globals' + getFileExtension());
        } else {
            result = localStorage.getItem('RPG Globals');
        }

        if (result) {
            result = decompressData(result);
        }

        if (result) {
            parameters._loadGlobals = true;

            Object.keys(result.variables).forEach((variableId) => {
                $gameVariables.setValue(parseInt(variableId), result.variables[variableId]);
            });

            Object.keys(result.switches).forEach((switchId) => {
                $gameSwitches.setValue(parseInt(switchId), result.switches[switchId]);
            });

            parameters._loadGlobals = false;
        }
    };

    DataManager.saveGlobals = function() {
        const data = { variables: {}, switches: {} };
        const variables = parameters['Variables'];
        const switches = parameters['Switches'];

        variables.forEach((variableId) => {
            data.variables[variableId] = $gameVariables.value(variableId);
        });

        switches.forEach((switchId) => {
            data.switches[switchId] = $gameSwitches.value(switchId);
        });

        if (Utils.isNwjs()) {
            fsWriteFile('save/', 'globals' + getFileExtension(), compressData(data));
        } else {
            localStorage.setItem('RPG Globals', compressData(data));
        }
    };

    const Globals_DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        Globals_DataManager_createGameObjects.apply(this, arguments);

        this.loadGlobals();
    };

    const Globals_DataManager_loadGame = DataManager.loadGame;
    DataManager.loadGame = function(savefileId) {
        const result = Globals_DataManager_loadGame.apply(this, arguments);

        if (result) {
            if (result instanceof Promise) {
                return result.then(() => {
                    this.loadGlobals();
                });
            } else {
                this.loadGlobals();
            }
        }

        return result;
    };

})();
