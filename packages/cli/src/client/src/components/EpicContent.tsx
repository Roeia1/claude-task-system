import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface EpicContentProps {
	content: string | undefined;
}

export function EpicContent({ content }: EpicContentProps) {
	const [isOpen, setIsOpen] = useState(true);

	// Return null for empty/undefined content
	if (!content || content.trim() === "") {
		return null;
	}

	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
			data-testid="epic-content"
		>
			<div className="border border-border-muted rounded-lg bg-bg-light/30">
				<CollapsibleTrigger asChild={true}>
					<button
						type="button"
						className="w-full flex items-center justify-between p-4 hover:bg-bg-light/50 transition-colors rounded-t-lg"
					>
						<h2 className="text-lg font-semibold text-text">
							Epic Documentation
						</h2>
						{isOpen ? (
							<ChevronUp className="w-5 h-5 text-text-muted" />
						) : (
							<ChevronDown className="w-5 h-5 text-text-muted" />
						)}
					</button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="px-4 pb-4">
						<div
							data-testid="epic-content-prose"
							className="prose prose-sm prose-invert max-w-none prose-headings:text-text prose-p:text-text-muted prose-strong:text-text prose-code:text-primary prose-code:bg-bg-dark prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-bg-dark prose-pre:border prose-pre:border-border-muted prose-a:text-primary prose-a:no-underline prose-a:hover:underline prose-li:text-text-muted prose-table:border prose-table:border-border-muted prose-th:bg-bg-dark prose-th:px-3 prose-th:py-2 prose-th:text-text prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-border-muted"
						>
							<ReactMarkdown remarkPlugins={[remarkGfm]}>
								{content}
							</ReactMarkdown>
						</div>
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}
