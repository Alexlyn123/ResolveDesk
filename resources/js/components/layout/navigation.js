import { ChartNoAxesColumn, CirclePlus, CircleUser, Inbox, LayoutDashboard, ListChecks, Settings, Tags, Users } from 'lucide-react';

export function navigationFor(role) {
    const isTeam = role === 'staff' || role === 'admin';
    const assignedOnly = (location) => new URLSearchParams(location.search).get('assignee') === 'me';
    const onConcernList = (location) => location.pathname === '/concerns';
    const onConcernRecord = (location) => /^\/concerns\/\d+/.test(location.pathname);

    const groups = [
        {
            label: null,
            items: [{ label: 'Overview', to: '/dashboard', icon: LayoutDashboard, match: (location) => location.pathname === '/dashboard' }],
        },
        {
            label: 'Concerns',
            items: [
                ...(isTeam
                    ? [
                          {
                              label: 'My assigned concerns',
                              to: '/concerns?assignee=me&status=active',
                              icon: ListChecks,
                              match: (location) => onConcernList(location) && assignedOnly(location),
                          },
                          {
                              label: 'Organization concerns',
                              to: '/concerns',
                              icon: Inbox,
                              match: (location) => (onConcernList(location) && !assignedOnly(location)) || onConcernRecord(location),
                          },
                      ]
                    : [
                          {
                              label: 'My concerns',
                              to: '/concerns',
                              icon: Inbox,
                              match: (location) => onConcernList(location) || onConcernRecord(location),
                          },
                      ]),
                {
                    label: 'Submit concern',
                    to: '/concerns/create',
                    icon: CirclePlus,
                    match: (location) => location.pathname === '/concerns/create',
                },
            ],
        },
    ];

    if (isTeam) {
        groups.push({
            label: 'Insight',
            items: [{ label: 'Reports', to: '/reports', icon: ChartNoAxesColumn, match: (location) => location.pathname === '/reports' }],
        });
    }

    if (role === 'admin') {
        groups.push({
            label: 'Workspace',
            items: [
                { label: 'Team management', to: '/team', icon: Users, match: (location) => location.pathname === '/team' },
                { label: 'Categories', to: '/categories', icon: Tags, match: (location) => location.pathname === '/categories' },
                { label: 'Organization settings', to: '/settings', icon: Settings, match: (location) => location.pathname === '/settings' },
            ],
        });
    }

    groups.push({
        label: 'Account',
        items: [{ label: 'Profile', to: '/profile', icon: CircleUser, match: (location) => location.pathname === '/profile' }],
    });

    return groups;
}
