// src/router/index.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import PasswordForgotPage from '@/pages/PasswordForgotPage'
import CreateAccountPage from '@/pages/CreateAccountPage'

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
  // добавьте другие маршруты по необходимости
], {
  // 🔥 basename для работы в поддиректории /oauth/
  basename: '/oauth',
})

export default function AppRouter() {
  return <RouterProvider router={router} />
}