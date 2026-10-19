import type { CreateFunc, UploadFunc } from "@/core/datalayer/upload/drag";
import { LOK_MEDIA_ACCEPT, useLokUpload } from "@/lok/datalayer/useLokUpload";
import type React from "react";
import { useCallback, useState } from "react";
import { reportError } from "@/core/notify";

/**
 * An image upload into lok's media store, applied with `apply(key)` — a
 * profile avatar, an organization logo.
 *
 * Every failure — the wrong type, too large, the store refusing, lok refusing
 * the update — ends in a toast. `DragZone` only logs its errors, and a silent
 * failure that leaves the old picture looks exactly like success.
 *
 * Returns the pair `DragZone` takes, plus an `<input type="file">` handler and
 * its `accept` list, which offers only the types lok will take.
 */
export const useLokImageUpload = (apply: (key: string) => Promise<unknown>) => {
  const upload = useLokUpload();
  const [busy, setBusy] = useState(false);

  const uploadFile: UploadFunc = useCallback(
    async (file, options) => {
      setBusy(true);
      try {
        return await upload(file, options);
      } catch (error) {
        setBusy(false);
        reportError(error, "Couldn't upload the image");
        throw error;
      }
    },
    [upload],
  );

  const createFile: CreateFunc = useCallback(
    async (_file, key) => {
      try {
        await apply(key);
      } catch (error) {
        reportError(error, "Couldn't change the picture");
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [apply],
  );

  const onInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      // Reset first, so picking the same file again still fires `change`.
      input.value = "";
      if (!file) return;
      try {
        await createFile(file, await uploadFile(file, {}));
      } catch {
        // Already reported above.
      }
    },
    [uploadFile, createFile],
  );

  return { uploadFile, createFile, onInputChange, accept: LOK_MEDIA_ACCEPT, busy };
};
