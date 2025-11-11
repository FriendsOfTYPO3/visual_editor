import DebounceEvent from '@typo3/core/event/debounce-event.js';
import {ClassicEditor} from '@ckeditor/ckeditor5-editor-classic';

// nearly 100% of this code is copied over from typo3/Build/Sources/TypeScript/rte-ckeditor/ckeditor5.ts
// only slight modifications to fit into Editara's context
// TODO make the needed modifications in TYPO3 Core so we can directly use that code here

/**
 * @typedef {Object} PluginModuleDescriptor
 * @property {string} module
 * @property {string[]} exports
 */

/**
 * @typedef {Object} CKEditor5Config
 * @property {Object} [toolbar]
 * @property {string[]} toolbar.items - in TYPO3 always `items` property is used, skipping `string[]`
 * @property {boolean} [toolbar.shouldNotGroupWhenFull]
 * @property {Array<string|PluginModuleDescriptor>} [importModules]
 * @property {Array<string|PluginModuleDescriptor>} [removeImportModules]
 * @property {string[]} [contentsCss]
 * @property {string|number} [width]
 * @property {string|number} [height]
 * @property {boolean} [readOnly]
 * @property {boolean} [debug]
 */

/**
 * @typedef {Object} Typo3Plugin
 * @property {Function[]} [overrides]
 */

/**
 * @typedef {Record<string, Typo3Plugin>} PluginModule
 */

/** @type {PluginModuleDescriptor[]} */
const defaultPlugins = [
  {module: '@ckeditor/ckeditor5-block-quote', exports: ['BlockQuote']},
  {module: '@ckeditor/ckeditor5-essentials', exports: ['Essentials']},
  {module: '@ckeditor/ckeditor5-find-and-replace', exports: ['FindAndReplace']},
  {module: '@ckeditor/ckeditor5-heading', exports: ['Heading']},
  {module: '@ckeditor/ckeditor5-indent', exports: ['Indent', 'IndentBlock']},
  {module: '@ckeditor/ckeditor5-link', exports: ['Link']},
  {module: '@ckeditor/ckeditor5-list', exports: ['List']},
  {module: '@ckeditor/ckeditor5-paragraph', exports: ['Paragraph']},
  {module: '@ckeditor/ckeditor5-clipboard', exports: ['PastePlainText']},
  {module: '@ckeditor/ckeditor5-paste-from-office', exports: ['PasteFromOffice']},
  {module: '@ckeditor/ckeditor5-remove-format', exports: ['RemoveFormat']},
  {module: '@ckeditor/ckeditor5-table', exports: ['Table', 'TableToolbar', 'TableProperties', 'TableCellProperties', 'TableCaption']},
  {module: '@ckeditor/ckeditor5-typing', exports: ['TextTransformation']},
  {module: '@ckeditor/ckeditor5-source-editing', exports: ['SourceEditing']},
  {module: '@ckeditor/ckeditor5-alignment', exports: ['Alignment']},
  {module: '@ckeditor/ckeditor5-style', exports: ['Style']},
  {module: '@ckeditor/ckeditor5-html-support', exports: ['GeneralHtmlSupport']},
  {module: '@ckeditor/ckeditor5-basic-styles', exports: ['Bold', 'Italic', 'Subscript', 'Superscript', 'Strikethrough', 'Underline']},
  {module: '@ckeditor/ckeditor5-special-characters', exports: ['SpecialCharacters', 'SpecialCharactersEssentials']},
  {module: '@ckeditor/ckeditor5-horizontal-line', exports: ['HorizontalLine']},
];

/**
 * @private
 * @param {Array<PluginModuleDescriptor>} defaultPlugins
 * @param {Array<string|PluginModuleDescriptor>|undefined} importModulesOption
 * @param {Array<string|PluginModuleDescriptor>|undefined} removeImportModulesOption
 * @returns {Promise<Array<any>>}
 */
