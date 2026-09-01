import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * figma: Message — the transcript row that wraps a Bubble.
 *
 *   <MessageGroup>                     stacks consecutive messages, one sender
 *     <Message align="end">
 *       <MessageAvatar>…</MessageAvatar>
 *       <MessageHeader>Ada</MessageHeader>
 *       <Bubble …>…</Bubble>
 *       <MessageFooter>Read 12:04</MessageFooter>
 *     </Message>
 *   </MessageGroup>
 *
 * `align="end"` puts the avatar and content on the end side. Inside a
 * MessageGroup, render an empty MessageAvatar on the earlier messages so they
 * stay aligned with the avatar on the last one.
 */
function Message({
  className,
  align = "start",
  ...props
}: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(
        "flex w-full items-end gap-2",
        align === "end" ? "flex-row-reverse" : "flex-row",
        className
      )}
      {...props}
    />
  );
}

/** Stacks consecutive messages from the same sender. */
function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="message-group" className={cn("flex flex-col gap-1", className)} {...props} />
  );
}

/** Render it empty to reserve the gutter on earlier messages in a group. */
function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-avatar"
      className={cn("size-8 shrink-0 self-end", className)}
      {...props}
    />
  );
}

/** The sender name. */
function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-header"
      className={cn("flex items-center gap-2 px-3 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

/** Metadata (delivery / read status) or message-level actions. */
function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-footer"
      className={cn(
        "flex min-h-6 items-center gap-2 px-3 text-xs font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Message, MessageGroup, MessageAvatar, MessageHeader, MessageFooter };
