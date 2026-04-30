import { useState, useEffect } from "react";
import { Users, Loader2 } from "lucide-react";
import * as api from "@/services/api";
import toast from "react-hot-toast";

const AdminBuyers = () => {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBuyers = async () => {
      try {
        const res = await api.getAdminUsers("buyer");
        setBuyers(res.data);
      } catch (error) {
        toast.error("Failed to fetch buyers");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchBuyers();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

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
            {buyers.map(b => (
              <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="p-4 font-semibold text-card-foreground flex items-center gap-2"><Users className="w-4 h-4 text-secondary" />{b.name}</td>
                <td className="p-4 text-muted-foreground">{b.email}</td>
                <td className="p-4 text-muted-foreground">{b.address?.city || 'N/A'}, {b.address?.state || ''}</td>
                <td className="p-4 text-card-foreground">{b.orderCount || 0}</td>
                <td className="p-4 font-semibold text-primary">₹{(b.revenue || 0).toLocaleString()}</td>
              </tr>
            ))}
            {buyers.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-muted-foreground">No buyers found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBuyers;
