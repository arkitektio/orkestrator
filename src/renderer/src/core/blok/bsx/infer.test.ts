import {describe, expect, it} from 'vitest';
import {blokView, defaultBlokView, orkestratorModule, parseSpecCatalog} from '../spec/catalogs';
import {defaultType, portIsValid, resolveBlokScope, resolveLocal} from './infer';
import {parseBsx} from './parse';
import {printBsx} from './print';
import {checkBlokTree, emptyBlokScope, literalHint, type BlokCheckScope} from './references';

const codes = (source: string, scope: BlokCheckScope): string[] => checkBlokTree(parseBsx(source).tree, scope).map(found => found.code);

const moveTo: BlokCheckScope['dependencies'][number] = {
  key: 'self',
  action_dependencies: [
    {
      key: 'move_to',
      demand: {
        arg_matches: [
          {key: 'position', kind: 'INT'},
          {key: 'unit', kind: 'QUANTITY'},
          {key: 'speed', kind: 'FLOAT'},
        ],
      },
    },
  ],
};

describe('local kind inference', () => {
  it('reads a default: bool before int, int before float, lists and dicts of one scalar', () => {
    expect(defaultType(true)).toEqual({kind: 'BOOL'});
    expect(defaultType(3)).toEqual({kind: 'INT'});
    expect(defaultType(0.5)).toEqual({kind: 'FLOAT'});
    expect(defaultType('a')).toEqual({kind: 'STRING'});
    expect(defaultType([1, 2])).toEqual({kind: 'LIST', children: [{key: '...', kind: 'INT'}]});
    expect(defaultType({a: 'x'})).toEqual({kind: 'DICT', children: [{key: '...', kind: 'STRING'}]});
    for (const silent of [null, undefined, [], {}, [1, 'a'], [[1]]]) expect(defaultType(silent)).toBeNull();
  });

  it('follows the precedence default, then task argument, then bind', () => {
    const scope = (local: BlokCheckScope['locals'][number]): BlokCheckScope => ({...emptyBlokScope('agent'), dependencies: [moveTo], locals: [local]});
    const resolved = (source: string, local: BlokCheckScope['locals'][number]) =>
      resolveBlokScope(parseBsx(source).tree, scope(local), defaultBlokView()).locals[0];
    const both = '<Html><Card><Slider bind={p} /><Button onClick={self.move_to(position: p)} /></Card></Html>';
    expect(resolved(both, {key: 'p'}).kind).toBe('INT');
    expect(resolved(both, {key: 'p', default: 'x'}).kind).toBe('STRING');
    expect(resolved('<Html><Slider bind={p} /></Html>', {key: 'p'}).kind).toBe('FLOAT');
    expect(resolved('<Html><Text text={p} /></Html>', {key: 'p'}).kind).toBe('ANY');
  });

  it('infers only a kind left out: a given one, ANY included, is kept', () => {
    expect(resolveLocal({key: 'p', kind: 'ANY'}, [{kind: 'INT'}], ['FLOAT']).kind).toBe('ANY');
    expect(resolveLocal({key: 'p', kind: 'STRING', default: 1}, [], []).kind).toBe('STRING');
    expect(resolveLocal({key: 'p', kind: null}, [{kind: 'INT'}], []).kind).toBe('INT');
  });

  it('skips a candidate that makes no valid port', () => {
    expect(portIsValid({kind: 'QUANTITY'})).toBe(false);
    expect(portIsValid({kind: 'STRUCTURE', identifier: '@mikro/image'})).toBe(true);
    expect(resolveLocal({key: 'p'}, [{kind: 'QUANTITY'}, {kind: 'FLOAT'}], []).kind).toBe('FLOAT');
  });

  it('lets an ANY local skip the argument, bind and default checks', () => {
    const scope: BlokCheckScope = {...emptyBlokScope('agent'), dependencies: [moveTo], locals: [{key: 'p', kind: 'ANY', default: 'x'}]};
    expect(codes('<Html><Card><Switch bind={p} /><Button onClick={self.move_to(position: p)} /><Text text={p.a.b} /></Card></Html>', scope)).toEqual([]);
  });

  it('checks the remaining sites against the kind found', () => {
    const scope: BlokCheckScope = {...emptyBlokScope('agent'), dependencies: [moveTo], locals: [{key: 'p'}]};
    expect(codes('<Html><Card><Switch bind={p} /><Button onClick={self.move_to(position: p)} /></Card></Html>', scope)).toEqual(['local.bind_kind']);
  });

  it('never infers a dependency: a custom blok reading an undeclared one is refused', () => {
    const tree = parseBsx('<Html><Card><Text text={deps.zeta.x} /><Button onClick={deps.alpha.go()} /><Text text={deps.mid.y} /></Card></Html>').tree;
    const scope: BlokCheckScope = {...emptyBlokScope('custom'), dependencies: [{key: 'mid', state_dependencies: []}]};
    expect(resolveBlokScope(tree, scope, null).dependencies).toBe(scope.dependencies);
    const found = checkBlokTree(tree, scope, null);
    expect(found.map(finding => finding.code)).toEqual(['deps.unknown', 'deps.unknown', 'deps.unknown_state']);
    expect(found[0].message).toContain('Fix: dependencies=[AgentDependencyInput(key="zeta")].');
    expect(found[1].message).toContain('Fix: dependencies=[AgentDependencyInput(key="alpha")].');
  });
});

