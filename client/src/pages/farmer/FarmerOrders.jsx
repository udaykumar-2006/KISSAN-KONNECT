import { useState, useEffect, useCallback } from 'react';
import { orderStatusLabels } from '@/data/ordersData';
import OrderTracker from '@/components/OrderTracker';
import RatingDialog from '@/components/RatingDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, PackageSearch, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '@/services/api';
import { getSocket } from '@/services/socket';

const statusColor = {
  PENDING_ADDRESS:          'border-rose-500 text-rose-500',
  AWAITING_ADVANCE_PAYMENT: 'border-amber-500 text-amber-500',
  CONFIRMED:                'border-blue-500 text-blue-500',
  FARMER_CONFIRMED:         'border-blue-600 text-blue-600',
  READY_FOR_PICKUP:         'border-indigo-500 text-indigo-500',
  OUT_FOR_DELIVERY:         'border-orange-500 text-orange-500',
  DELIVERED:                'border-green-600 text-green-600',
  COMPLETED:                'border-green-700 text-green-700',
};

// Farmer can only progress forward one step at a time
const nextStepMap = {
  CONFIRMED:        { next: 'FARMER_CONFIRMED',  label: 'Confirm Order' },
  FARMER_CONFIRMED: { next: 'READY_FOR_PICKUP',  label: 'Mark Ready for Pickup' },
  READY_FOR_PICKUP: { next: 'OUT_FOR_DELIVERY',  label: 'Mark Out for Delivery' },
  DELIVERED:        { next: 'COMPLETED',          label: 'Mark Completed' },
};

