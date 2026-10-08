import type { Metadata } from "next";
import { ConnectDevice } from "@/features/devices/components/ConnectDevice/ConnectDevice";
import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";
import { devicesCopy } from "@/features/devices/copy";

export const metadata: Metadata = { title: devicesCopy.connectTitle, robots: { index: false } };
export default function ConnectPage() { return <RequesterFrame><ConnectDevice /></RequesterFrame>; }
