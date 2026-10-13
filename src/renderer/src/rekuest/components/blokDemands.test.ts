import {describe, expect, it} from 'vitest';
import {collectDemandedLatestTasks, collectDemandedStateInterfaces} from './blokDemands';

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

  it('does not take a file the agent brings for one of its states', () => {
    const roots = [
      {
        id: 'root',
        component: 'Model',
        props: [
          {key: 'src', dynamic_value: {path: 'self.assets.scope'}},
          {key: 'value', dynamic_value: {path: 'self.Stage.x'}},
        ],
      },
    ];

    expect(toObject(collectDemandedStateInterfaces(roots, new Set(['self'])))).toEqual({
      self: ['Stage'],
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

describe('collectDemandedLatestTasks', () => {
  const roots = [
    {
      id: 'root',
      component: 'Row',
      props: [],
      children: [
        {id: 'bar', component: 'Progress', props: [{key: 'value', dynamic_value: {path: 'self.blur.latest.progress'}}]},
        {
          id: 'badge',
          component: 'Badge',
          props: [
            {
              key: 'text',
              util_call: {operation: 'concat', arguments: [{key: '0', value_path: 'self/segment/latest/message'}]},
            },
          ],
        },
        {id: 'stage', component: 'Text', props: [{key: 'text', dynamic_value: {path: 'self.stage.position'}}]},
        {id: 'local', component: 'Text', props: [{key: 'text', dynamic_value: {path: 'form.blur.latest'}}]},
      ],
    },
  ];

  it('names every action whose latest task is read, in either path spelling', () => {
    expect(toObject(collectDemandedLatestTasks(roots, new Set(['self'])))).toEqual({self: ['blur', 'segment']});
  });

  it('leaves the name among the state interfaces: only the agent can tell which it is', () => {
    expect(toObject(collectDemandedStateInterfaces(roots, new Set(['self'])))).toEqual({
      self: ['blur', 'segment', 'stage'],
    });
  });
});
