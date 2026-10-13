<?php

namespace Database\Seeders;

use App\Enums\CommentVisibility;
use App\Enums\ConcernStatus;
use App\Enums\MemberRole;
use App\Models\Category;
use App\Models\Concern;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use App\Services\ConcernService;
use App\Services\OrganizationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DemoSeeder extends Seeder
{
    public const PASSWORD = 'password';

    public const JOIN_CODE = 'NORTHGATE-DEMO';

    /** @var array<string, User> */
    private array $people = [];

    /** @var array<int, Membership> keyed by user id */
    private array $memberships = [];

    /** @var array<string, Category> */
    private array $categories = [];

    private ConcernService $concerns;

    public function run(): void
    {
        $this->concerns = app(ConcernService::class);
        $now = now();
        mt_srand(20261013);

        $organization = $this->createWorkspace();

        $scenarios = collect([...$this->featured(), ...$this->generated()])
            ->sortByDesc('age_hours')
            ->values();

        // Oldest first, so ticket references rise with time as they would in real use.
        foreach ($scenarios as $scenario) {
            $this->play($scenario, $now);
        }

        Carbon::setTestNow();

        // Leave only the last two days of notifications unread.
        DB::table('notifications')->where('created_at', '<', $now->copy()->subDays(2))->update(['read_at' => $now]);

        $this->command?->info("Seeded {$organization->name} with {$scenarios->count()} concerns.");
    }

    private function createWorkspace(): Organization
    {
        $accounts = [
            'admin' => ['Elena Marquez', 'admin@resolvedesk.test', MemberRole::Admin],
            'staff' => ['Daniel Okafor', 'staff@resolvedesk.test', MemberRole::Staff],
            'staff2' => ['Priya Nair', 'staff2@resolvedesk.test', MemberRole::Staff],
            'customer' => ['Sam Rivera', 'customer@resolvedesk.test', MemberRole::Customer],
            'customer2' => ['Jordan Lee', 'customer2@resolvedesk.test', MemberRole::Customer],
            'customer3' => ['Amara Castillo', 'amara.castillo@resolvedesk.test', MemberRole::Customer],
            'customer4' => ['Tomas Villanueva', 'tomas.villanueva@resolvedesk.test', MemberRole::Customer],
            'customer5' => ['Grace Lim', 'grace.lim@resolvedesk.test', MemberRole::Customer],
        ];

        foreach ($accounts as $key => [$name, $email]) {
            $this->people[$key] = User::factory()->create(['name' => $name, 'email' => $email, 'password' => self::PASSWORD]);
        }

        $organizations = app(OrganizationService::class);

        $organization = $organizations->create(
            $this->people['admin'],
            'Northgate Residences',
            'Resident services for the Northgate apartment community: maintenance, billing, security, and shared spaces.',
        );
        $organization->forceFill(['slug' => 'northgate-residences', 'join_code' => self::JOIN_CODE])->save();

        foreach ($accounts as $key => [, , $role]) {
            if ($key !== 'admin') {
                $organizations->addMember($organization, $this->people[$key], $role);
                $this->people[$key]->forceFill(['current_organization_id' => $organization->id])->save();
            }
        }

        $this->memberships = Membership::where('organization_id', $organization->id)->get()->keyBy('user_id')->all();

        // Replace the generic starter categories with ones that fit a residential property.
        $organization->categories()->delete();

        $categories = [
            'Plumbing & water' => 'Leaks, drainage, water pressure, and heaters.',
            'Electrical' => 'Power, lighting, outlets, and breakers.',
            'Air conditioning' => 'Cooling, ventilation, and thermostat issues.',
            'Security & access' => 'Key cards, gates, intercoms, and incidents.',
            'Billing & payments' => 'Statements, dues, deposits, and receipts.',
            'Common areas' => 'Lobby, lifts, gym, pool, parking, and grounds.',
            'Noise & neighbours' => 'Disturbances and house-rule concerns.',
            'General inquiry' => 'Anything that does not fit another category.',
        ];

        foreach ($categories as $name => $description) {
            $this->categories[$name] = $organization->categories()->save(
                new Category(['name' => $name, 'description' => $description])
            );
        }

        // A retired category, to show that categories are deactivated rather than deleted.
        $organization->categories()->save(new Category([
            'name' => 'Move-in inspections',
            'description' => 'Handled by the leasing office since 2025.',
            'is_active' => false,
        ]));

        return $organization;
    }

    private function play(array $scenario, Carbon $now): void
    {
        $clock = $now->copy()->subHours($scenario['age_hours']);
        Carbon::setTestNow($clock);

        $creator = $this->people[$scenario['by']];

        $concern = $this->concerns->create($creator, $this->memberships[$creator->id], [
            'title' => $scenario['title'],
            'description' => $scenario['description'],
            'category_id' => $this->categories[$scenario['category']]->id,
            'priority' => $scenario['priority'],
        ]);

        foreach ($scenario['steps'] as [$hoursLater, $action, $who, $value, $note]) {
            $clock = $clock->copy()->addMinutes((int) round($hoursLater * 60));

            // Never write history into the future.
            if ($clock->greaterThan($now)) {
                break;
            }

            Carbon::setTestNow($clock);
            $actor = $this->people[$who];
            $concern = Concern::findOrFail($concern->id);

            match ($action) {
                'assign' => $this->concerns->assign($concern, $actor, $this->people[$value]),
                'due' => $this->concerns->update($concern, $actor, ['due_at' => $concern->created_at->copy()->addHours($value)]),
                'status' => $this->concerns->changeStatus($concern, $actor, $this->memberships[$actor->id], ConcernStatus::from($value), $note),
                'comment' => $this->concerns->addComment($concern, $actor, $this->memberships[$actor->id], $note, CommentVisibility::Public),
                'internal' => $this->concerns->addComment($concern, $actor, $this->memberships[$actor->id], $note, CommentVisibility::Internal),
            };
        }
    }

    private static function step(float $hoursLater, string $action, string $who, mixed $value = null, ?string $note = null): array
    {
        return [$hoursLater, $action, $who, $value, $note];
    }

    private function featured(): array
    {
        return [
            [
                'by' => 'customer', 'category' => 'Plumbing & water', 'priority' => 'high', 'age_hours' => 30,
                'title' => 'Water leaking under the kitchen sink in unit 4B',
                'description' => "There is a steady drip from the pipe joint under my kitchen sink. I noticed it last night and have put a bucket underneath, but it fills up every few hours.\n\nThe cabinet base is starting to swell. I am home after 5 pm on weekdays and all day on Saturday.",
                'steps' => [
                    self::step(1.5, 'assign', 'admin', 'staff'),
                    self::step(0.1, 'due', 'admin', 72),
                    self::step(0.5, 'status', 'staff', 'under_review'),
                    self::step(2, 'internal', 'staff', null, 'Same riser as the 3B leak in August. Ask the plumber to check the shared shut-off valve while on site.'),
                    self::step(1, 'status', 'staff', 'in_progress'),
                    self::step(0.2, 'comment', 'staff', null, 'Hi Sam, a plumber is booked for tomorrow between 5 and 7 pm. Please keep the cabinet under the sink clear. In the meantime, the small valve below the basin can be turned clockwise to stop the drip.'),
                    self::step(3, 'comment', 'customer', null, 'Thank you. I turned the valve and the dripping has stopped for now. Tomorrow evening works.'),
                ],
            ],
            [
                'by' => 'customer', 'category' => 'Billing & payments', 'priority' => 'medium', 'age_hours' => 52,
                'title' => 'October statement shows a parking fee I do not use',
                'description' => 'My October statement includes a charge for parking slot P2-14. I gave up that slot at the end of August and returned the access sticker to the office. Please review and correct the statement.',
                'steps' => [
                    self::step(4, 'status', 'staff2', 'under_review'),
                    self::step(0.1, 'assign', 'staff2', 'staff2'),
                    self::step(0.1, 'due', 'staff2', 168),
                    self::step(20, 'status', 'staff2', 'waiting_for_customer', 'Could you send the date you returned the parking sticker, or a photo of the acknowledgement slip from the office? We need it to reverse the charge.'),
                ],
            ],
            [
                'by' => 'customer', 'category' => 'Air conditioning', 'priority' => 'medium', 'age_hours' => 9 * 24,
                'title' => 'Bedroom air conditioner not cooling',
                'description' => 'The split-type unit in the main bedroom runs but only blows room-temperature air. The filter was cleaned last month. The living room unit works normally.',
                'steps' => [
                    self::step(3, 'assign', 'admin', 'staff'),
                    self::step(0.1, 'due', 'admin', 120),
                    self::step(1, 'status', 'staff', 'under_review'),
                    self::step(20, 'status', 'staff', 'in_progress'),
                    self::step(0.2, 'comment', 'staff', null, 'A technician will inspect the unit on Thursday morning. No need to be home; security will accompany them with the duplicate key if you consent.'),
                    self::step(5, 'comment', 'customer', null, 'Yes, that is fine. Please have them close the windows before leaving.'),
                    self::step(44, 'internal', 'staff', null, 'Refrigerant was low. Technician found a loose flare nut on the outdoor unit and re-tightened it. No parts billed.'),
                    self::step(0.5, 'status', 'staff', 'resolved', 'The technician found a refrigerant leak at a loose fitting on the outdoor unit, tightened it, and recharged the system. The unit was tested for 30 minutes and is cooling to 18°C. No charge applies.'),
                ],
            ],
            [
                'by' => 'customer', 'category' => 'Security & access', 'priority' => 'low', 'age_hours' => 34 * 24,
                'title' => 'Replacement key card for a family member',
                'description' => 'My sister is staying with me until December. I would like to request one additional lobby access card registered under my unit.',
                'steps' => [
                    self::step(5, 'assign', 'admin', 'staff2'),
                    self::step(1, 'status', 'staff2', 'under_review'),
                    self::step(18, 'status', 'staff2', 'in_progress'),
                    self::step(24, 'status', 'staff2', 'resolved', 'A temporary access card valid until 31 December was issued and is ready for pick-up at the front desk. Please bring a valid ID.'),
                    self::step(30, 'status', 'customer', 'closed'),
                ],
            ],
            [
                'by' => 'customer', 'category' => 'Common areas', 'priority' => 'medium', 'age_hours' => 3,
                'title' => 'Gym treadmill displays an error and stops',
                'description' => 'The treadmill nearest the window shows "E-07" after about two minutes and stops abruptly. It happened on Monday and again this morning. Someone could get hurt.',
                'steps' => [],
            ],
            [
                'by' => 'customer2', 'category' => 'Electrical', 'priority' => 'urgent', 'age_hours' => 5,
                'title' => 'Burning smell from the hallway outlet on the 7th floor',
                'description' => 'There is a faint burning-plastic smell coming from the wall outlet beside the 7th-floor lift lobby. The cover plate is warm to the touch. I have not seen sparks, but it has been like this since this morning.',
                'steps' => [
                    self::step(0.3, 'status', 'admin', 'under_review'),
                    self::step(0.1, 'assign', 'admin', 'staff'),
                    self::step(0.1, 'due', 'admin', 12),
                    self::step(0.4, 'status', 'staff', 'in_progress'),
                    self::step(0.1, 'comment', 'staff', null, 'Thank you for reporting this quickly. The circuit has been switched off at the panel and the electrician is on the way. Please do not use that outlet.'),
                ],
            ],
            [
                'by' => 'customer2', 'category' => 'Noise & neighbours', 'priority' => 'medium', 'age_hours' => 6 * 24,
                'title' => 'Late-night drilling from the unit above',
                'description' => 'For the past three nights there has been drilling and hammering from the unit above mine, continuing past 10 pm. I understand renovations happen, but the house rules say work must stop at 6 pm.',
                'steps' => [
                    self::step(10, 'assign', 'admin', 'staff2'),
                    self::step(0.1, 'due', 'admin', 72),
                    self::step(2, 'status', 'staff2', 'under_review'),
                    self::step(20, 'status', 'staff2', 'in_progress'),
                    self::step(0.2, 'comment', 'staff2', null, 'We have spoken with the unit owner and their contractor, and issued a written reminder of the permitted work hours. Security will check the floor at 6 pm for the rest of the week.'),
                ],
            ],
            [
                'by' => 'customer3', 'category' => 'Plumbing & water', 'priority' => 'high', 'age_hours' => 20,
                'title' => 'No hot water in unit 9D since yesterday',
                'description' => 'The water heater switch is on and the indicator light is lit, but the shower and tap only run cold. This started yesterday evening.',
                'steps' => [
                    self::step(6, 'status', 'staff2', 'under_review'),
                ],
            ],
            [
                'by' => 'customer4', 'category' => 'Common areas', 'priority' => 'high', 'age_hours' => 4 * 24,
                'title' => 'Lift B stops between floors',
                'description' => 'Lift B stopped between the 5th and 6th floors for about a minute on Tuesday evening before continuing. Two other residents said the same thing happened to them last week.',
                'steps' => [
                    self::step(1, 'assign', 'admin', 'admin'),
                    self::step(0.1, 'due', 'admin', 48),
                    self::step(0.5, 'status', 'admin', 'in_progress'),
                    self::step(0.2, 'comment', 'admin', null, 'Lift B has been taken out of service and the maintenance contractor has been called for a full inspection. Please use Lift A in the meantime.'),
                    self::step(30, 'internal', 'admin', null, 'Contractor quote received for a door-sensor replacement. Awaiting board approval; follow up Friday.'),
                ],
            ],
            [
                'by' => 'customer5', 'category' => 'General inquiry', 'priority' => 'low', 'age_hours' => 12 * 24,
                'title' => 'Can the function room be booked for a private event?',
                'description' => 'I would like to host a small birthday gathering of about 20 people in the function room on a Saturday in November. Is this allowed, and what are the fees and rules?',
                'steps' => [
                    self::step(8, 'assign', 'staff', 'staff'),
                    self::step(0.2, 'status', 'staff', 'in_progress'),
                    self::step(1, 'status', 'staff', 'resolved', 'Yes, residents may book the function room. The booking form, fee schedule, and house rules were sent to your registered email. Reservations are confirmed once the form and deposit are received.'),
                    self::step(70, 'status', 'staff', 'closed'),
                ],
            ],
            [
                'by' => 'customer3', 'category' => 'Billing & payments', 'priority' => 'low', 'age_hours' => 16 * 24,
                'title' => 'Duplicate request for my September receipt',
                'description' => 'Please send the official receipt for my September association dues. I asked at the counter as well, so this may be a duplicate.',
                'steps' => [
                    self::step(20, 'status', 'staff2', 'closed', 'Closed as a duplicate: the receipt was already released at the front desk on the same day.'),
                ],
            ],
        ];
    }

    private function generated(): array
    {
        $pool = [
            ['Plumbing & water', 'Slow drain in the bathroom floor', 'Water pools around the shower drain and takes several minutes to clear.'],
            ['Plumbing & water', 'Toilet keeps running after flushing', 'The cistern does not stop filling and the water runs continuously.'],
            ['Plumbing & water', 'Low water pressure in the mornings', 'Between 6 and 8 am the pressure at the kitchen tap drops to a trickle.'],
            ['Plumbing & water', 'Damp patch on the bathroom ceiling', 'A brown damp patch has appeared on the ceiling below the upstairs bathroom.'],
            ['Electrical', 'Hallway light outside unit 3A is flickering', 'The corridor light flickers constantly in the evenings and sometimes goes out.'],
            ['Electrical', 'Kitchen outlet has no power', 'The double outlet beside the refrigerator stopped working. Other outlets are fine.'],
            ['Electrical', 'Breaker trips when the oven is used', 'The main breaker trips after the oven has been on for about ten minutes.'],
            ['Electrical', 'Doorbell not working', 'The doorbell button lights up but makes no sound inside the unit.'],
            ['Air conditioning', 'Water dripping from the living room unit', 'The indoor unit drips onto the floor when it runs for more than an hour.'],
            ['Air conditioning', 'Unusual rattling from the outdoor unit', 'The condenser on the balcony makes a loud rattling noise when it starts.'],
            ['Air conditioning', 'Thermostat display is blank', 'The wall controller for the bedroom unit shows nothing and does not respond.'],
            ['Security & access', 'Lobby intercom does not ring my unit', 'Visitors say the intercom rings, but the handset in my unit stays silent.'],
            ['Security & access', 'Parking gate remote stopped working', 'My gate remote no longer opens the basement barrier. The battery is new.'],
            ['Security & access', 'Unfamiliar person tailgating at the side gate', 'Someone followed a resident through the side gate last night without tapping a card.'],
            ['Security & access', 'Lost key card, please deactivate', 'I lost my access card near the pool area. Please deactivate it and issue a replacement.'],
            ['Billing & payments', 'Payment made but still shown as unpaid', 'I paid my dues by bank transfer on the 3rd, but the portal still shows a balance.'],
            ['Billing & payments', 'Request for a statement of account', 'I need a full statement of account for this year for a loan application.'],
            ['Billing & payments', 'Late fee charged despite paying on time', 'A late fee was added to my statement although payment was made before the due date.'],
            ['Common areas', 'Pool water looks cloudy', 'The pool has been cloudy for two days and there is a strong chemical smell.'],
            ['Common areas', 'Broken light in basement parking row C', 'Two ceiling lights in row C are out and the area is very dark at night.'],
            ['Common areas', 'Rubbish chute blocked on the 8th floor', 'The chute door on the 8th floor will not open and bags are piling up beside it.'],
            ['Common areas', 'Loose handrail on the east stairwell', 'The handrail between the 2nd and 3rd floors on the east stairs has come loose.'],
            ['Common areas', 'Playground swing chain is damaged', 'One chain on the left swing is frayed and looks unsafe for children.'],
            ['Noise & neighbours', 'Dog barking through the night', 'A dog in the neighbouring unit barks for long periods after midnight.'],
            ['Noise & neighbours', 'Smoking in the shared corridor', 'There is regular cigarette smoke in the 5th-floor corridor near the fire exit.'],
            ['Noise & neighbours', 'Loud music on weeknights', 'Music with heavy bass is played until about 1 am on most weeknights.'],
            ['General inquiry', 'How do I register a new vehicle?', 'I have changed cars and need to know how to register the new plate for parking.'],
            ['General inquiry', 'Schedule for the water tank cleaning', 'Is there a date set for the next water interruption for tank cleaning?'],
        ];

        $targets = [
            ...array_fill(0, 9, 'closed'),
            ...array_fill(0, 7, 'resolved'),
            ...array_fill(0, 5, 'in_progress'),
            ...array_fill(0, 3, 'under_review'),
            ...array_fill(0, 2, 'open'),
            ...array_fill(0, 2, 'waiting_for_customer'),
        ];

        $customers = ['customer', 'customer2', 'customer3', 'customer4', 'customer5'];
        $handlers = ['staff', 'staff2', 'staff', 'staff2', 'admin'];
        $priorities = ['low', 'medium', 'medium', 'medium', 'high', 'high', 'urgent'];
        $dueHours = ['low' => 336, 'medium' => 168, 'high' => 72, 'urgent' => 24];

        $resolutions = [
            'A technician attended, repaired the fault, and tested it with the resident present. No further action is needed.',
            'The issue was traced to a worn part, which has been replaced. Everything was checked and is working normally.',
            'Our team inspected the area, completed the repair, and confirmed the result with building security.',
            'The account was reviewed and corrected. An updated statement has been sent to your registered email.',
            'The matter was raised with the people involved and has been settled. Please let us know if it happens again.',
        ];

        $scenarios = [];

        foreach ($pool as $index => [$category, $title, $description]) {
            $target = $targets[$index];
            $handler = $handlers[$index % count($handlers)];
            $customer = $customers[$index % count($customers)];
            $priority = $priorities[mt_rand(0, count($priorities) - 1)];

            $age = match ($target) {
                'closed' => mt_rand(18, 80) * 24,
                'resolved' => mt_rand(6, 16) * 24,
                'open' => mt_rand(2, 40),
                default => mt_rand(3, 11) * 24,
            } + mt_rand(0, 12);

            $steps = [];

            if ($target !== 'open') {
                $steps[] = self::step(mt_rand(1, 8), 'status', $handler, 'under_review');
                $steps[] = self::step(0.1, 'assign', $handler, $handler);
                $steps[] = self::step(0.1, 'due', $handler, $dueHours[$priority]);
            }

            if (in_array($target, ['in_progress', 'waiting_for_customer', 'resolved', 'closed'], true)) {
                $steps[] = self::step(mt_rand(3, 22), 'status', $handler, 'in_progress');
                $steps[] = self::step(0.3, 'comment', $handler, null, 'We have looked into this and scheduled the work. We will post an update here as soon as it is done.');
            }

            if ($target === 'waiting_for_customer') {
                $steps[] = self::step(mt_rand(4, 20), 'status', $handler, 'waiting_for_customer', 'Could you let us know a time when someone will be home so our team can get access?');
            }

            if (in_array($target, ['resolved', 'closed'], true)) {
                $steps[] = self::step(mt_rand(12, 96), 'status', $handler, 'resolved', $resolutions[$index % count($resolutions)]);
            }

            if ($target === 'closed') {
                // Roughly half are confirmed by the customer, the rest closed by the team.
                $steps[] = self::step(mt_rand(6, 60), 'status', $index % 2 ? $customer : $handler, 'closed');
            }

            $scenarios[] = [
                'by' => $customer,
                'category' => $category,
                'priority' => $priority,
                'age_hours' => $age,
                'title' => $title,
                'description' => $description,
                'steps' => $steps,
            ];
        }

        return $scenarios;
    }
}
