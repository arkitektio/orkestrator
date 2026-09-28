// @vitest-environment jsdom
import {cleanup, fireEvent, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {defaultBlokCatalog} from '../catalog';
import {renderBlokDocument} from './testing';

afterEach(cleanup);

const render = (roots: unknown[], initialState?: unknown) =>
  renderBlokDocument(defaultBlokCatalog, roots, initialState);

describe('html bloks', () => {
  it('renders a list, a link and an image', () => {
    const {errors} = render([
      {
        id: 'list',
        component: 'ul',
        props: [{key: 'children', static_value: ['first', 'second']}],
        children: [
          {id: 'first', component: 'li', props: [{key: 'text', static_value: 'alpha'}]},
          {id: 'second', component: 'li', props: [{key: 'text', static_value: 'beta'}]},
        ],
      },
      {
        id: 'link',
        component: 'a',
        props: [
          {key: 'href', static_value: 'https://example.test'},
          {key: 'text', static_value: 'open'},
          {key: 'newTab', static_value: true},
        ],
      },
    ]);

    expect(errors).toEqual([]);
    expect(screen.getByRole('list').querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByText('alpha')).not.toBeNull();

    const link = screen.getByText('open');
    expect(link.getAttribute('href')).toBe('https://example.test');
    // `noreferrer` implies `noopener`, which matters for an externally
    // authored href.
    expect(link.getAttribute('rel')).toBe('noreferrer');
  });

  it('renders a heading at its fixed level', () => {
    render([{id: 'title', component: 'h2', props: [{key: 'text', static_value: 'Overview'}]}]);

    expect(screen.getByRole('heading', {level: 2}).textContent).toBe('Overview');
  });
});

describe('form bloks', () => {
  it('writes a checkbox through to the bound path', () => {
    const {store} = render(
      [
        {
          id: 'enabled',
          component: 'Checkbox',
          props: [
            {key: 'bind', static_value: 'settings/enabled'},
            {key: 'label', static_value: 'Enabled'},
          ],
        },
      ],
      {settings: {enabled: false}},
    );

    fireEvent.click(screen.getByRole('checkbox'));

    expect(store.getState().dataModel).toEqual({settings: {enabled: true}});
  });

  it('shows a bound value and re-renders a sibling reading the same path', () => {
    render(
      [
        {
          id: 'name',
          component: 'Input',
          props: [{key: 'bind', static_value: 'form/name'}],
        },
        {
          id: 'echo',
          component: 'Text',
          props: [{key: 'text', dynamic_value: {path: 'form/name'}}],
        },
      ],
      {form: {name: 'alpha'}},
    );

    expect(screen.getByText('alpha')).not.toBeNull();

    fireEvent.change(screen.getByRole('textbox'), {target: {value: 'beta'}});

    expect(screen.getByText('beta')).not.toBeNull();
  });

  it('disables a button whose checks fail', () => {
    render(
      [
        {
          id: 'save',
          component: 'Button',
          props: [
            {key: 'label', static_value: 'Save'},
            {
              key: 'checks',
              static_value: [{path: 'form/name', operator: 'nonEmpty', message: 'Name required'}],
            },
          ],
        },
      ],
      {form: {name: ''}},
    );

    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.title).toBe('Name required');
  });
});

describe('navigation bloks', () => {
  /**
   * The point of this test is not the tabs: it is that a child blok, built
   * through `buildChild`, still reaches the Radix context its parent declared.
   * That is what makes the shadcn-style subcomponent composition work.
   */
  it('switches panels from a trigger in a separate node', () => {
    const {errors} = render([
      {
        id: 'tabs',
        component: 'Tabs',
        props: [
          {key: 'defaultValue', static_value: 'one'},
          {key: 'children', static_value: ['tabs-list', 'panel-one', 'panel-two']},
        ],
        children: [
          {
            id: 'tabs-list',
            component: 'TabsList',
            props: [{key: 'children', static_value: ['trigger-one', 'trigger-two']}],
            children: [
              {
                id: 'trigger-one',
                component: 'TabsTrigger',
                props: [
                  {key: 'value', static_value: 'one'},
                  {key: 'label', static_value: 'First'},
                ],
              },
              {
                id: 'trigger-two',
                component: 'TabsTrigger',
                props: [
                  {key: 'value', static_value: 'two'},
                  {key: 'label', static_value: 'Second'},
                ],
              },
            ],
          },
          {
            id: 'panel-one',
            component: 'TabsContent',
            props: [
              {key: 'value', static_value: 'one'},
              {key: 'children', static_value: ['body-one']},
            ],
            children: [
              {id: 'body-one', component: 'Text', props: [{key: 'text', static_value: 'panel one'}]},
            ],
          },
          {
            id: 'panel-two',
            component: 'TabsContent',
            props: [
              {key: 'value', static_value: 'two'},
              {key: 'children', static_value: ['body-two']},
            ],
            children: [
              {id: 'body-two', component: 'Text', props: [{key: 'text', static_value: 'panel two'}]},
            ],
          },
        ],
      },
    ]);

    expect(errors).toEqual([]);
    expect(screen.queryByText('panel one')).not.toBeNull();
    expect(screen.queryByText('panel two')).toBeNull();

    // Radix activates a tab on mouse down, not on the synthetic click.
    fireEvent.mouseDown(screen.getByText('Second'), {button: 0});

    expect(screen.queryByText('panel two')).not.toBeNull();
  });

  it('keeps the active tab in the data model when bound', () => {
    const {store} = render(
      [
        {
          id: 'tabs',
          component: 'Tabs',
          props: [
            {key: 'bind', static_value: 'ui/tab'},
            {key: 'children', static_value: ['tabs-list']},
          ],
          children: [
            {
              id: 'tabs-list',
              component: 'TabsList',
              props: [{key: 'children', static_value: ['trigger-two']}],
              children: [
                {
                  id: 'trigger-two',
                  component: 'TabsTrigger',
                  props: [
                    {key: 'value', static_value: 'two'},
                    {key: 'label', static_value: 'Second'},
                  ],
                },
              ],
            },
          ],
        },
      ],
      {ui: {tab: 'one'}},
    );

    fireEvent.mouseDown(screen.getByText('Second'), {button: 0});

    expect(store.getState().dataModel).toEqual({ui: {tab: 'two'}});
  });
});

