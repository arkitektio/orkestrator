import {describe, expect, it} from 'vitest';
import {normalizeBlokCall, normalizeBlokComponentTree} from './normalize';
import {BlokSchemas} from './schemas';

describe('normalizeBlokComponentTree', () => {
  it('translates the GraphQL camelCase tree into the runtime snake_case shape', () => {
    const {roots, truncatedIds} = normalizeBlokComponentTree([
      {
        __typename: 'ComponentNode',
        id: 'root',
        component: 'Card',
        props: [
          {__typename: 'ComponentProp', key: 'title', staticValue: 'Hello', dynamicValue: null},
          {
            __typename: 'ComponentProp',
            key: 'subtitle',
            dynamicValue: {__typename: 'DynamicValue', path: 'user/name', literal: null},
          },
          {
            __typename: 'ComponentProp',
            key: 'onClick',
            agentCall: {
              __typename: 'AgentCall',
              dependency: 'camera',
              operation: 'snap',
              arguments: [
                {__typename: 'ActionArgument', key: 'exposure', valuePath: 'settings/exposure'},
                {
                  __typename: 'ActionArgument',
                  key: 'label',
                  utilCall: {
                    __typename: 'UtilCall',
                    operation: 'concat',
                    arguments: [{__typename: 'ActionArgument', valueLiteral: 'a'}],
                  },
                },
              ],
            },
          },
        ],
        children: [
          {__typename: 'ComponentNode', id: 'leaf', component: 'Text', props: [], children: []},
        ],
      },
    ]);

    expect(truncatedIds).toEqual([]);
    expect(roots).toEqual([
      {
        id: 'root',
        component: 'Card',
        props: [
          {key: 'title', static_value: 'Hello', dynamic_value: null},
          {key: 'subtitle', dynamic_value: {path: 'user/name', literal: null}},
          {
            key: 'onClick',
            agent_call: {
              dependency: 'camera',
              operation: 'snap',
              arguments: [
                {key: 'exposure', value_path: 'settings/exposure'},
                {
                  key: 'label',
                  util_call: {operation: 'concat', arguments: [{value_literal: 'a'}]},
                },
              ],
            },
          },
        ],
        children: [{id: 'leaf', component: 'Text', props: [], children: []}],
      },
    ]);

    roots.forEach(root => {
      expect(BlokSchemas.ComponentNode.safeParse(root).success).toBe(true);
    });
  });

  it('drops depth-truncated stubs and reports their ids', () => {
    const {roots, truncatedIds} = normalizeBlokComponentTree([
      {
        id: 'root',
        component: 'Stack',
        children: [
          {id: 'kept', component: 'Text', children: [{id: 'too-deep'}, {id: 'also-too-deep'}]},
        ],
      },
    ]);

    expect(truncatedIds).toEqual(['too-deep', 'also-too-deep']);
    expect(roots).toEqual([
      {id: 'root', component: 'Stack', children: [{id: 'kept', component: 'Text', children: []}]},
    ]);
  });

  it('accepts an already snake_case payload unchanged', () => {
    const payload = [
      {
        id: 'root',
        component: 'Text',
        props: [{key: 'text', util_call: {operation: 'upper', arguments: [{value_path: 'x'}]}}],
      },
    ];
    expect(normalizeBlokComponentTree(payload).roots).toEqual(payload);
  });
});

describe('normalizeBlokCall', () => {
  it('maps nested argument spellings and strips __typename', () => {
    expect(
      normalizeBlokCall({
        __typename: 'UtilCall',
        operation: 'and',
        arguments: [
          {
            __typename: 'ActionArgument',
            valueList: [{__typename: 'ActionArgument', valueLiteral: true}],
            valueDict: [{__typename: 'ActionArgument', key: 'k', valuePath: 'p'}],
          },
        ],
      }),
    ).toEqual({
      operation: 'and',
      arguments: [{value_list: [{value_literal: true}], value_dict: [{key: 'k', value_path: 'p'}]}],
    });
  });
});