const FarmerOrders = () => {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState(null);

  // Rating state
  const [rateOrder, setRateOrder] = useState(null);
  const [ratedOrders, setRatedOrders] = useState(new Set());

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.getOrders();
      setOrders(data);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Real-time order status updates via socket
  useEffect(() => {
    const socket = getSocket();
    orders.forEach(o => {
      const roomId = o.bargainId?.toString();
      if (socket.connected && roomId) socket.emit('join_room', { roomId });
    });
    const onConnect = () => orders.forEach(o => { if (o.bargainId) socket.emit('join_room', { roomId: o.bargainId.toString() }) });
    socket.on('connect', onConnect);
    const onOrderUpdated = (data) => {
      setOrders(prev => prev.map(o =>
        o._id?.toString() === data.orderId?.toString()
          ? { ...o, status: data.status, paymentStatus: data.paymentStatus, advancePaid: data.advancePaid, remainingAmount: data.remainingAmount }
          : o
      ));
    };
    socket.on('order_updated', onOrderUpdated);
    return () => {
      socket.off('connect', onConnect);
      socket.off('order_updated', onOrderUpdated);
    };
  }, [orders.length]);

  const handleStatusUpdate = async (order, nextStatus) => {
    setUpdating(order._id);
    try {
      const { data } = await api.updateOrderStatus(order._id, nextStatus);
      setOrders(prev => prev.map(o => o._id === data._id ? data : o));
      toast.success(`✅ Status: ${orderStatusLabels[nextStatus] || nextStatus}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setUpdating(null); }
  };

  const handleRatingComplete = (orderId) => {
    setRatedOrders(prev => new Set(prev).add(orderId));
  };

  const activeOrders    = orders.filter(o => o.status !== 'COMPLETED');
  const completedOrders = orders.filter(o => o.status === 'COMPLETED');

  const renderOrder = (order) => {
    const step = nextStepMap[order.status];
    return (
      <div key={order._id} className="rounded-xl border border-border bg-card shadow-card p-5 hover:shadow-elevated transition-shadow">
        <div className="flex flex-col md:flex-row gap-4">
          <img src={order.cropImage} alt={order.cropName} className="w-20 h-20 rounded-lg object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2 gap-2">
              <div>
                <h3 className="font-display font-bold text-card-foreground">{order.cropName}</h3>
                <p className="text-xs text-muted-foreground">Buyer: {order.buyerName} · #{order._id.slice(-8).toUpperCase()}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColor[order.status]||''}`}>
                {orderStatusLabels[order.status]||order.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
              <div><p className="text-xs text-muted-foreground">Qty</p><p className="font-semibold">{order.quantityKg} kg</p></div>
              <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">₹{order.totalPrice.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Advance</p><p className={`font-semibold ${order.advancePaid?'text-green-600':'text-amber-500'}`}>{order.advancePaid?`₹${order.advanceAmount?.toLocaleString()} ✓`:'Pending'}</p></div>
              <div><p className="text-xs text-muted-foreground">Payment</p><p className="font-semibold capitalize">{order.paymentStatus?.replace(/_/g,' ')||'—'}</p></div>
            </div>

            <OrderTracker currentStatus={order.status} />

            {/* Waiting states */}
            {['PENDING_ADDRESS','AWAITING_ADVANCE_PAYMENT'].includes(order.status) && (
              <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700">
                {order.status === 'PENDING_ADDRESS' ? '⏳ Waiting for buyer to submit delivery address.' : `⏳ Waiting for buyer to pay ₹${order.advanceAmount?.toLocaleString()} advance.`}
              </div>
            )}

            {/* Farmer progress button */}
            {step && !['PENDING_ADDRESS','AWAITING_ADVANCE_PAYMENT'].includes(order.status) && (
              <div className="mt-4">
                <Button size="sm" className="gradient-hero text-primary-foreground border-0" onClick={() => handleStatusUpdate(order, step.next)} disabled={updating===order._id}>
                  {updating===order._id?<><Loader2 className="w-4 h-4 animate-spin mr-2"/>Updating…</>:step.label}
                </Button>
              </div>
            )}

            {/* OUT_FOR_DELIVERY */}
            {order.status === 'OUT_FOR_DELIVERY' && (
              <div className="mt-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-sm text-orange-700">
                📦 Waiting for buyer to pay remaining ₹{order.remainingAmount?.toLocaleString()} before delivery is confirmed.
              </div>
            )}

            {/* Rate buyer after completion */}
            {order.status === 'COMPLETED' && (
                <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2">
                    <Star className={`w-4 h-4 ${(order.isRatedByFarmer || ratedOrders.has(order._id)) ? 'text-secondary fill-secondary' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-medium">{(order.isRatedByFarmer || ratedOrders.has(order._id)) ? 'Rating submitted!' : 'How was the buyer?'}</span>
                </div>
                {!(order.isRatedByFarmer || ratedOrders.has(order._id)) && (
                    <Button size="sm" variant="outline" className="h-8 text-xs px-3 bg-background hover:bg-muted" onClick={() => setRateOrder(order)}>
                    Rate Buyer
                    </Button>
                )}
                </div>
            )}

            {order.address && <p className="text-xs text-muted-foreground mt-2">📍 {order.address}</p>}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary mr-3" /><span className="text-muted-foreground">Loading orders…</span></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-bold">Orders</h1><p className="text-muted-foreground text-sm">Manage and update order status</p></div>
        <Button variant="outline" size="sm" onClick={loadOrders}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <PackageSearch className="w-12 h-12 opacity-30" />
          <p className="text-sm">No orders yet. Orders appear after advance payment.</p>
        </div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-4 mt-4">
            {activeOrders.map(renderOrder)}
            {activeOrders.length===0 && <p className="text-center text-muted-foreground py-12">No active orders</p>}
          </TabsContent>
          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedOrders.map(renderOrder)}
            {completedOrders.length===0 && <p className="text-center text-muted-foreground py-12">No completed orders yet</p>}
          </TabsContent>
        </Tabs>
      )}

      {/* Rating Dialog */}
      {rateOrder && (
        <RatingDialog 
          isOpen={!!rateOrder} 
          onClose={() => setRateOrder(null)} 
          order={rateOrder} 
          type="farmer"
          onRatingComplete={() => handleRatingComplete(rateOrder._id)}
        />
      )}
    </div>
  );
};

export default FarmerOrders;
