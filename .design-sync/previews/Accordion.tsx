import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from 'orkestrator';

export function Faq() {
  return (
    <Accordion type="single" collapsible defaultValue="item-1" style={{ width: 360 }}>
      <AccordionItem value="item-1">
        <AccordionTrigger>What is a deployment?</AccordionTrigger>
        <AccordionContent>
          A deployment is a running instance of your project that serves live traffic. Each
          deployment is immutable and can be rolled back at any time.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>How do I roll back a release?</AccordionTrigger>
        <AccordionContent>
          Open the deployment history panel, select a previous build, and click "Promote to
          production". The rollback completes within seconds.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Are environment variables encrypted?</AccordionTrigger>
        <AccordionContent>
          Yes — all environment variables are encrypted at rest using AES-256 and are never
          exposed in build logs.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function Settings() {
  return (
    <Accordion type="single" collapsible defaultValue="notifications" style={{ width: 360 }}>
      <AccordionItem value="notifications">
        <AccordionTrigger>Notifications</AccordionTrigger>
        <AccordionContent>
          Configure which events trigger email or push notifications. You can set per-project
          overrides or apply global defaults from your account settings.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="privacy">
        <AccordionTrigger>Privacy &amp; data</AccordionTrigger>
        <AccordionContent>
          Control what telemetry is collected and how long logs are retained. Data is stored
          in your chosen region and never shared with third parties.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
