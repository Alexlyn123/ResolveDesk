<?php

return [
    'ticket_prefix' => env('RESOLVEDESK_TICKET_PREFIX', 'RD'),

    'default_organization_slug' => env('RESOLVEDESK_DEFAULT_ORGANIZATION'),

    'starter_categories' => [
        'General inquiry',
        'Service request',
        'Complaint',
        'Billing',
    ],
];
