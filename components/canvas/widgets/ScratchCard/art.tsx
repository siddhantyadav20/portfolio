/* Extracted verbatim from references/canvas/Chess.tsx.

   The coin is a pure drawing — no state, no props, nothing to adapt — so it
   is copied rather than redrawn. (The wizard that came with it went when the
   card stopped hiding a chess game; see index.tsx.) */

export function Coin() {
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
                <circle
                    cx="23"
                    cy="23"
                    r="20"
                    fill="#d9d9d9"
                    stroke="#111"
                    strokeWidth="2.5"
                />
                <circle
                    cx="23"
                    cy="23"
                    r="15"
                    fill="none"
                    stroke="#111"
                    strokeWidth="1.5"
                    strokeDasharray="2 3"
                    opacity="0.5"
                />
                <path
                    d="M23 13 l2.6 6.3 6.8.5 -5.2 4.4 1.7 6.6 -5.9-3.6 -5.9 3.6 1.7-6.6 -5.2-4.4 6.8-.5 Z"
                    fill="#111"
                    opacity="0.85"
                />
            </svg>
  );
}
