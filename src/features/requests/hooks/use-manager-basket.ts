"use client";

import { useOptimistic, useRef, useState } from "react";
import type { ToastNotice } from "@/components/ui/Toast/Toast";
import { useToastSound } from "@/components/ui/Toast/use-toast-sound";
import { removeRequestItemAction, updateRequestItemAction } from "../actions";
import { previewBasketQuantity, type QuantityPreview } from "../basket-preview";
import { requestsCopy as copy } from "../copy";
import type { ManagerDetailDto, RequestMutationResult } from "../types";
import { useRequestMutation } from "./use-request-mutation";

export function useManagerBasket(request: ManagerDetailDto) {
	const mutation = useRequestMutation();
	const [preview, applyPreview] = useOptimistic(request, previewBasketQuantity);
	const [notice, setNotice] = useState<ToastNotice | null>(null);
	const sequence = useRef(0);
	const sound = useToastSound();

	function notify(kind: "success" | "error", message: string, title: string = kind === "success" ? copy.toastSuccess : copy.toastError) {
		setNotice({ id: ++sequence.current, kind, title, message });
		sound.play(kind);
	}

	function blockIfBusy() {
		if (!mutation.isRunning()) return false;
		sound.prepare();
		notify("error", copy.actionBusy, copy.actionBusyTitle);
		return true;
	}

	function execute(action: () => Promise<RequestMutationResult>, message: string, key: string, edit?: QuantityPreview) {
		if (blockIfBusy()) return;
		sound.prepare();
		mutation.run(async () => {
			setNotice(null);
			if (edit) applyPreview(edit);
			try {
				const result = await action();
				if (!result.ok) notify("error", copy.toastErrorMessage);
				return result;
			} catch {
				notify("error", copy.toastErrorMessage);
				return { ok: false, error: { code: "INTERNAL", message: copy.managerConfirmFailed } };
			}
		}, () => notify("success", message), key);
	}

	function save(item: ManagerDetailDto["items"][number], quantity: number) {
		execute(() => updateRequestItemAction({ requestId: request.id, revision: request.revision, itemId: item.id, quantity }),
			copy.managerQuantitySaved({ name: item.displayName, quantity }), `save:${item.id}`, { itemId: item.id, quantity });
	}

	function remove(item: ManagerDetailDto["items"][number]) {
		execute(() => removeRequestItemAction({ requestId: request.id, revision: request.revision, itemId: item.id }),
			copy.managerItemRemoved({ name: item.displayName }), `remove:${item.id}`);
	}

	// An error can render before the optimistic transition settles. Show confirmed
	// prices immediately without resetting the quantity field's unsaved draft.
	const displayedRequest = mutation.error ? request : preview;

	return { ...mutation, preview: displayedRequest, notice, dismiss: () => setNotice(null), sound, save, remove, blockIfBusy };
}
