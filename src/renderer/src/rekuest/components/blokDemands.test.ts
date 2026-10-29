import {describe, expect, it} from 'vitest';
import {collectDemandedLatestTasks, collectDemandedStateInterfaces} from './blokDemands';

const toObject = (demands: Map<string, Set<string>>) =>
  Object.fromEntries([...demands].map(([key, interfaces]) => [key, [...interfaces].sort()]));

describe('collectDemandedStateInterfaces', () => {
  it('reads the dependency key and state from deps.<key>.<state>', () => {
    const roots = [{id: 'root', component: 'Text', props: [{key: 'value', dynamic_value: {path: 'deps.stage.position.x'}}]}];
    expect(toObject(collectDemandedStateInterfaces(roots, new Set(['stage'])))).toEqual({stage: ['position']});
  });

  it('reads self as deps.self', () => {
    const roots = [{id: 'root', component: 'Text', props: [{key: 'value', dynamic_value: {path: 'self.gonio.angle'}}]}];
    expect(toObject(collectDemandedStateInterfaces(roots, new Set(['self'])))).toEqual({self: ['gonio']});
  });

  it('takes no agent segment for a state: tasks, assets, id, name', () => {
    const roots = [
      {
        id: 'root',
        component: 'Model',
        props: [
          {key: 'src', dynamic_value: {path: 'self.assets.scope'}},
          {key: 'value', dynamic_value: {path: 'self.Stage.x'}},
          {key: 'a', dynamic_value: {path: 'self.tasks.move.progress'}},
          {key: 'b', dynamic_value: {path: 'deps.robot.id'}},
          {key: 'c', dynamic_value: {path: 'deps.robot.name'}},
        ],
      },
    ];
    expect(toObject(collectDemandedStateInterfaces(roots, new Set(['self', 'robot'])))).toEqual({self: ['Stage']});
  });

  it('walks nested arguments, children, and the variables of declared reads', () => {
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
                    {key: 'x', util_call: {operation: 'math.add', arguments: [{key: 'a', value_path: 'deps.stage_dep.position.x'}, {key: 'b', value_literal: 1}]}},
                    {key: 'extra', value_list: [{value_path: 'self.settings.speed'}]},
                  ],
                },
              },
            ],
          },
        ],
      },
    ];
    const variables = [{key: 'slide', value_path: 'deps.scope.slide.id'}];
    expect(toObject(collectDemandedStateInterfaces(roots, new Set(['self', 'stage_dep', 'scope']), variables))).toEqual({
      self: ['settings'],
      stage_dep: ['position'],
      scope: ['slide'],
    });
  });

  it('ignores locals, whole agents and unbound keys', () => {
    const roots = [
      {
        id: 'root',
        component: 'Text',
        props: [
          {key: 'a', dynamic_value: {path: 'form.name'}},
          {key: 'b', dynamic_value: {path: 'self'}},
          {key: 'c', dynamic_value: {path: 'deps.other.state.x'}},
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
        {id: 'bar', component: 'Progress', props: [{key: 'value', dynamic_value: {path: 'self.tasks.blur.progress'}}]},
        {
          id: 'badge',
          component: 'Badge',
          props: [{key: 'text', util_call: {operation: 'str.upper', arguments: [{key: 'value', value_path: 'deps.robot.tasks.segment.message'}]}}],
        },
        {id: 'stage', component: 'Text', props: [{key: 'text', dynamic_value: {path: 'self.stage.position'}}]},
        {id: 'local', component: 'Text', props: [{key: 'text', dynamic_value: {path: 'move.tasks.blur'}}]},
      ],
    },
  ];

  it('names every action whose latest task is read: <agent>.tasks.<action>', () => {
    expect(toObject(collectDemandedLatestTasks(roots, new Set(['self', 'robot'])))).toEqual({self: ['blur'], robot: ['segment']});
  });

  it('keeps tasks apart from states: the segment says which it is', () => {
    expect(toObject(collectDemandedStateInterfaces(roots, new Set(['self', 'robot'])))).toEqual({self: ['stage']});
  });
});
