import { useState, useEffect } from "react";
import { Sprout, Loader2 } from "lucide-react";
import * as api from "@/services/api";
import toast from "react-hot-toast";

const AdminFarmers = () => {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const res = await api.getAdminUsers("farmer");
        setFarmers(res.data);
      } catch (error) {
        toast.error("Failed to fetch farmers");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchFarmers();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

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
            <th className="text-left p-4 font-medium">Crops Listed</th>
            <th className="text-left p-4 font-medium">Orders</th>
            <th className="text-left p-4 font-medium">Revenue</th>
          </tr></thead>
          <tbody>
            {farmers.map(f => (
              <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="p-4 font-semibold text-card-foreground flex items-center gap-2"><Sprout className="w-4 h-4 text-primary" />{f.name}</td>
                <td className="p-4 text-muted-foreground">{f.email}</td>
                <td className="p-4 text-muted-foreground">{f.address?.city || 'N/A'}, {f.address?.state || ''}</td>
                <td className="p-4 text-card-foreground">{f.cropCount || 0}</td>
                <td className="p-4 text-card-foreground">{f.orderCount || 0}</td>
                <td className="p-4 font-semibold text-primary">₹{(f.revenue || 0).toLocaleString()}</td>
              </tr>
            ))}
            {farmers.length === 0 && <tr><td colSpan="6" className="p-4 text-center text-muted-foreground">No farmers found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFarmers;
