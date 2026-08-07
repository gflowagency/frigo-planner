export function FridgeMark({ size }: { size: number }) {
  const bodyW = size * 0.51;
  const bodyH = size * 0.645;
  const radius = size * 0.1;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#c1602e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: bodyW,
          height: bodyH,
          borderRadius: radius,
          background: "#fff8f0",
          position: "relative",
          display: "flex",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: bodyH * 0.29,
            left: 0,
            width: "100%",
            height: Math.max(1, size * 0.011),
            background: "#c1602e",
            opacity: 0.25,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: bodyW * 0.15,
            top: bodyH * 0.09,
            width: size * 0.033,
            height: bodyH * 0.14,
            borderRadius: size * 0.017,
            background: "#c1602e",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: bodyW * 0.15,
            top: bodyH * 0.42,
            width: size * 0.033,
            height: bodyH * 0.35,
            borderRadius: size * 0.017,
            background: "#c1602e",
          }}
        />
      </div>
    </div>
  );
}
