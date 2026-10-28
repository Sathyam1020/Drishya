"use client";
import { Accordion as Primitive } from "radix-ui";
import type { ComponentProps } from "react";

export function Accordion(props: ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="accordion" {...props} />;
}
export function AccordionItem(props: ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item data-slot="accordion-item" {...props} />;
}
export function AccordionTrigger(
  props: ComponentProps<typeof Primitive.Trigger>,
) {
  return (
    <Primitive.Header>
      <Primitive.Trigger data-slot="accordion-trigger" {...props} />
    </Primitive.Header>
  );
}
export function AccordionContent(
  props: ComponentProps<typeof Primitive.Content>,
) {
  return <Primitive.Content data-slot="accordion-content" {...props} />;
}