async function resolvePlugins(
  defaultPlugins,
  importModulesOption,
  removeImportModulesOption,
)
{
  /** @type {Array<PluginModuleDescriptor>} */
  const removeImportModules = normalizeImportModules(removeImportModulesOption || []);
  /** @type {Array<PluginModuleDescriptor>} */
  const importModules = normalizeImportModules([
    ...defaultPlugins,
    ...(importModulesOption || []),
  ]).map((moduleDescriptor) => {
    const {module} = moduleDescriptor;
    let {exports} = moduleDescriptor;
    for (const toRemove of removeImportModules) {
      if (toRemove.module === module) {
        exports = exports.filter(el => !toRemove.exports.includes(el));
      }
    }
    return {module, exports};
  });

  const pluginModules = await Promise.all(
    importModules
      .map(async (moduleDescriptor) => {
        try {
          return {
            module: await import(moduleDescriptor.module),
            exports: moduleDescriptor.exports,
          };
        } catch (e) {
          console.error(`Failed to load CKEditor 5 module ${moduleDescriptor.module}`, e);
          return {
            module: null,
            exports: [],
          };
        }
      }),
  );

  const declaredPlugins = [];
  pluginModules.forEach(({module, exports}) => {
    for (const exportName of exports) {
      if (exportName in module) {
        declaredPlugins.push(module[exportName]);
      } else {
        console.error(`CKEditor 5 plugin export "${exportName}" not available in`, module);
      }
    }
  });

// plugins that were overridden by other custom plugin implementations
  const overriddenPlugins = declaredPlugins
    .filter(plugin => plugin.overrides?.length > 0)
    .map(plugin => plugin.overrides)
    .flat(1);

// plugins, without those that have been overridden
  return declaredPlugins
    .filter(plugin => !overriddenPlugins.includes(plugin));
}

/**
 * @private
 * @param {*} editor
 * @param {string|number|undefined} width
 * @param {string|number|undefined} height
 * @returns {void}
 */
function applyEditableElementStyles(editor, width, height) {
  const view = editor.editing.view;
  /** @type {Record<string, string|number|undefined>} */
  const styles = {
    'min-height': height,
    'min-width': width,
  };
  Object.keys(styles).forEach((key) => {
    const _assignment = styles[key];
    if (!_assignment) {
      return;
    }
    let assignment = _assignment;
    if (typeof _assignment === 'number' || !Number.isNaN(Number(_assignment))) {
      assignment = `${_assignment}px`;
    } else {
      assignment = _assignment;
    }
    view.change((writer) => {
      writer.setStyle(key, assignment, view.document.getRoot());
    });
  });
}

/**
 * see https://ckeditor.com/docs/ckeditor5/latest/features/word-count.html
 * @private
 * @param {HTMLElement} element
 * @param {ClassicEditor} editor
 * @param {Object} wordCount
 * @returns {void}
 */
function handleWordCountPlugin(element, editor, wordCount) {
  if (editor.plugins.has('WordCount') && (wordCount?.displayWords || wordCount?.displayCharacters)) {
    const wordCountPlugin = editor.plugins.get('WordCount');
    element.appendChild(wordCountPlugin.wordCountContainer);
  }
}


/**
 * see https://ckeditor.com/docs/ckeditor5/latest/features/read-only.html
 * @private
 * @param {*} editor
 * @param {boolean} readOnly
 * @returns {void}
 */
function applyReadOnly(editor, readOnly) {
  if (readOnly) {
    editor.enableReadOnlyMode('typo3-lock');
  }
}

