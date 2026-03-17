import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/stores/AppStore";
import { Users } from "lucide-react";

const AdminBuyers = () => {
  const { allUsers } = useAuth();
  const { orders } = useAppStore();
  const buyers = allUsers.filter(u => u.role === "buyer");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Buyers</h1>
        <p className="text-muted-foreground text-sm">All registered buyers ({buyers.length})</p>
      </div>
      <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground">
            <th className="text-left p-4 font-medium">Buyer</th>
            <th className="text-left p-4 font-medium">Email</th>
            <th className="text-left p-4 font-medium">Location</th>
            <th className="text-left p-4 font-medium">Orders</th>
            <th className="text-left p-4 font-medium">Total Spent</th>
          </tr></thead>
          <tbody>
            {buyers.map(b => {
              const buyerOrders = orders.filter(o => o.buyerId === b.id);
              const spent = buyerOrders.reduce((s, o) => s + o.totalPrice, 0);
              return (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-4 font-semibold text-card-foreground flex items-center gap-2"><Users className="w-4 h-4 text-secondary" />{b.name}</td>
                  <td className="p-4 text-muted-foreground">{b.email}</td>
                  <td className="p-4 text-muted-foreground">{b.address.city}, {b.address.state}</td>
                  <td className="p-4 text-card-foreground">{buyerOrders.length}</td>
                  <td className="p-4 font-semibold text-primary">₹{spent.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBuyers;
