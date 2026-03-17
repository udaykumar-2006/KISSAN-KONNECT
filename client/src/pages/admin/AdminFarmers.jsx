import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/stores/AppStore";
import { Sprout } from "lucide-react";

const AdminFarmers = () => {
  const { allUsers } = useAuth();
  const { crops, orders } = useAppStore();
  const farmers = allUsers.filter(u => u.role === "farmer");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Farmers</h1>
        <p className="text-muted-foreground text-sm">All registered farmers ({farmers.length})</p>
      </div>
      <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground">
            <th className="text-left p-4 font-medium">Farmer</th>
            <th className="text-left p-4 font-medium">Email</th>
            <th className="text-left p-4 font-medium">Location</th>
            <th className="text-left p-4 font-medium">Crops</th>
            <th className="text-left p-4 font-medium">Orders</th>
            <th className="text-left p-4 font-medium">Revenue</th>
          </tr></thead>
          <tbody>
            {farmers.map(f => {
              const farmerCrops = crops.filter(c => c.farmerId === f.id).length;
              const farmerOrders = orders.filter(o => o.farmerId === f.id);
              const revenue = farmerOrders.reduce((s, o) => s + o.totalPrice, 0);
              return (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-4 font-semibold text-card-foreground flex items-center gap-2"><Sprout className="w-4 h-4 text-primary" />{f.name}</td>
                  <td className="p-4 text-muted-foreground">{f.email}</td>
                  <td className="p-4 text-muted-foreground">{f.address.city}, {f.address.state}</td>
                  <td className="p-4 text-card-foreground">{farmerCrops}</td>
                  <td className="p-4 text-card-foreground">{farmerOrders.length}</td>
                  <td className="p-4 font-semibold text-primary">₹{revenue.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFarmers;
