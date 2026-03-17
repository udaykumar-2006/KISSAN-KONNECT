import { useAppStore } from "@/stores/AppStore";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/stores/NotificationStore";
import { orderStatusLabels} from "@/data/ordersData";
import OrderTracker from "@/components/OrderTracker";
import StarRating from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import  toast  from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FarmerOrders = () => {
  const { userId, userName } = useAuth();
  const { orders, updateOrderStatus, addBuyerRating, buyerRatings } = useAppStore();
  const { addNotification } = useNotifications();
  const myOrders = orders.filter(o => o.farmerId === userId);

  const activeOrders = myOrders.filter(o => o.status !== "delivered");
  const completedOrders = myOrders.filter(o => o.status === "delivered");

  const getNextStatus = (status) => {
    const map = {
      confirmed: { next: "packing", label: "Start Packing" },
      packing: { next: "in_transit", label: "Mark In Transit" },
      in_transit: { next: "out_for_delivery", label: "Out for Delivery" },
      out_for_delivery: { next: "delivered", label: "Mark Delivered" },
    };
    return map[status] || null;
  };

  const handleStatusUpdate = (order, nextStatus) => {
    updateOrderStatus(order.id, nextStatus);
    addNotification({ userId: order.buyerId, title: "Order Update", message: `Your order ${order.id} is now "${orderStatusLabels[nextStatus]}"`, type: "order" });
    toast.success(`Order status updated to "${orderStatusLabels[nextStatus]}" ✅`);
  };

  const handleRateBuyer = (buyerId, orderId, rating) => {
    const existing = buyerRatings.find(r => r.orderId === orderId && r.farmerId === userId);
    if (existing) { toast.info("You've already rated this buyer"); return; }
    addBuyerRating({ buyerId, farmerId: userId, farmerName: userName, orderId, rating });
    toast.success(`Rated buyer ${rating} star${rating > 1 ? "s" : ""}! ⭐`);
  };

  const getFarmerRating = (orderId) => {
    return buyerRatings.find(r => r.orderId === orderId && r.farmerId === userId)?.rating || 0;
  };

  const renderOrder = (order) => {
    const isDelivered = order.status === "delivered";
    const myRating = getFarmerRating(order.id);
    return (
    <div key={order.id} className="rounded-xl border border-border bg-card shadow-card p-5 hover:shadow-elevated transition-shadow">
      <div className="flex flex-col md:flex-row gap-4">
        <img src={order.image} alt={order.cropName} className="w-20 h-20 rounded-lg object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-display font-bold text-card-foreground">{order.cropName}</h3>
              <p className="text-xs text-muted-foreground">Buyer: {order.buyerName} · Order #{order.id}</p>
            </div>
            <Badge variant="outline">{orderStatusLabels[order.status]}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div><span className="text-muted-foreground">Qty:</span> <span className="font-semibold text-card-foreground">{order.quantityKg}kg</span></div>
            <div><span className="text-muted-foreground">Total:</span> <span className="font-semibold text-card-foreground">₹{order.totalPrice.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Advance:</span> <span className="font-semibold text-success">₹{order.advancePaid.toLocaleString()}</span></div>
          </div>
          <OrderTracker currentStatus={order.status} />
          {getNextStatus(order.status) && (
            <div className="mt-4">
              <Button size="sm" className="gradient-hero text-primary-foreground border-0" onClick={() => handleStatusUpdate(order, getNextStatus(order.status).next)}>
                {getNextStatus(order.status).label}
              </Button>
            </div>
          )}
          {isDelivered && (
            <div className="mt-3 flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
              <span className="text-xs text-muted-foreground font-medium">{myRating ? "Your rating:" : "Rate buyer:"}</span>
              <StarRating rating={myRating} onRate={(r) => handleRateBuyer(order.buyerId, order.id, r)} readonly={myRating > 0} size="sm" />
              {myRating > 0 && <span className="text-xs text-success font-medium">Thanks! ✓</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Orders</h1>
        <p className="text-muted-foreground text-sm">Manage and update order status</p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-4 mt-4">
          {activeOrders.map(renderOrder)}
          {activeOrders.length === 0 && <p className="text-center text-muted-foreground py-12">No active orders</p>}
        </TabsContent>
        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedOrders.map(renderOrder)}
          {completedOrders.length === 0 && <p className="text-center text-muted-foreground py-12">No completed orders yet</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FarmerOrders;
