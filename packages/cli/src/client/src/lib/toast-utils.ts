import React from "react";
import type { ToastActionElement } from "@/components/ui/toast";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";

/** Track active toast IDs to prevent duplicates */
const activeToasts = new Set<string>();

/** Duration for error toasts - they stay until dismissed */
const ERROR_TOAST_DURATION = Number.POSITIVE_INFINITY;

/** Duration for info toasts like reconnecting */
const INFO_TOAST_DURATION = 5000;

/**
 * Show a generic error toast
 */
export function showErrorToast(title: string, description?: string) {
	const toastId = `error-${title}`;

	// Prevent duplicate toasts
	if (activeToasts.has(toastId)) {
		return;
	}

	activeToasts.add(toastId);

	const { dismiss } = toast({
		variant: "destructive",
		title,
		description,
		duration: ERROR_TOAST_DURATION,
		onOpenChange: (open) => {
			if (!open) {
				activeToasts.delete(toastId);
			}
		},
	});

	return dismiss;
}

/**
 * Show a toast when connection is reconnecting
 */
export function showReconnectingToast(retryCount: number) {
	const toastId = "reconnecting";

	// Prevent duplicate reconnecting toasts
	if (activeToasts.has(toastId)) {
		return;
	}

	activeToasts.add(toastId);

	const { dismiss } = toast({
		title: "Reconnecting...",
		description: `Attempting to reconnect (attempt ${retryCount})`,
		duration: INFO_TOAST_DURATION,
		onOpenChange: (open) => {
			if (!open) {
				activeToasts.delete(toastId);
			}
		},
	});

	return dismiss;
}

/**
 * Show a connection error toast with optional retry action
 */
export function showConnectionErrorToast(error: string, onRetry?: () => void) {
	const toastId = "connection-error";

	// Prevent duplicate connection error toasts
	if (activeToasts.has(toastId)) {
		return;
	}

	activeToasts.add(toastId);

	const { dismiss } = toast({
		variant: "destructive",
		title: "Connection Error",
		description: error,
		duration: ERROR_TOAST_DURATION,
		action: onRetry
			? (React.createElement(
					ToastAction,
					{
						altText: "Retry connection",
						onClick: () => {
							dismiss();
							onRetry();
						},
					},
					"Retry",
				) as unknown as ToastActionElement)
			: undefined,
		onOpenChange: (open) => {
			if (!open) {
				activeToasts.delete(toastId);
			}
		},
	});

	return dismiss;
}

/**
 * Show an API error toast
 */
export function showApiErrorToast(endpoint: string, error?: string) {
	const description = error || `Failed to fetch data from ${endpoint}`;
	return showErrorToast("API Error", description);
}

/**
 * Clear all active toasts (useful for cleanup)
 */
export function clearActiveToasts() {
	activeToasts.clear();
}
