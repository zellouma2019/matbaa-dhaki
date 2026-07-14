import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "مطبعة الذكي";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#d4af37",
          borderRadius: "4px",
        }}
      >
        {/* Printer body */}
        <div
          style={{
            position: "absolute",
            width: "20px",
            height: "12px",
            top: "11px",
            left: "6px",
            backgroundColor: "#ffffff",
            borderRadius: "2px",
          }}
        />
        {/* Paper tray (top) */}
        <div
          style={{
            position: "absolute",
            width: "12px",
            height: "8px",
            top: "5px",
            left: "10px",
            backgroundColor: "rgba(255,255,255,0.25)",
            borderRadius: "1px",
            border: "1.2px solid rgba(255,255,255,0.9)",
            boxSizing: "border-box",
          }}
        />
        {/* Output paper (bottom) */}
        <div
          style={{
            position: "absolute",
            width: "12px",
            height: "8px",
            top: "19px",
            left: "10px",
            backgroundColor: "rgba(255,255,255,0.25)",
            borderRadius: "1px",
            border: "1.2px solid rgba(255,255,255,0.9)",
            boxSizing: "border-box",
          }}
        />
        {/* Status light */}
        <div
          style={{
            position: "absolute",
            width: "2.4px",
            height: "2.4px",
            top: "13px",
            left: "22px",
            backgroundColor: "#ffffff",
            borderRadius: "50%",
            opacity: 0.8,
          }}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}