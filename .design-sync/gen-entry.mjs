import { writeFileSync, readFileSync } from 'node:fs';

const UI = 'src/renderer/src/core/components/ui';
const FIELDS = 'src/renderer/src/core/components/fields';
const LAYOUT = 'src/renderer/src/core/components/layout';

// cardName -> { file, default? }  (cardName MUST be a real export name on the global)
const map = {
  // ── primitives (54) ──
  Accordion: `${UI}/accordion.tsx`, Alert: `${UI}/alert.tsx`, AlertDialog: `${UI}/alert-dialog.tsx`,
  AspectRatio: `${UI}/aspect-ratio.tsx`, Avatar: `${UI}/avatar.tsx`, Badge: `${UI}/badge.tsx`,
  Breadcrumb: `${UI}/breadcrumb.tsx`, Button: `${UI}/button.tsx`, ButtonGroup: `${UI}/button-group.tsx`,
  Calendar: `${UI}/calendar.tsx`, Card: `${UI}/card.tsx`, Carousel: `${UI}/carousel.tsx`,
  Checkbox: `${UI}/checkbox.tsx`, Collapsible: `${UI}/collapsible.tsx`, Command: `${UI}/command.tsx`,
  ContextMenu: `${UI}/context-menu.tsx`, Dialog: `${UI}/dialog.tsx`, Drawer: `${UI}/drawer.tsx`,
  DropdownMenu: `${UI}/dropdown-menu.tsx`, Empty: `${UI}/empty.tsx`, Field: `${UI}/field.tsx`,
  Form: `${UI}/form.tsx`, HoverCard: `${UI}/hover-card.tsx`, Input: `${UI}/input.tsx`,
  InputGroup: `${UI}/input-group.tsx`, InputOTP: `${UI}/input-otp.tsx`, Item: `${UI}/item.tsx`,
  Kbd: `${UI}/kbd.tsx`, Label: `${UI}/label.tsx`, Menubar: `${UI}/menubar.tsx`,
  NavigationMenu: `${UI}/navigation-menu.tsx`, Pagination: `${UI}/pagination.tsx`, Popover: `${UI}/popover.tsx`,
  Progress: `${UI}/progress.tsx`, RadioGroup: `${UI}/radio-group.tsx`, ResizablePanelGroup: `${UI}/resizable.tsx`,
  ScrollArea: `${UI}/scroll-area.tsx`, Select: `${UI}/select.tsx`, Separator: `${UI}/separator.tsx`,
  Sheet: `${UI}/sheet.tsx`, Sidebar: `${UI}/sidebar.tsx`, Skeleton: `${UI}/skeleton.tsx`,
  Slider: `${UI}/slider.tsx`, Toaster: `${UI}/sonner.tsx`, Spinner: `${UI}/spinner.tsx`,
  StatusPulse: `${UI}/status.tsx`, Switch: `${UI}/switch.tsx`, Table: `${UI}/table.tsx`,
  Tabs: `${UI}/tabs.tsx`, Textarea: `${UI}/textarea.tsx`, Toggle: `${UI}/toggle.tsx`,
  ToggleGroup: `${UI}/toggle-group.tsx`, Tooltip: `${UI}/tooltip.tsx`, ChartContainer: `${UI}/chart.tsx`,
  // ── utilities (7) ──
  ProgressButton: { file: `${UI}/progress-button.tsx`, default: true },
  DownloadButton: `${UI}/download-button.tsx`, HoverBorderGradient: `${UI}/hover-button.tsx`,
  Keybutton: `${UI}/keybutton.tsx`, FancyInput: `${UI}/fancy-input.tsx`,
  CollapsibleSearch: `${UI}/collapsible-search.tsx`,
  // ── fields (11) ──
  StringField: `${FIELDS}/StringField.tsx`, IntField: `${FIELDS}/IntField.tsx`, FloatField: `${FIELDS}/FloatField.tsx`,
  SwitchField: `${FIELDS}/SwitchField.tsx`, ToggleField: `${FIELDS}/ToggleField.tsx`, SliderField: `${FIELDS}/SliderField.tsx`,
  ChoicesField: `${FIELDS}/ChoicesField.tsx`, ParagraphField: `${FIELDS}/ParagraphField.tsx`, DateField: `${FIELDS}/DateField.tsx`,
  DateTimeField: `${FIELDS}/DateTimeField.tsx`, TimeField: `${FIELDS}/TimeField.tsx`,
  // ── layout (4) ──
  Actionbar: `${LAYOUT}/Actionbar.tsx`, SidebarLayout: `${LAYOUT}/SidebarLayout.tsx`,
  ContainerGrid: `${LAYOUT}/ContainerGrid.tsx`, PageLayout: `${LAYOUT}/PageLayout.tsx`,
};

// Build the barrel entry: one `export *` per UNIQUE file (+ default re-exports).
const fileOf = (v) => (typeof v === 'string' ? v : v.file);
const uniqueFiles = [...new Set(Object.values(map).map(fileOf))];
const defaults = Object.entries(map).filter(([, v]) => typeof v === 'object' && v.default);

const lines = [];
lines.push('// AUTO-GENERATED synthetic barrel entry for design-sync. Do not edit by hand.');
for (const f of uniqueFiles) lines.push(`export * from ${JSON.stringify('@/' + f.replace('src/renderer/src/', ''))};`);
for (const [name, v] of defaults) lines.push(`export { default as ${name} } from ${JSON.stringify('@/' + v.file.replace('src/renderer/src/', ''))};`);
writeFileSync('.design-sync/entry.tsx', lines.join('\n') + '\n');

// componentSrcMap: cardName -> file path (relative to PKG_DIR = repo root)
const componentSrcMap = {};
for (const [name, v] of Object.entries(map)) componentSrcMap[name] = fileOf(v);

// merge into existing config.json
const cfg = JSON.parse(readFileSync('.design-sync/config.json', 'utf8'));
cfg.srcDir = 'src/renderer/src';
cfg.tsconfig = 'tsconfig.json';
cfg.entry = './.design-sync/entry.tsx';
cfg.cssEntry = '.design-sync/.cache/compiled.css';
cfg.componentSrcMap = componentSrcMap;
writeFileSync('.design-sync/config.json', JSON.stringify(cfg, null, 2) + '\n');

console.log(`entry: ${uniqueFiles.length} files, ${defaults.length} default re-export(s)`);
console.log(`componentSrcMap: ${Object.keys(componentSrcMap).length} components`);
