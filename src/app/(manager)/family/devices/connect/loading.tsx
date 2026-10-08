import DevicesLoading from "../loading";

// This boundary belongs to the nested route itself. The parent devices boundary
// is already resolved when navigating from /family/devices to /connect.
export default function DeviceConnectLoading() {
  return <DevicesLoading />;
}
