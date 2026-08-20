import { ImageResponse } from "next/og";
import { STUDIES, getStudy } from "@/content/work";

/**
 * A case study's share card, one per slug.
 *
 * Same idea as the homepage's, and the same reason: this reads the study out
 * of `content/work`, so writing a title once updates the page, the `<title>`,
 * the modal and the thing LinkedIn renders. The meta row is included because
 * it is the part of a case study a recruiter actually scans — role, timeline,
 * and what it was.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return STUDIES.map((study) => ({ slug: study.slug }));
}

export default async function StudyOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = getStudy(slug);

  // The route itself calls notFound() for an unknown slug; this only has to
  // avoid throwing while the crawler is looking.
  if (!study) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", backgroundColor: "#f3f3f3" }} />,
      size,
    );
  }

  // Only the rows that have been written — an OG card is the wrong place to
  // advertise an em dash.
  const filled = study.meta.filter((m) => m.value);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          backgroundColor: "#f3f3f3",
          backgroundImage:
            "linear-gradient(97deg, #ebebeb 0%, rgba(237,237,237,0.55) 100%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* The byline rides up here with the eyebrow rather than sitting
              beside the meta row. Three meta columns and a name do not fit on
              one 1040px line, and the version that tried either wrapped the
              name or ellipsised the values — both worse than moving it. */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontSize: 24,
              color: "rgba(34,34,34,0.5)",
            }}
          >
            <div style={{ letterSpacing: 2, textTransform: "uppercase" }}>
              Case Study
            </div>
            <div>Siddhant Yadav</div>
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#191919",
              maxWidth: 1000,
            }}
          >
            {study.title}
          </div>
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.35,
              color: "rgba(34,34,34,0.7)",
              maxWidth: 940,
            }}
          >
            {study.subtitle}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 56 }}>
          {filled.slice(0, 3).map((m) => (
            <div
              key={m.label}
              // `flex: none` so a value keeps its natural width. Anything that
              // shrinks here gets ellipsised, and a truncated role on a share
              // card is worse than one fewer column.
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                flex: "none",
              }}
            >
              <div style={{ fontSize: 22, color: "rgba(34,34,34,0.5)" }}>
                {m.label}
              </div>
              <div
                style={{
                  fontSize: 28,
                  color: "#222222",
                  whiteSpace: "nowrap",
                }}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
