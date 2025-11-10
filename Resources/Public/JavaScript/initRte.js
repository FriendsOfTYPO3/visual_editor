import {ClassicEditor as Editor} from '@ckeditor/ckeditor5-editor-classic';
// import { InlineEditor as Editor } from '@ckeditor/ckeditor5-editor-inline'; // TODO : switch to inline editor, this needs to be added to TYPO3 Core? or we should add it to editara

// TYPO3 default plugins:
import {BlockQuote} from '@ckeditor/ckeditor5-block-quote';
import {Essentials} from '@ckeditor/ckeditor5-essentials';
import {FindAndReplace} from '@ckeditor/ckeditor5-find-and-replace';
import {Heading} from '@ckeditor/ckeditor5-heading';
import {Indent, IndentBlock} from '@ckeditor/ckeditor5-indent';
import {Link} from '@ckeditor/ckeditor5-link';
import {List} from '@ckeditor/ckeditor5-list';
import {Paragraph} from '@ckeditor/ckeditor5-paragraph';
import {PastePlainText} from '@ckeditor/ckeditor5-clipboard';
import {PasteFromOffice} from '@ckeditor/ckeditor5-paste-from-office';
import {RemoveFormat} from '@ckeditor/ckeditor5-remove-format';
import {Table, TableToolbar, TableProperties, TableCellProperties, TableCaption} from '@ckeditor/ckeditor5-table';
import {TextTransformation} from '@ckeditor/ckeditor5-typing';
import {SourceEditing} from '@ckeditor/ckeditor5-source-editing';
import {Alignment} from '@ckeditor/ckeditor5-alignment';
import {Style} from '@ckeditor/ckeditor5-style';
import {GeneralHtmlSupport} from '@ckeditor/ckeditor5-html-support';
import {Bold, Italic, Subscript, Superscript, Strikethrough, Underline} from '@ckeditor/ckeditor5-basic-styles';
import {SpecialCharacters, SpecialCharactersEssentials} from '@ckeditor/ckeditor5-special-characters';
import {HorizontalLine} from '@ckeditor/ckeditor5-horizontal-line';






const contentLanguage = document.documentElement.lang || 'en';
await import(`@typo3/ckeditor5/translations/${contentLanguage}.js`); // TODO fix loading as only some languages are available, handle de-AT etc., (en is already included by default)

console.log('Content language:', contentLanguage);

const configuration = {
  licenseKey: 'GPL',
  language: {
    ui: contentLanguage, // TODO : make dynamic based on user
    content: contentLanguage,
  },


  // TODO load config from TYPO3 (the configured config for this field, for editables we use the default config, or if given the configName attribute)
  plugins: [
    BlockQuote, Essentials, FindAndReplace, Heading, Indent, IndentBlock, Link, List, Paragraph,
    PastePlainText, PasteFromOffice, RemoveFormat,
    Table, TableToolbar, TableProperties, TableCellProperties, TableCaption,
    TextTransformation, SourceEditing, Alignment, Style,
    GeneralHtmlSupport,
    Bold, Italic, Subscript, Superscript, Strikethrough, Underline,
    SpecialCharacters, SpecialCharactersEssentials,
    HorizontalLine,
  ],
  toolbar: [
    'undo', 'redo', '|',
    'style', 'heading', '|',
    'bold', 'italic', 'subscript', 'superscript', '|',
    'bulletedList', 'numberedList', 'blockQuote', 'alignment', '|',
    'findAndReplace', 'link', '|',
    'removeFormat', 'undo', 'redo', '|',
    'insertTable', '|',
    'specialCharacters', 'horizontalLine', 'sourceEditing',
  ],
};

/**
 * @param element {HTMLElement}
 * @param options {Object}
 * @param onChangeCallback { (html: string) => void }
 */
export async function initRte(element, options, onChangeCallback) {

  const editor = await Editor.create(element, configuration);
  editor.model.document.on('change:data', () => onChangeCallback(editor.getData()));
  return editor;
}
