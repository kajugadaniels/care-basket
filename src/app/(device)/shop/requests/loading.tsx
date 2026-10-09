import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";
import { RequestSkeleton } from "@/features/requests/components/RequestUi/RequestSkeleton";

export default function HistoryLoading() {
	return <RequesterFrame wide><RequestSkeleton /></RequesterFrame>;
}
