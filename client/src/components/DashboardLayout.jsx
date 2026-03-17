import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Sprout, LayoutDashboard, Wheat, ShoppingBag, MessageSquare, LogOut, Store, Package, Users, BarChart3, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";

const farmerLinks = [
  { title: "Dashboard", url: "/farmer", icon: LayoutDashboard },
  { title: "My Crops", url: "/farmer/crops", icon: Wheat },
  { title: "Orders", url: "/farmer/orders", icon: ShoppingBag },
  { title: "Bargains", url: "/farmer/bargains", icon: MessageSquare },
  { title: "Profile", url: "/farmer/profile", icon: Settings },
];

const buyerLinks = [
  { title: "Browse Crops", url: "/buyer", icon: Store },
  { title: "My Orders", url: "/buyer/orders", icon: Package },
  { title: "Bargains", url: "/buyer/bargains", icon: MessageSquare },
  { title: "Profile", url: "/buyer/profile", icon: Settings },
];

const adminLinks = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Farmers", url: "/admin/farmers", icon: Sprout },
  { title: "Buyers", url: "/admin/buyers", icon: Users },
  { title: "Orders", url: "/admin/orders", icon: Package },
  { title: "Revenue", url: "/admin/revenue", icon: BarChart3 },
  { title: "Profile", url: "/admin/profile", icon: Settings },
];

const DashboardLayout = ({ children }) => {
  const { role, userName, logout } = useAuth();
  const navigate = useNavigate();
  

  const links = role === "farmer" ? farmerLinks : role === "buyer" ? buyerLinks : adminLinks;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon" className="border-r-0">
          <SidebarContent className="flex flex-col h-full">
            <div className="p-4 flex items-center gap-2">
              <Sprout className="w-7 h-7 text-sidebar-primary shrink-0" />
              <span className="font-display text-lg font-bold text-sidebar-foreground truncate">Kissan Konnect</span>
            </div>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50">Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {links.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/farmer" || item.url === "/buyer" || item.url === "/admin"}
                          className="hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <div className="mt-auto p-4">
              <div className="text-sm text-sidebar-foreground/70 mb-2 truncate">{userName}</div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-background px-4 shrink-0">
            <div className="flex items-center">
              <SidebarTrigger className="mr-4" />
              <h2 className="font-display font-semibold text-foreground capitalize">{role} Portal</h2>
            </div>
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-auto p-6 bg-muted/30">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
