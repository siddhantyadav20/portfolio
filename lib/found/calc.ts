/**
 * The calculator's arithmetic. It has to be a real calculator: the vault only
 * works as a secret if the app in front of it behaves exactly like one.
 *
 * `×` and `÷` bind before `+` and `−`, a leading `−` negates, and a trailing
 * operator is ignored. Returns what the display should show.
 */
export function calc(expr: string): string {
  const parts = expr.match(/\d+(?:\.\d*)?|\.\d+|[+\-−×÷]/g) ?? [];
  const nums: number[] = [];
  const ops: string[] = [];
  let expectNum = true;
  let sign = 1;

  for (const raw of parts) {
    const p = raw === "-" ? "−" : raw;
    if ("+−×÷".includes(p)) {
      if (expectNum) {
        if (p === "−") sign = -sign;
        continue;
      }
      ops.push(p);
      expectNum = true;
    } else {
      nums.push(sign * Number.parseFloat(p));
      sign = 1;
      expectNum = false;
    }
  }

  if (nums.length === 0) return "0";
  ops.length = Math.min(ops.length, nums.length - 1);

  const terms = [nums[0]];
  const additive: string[] = [];
  ops.forEach((op, i) => {
    const b = nums[i + 1];
    const last = terms.length - 1;
    if (op === "×") terms[last] *= b;
    else if (op === "÷") terms[last] = b === 0 ? Number.NaN : terms[last] / b;
    else {
      additive.push(op);
      terms.push(b);
    }
  });

  let result = terms[0];
  additive.forEach((op, i) => {
    result = op === "+" ? result + terms[i + 1] : result - terms[i + 1];
  });

  if (!Number.isFinite(result)) return "Error";
  return String(Number(result.toPrecision(12)));
}
