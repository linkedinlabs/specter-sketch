import { Settings } from 'sketch';
import { updateArray } from './Tools';
import { PLUGIN_IDENTIFIER } from './constants';

/**
 * @description A class to handle housekeeping tasks on Sketch, plugin, document, or
 * layer Settings objects.
 *
 * @class
 * @name Housekeeper
 *
 * @constructor
 *
 * @property document The Sketch document that contains the layer.
 * @property messenger An instance of the Messenger class.
 */
export default class Housekeeper {
  constructor({ in: document, messenger }) {
    this.document = document;
    this.messenger = messenger;
  }

  /**
   * @description Used to move plugin settings to document-level settings based on a set of
   * keys used for comparisons.
   *
   * @kind function
   * @name runMigrations
   *
   * @param {Object} comparisonKeys An object containing a `mainKey` and `secondaryKey` used
   * @param {Object} pluginSettings An object containing the plugin settings.
   * @param {Object} documentSettings An object containing the document settings.
   * in addition to `id` to compare layer ID sets between plugin and document settings.
   * @returns {Object} Returns an object containing (potentially) updated `documentSettings` and
   * `pluginSettings` objects, and a `changed` flag indicating updates.
   */
  fromPluginToDocument(comparisonKeys, pluginSettings, documentSettings = {}) {
    const { mainKey, secondaryKey, newMainKey } = comparisonKeys;
    const mainKeyToUse = newMainKey || mainKey;
    const newDocumentSettings = documentSettings;
    let newPluginSettings = pluginSettings;
    let settingsChanged = false;

    // set up placeholder in `documentSettings` for the main key
    if (!newDocumentSettings[mainKey]) {
      newDocumentSettings[mainKey] = [];
    }

    // iterate through each `mainKey`
    pluginSettings[mainKey].forEach((layerIdSet) => {
      const { id } = layerIdSet;
      const secondaryId = layerIdSet[secondaryKey];

      // make sure the primary `id` layer actually exists
      const primaryLayer = this.document.getLayerWithID(id);

      // make sure the `secondaryKey` paired layer actually exists
      const pairedLayer = this.document.getLayerWithID(secondaryId);

      if (primaryLayer && pairedLayer) {
        // check if this `primaryLayer` has already been migrated
        const existingItemIndex = newDocumentSettings[mainKeyToUse].findIndex(
          foundItem => (foundItem.id === id),
        );
        if (existingItemIndex < 0) {
          // add the `layerIdSet` to the document settings
          newDocumentSettings[mainKeyToUse].push(layerIdSet);

          // remove the `layerIdSet` from the plugin settings
          newPluginSettings = updateArray(
            mainKey,
            layerIdSet,
            newPluginSettings,
            'remove',
          );

          // set the `changed` flag
          settingsChanged = true;
        }
      }
    });
    return {
      documentSettings: newDocumentSettings,
      pluginSettings: newPluginSettings,
      changed: settingsChanged,
    };
  }

  /**
   * @description Checks for the existence of certain keys in the plugin Settings (`containerGroups`
   * and `labeledLayers`) and runs any necessary migrations.
   *
   * @kind function
   * @name runMigrations
   */
  runMigrations() {
    const pluginSettings = Settings.settingForKey(PLUGIN_IDENTIFIER);
    const documentSettings = Settings.documentSettingForKey(this.document, PLUGIN_IDENTIFIER);
    let settingsToUpdate = {
      pluginSettings,
      documentSettings,
      changed: false,
    };

    if (!pluginSettings) {
      return null;
    }

    // migrate the `containerGroups` into local document settings
    if (pluginSettings.containerGroups && pluginSettings.containerGroups.length > 0) {
      const comparisonKeys = {
        mainKey: 'containerGroups',
        secondaryKey: 'artboardId',
      };
      this.messenger.log('Run “containerGroups” settings migration…');
      settingsToUpdate = this.fromPluginToDocument(
        comparisonKeys,
        settingsToUpdate.pluginSettings,
        settingsToUpdate.documentSettings,
      );
    }

    // migrate the `labeledLayers` into local document settings as `annotatedLayeres`
    if (pluginSettings.labeledLayers && pluginSettings.labeledLayers.length > 0) {
      const comparisonKeys = {
        mainKey: 'labeledLayers',
        newMainKey: 'annotatedLayers',
        secondaryKey: 'originalId',
      };
      this.messenger.log('Run “labeledLayers” settings migration…');
      settingsToUpdate = this.fromPluginToDocument(
        comparisonKeys,
        settingsToUpdate.pluginSettings,
        settingsToUpdate.documentSettings,
      );
    }

    if (settingsToUpdate.changed) {
      Settings.setDocumentSettingForKey(
        this.document,
        PLUGIN_IDENTIFIER,
        settingsToUpdate.documentSettings,
      );
      Settings.setSettingForKey(PLUGIN_IDENTIFIER, settingsToUpdate.pluginSettings);
      this.messenger.log('Migration: settings were updated');
    }
    return null;
  }
}
