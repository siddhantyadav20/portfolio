"use client";

import { useReportWebVitals } from "next/web-vitals";
import { report } from "@/lib/telemetry";

/** The half that costs something. Only mounted when there is an endpoint. */
export default function VitalsReporter() {
  useReportWebVitals(({ name, value, rating }) => {
    report({ kind: "vital", name, value, rating });
  });

  return null;
}
