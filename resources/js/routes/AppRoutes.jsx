import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/ui/States';
import { GuestOnly, RequireAuth, RequireRole } from '@/features/auth/guards';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RegisterPage } from '@/pages/RegisterPage';

// The signed-in application is split from the public pages so visitors download less.
const page = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })));

const DashboardPage = page(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage');
const ConcernsPage = page(() => import('@/features/concerns/ConcernsPage'), 'ConcernsPage');
const ConcernFormPage = page(() => import('@/features/concerns/ConcernFormPage'), 'ConcernFormPage');
const ConcernDetailPage = page(() => import('@/features/concerns/ConcernDetailPage'), 'ConcernDetailPage');
const ReportsPage = page(() => import('@/features/reports/ReportsPage'), 'ReportsPage');
const CategoriesPage = page(() => import('@/features/categories/CategoriesPage'), 'CategoriesPage');
const TeamPage = page(() => import('@/features/organizations/TeamPage'), 'TeamPage');
const OrganizationSettingsPage = page(() => import('@/features/organizations/OrganizationSettingsPage'), 'OrganizationSettingsPage');
const WelcomePage = page(() => import('@/features/organizations/WelcomePage'), 'WelcomePage');
const ProfilePage = page(() => import('@/features/profile/ProfilePage'), 'ProfilePage');

const fallback = <LoadingState className="min-h-[60vh]" />;

export function AppRoutes() {
    return (
        <Suspense fallback={fallback}>
            <Routes>
                <Route path="/" element={<HomePage />} />

                <Route element={<GuestOnly />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Route>

                <Route element={<RequireAuth requireWorkspace={false} />}>
                    <Route path="/welcome" element={<WelcomePage />} />
                </Route>

                <Route element={<RequireAuth />}>
                    <Route element={<AppShell />}>
                        <Route path="/dashboard" element={<DashboardPage />} />

                        <Route path="/concerns" element={<ConcernsPage />} />
                        <Route path="/concerns/create" element={<ConcernFormPage />} />
                        <Route path="/concerns/:id" element={<ConcernDetailPage />} />
                        <Route path="/concerns/:id/edit" element={<ConcernFormPage />} />

                        <Route path="/profile" element={<ProfilePage />} />

                        <Route element={<RequireRole roles={['staff', 'admin']} />}>
                            <Route path="/reports" element={<ReportsPage />} />
                        </Route>

                        <Route element={<RequireRole roles={['admin']} />}>
                            <Route path="/team" element={<TeamPage />} />
                            <Route path="/categories" element={<CategoriesPage />} />
                            <Route path="/settings" element={<OrganizationSettingsPage />} />
                        </Route>
                    </Route>
                </Route>

                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </Suspense>
    );
}
