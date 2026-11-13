import { describe, expect, it } from "vitest";

import { splitName } from "./name";

describe("splitName", () => {
  it("leaves a short name whole", () => {
    expect(splitName("image.tiff")).toEqual({ head: "image.tiff", tail: "" });
    expect(splitName("sixteen_chars_ok.png")).toEqual({ head: "sixteen_chars_ok.png", tail: "" });
  });

  it("keeps the end of the stem and the extension", () => {
    expect(splitName("2026-10-03_exp12_mouse4_slice2_deconvolved_v3.tiff")).toEqual({
      head: "2026-10-03_exp12_mouse4_slice2_deconv",
      tail: "olved_v3.tiff",
    });
  });

  it("keeps a double extension whole", () => {
    expect(splitName("exp12_mouse4_slice2_ch488_z-stack.ome.tiff").tail).toBe("_z-stack.ome.tiff");
    expect(splitName("backup_of_everything_2026.tar.gz").tail).toBe("ing_2026.tar.gz");
  });

  it("cuts a name without an extension", () => {
    expect(splitName("a_very_long_folder_name_without_any_suffix")).toEqual({
      head: "a_very_long_folder_name_without_an",
      tail: "y_suffix",
    });
  });

  it("does not take a long or spaced suffix for an extension", () => {
    expect(splitName("Report on the 3. Quarter of the year").tail).toBe("the year");
    expect(splitName("measurement_series.finalversion").tail).toBe("lversion");
  });

  it("treats a dotfile as all name", () => {
    expect(splitName(".gitignore")).toEqual({ head: ".gitignore", tail: "" });
  });

  it("keeps a space at the cut on its side", () => {
    const { head, tail } = splitName("my holiday pictures from 2026 final.zip", 6);
    expect(head + tail).toBe("my holiday pictures from 2026 final.zip");
    expect(tail).toBe(" final.zip");
  });

  it("never cuts a surrogate pair", () => {
    const name = "🔬".repeat(20) + ".png";
    const { head, tail } = splitName(name, 4);
    expect(head).toBe("🔬".repeat(16));
    expect(tail).toBe("🔬".repeat(4) + ".png");
  });

  it("honours keep", () => {
    expect(splitName("abcdefghijklmnopqrstuvwxyz.txt", 3).tail).toBe("xyz.txt");
    expect(splitName("abcdefghijklmnopqrstuvwxyz.txt", 0)).toEqual({
      head: "abcdefghijklmnopqrstuvwxyz.txt",
      tail: "",
    });
  });
});
