import {describe, expect, it} from 'vitest';
import {declaredLocals, demoModel, parseBlokDeclarations} from './declarations';

describe('parseBlokDeclarations', () => {
  it('reads the declarations a service serves as JSON', () => {
    const declarations = parseBlokDeclarations({
      vocab: 2,
      locals: [
        {key: 'iterations', kind: 'INT', default: 3, persist: true},
        {key: 'mode', kind: 'ENUM', choices: [{value: 'fast', label: 'Fast'}], default: 'fast'},
        {key: 'form', kind: 'DICT', children: [{key: 'name', kind: 'STRING'}]},
        {key: 'kindless'},
      ],
      demo: {args: {scene: 1}, queries: {stats: {mean: 2}}},
      queries: [{key: 'stats', service: 'mikro', document: 'query Stats { stats }', variables: {table_id: 1}, poll: 5, more: 'stats.rows'}],
    });
    const port = {identifier: null, nullable: false, default: null, children: null, choices: null, label: null, description: null};
    // A local is a port plus persist; one left without a kind (and no tree to tell) is ANY.
    expect(declaredLocals(declarations)).toEqual([
      {...port, key: 'iterations', kind: 'INT', default: 3, persist: true},
      {...port, key: 'mode', kind: 'ENUM', default: 'fast', choices: [{value: 'fast', label: 'Fast', description: null}], persist: false},
      {...port, key: 'form', kind: 'DICT', children: [{...port, key: 'name', kind: 'STRING'}], persist: false},
      {...port, key: 'kindless', kind: 'ANY', persist: false},
    ]);
    expect(declarations.queries).toEqual([
      {key: 'stats', service: 'mikro', document: 'query Stats { stats }', variables: {table_id: 1}, poll: 5, more: 'stats.rows', keep: null, history: null},
    ]);
    expect(declarations.subscriptions).toEqual([]);
  });

  it('drops malformed entries and non-list values', () => {
    const declarations = parseBlokDeclarations({locals: [{default: 1}, 'x', null], queries: {key: 'q'}, subscriptions: [{key: 's', service: 'mikro'}]});
    expect(declarations.resolvedLocals).toEqual([]);
    expect(declarations.queries).toEqual([]);
    expect(declarations.subscriptions).toEqual([]);
  });

  it('resolves locals served as written against the tree, as the server does', () => {
    const declarations = parseBlokDeclarations({
      componentTree: [
        {
          id: 'Card[0]',
          component: 'Card',
          children: [
            {id: 'Card[0]/Switch[0]', component: 'Switch', props: [{key: 'bind', dynamic_value: {path: 'on'}}]},
            {id: 'Card[0]/Text[0]', component: 'Text', props: [{key: 'text', dynamic_value: {path: 'note'}}]},
          ],
        },
      ],
      locals: [{key: 'on'}, {key: 'count', default: 2}, {key: 'note'}, {key: 'given', kind: 'STRING', default: 1}],
    });
    expect(declarations.resolvedLocals.map(local => [local.key, local.kind])).toEqual([
      ['on', 'BOOL'],
      ['count', 'INT'],
      ['note', 'ANY'],
      ['given', 'STRING'],
    ]);
  });

  it('gives a preview its locals at their defaults and its reads answered by the demo', () => {
    const model = demoModel(
      [],
      parseBlokDeclarations({
        locals: [{key: 'iterations', kind: 'INT', default: 3}],
        demo: {queries: {stats: {mean: 2}}},
        queries: [{key: 'stats', service: 'mikro', document: 'query Stats { stats }'}],
      }),
    );
    expect(model.iterations).toBe(3);
    expect(model.queries).toEqual({stats: {status: 'ready', value: {mean: 2}, error: null, refetching: false, fetching_more: false}});
  });
});