/**
 * @param {HTMLElement} editorWrapper
 * @param {CKEditor5Config} options
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
export async function initCKEditor(editorWrapper, options, target) {
  const {
    // options handled by this wrapper
    importModules,
    removeImportModules,
    width,
    height,
    readOnly,
    debug,

    // options forwarded to CKEditor 5
    toolbar,
    placeholder,
    htmlSupport,
    wordCount,
    typo3link,
    removePlugins,
    ...otherOptions
  } = options;

  if ('extraPlugins' in otherOptions) {
    // Drop CKEditor 4 style extraPlugins which we do not support for CKEditor 5
    // as this string-based list of plugin names works only for bundled plugins.
    // `config.importModules` is used for CKEditor 5 instead
    delete otherOptions.extraPlugins;
  }
  if ('contentsCss' in otherOptions) {
    // Consumed in connectedCallback
    delete otherOptions.contentsCss;
  }

  /** @type {Object} */
  let fullscreenConfiguration = {};
  if ('fullscreen' in otherOptions) {
    fullscreenConfiguration = otherOptions.fullscreen;
    delete otherOptions.fullscreen;
  }
  // Set `.module-body` as the parent container to let users reach controls, e.g. the "Save" button
  fullscreenConfiguration.container = document.querySelector('.module-body');

  const plugins = await resolvePlugins(defaultPlugins, importModules, removeImportModules);

  /** @type {Object} */
  const config = {
    licenseKey: 'GPL',
    ...otherOptions,
    // link.defaultProtocol: 'https://'
    toolbar,
    plugins,
    placeholder,
    wordCount,
    typo3link: typo3link || null,
    removePlugins: removePlugins || [],
    fullscreen: fullscreenConfiguration,
  };

  if (htmlSupport !== undefined) {
    config.htmlSupport = convertPseudoRegExp(htmlSupport);
  }

  if (config?.typing?.transformations !== undefined) {
    // Implement variant of CKEditor's native buildQuotesRegExp() method.
    // This allows to convert a 'pattern' sub-object into the proper object.
    config.typing.transformations = convertPseudoRegExp(config.typing.transformations);
  }

  const editor = await ClassicEditor.create(target, config);

  applyEditableElementStyles(editor, width, height);
  handleWordCountPlugin(editorWrapper, editor, wordCount);
  applyReadOnly(editor, readOnly);

  editor.model.document.on('change:data', () => {
    editor.updateSourceElement();
    target.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));
  });

  if (editor.plugins.has('SourceEditing')) {
    const sourceEditingPlugin = editor.plugins.get('SourceEditing');
    sourceEditingPlugin.on('change:isSourceEditingMode', (eventInfo, eventName, isEnabled) => {
      for (const [rootName] of editor.editing.view.domRoots) {
        // Behold, CKEditor doesn't exposes events for the edit textarea that replaces the editor UI
        // therefore we have to register an `input` event handler ourselves.
        // The neat thing: if the user switches back to wysiwyg mode, the textarea is disposed,
        // we don't have to remove the event handler by ourselves.
        if (isEnabled) {
          const sourceEditingTextarea = editor.ui.getEditableElement(`sourceEditing:${rootName}`);
          if (sourceEditingTextarea instanceof HTMLTextAreaElement) {
            new DebounceEvent('input', () => {
              // Force editor model update on input, this will dispatch `change:data`
              sourceEditingPlugin.updateEditorData();
            }, 100).bindTo(sourceEditingTextarea);
          } else {
            throw new Error('Cannot find textarea related to source editing. Has CKEditor been upgraded?');
          }
        }
      }
    });
  }

  if (debug) {
    const {default: CKEditorInspector} = await import('@ckeditor/ckeditor5-inspector');
    CKEditorInspector.attach(editor, {isCollapsed: true});
  }
  return editor;
}

/**
 * @typedef {Record<string, unknown>|Array<unknown>|unknown} RecurseMapInput
 */

/**
 * @typedef {Object} PseudoRegExp
 * @property {string} pattern
 * @property {string} [flags]
 */

/**
 * @param {RecurseMapInput} data
 * @param {Function} proc
 * @returns {RecurseMapInput}
 */
function walkObj(data, proc) {
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map((element) => proc(element) ?? walkObj(element, proc));
    }
    /** @type {Record<string, unknown>} */
    const newData = {};
    for (const [key, value] of Object.entries(data)) {
      newData[key] = proc(value) ?? walkObj(value, proc);
    }
    return newData;
  }
  return data;
}

/**
 * @param {RecurseMapInput} data
 * @returns {RecurseMapInput}
 */
function convertPseudoRegExp(data) {
  return walkObj(data, (entry) => {
    if (typeof entry === 'object' && 'pattern' in entry && typeof entry.pattern === 'string') {
      const pseudoRegExp = entry;
      return new RegExp(pseudoRegExp.pattern, pseudoRegExp.flags || undefined);
    }
    return null;
  });
}

/**
 * @param {Array<string|PluginModuleDescriptor>} modules
 * @returns {Array<PluginModuleDescriptor>}
 */
function normalizeImportModules(modules) {
  return modules.map(moduleDescriptor => {
    if (typeof moduleDescriptor === 'string') {
      return {
        module: moduleDescriptor,
        exports: ['default'],
      };
    }
    return moduleDescriptor;
  });
}
