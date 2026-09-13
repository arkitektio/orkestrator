import { Alert, AlertTitle, AlertDescription, AlertAction, Button } from 'orkestrator';
import { Info, TriangleAlert } from 'lucide-react';

export function Default() {
  return (
    <Alert style={{ maxWidth: 420 }}>
      <Info />
      <AlertTitle>Changes saved</AlertTitle>
      <AlertDescription>Your edits have been saved and will sync to every device.</AlertDescription>
    </Alert>
  );
}

export function Destructive() {
  return (
    <Alert variant="destructive" style={{ maxWidth: 420 }}>
      <TriangleAlert />
      <AlertTitle>Connection lost</AlertTitle>
      <AlertDescription>We couldn't reach the server. Retrying in 5 seconds.</AlertDescription>
    </Alert>
  );
}

export function WithAction() {
  return (
    <Alert style={{ maxWidth: 420 }}>
      <Info />
      <AlertTitle>Update available</AlertTitle>
      <AlertDescription>A new version of Orkestrator is ready to install.</AlertDescription>
      <AlertAction><Button size="xs" variant="outline">Update</Button></AlertAction>
    </Alert>
  );
}
