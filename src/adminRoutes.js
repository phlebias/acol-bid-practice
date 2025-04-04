import AdminPage from './components/AdminPage';
import { Navigate } from 'react-router-dom';
import { FEATURES } from './config';

// Only export admin routes if admin is enabled
const adminRoutes = FEATURES.SHOW_ADMIN ? [
  { path: '/login', element: <AdminPage /> },
  { path: '/admin', element: <AdminPage /> }
] : [
  { path: '/login', element: <Navigate to="/main" replace /> },
  { path: '/admin', element: <Navigate to="/main" replace /> }
];

export default adminRoutes;