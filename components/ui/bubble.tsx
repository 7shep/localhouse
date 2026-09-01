import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * figma: Bubble — one of the chat primitives this library adds on top of
 * shadcn. Composition, per the kit's recipes:
 *
 *   <BubbleGroup>                       groups consecutive bubbles from one sender
 *     <Bubble variant="primary" align="end">
 *       <BubbleContent>…</BubbleContent>        asChild -> link or button
 *       <BubbleReactions side="bottom" align="end">
 *         <BubbleReaction>👍</BubbleReaction>
 *       </BubbleReactions>
 *     </Bubble>
 *   </BubbleGroup>
 *
 * Geometry: px 12, py 10, rounded-3xl (22), text-sm/400.
 * `primary` is the only variant off the neutral ramp (blue-700); `tinted` uses
 * a light blue behind normal foreground text.
 *
 * Reactions overlap the bubble edge, so leave vertical space between rows.
 */
const bubbleVariants = cva(
  "relative flex w-fit max-w-[80%] flex-col rounded-3xl px-3 py-2.5 text-sm break-words",
  {
    variants: {
      variant: {
        primary: "bg-[#1447e6] text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        muted: "bg-muted text-foreground",
        tinted: "bg-[#c7e8ff] text-foreground",
        outline: "border border-border bg-transparent text-foreground",
        destructive: "bg-destructive-subtle text-text-destructive",
      },
      align: {
        start: "me-auto rounded-es-md",
        end: "ms-auto rounded-ee-md",
      },
    },
    defaultVariants: { variant: "secondary", align: "start" },
  }
);

function Bubble({
  className,
  variant,
  align,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof bubbleVariants>) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant, align }), className)}
      {...props}
    />
  );
}

/** Groups consecutive bubbles from the same sender. `align` goes on the Bubble. */
function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn("flex w-full flex-col gap-1", className)}
      {...props}
    />
  );
}

/** The bubble's content. `asChild` turns it into a link or button. */
function BubbleContent({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="bubble-content"
      className={cn("min-w-0 [&:is(a,button)]:underline-offset-4 [&:is(a,button)]:hover:underline", className)}
      {...props}
    />
  );
}

/**
 * A row of reactions or quick actions that overlaps the bubble's edge.
 * `side` picks which edge; `align` which end of it.
 */
const bubbleReactionsVariants = cva("absolute z-10 flex items-center gap-1", {
  variants: {
    side: { top: "-top-3", bottom: "-bottom-3" },
    align: { start: "start-3", end: "end-3" },
  },
  defaultVariants: { side: "bottom", align: "end" },
});

function BubbleReactions({
  className,
  side,
  align,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof bubbleReactionsVariants>) {
  return (
    <div
      data-slot="bubble-reactions"
      className={cn(bubbleReactionsVariants({ side, align }), className)}
      {...props}
    />
  );
}

function BubbleReaction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : "button"}
      data-slot="bubble-reaction"
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border bg-background px-1.5",
        "text-xs font-medium shadow-xs transition-colors hover:bg-accent",
        "focus-visible:border-ring focus-visible:ring-ring-subtle focus-visible:ring-[3px] focus-visible:outline-none",
        className
      )}
      {...props}
    />
  );
}

export {
  Bubble,
  BubbleGroup,
  BubbleContent,
  BubbleReactions,
  BubbleReaction,
  bubbleVariants,
};
