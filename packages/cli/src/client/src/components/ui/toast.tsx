import {
	Action as ToastPrimitiveAction,
	Close as ToastPrimitiveClose,
	Description as ToastPrimitiveDescription,
	Provider as ToastPrimitiveProvider,
	Root as ToastPrimitiveRoot,
	Title as ToastPrimitiveTitle,
	Viewport as ToastPrimitiveViewport,
} from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import {
	type ComponentPropsWithoutRef,
	type ElementRef,
	forwardRef,
} from "react";

import { cn } from "@/lib/utils";

const toastVariants = cva(
	"group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x) data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full sm:data-[state=open]:slide-in-from-bottom-full",
	{
		variants: {
			variant: {
				default: "border bg-background text-foreground",
				destructive:
					"destructive group border-destructive bg-destructive text-destructive-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const ToastProvider = forwardRef<
	ElementRef<typeof ToastPrimitiveProvider>,
	ComponentPropsWithoutRef<typeof ToastPrimitiveProvider>
>(({ ...props }, _ref) => <ToastPrimitiveProvider {...props} />);
ToastProvider.displayName = "ToastProvider";

const ToastViewport = forwardRef<
	ElementRef<typeof ToastPrimitiveViewport>,
	ComponentPropsWithoutRef<typeof ToastPrimitiveViewport>
>(({ className, ...props }, ref) => (
	<ToastPrimitiveViewport
		ref={ref}
		className={cn(
			"fixed top-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
			className,
		)}
		{...props}
	/>
));
ToastViewport.displayName = "ToastViewport";

const Toast = forwardRef<
	ElementRef<typeof ToastPrimitiveRoot>,
	ComponentPropsWithoutRef<typeof ToastPrimitiveRoot> &
		VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
	return (
		<ToastPrimitiveRoot
			ref={ref}
			className={cn(toastVariants({ variant }), className)}
			{...props}
		/>
	);
});
Toast.displayName = "Toast";

const ToastAction = forwardRef<
	ElementRef<typeof ToastPrimitiveAction>,
	ComponentPropsWithoutRef<typeof ToastPrimitiveAction>
>(({ className, ...props }, ref) => (
	<ToastPrimitiveAction
		ref={ref}
		className={cn(
			"inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 hover:group-[.destructive]:border-destructive/30 hover:group-[.destructive]:bg-destructive hover:group-[.destructive]:text-destructive-foreground focus:group-[.destructive]:ring-destructive",
			className,
		)}
		{...props}
	/>
));
ToastAction.displayName = "ToastAction";

const ToastClose = forwardRef<
	ElementRef<typeof ToastPrimitiveClose>,
	ComponentPropsWithoutRef<typeof ToastPrimitiveClose>
>(({ className, ...props }, ref) => (
	<ToastPrimitiveClose
		ref={ref}
		className={cn(
			"absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-hidden focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 hover:group-[.destructive]:text-red-50 focus:group-[.destructive]:ring-red-400 focus:group-[.destructive]:ring-offset-red-600",
			className,
		)}
		toast-close=""
		{...props}
	>
		<X className="h-4 w-4" />
	</ToastPrimitiveClose>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = forwardRef<
	ElementRef<typeof ToastPrimitiveTitle>,
	ComponentPropsWithoutRef<typeof ToastPrimitiveTitle>
>(({ className, ...props }, ref) => (
	<ToastPrimitiveTitle
		ref={ref}
		className={cn("text-sm font-semibold", className)}
		{...props}
	/>
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = forwardRef<
	ElementRef<typeof ToastPrimitiveDescription>,
	ComponentPropsWithoutRef<typeof ToastPrimitiveDescription>
>(({ className, ...props }, ref) => (
	<ToastPrimitiveDescription
		ref={ref}
		className={cn("text-sm opacity-90", className)}
		{...props}
	/>
));
ToastDescription.displayName = "ToastDescription";

export {
	ToastProvider,
	ToastViewport,
	Toast,
	ToastAction,
	ToastClose,
	ToastTitle,
	ToastDescription,
};
export type { ToastActionElement, ToastProps } from "./toast-types.ts";
