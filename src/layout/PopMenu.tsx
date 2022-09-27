import { Popover } from "@headlessui/react";
import { Placement } from "@popperjs/core";
import { useState } from "react";
import { createPortal } from "react-dom";
import { usePopper } from "react-popper";

export type PopMenuProps = {
  children: React.ReactNode;
  className?: string;
  label: React.ReactNode;
  labelClassName?: string;
  placement?: Placement;
};

export const PopMenu = ({
  children,
  className,
  labelClassName,
  label,
  placement,
}: PopMenuProps): JSX.Element => {
  const [referenceElement, setReferenceElement] =
    useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(
    null
  );
  const [arrowElement, setArrowElement] = useState<HTMLDivElement | null>(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: placement,
  });

  return (
    <>
      <Popover>
        {({ open }) => (
          <>
            <Popover.Button
              as={"div"}
              className={
                labelClassName ||
                "dark:text-gray-800 flex text-sm rounded-md px-2 py-2  mr-1 relative border"
              }
              ref={(ref: any) => setReferenceElement(ref)}
            >
              {label}
              <span className="sr-only">Open user menu</span>
            </Popover.Button>
            {createPortal(
              <Popover.Panel
                /// <reference path="" />
                as="div"
                ref={(ref: any) => setPopperElement(ref)}
                id="tooltip"
                role="tooltip"
                className={className}
                style={styles.popper}
                {...attributes.popper}
              >
                {children}
              </Popover.Panel>,
              document.querySelector("#destination") as any
            )}
          </>
        )}
      </Popover>
    </>
  );
};
