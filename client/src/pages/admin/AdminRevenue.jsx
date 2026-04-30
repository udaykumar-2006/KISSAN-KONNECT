import { useState, useEffect } from "react";
import { IndianRupee, TrendingUp, BarChart3, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import * as api from "@/services/api";
import toast from "react-hot-toast";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const AdminRevenue = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const res = await api.getAdminRevenue();
        setData(res.data);
      } catch (error) {
        toast.error("Failed to fetch revenue data");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const { totalRevenue, avgOrderValue, revenueByMonth } = data;

  // Format revenue data for the chart. Let's show the last 6 months minimum.
  const chartData = [];
  const currentDate = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const m = d.getMonth() + 1; // 1-12
    const y = d.getFullYear();
    const found = revenueByMonth?.find(r => r._id.month === m && r._id.year === y);
    chartData.push({
      month: m,
      year: y,
      totalRevenue: found ? found.totalRevenue : 0
    });
  }

  const maxRevenue = Math.max(...chartData.map(d => d.totalRevenue), 1);
  const thisMonthRevenue = chartData[5].totalRevenue;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Revenue Analytics</h1>
        <p className="text-muted-foreground text-sm">Platform revenue overview</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee },
          { label: "This Month", value: `₹${thisMonthRevenue.toLocaleString()}`, icon: TrendingUp },
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
        <div className="flex items-end gap-4 h-64 mt-4">
          {chartData.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-xs font-semibold text-card-foreground mb-2">₹{(val.totalRevenue / 1000).toFixed(1)}k</span>
              <div className="w-full flex-1 flex items-end justify-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(val.totalRevenue / maxRevenue) * 100}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="w-full max-w-[4rem] rounded-t-lg gradient-hero min-h-[4px]"
                />
              </div>
              <span className="text-xs text-muted-foreground mt-2">{monthNames[val.month - 1]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminRevenue;
