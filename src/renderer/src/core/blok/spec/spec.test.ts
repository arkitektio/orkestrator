import {describe, expect, it} from 'vitest';
import corpus from './bsx_v2.json';
import {defaultBlokView} from './catalogs';
import {argFits, bindFits, bindKindsOf, diagnosticMessage, isExplicitId, loadVocabulary} from './vocabulary';

describe('the synced vocabulary', () => {
  it('is version 2, with the one reserved list', () => {
    const vocabulary = loadVocabulary();
    expect(vocabulary.vocab).toBe(2);
    expect(vocabulary.reserved.has('deps')).toBe(true);
    expect(vocabulary.reserved.has('mutations')).toBe(true);
    expect(vocabulary.functions.get('str.template')?.keys).toEqual(['template', 'values']);
    expect(vocabulary.functions.get('logic.choose')?.requiredKeys).toEqual(['cond', 'then']);
    expect(vocabulary.functions.get('ui.copy')?.effect).toBe(true);
    expect(vocabulary.kinds.action_logo.roots).toEqual(['task']);
  });

  it('has then, never now, and the query effects (revision 2)', () => {
    const vocabulary = loadVocabulary();
    expect(vocabulary.dataRoots).toHaveProperty('then');
    expect(vocabulary.dataRoots).not.toHaveProperty('now');
    expect(vocabulary.reserved.has('then')).toBe(true);
    expect(vocabulary.reserved.has('query')).toBe(true);
    expect(vocabulary.reserved.has('now')).toBe(false);
    expect(vocabulary.kinds.agent.roots).toContain('then');
    expect(vocabulary.kinds.action_logo.roots).not.toContain('then');
    expect(vocabulary.functions.get('query.refetch')).toMatchObject({effect: true, keys: ['query']});
    expect(vocabulary.functions.get('query.fetch_more')).toMatchObject({effect: true, keys: ['query', 'variables'], requiredKeys: ['query']});
    expect(vocabulary.functions.get('time.diff')?.keys).toEqual(['start', 'end']);
    expect(vocabulary.functions.has('fmt.duration')).toBe(true);
    for (const gone of ['time.since', 'time.until', 'fmt.relative_time']) expect(vocabulary.functions.has(gone)).toBe(false);
    expect(vocabulary.callKinds).not.toContain('query_refetch');
    expect(vocabulary.records.query.fields.map(field => field.key)).toContain('fetching_more');
    expect(Object.keys(vocabulary.theme.dataAttributes).sort()).toEqual(['busy', 'stale']);
    expect(vocabulary.catalogs).toEqual({ui: 1, scene: 1, logo: 1, structure: 1, html: 1});
    expect(vocabulary.baseVersion).toBe(2);
  });

  it('says what a bind writes and what an argument takes', () => {
    const {locals} = loadVocabulary();
    expect(locals.fields).toEqual(['persist']);
    expect(bindKindsOf('FLOAT')).toEqual(['FLOAT', 'INT', 'QUANTITY']);
    expect(bindKindsOf('ANY')).toBeNull();
    expect(bindFits('STRING', 'ENUM')).toBe(true);
    expect(bindFits('BOOL', 'INT')).toBe(false);
    expect(bindFits('ANY', 'MODEL')).toBe(true);
    expect(argFits({kind: 'INT'}, {kind: 'FLOAT'})).toBe(true);
    expect(argFits({kind: 'FLOAT'}, {kind: 'INT'})).toBe(false);
    // No action port is ANY; an ANY local is checked against nothing.
    expect(argFits({kind: 'STRING'}, {kind: 'INT'})).toBe(false);
    expect(argFits({kind: 'ANY'}, {kind: 'INT'})).toBe(true);
    expect(bindFits('BOOL', 'ANY')).toBe(true);
    expect(argFits({kind: 'STRUCTURE', identifier: '@mikro/image'}, {kind: 'STRUCTURE', identifier: '@mikro/roi'})).toBe(false);
    expect(argFits({kind: 'STRUCTURE', identifier: '@mikro/image'}, {kind: 'STRUCTURE', identifier: '@mikro/image'})).toBe(true);
  });

  it('fills diagnostic messages like str.format', () => {
    expect(diagnosticMessage('roots.reserved', {name: 'task'})).toBe("'task' is reserved: no local, let or into may use it.");
    expect(diagnosticMessage('local.bind', {what: 'x'})).toContain('{name}');
  });

  it('tells explicit ids from derived ones', () => {
    expect(isExplicitId('ot2-monitor')).toBe(true);
    expect(isExplicitId('Card[0]')).toBe(false);
    expect(isExplicitId('a/b')).toBe(false);
  });
});

describe('the catalog view', () => {
  it("gives the corpus's text table, component for component", () => {
    const view = defaultBlokView();
    const table = Object.fromEntries(
      [...view.components.values()].map(component => [
        component.name,
        {
          text_prop: component.textProp,
          context: component.context,
          children_context: component.childrenContext,
          inherits_context: component.inheritsContext,
          accepts_children: component.acceptsChildren,
          catalog: component.catalog,
        },
      ]),
    );
    expect(table).toEqual(corpus.text_table);
  });
});
