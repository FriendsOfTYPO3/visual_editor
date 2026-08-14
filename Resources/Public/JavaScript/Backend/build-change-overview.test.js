import test from 'node:test';
import assert from 'node:assert/strict';
import {buildChangeOverview} from './build-change-overview.js';

const languages = [
  {id: 0, title: 'English', order: 0},
  {id: 1, title: 'German', order: 1},
];

function fieldMetadata(uid, order, validationErrors = []) {
  return {
    tt_content: {
      [uid]: {
        header: {
          recordKey: 'tt_content:7',
          recordLabel: 'Text',
          fieldLabel: 'Header',
          fieldPositionId: 'tt_content:7:header',
          kind: 'text',
          order,
          validationErrors,
        },
        hidden: {
          recordKey: 'tt_content:7',
          recordLabel: 'Text',
          fieldLabel: 'Visibility',
          fieldPositionId: 'tt_content:7:hidden',
          hidden: true,
          order,
        },
      },
    },
  };
}

test('groups linked language fields and counts only changed language variants', () => {
  const states = new Map([
    [0, {
      data: {tt_content: {17: {header: 'Changed', hidden: false}}},
      initialData: {tt_content: {17: {header: 'Before', hidden: true}}},
      invalidFields: {tt_content: {17: {header: true}}},
      fieldMetadata: fieldMetadata(17, 4, ['Required']),
    }],
    [1, {
      data: {},
      initialData: {tt_content: {27: {header: 'Vorher', hidden: true}}},
      invalidFields: {},
      fieldMetadata: fieldMetadata(27, 4),
    }],
  ]);

  const overview = buildChangeOverview(states, languages);

  assert.equal(overview.count, 2);
  assert.equal(overview.records.length, 1);
  assert.deepEqual(overview.records[0], {
    key: 'tt_content:7',
    table: 'tt_content',
    uid: 7,
    label: 'Text',
    order: 4,
    fields: [
      {
        key: 'tt_content:7:header',
        label: 'Header',
        kind: 'text',
        order: 4,
        languages: [
          {
            languageId: 0,
            languageTitle: 'English',
            languageOrder: 0,
            uid: 17,
            before: 'Before',
            current: 'Changed',
            changed: true,
            invalid: true,
            validationErrors: ['Required'],
            fieldPositionId: 'tt_content:7:header',
            scrollPositionId: 'tt_content:7',
          },
          {
            languageId: 1,
            languageTitle: 'German',
            languageOrder: 1,
            uid: 27,
            before: 'Vorher',
            current: 'Vorher',
            changed: false,
            invalid: false,
            validationErrors: [],
            fieldPositionId: 'tt_content:7:header',
            scrollPositionId: 'tt_content:7',
          },
        ],
      },
      {
        key: 'tt_content:7:hidden',
        label: 'Visibility',
        kind: 'visibility',
        order: 4,
        languages: [
          {
            languageId: 0,
            languageTitle: 'English',
            languageOrder: 0,
            uid: 17,
            before: true,
            current: false,
            changed: true,
            invalid: false,
            validationErrors: [],
            fieldPositionId: 'tt_content:7:hidden',
            scrollPositionId: 'tt_content:7',
          },
          {
            languageId: 1,
            languageTitle: 'German',
            languageOrder: 1,
            uid: 27,
            before: true,
            current: true,
            changed: false,
            invalid: false,
            validationErrors: [],
            fieldPositionId: 'tt_content:7:hidden',
            scrollPositionId: 'tt_content:7',
          },
        ],
      },
    ],
    actions: [],
  });
});

test('keeps every move but lets delete replace all other record changes', () => {
  const states = new Map([[0, {
    data: {tt_content: {18: {header: 'Changed'}, 19: {header: 'Also changed'}}},
    initialData: {tt_content: {18: {header: 'Before'}, 19: {header: 'Before'}}},
    fieldMetadata: {
      tt_content: {
        18: {header: {recordKey: 'tt_content:8', fieldLabel: 'Header', order: 8}},
        19: {header: {recordKey: 'tt_content:9', fieldLabel: 'Header', order: 3}},
      },
    },
    cmdArray: [
      {tt_content: {18: {move: {target: -1}}}},
      {tt_content: {18: {move: {target: -2}}}},
      {tt_content: {18: {delete: 1}}},
      {tt_content: {19: {move: {target: -3}}}},
      {tt_content: {19: {move: {target: -4}}}},
    ],
    cmdMetadata: [
      {recordKey: 'tt_content:8', sourceLabel: 'Main', targetLabel: 'after A', order: 8},
      {recordKey: 'tt_content:8', sourceLabel: 'after A', targetLabel: 'after B', order: 8},
      {recordKey: 'tt_content:8', recordLabel: 'Deleted text', scrollPositionId: 'tt_content:8', order: 8},
      {recordKey: 'tt_content:9', sourceLabel: 'Main', targetLabel: 'after C', order: 11},
      {recordKey: 'tt_content:9', sourceLabel: 'after C', targetLabel: 'after D', order: 6},
    ],
  }]]);

  const overview = buildChangeOverview(states, languages);

  assert.equal(overview.count, 4);
  assert.deepEqual(overview.records.map(record => record.key), ['tt_content:9', 'tt_content:8']);
  assert.equal(overview.records[0].fields.length, 1);
  assert.equal(overview.records[0].order, 6);
  assert.deepEqual(overview.records[0].actions.map(({action, from, to}) => ({action, from, to})), [
    {action: 'move', from: 'Main', to: 'after C'},
    {action: 'move', from: 'after C', to: 'after D'},
  ]);
  assert.deepEqual(overview.records[1].fields, []);
  assert.equal(overview.records[1].label, 'Deleted text');
  assert.equal(overview.records[1].order, 8);
  assert.deepEqual(overview.records[1].actions.map(({action}) => action), ['delete']);
});

test('preserves empty and rich-text values without treating them as missing', () => {
  const overview = buildChangeOverview(new Map([[0, {
    data: {tt_content: {17: {header: '', bodytext: '<p><strong>After</strong></p>'}}},
    initialData: {tt_content: {17: {header: 'Before', bodytext: '<p>Before</p>'}}},
    fieldMetadata: {
      tt_content: {
        17: {
          header: {recordKey: 'tt_content:7', fieldPositionId: 'tt_content:7:header', kind: 'text'},
          bodytext: {recordKey: 'tt_content:7', fieldPositionId: 'tt_content:7:bodytext', kind: 'richText'},
        },
      },
    },
  }]]), languages);

  assert.equal(overview.count, 2);
  assert.deepEqual(overview.records[0].fields.map(({kind, languages: fieldLanguages}) => ({
    kind,
    before: fieldLanguages[0].before,
    current: fieldLanguages[0].current,
  })), [
    {kind: 'text', before: 'Before', current: ''},
    {kind: 'richText', before: '<p>Before</p>', current: '<p><strong>After</strong></p>'},
  ]);
});
