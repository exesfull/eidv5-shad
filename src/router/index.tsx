// src/router/index.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import PasswordForgotPage from '@/pages/PasswordForgotPage'
import CreateAccountPage from '@/pages/CreateAccountPage'
import NotFoundPage from '@/pages/NotFoundPage'

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