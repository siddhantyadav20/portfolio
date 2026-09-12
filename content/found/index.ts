/**
 * Found, as the rest of the site refers to it: the route, its name, and the
 * lines the palette, the page's metadata, the share card and the canvas's
 * phone use.
 *
 * Deliberately doesn't import the episode. The palette and the homepage's
 * canvas preview read this file, and the script is 20KB that nothing outside
 * `components/found` should carry. `tests/found.test.ts` checks the title here
 * matches the episode's.
 */
export const found = {
  href: "/found",
  title: "Low Battery",
  cta: "Play Low Battery",
  hint: "Someone is missing. You have their phone.",
  description:
    "Someone is missing, and their phone has arrived in your post. A mystery in one sitting, played on the phone itself.",
  /** The missing person's lock screen: the game's, and the canvas phone's. */
  wallpaper: "/found/wallpaper.jpg",
} as const;

/**
 * What keeps landing on the phone's lock screen. The first three are the
 * episode's own lock-screen notifications (episode1.ts reads them from here);
 * the canvas phone cycles through all of them, one per buzz. None of them
 * names the missing person, so none needs a cast.
 */
export const teaser: readonly { readonly from: string; readonly text: string }[] = [
  { from: "Mum", text: "14 missed calls" },
  { from: "Tara", text: "i'm scared. please" },
  { from: "Dev", text: "your mum called me. where are you" },
  { from: "Mum", text: "Beta please. Just one message." },
  { from: "Tara", text: "text me when you're home" },
  { from: "Mum", text: "I keep calling so I can hear your voicemail." },
];
