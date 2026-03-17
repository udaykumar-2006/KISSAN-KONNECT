import { useState } from "react";
import { useAppStore } from "@/stores/AppStore";
import { useAuth } from "@/contexts/AuthContext";
import { orderStatusLabels } from "@/data/ordersData";
import OrderTracker from "@/components/OrderTracker";
import StarRating from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import  toast  from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BuyerOrders = () => {
  const { userId, userName } = useAuth();
  const { orders, payRemaining, addRating, ratings } = useAppStore();
  const myOrders = orders.filter(o => o.buyerId === userId);

  const activeOrders = myOrders.filter(o => o.status !== "delivered");
  const completedOrders = myOrders.filter(o => o.status === "delivered");

  const handlePayRemaining = (orderId, amount) => {
    payRemaining(orderId);
    toast.success(`Payment of ₹${amount.toLocaleString()} completed! Order delivered 🎉`);
  };

  const handleRate = (cropId, rating) => {
    const existing = ratings.find(r => r.cropId === cropId && r.buyerId === userId);
    if (existing) { toast.info("You've already rated this crop"); return; }
    addRating({ cropId, buyerId: userId, buyerName: userName, rating });
    toast.success(`Rated ${rating} star${rating > 1 ? "s" : ""}! ⭐`);
  };

  const getUserRating = (cropId) => {
    return ratings.find(r => r.cropId === cropId && r.buyerId === userId)?.rating || 0;
  };

  const renderOrder = (order) => {
    const myRating = getUserRating(order.cropId);
    const isDelivered = order.status === "delivered";

    return (
      <div key={order.id} className="rounded-xl border border-border bg-card shadow-card p-5 hover:shadow-elevated transition-shadow">
        <div className="flex flex-col md:flex-row gap-4">
          <img src={order.image} alt={order.cropName} className="w-20 h-20 rounded-lg object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-display font-bold text-card-foreground">{order.cropName}</h3>
                <p className="text-xs text-muted-foreground">Farmer: {order.farmerName} · Order #{order.id}</p>
              </div>
              <Badge variant="outline">{orderStatusLabels[order.status]}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              <div><span className="text-muted-foreground">Qty:</span> <span className="font-semibold text-card-foreground">{order.quantityKg}kg</span></div>
              <div><span className="text-muted-foreground">Total:</span> <span className="font-semibold text-card-foreground">₹{order.totalPrice.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Remaining:</span> <span className="font-semibold text-warning">₹{order.remainingAmount.toLocaleString()}</span></div>
            </div>
            <OrderTracker currentStatus={order.status} />
            {order.status === "out_for_delivery" && order.remainingAmount > 0 && (
              <div className="mt-4">
                <Button size="sm" className="gradient-golden text-secondary-foreground border-0" onClick={() => handlePayRemaining(order.id, order.remainingAmount)}>
                  Pay Remaining ₹{order.remainingAmount.toLocaleString()}
                </Button>
              </div>
            )}
            {isDelivered && (
              <div className="mt-3 flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                <span className="text-xs text-muted-foreground font-medium">{myRating ? "Your rating:" : "Rate this crop:"}</span>
                <StarRating rating={myRating} onRate={(r) => handleRate(order.cropId, r)} readonly={myRating > 0} size="sm" />
                {myRating > 0 && <span className="text-xs text-success font-medium">Thanks! ✓</span>}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">📍 {order.address}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">My Orders</h1>
        <p className="text-muted-foreground text-sm">Track your purchases</p>
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

export default BuyerOrders;
