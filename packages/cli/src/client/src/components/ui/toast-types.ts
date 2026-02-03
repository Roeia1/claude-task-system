import type * as ToastPrimitives from "@radix-ui/react-toast";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

// Re-declare the toastVariants type locally to avoid circular imports
type ToastVariants = VariantProps<{
	variants: {
		variant: {
			default: string;
			destructive: string;
		};
	};
	defaultVariants: {
		variant: "default";
	};
}>;

export type ToastProps = React.ComponentPropsWithoutRef<
	typeof ToastPrimitives.Root
> &
	ToastVariants;

export type ToastActionElement = React.ReactElement<
	React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>;
