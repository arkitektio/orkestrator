/** What the install and deploy dialogs share. */

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex min-w-0 flex-col gap-1.5">
    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h4>
    {children}
  </section>
);

/**
 * No deployer offers `install(approval)`: there is nothing to authorize and
 * nowhere to deploy to, and setting one up is not the user's to do.
 */
export const NoPluginEngine = () => (
  <p className="text-sm text-muted-foreground">
    No plugin engine is installed. Ask your admin to install a plugin engine.
  </p>
);