describe('new warnings', () => {
  it('warns a keyless foreach over objects, not over scalars', () => {
    const scope = emptyBlokScope('agent');
    expect(codes('<Html><foreach items={[{a: 1}]} let="x"><Text>{x.a}</Text></foreach></Html>', scope)).toEqual(['foreach.position_key']);
    expect(codes('<Html><foreach items={[1, 2]} let="x"><Text>{x}</Text></foreach></Html>', scope)).toEqual([]);
    expect(codes('<Html><foreach items={args.xs} let="x"><Text>{x}</Text></foreach></Html>', scope)).toEqual([]);
  });

  it('warns reading an unnamed return', () => {
    expect(codes('<Html><Text text={task.returns.return0} /></Html>', emptyBlokScope('task'))).toEqual(['returns.unnamed']);
    expect(codes('<Html><Text text={task.returns.image} /></Html>', emptyBlokScope('task'))).toEqual([]);
  });

  it('hints the literal a string meant', () => {
    expect(literalHint('fullWidth', 'TRUE', 'BOOL')).toBe('fullWidth={true}');
    expect(literalHint('fullWidth', 'yes', 'BOOL')).toBe('fullWidth={true}');
    expect(literalHint('max', '3.7', 'INT')).toBe('max={3}');
    expect(literalHint('max', 'many', 'INT')).toBe('max={0}');
    expect(literalHint('step', '2', 'FLOAT')).toBe('step={2}');
    expect(literalHint('step', '2.0', 'FLOAT')).toBe('step={2.0}');
    expect(literalHint('step', '0.5', 'FLOAT')).toBe('step={0.5}');
    // The spec's literal_hint writes a non-number as 0 (it is whole and has no '.').
    expect(literalHint('step', 'x', 'FLOAT')).toBe('step={0}');
  });
});

describe('shadowing', () => {
  it("leaves the Orkestrator's view without shadows", () => {
    expect([...defaultBlokView().shadows.keys()]).toEqual([]);
  });

  it("draws a module's definition over a standard one, never over base's", () => {
    const module = parseSpecCatalog(
      {
        name: 'mine',
        components: [
          {name: 'Slider', context: 'HTML', props: [{key: 'bind', kind: 'STRING'}]},
          {name: 'foreach', context: 'HTML', props: []},
        ],
      },
      'mine',
    );
    const view = blokView([orkestratorModule(), module]);
    expect(view.components.get('Slider')?.catalog).toBe('mine');
    expect(view.shadows.get('Slider')).toEqual({component: 'Slider', catalog: 'ui@1', module: 'mine', winner: 'mine'});
    expect(view.components.get('foreach')?.catalog).toMatch(/^base@/);
    expect(view.shadows.get('foreach')?.winner).toMatch(/^base@/);
    const found = checkBlokTree(parseBsx('<Html><Card><Slider bind={l} /><Slider bind={l} /></Card></Html>').tree, {...emptyBlokScope('agent'), locals: [{key: 'l', kind: 'STRING'}]}, view);
    expect(found.map(finding => finding.code)).toEqual(['catalog.shadow']);
  });
});

describe('??', () => {
  it('stores a chain as one logic.coalesce and prints it back', () => {
    const {tree} = parseBsx('<Text text={a ?? b ?? c} />');
    expect(tree.props?.[0].util_call).toEqual({
      operation: 'logic.coalesce',
      arguments: [{key: 'values', value_list: [{value_path: 'a'}, {value_path: 'b'}, {value_path: 'c'}]}],
    });
    expect(printBsx(tree)).toBe('<Text>{a ?? b ?? c}</Text>');
  });

  it('binds looser than || and tighter than a ternary', () => {
    expect(printBsx(parseBsx('<Text text={(a || b) ?? c} />').tree)).toBe('<Text>{a || b ?? c}</Text>');
    expect(printBsx(parseBsx('<Text text={a || (b ?? c)} />').tree)).toBe('<Text>{a || (b ?? c)}</Text>');
    expect(printBsx(parseBsx('<Text text={(a ?? b) ? x : y} />').tree)).toBe('<Text>{a ?? b ? x : y}</Text>');
    expect(printBsx(parseBsx('<Text text={(a ?? b) ?? c} />').tree)).toBe('<Text>{(a ?? b) ?? c}</Text>');
  });
});
