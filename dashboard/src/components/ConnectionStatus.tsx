"use client";

interface ConnectionStatusProps {
  status: "connected" | "connecting" | "disconnected";
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const label =
    status === "connected"
      ? "Live"
      : status === "connecting"
        ? "Connecting..."
        : "Disconnected";

  const dotClass =
    status === "connected" ? "connected" : "disconnected";

  return (
    <div className="connection-status">
      <span className={`connection-dot ${dotClass}`} />
      <span className={`connection-text ${dotClass}`}>{label}</span>
    </div>
  );
}
