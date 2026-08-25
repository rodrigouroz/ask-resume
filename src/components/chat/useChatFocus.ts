import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useChatFocus({
  inputRef,
  modal,
  onClose,
  open,
  panelRef,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  modal: boolean;
  onClose: () => void;
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
}) {
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(open);
  const wasModal = useRef(modal);

  useEffect(() => {
    if (open && (!wasOpen.current || (modal && !wasModal.current))) {
      if (!wasOpen.current) {
        openerRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      inputRef.current?.focus();
    } else if (!open && wasOpen.current) {
      openerRef.current?.focus();
    }
    wasOpen.current = open;
    wasModal.current = modal;
  }, [inputRef, modal, open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      const panel = panelRef.current;
      if (!modal || event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (
        event.shiftKey &&
        (document.activeElement === first || !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modal, onClose, open, panelRef]);
}
