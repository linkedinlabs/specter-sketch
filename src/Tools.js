import { toArray } from 'util';
import { fromNative } from 'sketch';

// --- contants
/**
 * @description A constant with unique string to identify the plugin within Sketch.
 * Changing this will potentially break data retrieval in Sketch files that used
 * earlier versions of the plugin with a different identifier.
 *
 * @kind constant
 * @name options
 * @type {string}
 */
const PLUGIN_IDENTIFIER = 'com.linkedinlabs.sketch.auto-spec-plugin';

// --- helper functions
/**
 * @description Takes context (if made available) and returns the document
 * or derives the `currentDocument` from `NSDocumentController` (necessary
 * when a command froms from the GUI)
 *
 * @kind function
 * @name getDocument
 * @param {Object} context The current context (event) received from Sketch (optional).
 * @returns {Object} Contains an objective-c object with the current document.
 */
const getDocument = (context = null) => {
  if (!context) {
    /* eslint-disable no-undef */
    return NSDocumentController.sharedDocumentController().currentDocument();
    /* eslint-enable no-undef */
  }

  if (context.actionContext && context.actionContext.document) {
    return context.actionContext.document;
  }

  return context.document;
};

/**
 * @description Takes an objective-c object of the document and
 * retrieves the currently-selected layers
 *
 * @kind function
 * @name getSelection
 * @param {Object} objcDocument The current objective-c document object.
 * @returns {Object} Contains an objective-c object with the current document.
 */
const getSelection = objcDocument => objcDocument.selectedLayers().layers() || null;

/**
 * @description A conversion function to give us full js Array functions from an NSArray object.
 * Info {@link https://sketchplugins.com/d/113-how-to-iterate-through-selected-layers-in-sketchapi/8}
 *
 * @kind function
 * @name setArray
 * @param {Array} nsArray The NSArray-formatted array.
 * @returns {Array} Javascript Array.
 */
const setArray = nsArray => toArray(nsArray);

/**
 * @description Find a layer by ID in an array of layers.
 *
 * @kind function
 * @name findLayerById
 * @param {Array} layers Array of layers to search through.
 * @param {string} layerId The string ID of the layer to find.
 * @returns {Object} foundLayer The layer that was found (or null).
 */
const findLayerById = (layers, layerId) => {
  if (!layers || !layerId) {
    return null;
  }

  let foundLayer = null;
  layers.forEach((layer) => {
    const layerJSON = fromNative(layer);
    if (layerJSON.id === layerId) {
      foundLayer = layer;
    }
    return foundLayer;
  });
  return foundLayer;
};

export {
  findLayerById,
  getDocument,
  getSelection,
  PLUGIN_IDENTIFIER,
  setArray,
};
