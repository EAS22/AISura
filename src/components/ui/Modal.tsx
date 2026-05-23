import {
  Modal as AriaModal,
  ModalOverlay,
  Dialog,
  Heading,
  type ModalOverlayProps,
} from 'react-aria-components';
import type { ReactNode } from 'react';

interface ModalProps extends ModalOverlayProps {
  title?: string;
  children: ReactNode;
}

export function Modal({ title, children, ...props }: ModalProps) {
  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      {...props}
    >
      <AriaModal className="w-full max-w-lg mx-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl">
        <Dialog className="p-4 outline-none">
          {title && (
            <Heading slot="title" className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
              {title}
            </Heading>
          )}
          {children}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}
