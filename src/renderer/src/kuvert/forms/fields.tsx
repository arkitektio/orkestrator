import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/core/ui/form";
import { Input } from "@/core/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { useFormContext } from "react-hook-form";
import { Security } from "../api/graphql";

/** A password: masked, never autofilled into by the browser's own store. */
export const PasswordField = ({ name, label, description }: { name: string; label: string; description?: string }) => {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ""} type="password" autoComplete="new-password" />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

/** One of a few fixed values. */
export const SelectField = ({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) => {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

/** A plain text or number input, without the placeholder StringField insists on. */
export const TextField = ({
  name,
  label,
  placeholder,
  type = "text",
  description,
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "email";
  description?: string;
}) => {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              type={type}
              placeholder={placeholder}
              onChange={(e) => field.onChange(type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export const SECURITY_OPTIONS = [
  { value: Security.Tls, label: "TLS" },
  { value: Security.Starttls, label: "STARTTLS" },
  { value: Security.None, label: "None" },
];

/** Host, port and security of one server, side by side. */
export const ServerFields = ({ prefix, label }: { prefix: string; label: string }) => (
  <div className="grid grid-cols-[1fr_6rem_8rem] gap-2">
    <TextField name={`${prefix}.host`} label={`${label} server`} placeholder="imap.example.org" />
    <TextField name={`${prefix}.port`} label="Port" type="number" />
    <SelectField name={`${prefix}.security`} label="Security" options={SECURITY_OPTIONS} />
  </div>
);

export type ServerValues = { host: string; port: number | null; security: Security };

/** A server as the API takes it, or null when its host is left empty. */
export const serverInput = (s: ServerValues) =>
  s.host.trim() && s.port ? { host: s.host.trim(), port: s.port, security: s.security } : null;
