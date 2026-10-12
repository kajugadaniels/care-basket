"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { requestNotificationsCopy } from "../copy";
import { REQUEST_NOTIFICATION_POLL_MS } from "../limits";
import { requestNotificationsSchema } from "../schemas";
import type { RequestNotificationsDto } from "../types";

export function useRequestNotifications(initialData: RequestNotificationsDto | null) {
	const [data, setData] = useState(initialData);
	const [failed, setFailed] = useState(initialData === null);
	const [pending, setPending] = useState(false);
	const [accessLost, setAccessLost] = useState(false);
	const [announcement, setAnnouncement] = useState("");
	const active = useRef(false);
	const generation = useRef(0);
	const inFlight = useRef<AbortController | null>(null);
	const denied = useRef(false);

	async function refresh() {
		if (!active.current || denied.current || inFlight.current || document.visibilityState === "hidden") return;
		const version = generation.current;
		const controller = new AbortController();
		inFlight.current = controller;
		let timedOut = false;
		const timeout = window.setTimeout(() => {
			timedOut = true;
			controller.abort();
		}, 10_000);
		setPending(true);

		try {
			const response = await fetch("/api/requests/notifications", {
				cache: "no-store", credentials: "same-origin", redirect: "error", signal: controller.signal,
			});
			if (!active.current || generation.current !== version) return;
			if (response.status === 401 || response.status === 403) {
				denied.current = true;
				setAccessLost(true);
				setData(null);
				setAnnouncement("");
				setFailed(true);
				return;
			}
			if (!response.ok) throw new Error("Notification read failed");
			const body: { data: unknown } = await response.json();
			const next = requestNotificationsSchema.parse(body.data);
			if (!active.current || generation.current !== version || controller.signal.aborted) return;
			const previousIds = new Set(data?.notifications.map((item) => item.id));
			const incoming = data ? next.notifications.filter((item) => !previousIds.has(item.id)) : [];
			if (incoming.length) {
				setAnnouncement(incoming.length === 1
					? requestNotificationsCopy.message(incoming[0].displayName)
					: requestNotificationsCopy.newLists(incoming.length));
			}
			setData(next);
			setFailed(false);
		} catch {
			if (active.current && generation.current === version && (!controller.signal.aborted || timedOut)) {
				setFailed(true);
			}
		} finally {
			window.clearTimeout(timeout);
			if (inFlight.current === controller) inFlight.current = null;
			if (active.current && generation.current === version) setPending(false);
		}
	}

	const refreshFromEvent = useEffectEvent(refresh);
	useEffect(() => {
		active.current = true;
		generation.current += 1;
		const timer = window.setInterval(() => { void refreshFromEvent(); }, REQUEST_NOTIFICATION_POLL_MS);
		const resume = () => {
			if (document.visibilityState === "hidden") inFlight.current?.abort();
			else void refreshFromEvent();
		};
		window.addEventListener("focus", resume);
		document.addEventListener("visibilitychange", resume);
		return () => {
			active.current = false;
			generation.current += 1;
			inFlight.current?.abort();
			inFlight.current = null;
			window.clearInterval(timer);
			window.removeEventListener("focus", resume);
			document.removeEventListener("visibilitychange", resume);
		};
	}, []);

	return { data, failed, pending, accessLost, announcement, refresh };
}
