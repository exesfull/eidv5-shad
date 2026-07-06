// src/router/index.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import PasswordForgotPage from '@/pages/PasswordForgotPage'
import CreateAccountPage from '@/pages/CreateAccountPage'
import NotFoundPage from '@/pages/NotFoundPage'
import WebAuthnPage from '@/pages/WebAuthnPage'
import PushAuthPage from '@/pages/PushAuthPage'
import PushAuthEmailPage from '@/pages/PushAuthEmailPage'
import ProfilePage from '@/pages/ProfilePage'
import SecurityPage from '@/pages/SecurityPage'
import SessionsPage from '@/pages/SessionsPage'
import MyPage from '@/pages/MyPage'
import { Navigate } from 'react-router-dom'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/create',
    element: <CreateAccountPage />,
  },
  {
    path: '/forgotPassword',
    element: <PasswordForgotPage />,
  },
  {
    path: '/webauthn',
    element: <WebAuthnPage />,
  },
  {
    path: '/push-auth',
    element: <PushAuthPage />,
  },
  {
    path: '/push-auth/email',
    element: <PushAuthEmailPage />,
  },
  {
    path: '/my/profile',
    element: <ProfilePage />,
  },
  {
    path: '/my',
    element: <MyPage />,
  },
  {
    path: '/my/security',
    element: <SecurityPage />,
  },
  {
    path: '/security/sessions',
    element: <SessionsPage />,
  },
  {
    path: '/my/securety',
    element: <Navigate to="/my/security" replace />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
  // добавьте другие маршруты по необходимости
], {
  // 🔥 basename для работы в поддиректории /oauth/
  basename: '/oauth',
})

export default function AppRouter() {
  return <RouterProvider router={router} />
}
