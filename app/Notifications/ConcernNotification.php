<?php

namespace App\Notifications;

use App\Models\Concern;
use Illuminate\Notifications\Notification;

class ConcernNotification extends Notification
{
    public function __construct(
        private Concern $concern,
        private string $kind,
        private string $message,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'kind' => $this->kind,
            'message' => $this->message,
            'concern_id' => $this->concern->id,
            'reference' => $this->concern->reference,
            'title' => $this->concern->title,
            'organization_id' => $this->concern->organization_id,
        ];
    }
}
