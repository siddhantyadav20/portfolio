import { PREVIEW_SCALE } from "@/content/canvas";
import Face from "../widgets/FoundCard/Face";

/**
 * Found's phone in the homepage's canvas preview: the same face as the live
 * widget, still, with its wallpaper asked for at the size it is actually
 * painted (a 320px phone is about 42 CSS pixels at the preview's scale).
 */
export default function FoundStill() {
  return <Face sizes={`${Math.max(1, Math.round(320 * PREVIEW_SCALE))}px`} />;
}
