/**
 * The name the colophon card and its reader trade, so one becomes the other.
 *
 * Its own module, and not a re-export from `./index`, for the reason
 * `ModalSurface` records about `EXIT_MS`: the card needs this constant at
 * render time and the reader is loaded on demand, so importing the name out of
 * the reader would pull the whole reader — four drawings, a `LogoMark` and a
 * stylesheet — straight back into the homepage's first load, quietly undoing
 * the split.
 */
export const MAKING_MORPH = "making-plate";
