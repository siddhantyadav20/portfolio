import type { Brief, Frame } from "@/content/canvas";
import { SHEET } from "@/components/canvas/ink/useInk";

/* ===========================================================================
   The frame under the sketch.

   "The live cricket score, during a meeting" on a blank square has nothing to
   hold on to — where does it go, how big is it, what is around it? Each brief
   names the thing it is designed for, and the Studio draws that thing's
   outline, faint, under the paper: the menu bar of a laptop, a station sign,
   a phone. The constraint becomes something you can see.

   Drawn with Canvas2D in sheet units (1000 square) rather than as SVG, so the
   same painter draws the on-screen underlay and the one baked into the PNG
   that is sent — the sketch arrives with its context.
   =========================================================================== */

export const FRAME_LABEL: Record<Frame, string> = {
  phone: "Phone",
  tablet: "Tablet, propped up",
  laptop: "Laptop menu bar",
  sign: "Station sign",
  car: "Car dashboard",
  watch: "Watch",
};

/** The tape's second line, in the Studio and on the leaf flying to it. */
export function tapeMeta(brief: Brief): string {
  return `${brief.constraint} · ${FRAME_LABEL[brief.frame]}`;
}

export function paintFrame(ctx: CanvasRenderingContext2D, frame: Frame, ink: string) {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const box = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };
  const dot = (x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  switch (frame) {
    case "phone": {
      box(290, 60, 420, 880, 70);
      ctx.stroke();
      box(440, 88, 120, 28, 14); // the island
      ctx.fill();
      ctx.beginPath(); // home indicator
      ctx.moveTo(440, 912);
      ctx.lineTo(560, 912);
      ctx.stroke();
      break;
    }
    case "tablet": {
      // Landscape, leaning back on a book-stand ledge on the kitchen counter.
      // A stand with feet read as a desktop monitor; a ledge and a counter
      // line read as a tablet propped up where you are cooking.
      box(110, 170, 780, 560, 44);
      ctx.stroke();
      dot(500, 194, 6);
      box(150, 730, 700, 34, 12); // the ledge it rests on
      ctx.stroke();
      ctx.beginPath(); // the counter
      ctx.moveTo(30, 830);
      ctx.lineTo(970, 830);
      ctx.stroke();
      ctx.setLineDash([2, 22]); // a dusting of flour on the counter
      ctx.beginPath();
      ctx.moveTo(120, 880);
      ctx.lineTo(440, 880);
      ctx.moveTo(600, 900);
      ctx.lineTo(860, 900);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case "laptop": {
      box(100, 140, 800, 520, 26); // screen
      ctx.stroke();
      // The menu bar, where a glance lands — the brief's whole territory.
      ctx.beginPath();
      ctx.moveTo(100, 196);
      ctx.lineTo(900, 196);
      ctx.stroke();
      dot(132, 168, 7);
      for (const x of [790, 822, 854]) dot(x, 168, 6);
      // A window in the way, the meeting you are in.
      ctx.setLineDash([10, 12]);
      box(200, 250, 600, 340, 14);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); // base
      ctx.moveTo(40, 720);
      ctx.lineTo(960, 720);
      ctx.lineTo(912, 668);
      ctx.lineTo(88, 668);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "sign": {
      // Hung from the canopy, wide and high up.
      ctx.beginPath();
      ctx.moveTo(240, 40);
      ctx.lineTo(240, 300);
      ctx.moveTo(760, 40);
      ctx.lineTo(760, 300);
      ctx.stroke();
      box(50, 300, 900, 300, 24);
      ctx.stroke();
      box(80, 330, 840, 240, 12);
      ctx.setLineDash([10, 12]);
      ctx.stroke();
      ctx.setLineDash([]);
      // The platform edge below, and a person for scale — it is read from here.
      ctx.beginPath();
      ctx.moveTo(40, 900);
      ctx.lineTo(960, 900);
      ctx.stroke();
      dot(820, 780, 20);
      ctx.beginPath();
      ctx.moveTo(820, 800);
      ctx.lineTo(820, 880);
      ctx.stroke();
      break;
    }
    case "car": {
      ctx.beginPath(); // windscreen's lower edge
      ctx.moveTo(30, 470);
      ctx.quadraticCurveTo(500, 380, 970, 470);
      ctx.stroke();
      ctx.beginPath(); // dashboard
      ctx.moveTo(30, 600);
      ctx.quadraticCurveTo(500, 540, 970, 600);
      ctx.stroke();
      ctx.beginPath(); // the wheel
      ctx.arc(300, 860, 230, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(300, 860, 70, 0, Math.PI * 2);
      ctx.stroke();
      box(600, 610, 290, 190, 20); // the centre screen, out of the eyeline
      ctx.stroke();
      break;
    }
    case "watch": {
      box(390, 30, 220, 200, 34); // strap
      ctx.stroke();
      box(320, 230, 360, 440, 96); // face
      ctx.stroke();
      box(680, 380, 22, 90, 8); // crown
      ctx.fill();
      box(390, 670, 220, 300, 34); // strap
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

/** Paint a frame into a canvas at its displayed size and the screen's DPR. */
export function paintFrameCanvas(canvas: HTMLCanvasElement, frame: Frame, ink: string) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const px = Math.max(1, Math.round(r.width * dpr));
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const k = px / SHEET;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.clearRect(0, 0, SHEET, SHEET);
  paintFrame(ctx, frame, ink);
}
