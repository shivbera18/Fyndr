import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./drawer";
import { cn } from "../../lib/utils";

// ponytail: vaul (~35KB with react-remove-scroll) loads only when a mobile
// drawer actually opens — desktop users never download it.
export interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
}

export function MobileDrawer({
  open,
  onOpenChange,
  children,
  className,
  title,
  description,
  footer,
}: MobileDrawerProps): React.JSX.Element {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn("px-4 pb-6", className)}
        footer={
          footer && (
            <div className="border-t border-border bg-background px-4 pt-2 pb-2">{footer}</div>
          )
        }
      >
        {(title || description) && (
          <DrawerHeader className="text-left px-0 pb-3">
            {title && <DrawerTitle>{title}</DrawerTitle>}
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
        )}
        {children}
      </DrawerContent>
    </Drawer>
  );
}

export default MobileDrawer;
