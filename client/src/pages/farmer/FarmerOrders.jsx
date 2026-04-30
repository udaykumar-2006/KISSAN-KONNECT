import { useState, useEffect, useCallback } from 'react';
import { orderStatusLabels } from '@/data/ordersData';
import OrderTracker from '@/components/OrderTracker';
import RatingDialog from '@/components/RatingDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, PackageSearch, Star, CheckCircle2, Phone, MessageSquare, Clock, Package, CreditCard, MapPin, Search, ChevronDown } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter,   setTimeFilter]   = useState('all');

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

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.cropName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          o.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o._id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderOrder = (order) => {
    const step = nextStepMap[order.status];
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
      <div key={order._id} className="rounded-xl border border-border/80 bg-background overflow-hidden mb-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-muted/40 px-4 py-3 border-b border-border/80 flex flex-wrap items-center justify-between gap-4 text-[13px]">
          <div className="flex gap-8">
            <div className="space-y-0.5">
              <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Order Received</p>
              <p className="font-medium text-foreground">{orderDate}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Earnings</p>
              <p className="font-medium text-foreground">₹{order.totalPrice.toLocaleString()}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Buyer</p>
              <p className="font-medium text-primary hover:underline cursor-pointer">{order.buyerName}</p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-0.5">
            <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Order # {order._id.slice(-12).toUpperCase()}</p>
            <div className="flex gap-2 text-primary font-medium">
              <button className="hover:underline" onClick={() => { navigator.clipboard.writeText(order._id); toast.success('ID copied'); }}>Copy ID</button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex gap-4 min-w-[300px]">
              <img src={order.cropImage} alt={order.cropName} className="w-24 h-24 rounded-lg object-cover border border-border/50 shadow-sm" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground leading-tight hover:text-primary cursor-pointer transition-colors">{order.cropName}</h3>
                <p className="text-sm text-muted-foreground">Buyer: <span className="text-primary font-medium">{order.buyerName}</span></p>
                <p className="text-xs text-muted-foreground font-medium">Quantity: {order.quantityKg} kg @ ₹{order.pricePerKg}/kg</p>
                <div className="flex items-center gap-3 mt-2">
                  <a href={`tel:${order.buyerPhone}`} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 hover:bg-primary/20 transition-colors">
                    <Phone className="w-3 h-3" /> Contact Buyer
                  </a>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${order.status==='COMPLETED' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
                <p className="text-base font-bold text-foreground">
                  {order.status === 'COMPLETED' ? `Successfully Sold on ${new Date(order.updatedAt).toLocaleDateString()}` : orderStatusLabels[order.status]}
                </p>
              </div>
              <OrderTracker currentStatus={order.status} />
              {['PENDING_ADDRESS','AWAITING_ADVANCE_PAYMENT'].includes(order.status) && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                  <Clock className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-medium">
                    Waiting for buyer: {order.status === 'PENDING_ADDRESS' ? 'They are submitting the delivery address.' : 'They are paying the 15% advance.'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 min-w-[200px]">
              {step && !['PENDING_ADDRESS','AWAITING_ADVANCE_PAYMENT'].includes(order.status) && (
                <Button size="sm" className="w-full gradient-hero text-primary-foreground font-bold rounded-lg shadow-sm" onClick={() => handleStatusUpdate(order, step.next)} disabled={updating===order._id}>
                  {updating===order._id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : step.label}
                </Button>
              )}
              {order.status === 'OUT_FOR_DELIVERY' && order.remainingAmount > 0 && (
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold text-center uppercase border border-blue-100">
                  Awaiting Balance Pay
                </div>
              )}
              {order.status === 'COMPLETED' && (
                <>
                  {!(order.isRatedByFarmer || ratedOrders.has(order._id)) ? (
                    <Button size="sm" variant="outline" className="w-full rounded-lg text-xs font-medium border-primary/30 text-primary hover:bg-primary/5" onClick={() => setRateOrder(order)}>Rate Buyer</Button>
                  ) : (
                    <p className="text-[10px] text-center text-green-600 font-bold mt-1 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3"/> Rating submitted</p>
                  )}
                </>
              )}
            </div>
          </div>
          {order.address && (
            <div className="mt-4 pt-4 border-t border-border/50 flex items-start gap-2 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">Delivery Location: <span className="text-foreground font-medium">{order.address}</span></p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary mr-3" /><span className="text-muted-foreground">Loading orders…</span></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Sales</h1>
          <p className="text-muted-foreground mt-1">Track your orders and update fulfillment status.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrders} className="w-fit">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh List
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by buyer or crop" 
            className="pl-10 h-10 rounded-lg bg-muted/20 border-border focus:ring-primary"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-muted-foreground">Timeframe:</span>
          <select 
            className="h-10 px-3 rounded-lg bg-muted/20 border border-border text-sm font-medium focus:ring-primary focus:outline-none"
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value)}
          >
            <option value="all">Last 3 months</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4 border-2 border-dashed border-border rounded-3xl">
          <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center">
            <PackageSearch className="w-10 h-10 opacity-20" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">No active sales</p>
            <p className="text-sm max-w-xs mx-auto">Orders will appear here once buyers confirm their deals with advance payment.</p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 gap-8">
            <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 text-sm font-bold transition-none">
              Pending Fulfillment ({filteredOrders.filter(o => o.status !== 'COMPLETED').length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 text-sm font-bold transition-none">
              Sold / Completed ({filteredOrders.filter(o => o.status === 'COMPLETED').length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-6 space-y-6">
            {filteredOrders.filter(o => o.status !== 'COMPLETED').map(renderOrder)}
            {filteredOrders.filter(o => o.status !== 'COMPLETED').length === 0 && (
              <p className="text-center text-muted-foreground py-20 italic">No matching active orders.</p>
            )}
          </TabsContent>
          <TabsContent value="completed" className="mt-6 space-y-6">
            {filteredOrders.filter(o => o.status === 'COMPLETED').map(renderOrder)}
            {filteredOrders.filter(o => o.status === 'COMPLETED').length === 0 && (
              <p className="text-center text-muted-foreground py-20 italic">No matching completed orders.</p>
            )}
          </TabsContent>
        </Tabs>
      )}

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