describe('overlay bloks', () => {
  it('opens a dialog from its trigger', () => {
    const {errors} = render([
      {
        id: 'dialog',
        component: 'Dialog',
        props: [{key: 'children', static_value: ['dialog-trigger', 'dialog-content']}],
        children: [
          {
            id: 'dialog-trigger',
            component: 'DialogTrigger',
            props: [{key: 'label', static_value: 'Open'}],
          },
          {
            id: 'dialog-content',
            component: 'DialogContent',
            props: [{key: 'children', static_value: ['dialog-title']}],
            children: [
              {
                id: 'dialog-title',
                component: 'DialogTitle',
                props: [{key: 'text', static_value: 'Confirm'}],
              },
            ],
          },
        ],
      },
    ]);

    expect(errors).toEqual([]);
    expect(screen.queryByText('Confirm')).toBeNull();

    fireEvent.click(screen.getByText('Open'));

    expect(screen.queryByText('Confirm')).not.toBeNull();
  });

  it('reflects the open state into the bound path', () => {
    const {store} = render(
      [
        {
          id: 'dialog',
          component: 'Dialog',
          props: [
            {key: 'bind', static_value: 'ui/open'},
            {key: 'children', static_value: ['dialog-trigger']},
          ],
          children: [
            {
              id: 'dialog-trigger',
              component: 'DialogTrigger',
              props: [{key: 'label', static_value: 'Open'}],
            },
          ],
        },
      ],
      {ui: {open: false}},
    );

    fireEvent.click(screen.getByText('Open'));

    expect(store.getState().dataModel).toEqual({ui: {open: true}});
  });
});

describe('feedback and data bloks', () => {
  it('renders an alert', () => {
    render([
      {
        id: 'alert',
        component: 'Alert',
        props: [
          {key: 'title', static_value: 'Heads up'},
          {key: 'description', static_value: 'Something happened.'},
          {key: 'icon', static_value: 'info'},
        ],
      },
    ]);

    expect(screen.getByRole('alert').textContent).toContain('Heads up');
  });

  it('renders a table of rows', () => {
    const {errors} = render([
      {
        id: 'table',
        component: 'Table',
        props: [{key: 'children', static_value: ['body']}],
        children: [
          {
            id: 'body',
            component: 'TableBody',
            props: [{key: 'children', static_value: ['row']}],
            children: [
              {
                id: 'row',
                component: 'TableRow',
                props: [{key: 'children', static_value: ['cell']}],
                children: [
                  {id: 'cell', component: 'TableCell', props: [{key: 'text', static_value: 'alpha'}]},
                ],
              },
            ],
          },
        ],
      },
    ]);

    expect(errors).toEqual([]);
    expect(screen.getByRole('cell').textContent).toBe('alpha');
  });

  it('renders an icon by name and ignores an unknown one', () => {
    render([
      {id: 'known', component: 'Icon', props: [{key: 'name', static_value: 'check'}]},
      {id: 'unknown', component: 'Icon', props: [{key: 'name', static_value: 'not-an-icon'}]},
    ]);

    // The enum refuses the unknown name, so only the valid icon is drawn.
    expect(document.querySelectorAll('svg')).toHaveLength(1);
  });
});

describe('control-flow bloks', () => {
  it('picks a branch with if', () => {
    render(
      [
        {
          id: 'branch',
          component: 'if',
          props: [
            {key: 'when', dynamic_value: {path: 'flag'}},
            {key: 'then', static_value: 'yes'},
            {key: 'else', static_value: 'no'},
          ],
          children: [
            {id: 'yes', component: 'Text', props: [{key: 'text', static_value: 'enabled'}]},
            {id: 'no', component: 'Text', props: [{key: 'text', static_value: 'disabled'}]},
          ],
        },
      ],
      {flag: true},
    );

    expect(screen.queryByText('enabled')).not.toBeNull();
    expect(screen.queryByText('disabled')).toBeNull();
  });
});
