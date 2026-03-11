import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/stores/AppStore";
import { NotificationProvider } from "@/stores/NotificationStore";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardLayout from "./components/DashboardLayout";
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import FarmerCrops from "./pages/farmer/FarmerCrops";
import FarmerOrders from "./pages/farmer/FarmerOrders";
import FarmerBargains from "./pages/farmer/FarmerBargains";
import BuyerBrowse from "./pages/buyer/BuyerBrowse";
import BuyerOrders from "./pages/buyer/BuyerOrders";
import BuyerBargains from "./pages/buyer/BuyerBargains";
import CropDetail from "./pages/buyer/CropDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFarmers from "./pages/admin/AdminFarmers";
import AdminBuyers from "./pages/admin/AdminBuyers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminRevenue from "./pages/admin/AdminRevenue";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";


// const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRole }) => {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" />;
  if (role !== allowedRole) return <Navigate to={`/${role}`} />;
  return <DashboardLayout>{children}</DashboardLayout>;
};

const App = () => (
  // <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="bottom-right" reverseOrder={false} />
      <AuthProvider>
        <AppProvider>
          <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth" element={<Navigate to="/login" />} />

              {/* Farmer */}
              <Route path="/farmer" element={<ProtectedRoute allowedRole="farmer"><FarmerDashboard /></ProtectedRoute>} />
              <Route path="/farmer/crops" element={<ProtectedRoute allowedRole="farmer"><FarmerCrops /></ProtectedRoute>} />
              <Route path="/farmer/orders" element={<ProtectedRoute allowedRole="farmer"><FarmerOrders /></ProtectedRoute>} />
              <Route path="/farmer/bargains" element={<ProtectedRoute allowedRole="farmer"><FarmerBargains /></ProtectedRoute>} />
              <Route path="/farmer/profile" element={<ProtectedRoute allowedRole="farmer"><ProfilePage /></ProtectedRoute>} />

              {/* Buyer */}
              <Route path="/buyer" element={<ProtectedRoute allowedRole="buyer"><BuyerBrowse /></ProtectedRoute>} />
              <Route path="/buyer/crop/:id" element={<ProtectedRoute allowedRole="buyer"><CropDetail /></ProtectedRoute>} />
              <Route path="/buyer/orders" element={<ProtectedRoute allowedRole="buyer"><BuyerOrders /></ProtectedRoute>} />
              <Route path="/buyer/bargains" element={<ProtectedRoute allowedRole="buyer"><BuyerBargains /></ProtectedRoute>} />
              <Route path="/buyer/profile" element={<ProtectedRoute allowedRole="buyer"><ProfilePage /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/farmers" element={<ProtectedRoute allowedRole="admin"><AdminFarmers /></ProtectedRoute>} />
              <Route path="/admin/buyers" element={<ProtectedRoute allowedRole="admin"><AdminBuyers /></ProtectedRoute>} />
              <Route path="/admin/orders" element={<ProtectedRoute allowedRole="admin"><AdminOrders /></ProtectedRoute>} />
              <Route path="/admin/revenue" element={<ProtectedRoute allowedRole="admin"><AdminRevenue /></ProtectedRoute>} />
              <Route path="/admin/profile" element={<ProtectedRoute allowedRole="admin"><ProfilePage /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </NotificationProvider>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  // </QueryClientProvider>
);

export default App;
