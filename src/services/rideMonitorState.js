// A completed ride disappears from active-ride, but must remain on its monitor.
export async function resolveMonitoredRide(targetId, active, loadHistory) {
  if (active && (!targetId || String(active.rideId) === String(targetId))) return active;
  if (!targetId) return null;
  const rows = await loadHistory();
  return rows.find(row => String(row.rideId) === String(targetId)) || null;
}
export const isCurrentRideMonitor = (pathname, params, rideId) =>
  pathname === "/ride-monitor" && String(params.rideId) === String(rideId);
