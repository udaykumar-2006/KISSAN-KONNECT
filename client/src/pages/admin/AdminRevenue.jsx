import { IndianRupee, TrendingUp, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/AppStore";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const AdminRevenue = () => {
  const { orders } = useAppStore();
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
  const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

  // Simulated monthly data based on total
  const revenueData = [
    Math.round(totalRevenue * 0.08),
    Math.round(totalRevenue * 0.12),
    Math.round(totalRevenue * 0.15),
    Math.round(totalRevenue * 0.13),
    Math.round(totalRevenue * 0.19),
    Math.round(totalRevenue * 0.33),
  ];
  const maxRevenue = Math.max(...revenueData, 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Revenue Analytics</h1>
        <p className="text-muted-foreground text-sm">Platform revenue overview</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee },
          { label: "This Month", value: `₹${revenueData[5].toLocaleString()}`, icon: TrendingUp },
          { label: "Avg Order Value", value: `₹${avgOrderValue.toLocaleString()}`, icon: BarChart3 },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-shadow">
            <div className="w-10 h-10 rounded-lg gradient-golden flex items-center justify-center mb-3">
              <s.icon className="w-5 h-5 text-secondary-foreground" />
            </div>
            <p className="text-2xl font-bold text-card-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card p-6">
        <h2 className="font-display font-bold text-card-foreground mb-6">Monthly Revenue</h2>
        <div className="flex items-end gap-4 h-48">
          {revenueData.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-card-foreground">₹{(val / 1000).toFixed(1)}k</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(val / maxRevenue) * 100}%` }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="w-full rounded-t-lg gradient-hero min-h-[4px]"
              />
              <span className="text-xs text-muted-foreground">{months[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminRevenue;
