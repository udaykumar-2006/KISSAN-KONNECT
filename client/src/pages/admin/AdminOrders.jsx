import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import * as api from "@/services/api";
import { orderStatusLabels } from "@/data/ordersData";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.getAdminOrders();
        setOrders(res.data);
      } catch (error) {
        toast.error("Failed to fetch orders");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">All Orders</h1>
        <p className="text-muted-foreground text-sm">Platform-wide order management ({orders.length} total)</p>
      </div>
      <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground">
            <th className="text-left p-4 font-medium">Order</th>
            <th className="text-left p-4 font-medium">Crop</th>
            <th className="text-left p-4 font-medium">Buyer</th>
            <th className="text-left p-4 font-medium">Farmer</th>
            <th className="text-left p-4 font-medium">Qty</th>
            <th className="text-left p-4 font-medium">Total</th>
            <th className="text-left p-4 font-medium">Status</th>
            <th className="text-left p-4 font-medium">Date</th>
          </tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="p-4 font-mono text-xs text-card-foreground">{o.id.slice(-12)}</td>
                <td className="p-4 text-card-foreground">{o.cropName}</td>
                <td className="p-4 text-muted-foreground">{o.buyerName}</td>
                <td className="p-4 text-muted-foreground">{o.farmerName}</td>
                <td className="p-4 text-card-foreground">{o.quantityKg}kg</td>
                <td className="p-4 font-semibold text-card-foreground">₹{o.totalPrice.toLocaleString()}</td>
                <td className="p-4"><Badge variant="outline" className="text-xs">{orderStatusLabels[o.status] || o.status}</Badge></td>
                <td className="p-4 text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan="8" className="p-4 text-center text-muted-foreground">No orders found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders;
