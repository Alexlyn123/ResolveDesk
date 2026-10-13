import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Building, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown } from '@/components/ui/Dropdown';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { ROLE_LABELS } from '@/lib/constants';
import { cx } from '@/lib/format';
import { organizationsApi } from '@/lib/services';
import { navigationFor } from './navigation';

function WorkspaceSwitcher({ onNavigate }) {
    const { organization, organizations, role, applySession } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [switching, setSwitching] = useState(false);

    async function switchTo(target) {
        if (target.id === organization.id || switching) return;

        setSwitching(true);
        try {
            applySession(await organizationsApi.switchTo(target.id));
            toast.success(`Switched to ${target.name}.`);
            onNavigate?.();
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSwitching(false);
        }
    }

    const items = [
        ...organizations.map((item) => ({
            label: item.name,
            icon: item.id === organization.id ? Check : Building,
            onSelect: () => switchTo(item),
        })),
        'divider',
        { label: 'Join or create a workspace', icon: Plus, to: '/welcome' },
    ];

    return (
        <Dropdown
            align="start"
            label="Workspace"
            items={items}
            trigger={
                <button
                    type="button"
                    className="on-dark flex w-full items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.07]"
                >
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-paper">{organization.name}</span>
                        <span className="block font-mono text-2xs uppercase tracking-[0.12em] text-ink-400">{ROLE_LABELS[role]}</span>
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                </button>
            }
        />
    );
}

export function Sidebar({ onNavigate }) {
    const { user, role } = useAuth();
    const location = useLocation();

    return (
        <div className="on-dark flex h-full flex-col bg-ink-950 text-ink-300">
            <div className="px-5 pb-5 pt-6">
                <Link to="/dashboard" onClick={onNavigate} className="inline-flex rounded" aria-label="ResolveDesk overview">
                    <Logo tone="dark" />
                </Link>
            </div>

            <div className="px-3">
                <WorkspaceSwitcher onNavigate={onNavigate} />
            </div>

            <nav aria-label="Main" className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
                {navigationFor(role).map((group, index) => (
                    <div key={group.label ?? index} className={index > 0 ? 'mt-5' : undefined}>
                        {group.label && (
                            <p className="mb-1.5 px-3 font-mono text-2xs uppercase tracking-[0.14em] text-ink-500">{group.label}</p>
                        )}
                        <ul className="space-y-0.5">
                            {group.items.map((item) => {
                                const active = item.match(location);

                                return (
                                    <li key={item.label}>
                                        <Link
                                            to={item.to}
                                            onClick={onNavigate}
                                            aria-current={active ? 'page' : undefined}
                                            className={cx(
                                                'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                                                active ? 'bg-white/[0.08] font-medium text-paper' : 'hover:bg-white/[0.05] hover:text-paper',
                                            )}
                                        >
                                            {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-jade-500" aria-hidden="true" />}
                                            <item.icon className={cx('h-4 w-4 shrink-0', active ? 'text-jade-300' : 'text-ink-400 group-hover:text-ink-300')} aria-hidden="true" />
                                            {item.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
                <Avatar name={user.name} tone="dark" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-paper">{user.name}</p>
                    <p className="truncate text-xs text-ink-400">{user.email}</p>
                </div>
            </div>
        </div>
    );
}
