import { useAppStore } from "@/stores/AppStore";
import { orderStatusLabels } from "@/data/ordersData";
import { Badge } from "@/components/ui/badge";

const AdminOrders = () => {
  const { orders } = useAppStore();

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
                <td className="p-4 font-mono text-xs text-card-foreground">{o.id}</td>
                <td className="p-4 text-card-foreground">{o.cropName}</td>
                <td className="p-4 text-muted-foreground">{o.buyerName}</td>
                <td className="p-4 text-muted-foreground">{o.farmerName}</td>
                <td className="p-4 text-card-foreground">{o.quantityKg}kg</td>
                <td className="p-4 font-semibold text-card-foreground">₹{o.totalPrice.toLocaleString()}</td>
                <td className="p-4"><Badge variant="outline" className="text-xs">{orderStatusLabels[o.status]}</Badge></td>
                <td className="p-4 text-muted-foreground text-xs">{o.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders;
