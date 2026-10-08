"use client";
import { Button } from "@/components/ui/Button/Button";
import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";
import { devicesCopy } from "@/features/devices/copy";
export default function ShopError({ retry }: { retry(): void }) { return <RequesterFrame><h1>{devicesCopy.errorTitle}</h1><p role="alert">{devicesCopy.errorText}</p><Button onClick={retry}>{devicesCopy.retry}</Button></RequesterFrame>; }
