import { motion } from "framer-motion";
import { Users, Sprout, Package, IndianRupee, ArrowUpRight, MessageSquare } from "lucide-react";
import { useAppStore } from "@/stores/AppStore";
import { useAuth } from "@/contexts/AuthContext";

const AdminDashboard = () => {
  const { orders, crops, bargains } = useAppStore();
  const { allUsers } = useAuth();

  const totalFarmers = allUsers.filter(u => u.role === "farmer").length;
  const totalBuyers = allUsers.filter(u => u.role === "buyer").length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
  const activeBargains = bargains.filter(b => b.status === "active").length;

  const stats = [
    { label: "Total Farmers", value: String(totalFarmers), icon: Sprout, change: "+12%" },
    { label: "Total Buyers", value: String(totalBuyers), icon: Users, change: "+8%" },
    { label: "Total Orders", value: String(orders.length), icon: Package, change: "+24%" },
    { label: "Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, change: "+18%" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and analytics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xs text-success flex items-center gap-0.5 font-medium">
                <ArrowUpRight className="w-3 h-3" />{s.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-card-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="p-5 border-b border-border">
          <h2 className="font-display font-bold text-card-foreground">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-4 font-medium">Order ID</th>
                <th className="text-left p-4 font-medium">Crop</th>
                <th className="text-left p-4 font-medium">Buyer</th>
                <th className="text-left p-4 font-medium">Farmer</th>
                <th className="text-left p-4 font-medium">Amount</th>
                <th className="text-left p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map(o => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-4 font-mono text-xs text-card-foreground">{o.id}</td>
                  <td className="p-4 text-card-foreground">{o.cropName}</td>
                  <td className="p-4 text-muted-foreground">{o.buyerName}</td>
                  <td className="p-4 text-muted-foreground">{o.farmerName}</td>
                  <td className="p-4 font-semibold text-card-foreground">₹{o.totalPrice.toLocaleString()}</td>
                  <td className="p-4"><span className="px-2 py-1 rounded-full text-xs bg-accent text-accent-foreground capitalize">{o.status.replace(/_/g, " ")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Bargains */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold text-card-foreground">Active Bargains</h2>
          <span className="text-xs bg-warning/20 text-warning px-2 py-1 rounded-full font-medium">{activeBargains} active</span>
        </div>
        <div className="p-5 space-y-3">
          {bargains.filter(b => b.status === "active").map(b => (
            <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <img src={b.cropImage} alt="" className="w-8 h-8 rounded object-cover" />
                <div>
                  <p className="font-semibold text-sm text-card-foreground">{b.cropName}</p>
                  <p className="text-xs text-muted-foreground">{b.buyerName} ↔ {b.farmerName}</p>
                </div>
              </div>
              <span className="px-2 py-1 rounded-full text-xs bg-warning/20 text-warning font-medium">{b.messages.length} messages</span>
            </div>
          ))}
          {activeBargains === 0 && <p className="text-center text-muted-foreground text-sm py-4">No active bargains</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
