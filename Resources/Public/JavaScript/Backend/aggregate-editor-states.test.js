import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateEditorStates} from './aggregate-editor-states.js';

test('aggregates editor states from all iframes', () => {
  const firstIframe = {};
  const secondIframe = {};
  const editorStates = new Map([
    [firstIframe, {
      data: {tt_content: {1: {bodytext: 'Changed'}}},
      cmdArray: [{command: 'copy', table: 'tt_content', uid: 1}],
      invalidFields: {bodytext: ['Required']},
      count: 2,
      invalidCount: 1,
    }],
    [secondIframe, {
      data: {pages: {2: {title: 'Updated'}}},
      cmdArray: [{command: 'move', table: 'pages', uid: 2}],
      invalidFields: {title: ['Too short']},
      count: 3,
      invalidCount: 2,
    }],
  ]);

  assert.deepEqual(aggregateEditorStates(editorStates), {
    data: {
      tt_content: {1: {bodytext: 'Changed'}},
      pages: {2: {title: 'Updated'}},
    },
    cmdArray: [
      {command: 'copy', table: 'tt_content', uid: 1},
      {command: 'move', table: 'pages', uid: 2},
    ],
    invalidFields: {
      bodytext: ['Required'],
      title: ['Too short'],
    },
    count: 5,
    invalidCount: 3,
  });
});

test('uses the latest state for an iframe', () => {
  const iframe = {};
  const editorStates = new Map([
    [iframe, {
      data: {tt_content: {1: {bodytext: 'Old'}}},
      cmdArray: [{command: 'copy', table: 'tt_content', uid: 1}],
      invalidFields: {bodytext: ['Required']},
      count: 2,
      invalidCount: 1,
    }],
  ]);

  editorStates.set(iframe, {
    data: {},
    cmdArray: [],
    invalidFields: {},
    count: 0,
    invalidCount: 0,
  });

  assert.deepEqual(aggregateEditorStates(editorStates), {
    data: {},
    cmdArray: [],
    invalidFields: {},
    count: 0,
    invalidCount: 0,
  });
});

test('deep merges nested editor state data and invalid fields', () => {
  const firstIframe = {};
  const secondIframe = {};
  const editorStates = new Map([
    [firstIframe, {
      data: {
        tt_content: {
          1: {
            header: 'Original header',
            bodytext: 'Original body',
          },
        },
      },
      invalidFields: {
        tt_content: {
          1: {
            header: ['Required'],
          },
        },
      },
    }],
    [secondIframe, {
      data: {
        tt_content: {
          1: {
            bodytext: 'Updated body',
          },
        },
      },
      invalidFields: {
        tt_content: {
          1: {
            bodytext: ['Too short'],
          },
        },
      },
    }],
  ]);

  assert.deepEqual(aggregateEditorStates(editorStates), {
    data: {
      tt_content: {
        1: {
          header: 'Original header',
          bodytext: 'Updated body',
        },
      },
    },
    cmdArray: [],
    invalidFields: {
      tt_content: {
        1: {
          header: ['Required'],
          bodytext: ['Too short'],
        },
      },
    },
    count: 0,
    invalidCount: 0,
  });
});
