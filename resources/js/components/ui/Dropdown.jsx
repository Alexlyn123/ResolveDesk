import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { cx } from '@/lib/format';

const MENU_WIDTH = 208;
const GAP = 6;

/** @param {{ trigger: JSX.Element, items: Array<{label: string, icon?: any, onSelect?: Function, to?: string, danger?: boolean, disabled?: boolean} | 'divider'>, align?: 'start'|'end', label?: string }} props */
export function Dropdown({ trigger, items, align = 'end', label = 'Actions' }) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const menuId = useId();

    const close = useCallback((returnFocus = true) => {
        setOpen(false);
        if (returnFocus) triggerRef.current?.focus();
    }, []);

    useLayoutEffect(() => {
        if (!open) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const height = menuRef.current?.offsetHeight ?? 0;
        const width = Math.min(MENU_WIDTH, window.innerWidth - 16);

        let left = align === 'end' ? rect.right - width : rect.left;
        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

        // Open upwards when there is not enough room below.
        const below = rect.bottom + GAP;
        const top = below + height > window.innerHeight - 8 && rect.top - GAP - height > 8 ? rect.top - GAP - height : below;

        setPosition({ top, left, width });
    }, [open, align, items.length]);

    useEffect(() => {
        if (!open) return undefined;

        menuRef.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])')?.focus();

        function onPointerDown(event) {
            if (!menuRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
                close(false);
            }
        }

        const dismiss = () => close(false);

        document.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('resize', dismiss);
        window.addEventListener('scroll', dismiss, true);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('resize', dismiss);
            window.removeEventListener('scroll', dismiss, true);
        };
    }, [open, close]);

    function onMenuKeyDown(event) {
        const options = [...menuRef.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')];
        const index = options.indexOf(document.activeElement);

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            options[(index + 1) % options.length]?.focus();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            options[(index - 1 + options.length) % options.length]?.focus();
        } else if (event.key === 'Home') {
            event.preventDefault();
            options[0]?.focus();
        } else if (event.key === 'End') {
            event.preventDefault();
            options[options.length - 1]?.focus();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
        } else if (event.key === 'Tab') {
            close(false);
        }
    }

    const itemClass = (item) =>
        cx(
            'flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm outline-none transition-colors',
            item.disabled
                ? 'cursor-not-allowed text-ink-300'
                : item.danger
                  ? 'text-signal-700 hover:bg-signal-50 focus-visible:bg-signal-50'
                  : 'text-ink-800 hover:bg-paper-100 focus-visible:bg-paper-100',
        );

    return (
        <>
            {cloneElement(trigger, {
                ref: triggerRef,
                'aria-haspopup': 'menu',
                'aria-expanded': open,
                'aria-controls': open ? menuId : undefined,
                onClick: (event) => {
                    trigger.props.onClick?.(event);
                    setOpen((value) => !value);
                },
                onKeyDown: (event) => {
                    if (event.key === 'ArrowDown' && !open) {
                        event.preventDefault();
                        setOpen(true);
                    }
                },
            })}

            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        id={menuId}
                        role="menu"
                        aria-label={label}
                        onKeyDown={onMenuKeyDown}
                        style={{
                            position: 'fixed',
                            top: position?.top ?? 0,
                            left: position?.left ?? 0,
                            width: position?.width ?? MENU_WIDTH,
                            visibility: position ? 'visible' : 'hidden',
                        }}
                        className="z-[60] animate-fade-in rounded-lg border border-line bg-white p-1 shadow-lg shadow-ink-950/10"
                    >
                        {items.map((item, index) =>
                            item === 'divider' ? (
                                // eslint-disable-next-line react/no-array-index-key
                                <div key={`divider-${index}`} role="separator" className="my-1 h-px bg-line" />
                            ) : item.to && !item.disabled ? (
                                <Link key={item.label} to={item.to} role="menuitem" className={itemClass(item)} onClick={() => close(false)}>
                                    {item.icon && <item.icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />}
                                    {item.label}
                                </Link>
                            ) : (
                                <button
                                    key={item.label}
                                    type="button"
                                    role="menuitem"
                                    aria-disabled={item.disabled || undefined}
                                    className={itemClass(item)}
                                    onClick={() => {
                                        if (item.disabled) return;
                                        close();
                                        item.onSelect?.();
                                    }}
                                >
                                    {item.icon && <item.icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />}
                                    {item.label}
                                </button>
                            ),
                        )}
                    </div>,
                    document.body,
                )}
        </>
    );
}
