import {describe, expect, it} from 'vitest';
import {collectDemandedStateInterfaces} from './blokDemands';

const toObject = (demands: Map<string, Set<string>>) =>
  Object.fromEntries([...demands].map(([key, interfaces]) => [key, [...interfaces].sort()]));

describe('collectDemandedStateInterfaces', () => {
  it('reads the dependency key and interface from a dynamic value path', () => {
    const roots = [
      {
        id: 'root',
        component: 'Text',
        props: [{key: 'value', dynamic_value: {path: '/self/stage/position/x'}}],
      },
    ];

    expect(toObject(collectDemandedStateInterfaces(roots, new Set(['self'])))).toEqual({
      self: ['stage'],
    });
  });

  it('accepts dotted paths', () => {
    const roots = [
      {id: 'root', component: 'Text', props: [{key: 'value', dynamic_value: {path: 'self.gonio.angle'}}]},
    ];

    expect(toObject(collectDemandedStateInterfaces(roots, new Set(['self'])))).toEqual({
      self: ['gonio'],
    });
  });

  it('walks nested action arguments and children', () => {
    const roots = [
      {
        id: 'root',
        component: 'Stack',
        props: [],
        children: [
          {
            id: 'button',
            component: 'Button',
            props: [
              {
                key: 'onClick',
                agent_call: {
                  dependency: 'self',
                  operation: 'move',
                  arguments: [
                    {
                      key: 'x',
                      util_call: {
                        operation: 'add',
                        arguments: [{value_path: 'stage_dep/position/x'}, {value_literal: 1}],
                      },
                    },
                    {key: 'extra', value_list: [{value_path: 'self/settings/speed'}]},
                  ],
                },
              },
            ],
          },
        ],
      },
    ];

    expect(
      toObject(collectDemandedStateInterfaces(roots, new Set(['self', 'stage_dep']))),
    ).toEqual({self: ['settings'], stage_dep: ['position']});
  });

  it('ignores local data-model paths and unbound keys', () => {
    const roots = [
      {
        id: 'root',
        component: 'Text',
        props: [
          {key: 'a', dynamic_value: {path: 'form/name'}},
          {key: 'b', dynamic_value: {path: 'self'}},
          {key: 'c', dynamic_value: {path: 'other/state/x'}},
        ],
      },
    ];

    expect(toObject(collectDemandedStateInterfaces(roots, new Set(['self'])))).toEqual({});
  });
});
