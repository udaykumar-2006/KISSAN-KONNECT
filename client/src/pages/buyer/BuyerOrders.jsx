import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { orderStatusLabels } from '@/data/ordersData';
import OrderTracker from '@/components/OrderTracker';
import RatingDialog from '@/components/RatingDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, ShoppingBag, MapPin, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '@/services/api';
import { getSocket } from '@/services/socket';
import { loadRazorpay } from '@/utils/loadRazorpay';

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

const BuyerOrders = () => {
  const { userAddress } = useAuth();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState(null);

  // Address dialog (for PENDING_ADDRESS orders)
  const [addrOrder,    setAddrOrder]    = useState(null);
  const [addrForm,     setAddrForm]     = useState({ street:'', landmark:'', city:'', state:'', pincode:'' });
  const [addrLoading,  setAddrLoading]  = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [addrMode,     setAddrMode]     = useState('saved');

  // Rating dialog
  const [rateOrder, setRateOrder] = useState(null);
  const [ratedOrders, setRatedOrders] = useState(new Set()); // Track rated in this session

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.getOrders();
      setOrders(data);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { if (userAddress) setAddrForm({ street: userAddress.street||'', landmark: userAddress.landmark||'', city: userAddress.city||'', state: userAddress.state||'', pincode: userAddress.pincode||'' }); }, [userAddress]);

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
          ? { ...o, status: data.status, paymentStatus: data.paymentStatus, advancePaid: data.advancePaid, remainingAmount: data.remainingAmount, address: data.address ?? o.address }
          : o
      ));
    };
    socket.on('order_updated', onOrderUpdated);
    return () => {
      socket.off('connect', onConnect);
      socket.off('order_updated', onOrderUpdated);
    };
  }, [orders.length]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
        const d    = (await res.json()).address || {};
        setAddrForm({ street: [d.road, d.neighbourhood].filter(Boolean).join(', '), landmark: d.amenity||'', city: d.city||d.town||d.village||'', state: d.state||'', pincode: d.postcode||'' });
        toast.success('Location detected 📍');
      } catch { toast.error('Could not fetch address'); }
      finally { setDetectingLoc(false); }
    }, () => { toast.error('Location denied'); setDetectingLoc(false); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const handleSubmitAddress = async () => {
    if (!addrForm.street || !addrForm.city || !addrForm.state || !addrForm.pincode) { toast.error('Fill all required fields'); return; }
    if (!/^\d{6}$/.test(addrForm.pincode)) { toast.error('Invalid pincode'); return; }
    setAddrLoading(true);
    try {
      const { data } = await api.submitOrderAddress(addrOrder._id, addrForm);
      setOrders(prev => prev.map(o => o._id === data._id ? data : o));
      setAddrOrder(null);
      toast.success('Address saved! Pay the advance to confirm.');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save address'); }
    finally { setAddrLoading(false); }
  };

  const handlePayAdvance = async (order) => {
    setPaying(order._id);
    try {
      const res = await loadRazorpay();
      if (!res) { toast.error('Razorpay SDK failed to load'); return; }
      
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim();
      if (!razorpayKey) { toast.error('Razorpay Key ID is missing in frontend .env'); return; }

      const { data } = await api.createPaymentOrder({ orderId: order._id, paymentType: 'ADVANCE' });
      const options = {
        key: razorpayKey,
        amount: Math.round(data.amount * 100),
        currency: 'INR',
        name: 'KissanKonnect',
        description: '15% Advance Payment',
        order_id: data.order.id,
        handler: async function (response) {
          try {
            const verifyRes = await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order._id,
              paymentType: 'ADVANCE'
            });
            setOrders(prev => prev.map(o => o._id === verifyRes.data.order._id ? verifyRes.data.order : o));
            toast.success('✅ Advance paid! Order confirmed.');
          } catch (err) { toast.error(err.response?.data?.message || 'Payment verification failed'); }
        },
        prefill: { name: order.buyerName },
        theme: { color: '#16a34a' }
      };
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) { toast.error(err.response?.data?.message || 'Payment failed'); }
    finally { setPaying(null); }
  };

  const handlePayRemaining = async (order) => {
    setPaying(order._id);
    try {
      const res = await loadRazorpay();
      if (!res) { toast.error('Razorpay SDK failed to load'); return; }

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim();
      if (!razorpayKey) { toast.error('Razorpay Key ID is missing in frontend .env'); return; }

      const { data } = await api.createPaymentOrder({ orderId: order._id, paymentType: 'REMAINING' });
      const options = {
        key: razorpayKey,
        amount: Math.round(data.amount * 100),
        currency: 'INR',
        name: 'KissanKonnect',
        description: '85% Remaining Payment',
        order_id: data.order.id,
        handler: async function (response) {
          try {
            const verifyRes = await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order._id,
              paymentType: 'REMAINING'
            });
            setOrders(prev => prev.map(o => o._id === verifyRes.data.order._id ? verifyRes.data.order : o));
            toast.success('✅ Final payment done! Order delivered.');
          } catch (err) { toast.error(err.response?.data?.message || 'Payment verification failed'); }
        },
        prefill: { name: order.buyerName },
        theme: { color: '#16a34a' }
      };
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) { toast.error(err.response?.data?.message || 'Payment failed'); }
    finally { setPaying(null); }
  };

  const handleRatingComplete = (orderId) => {
    setRatedOrders(prev => new Set(prev).add(orderId));
  };

  const activeOrders    = orders.filter(o => !['COMPLETED'].includes(o.status));
  const completedOrders = orders.filter(o =>  ['COMPLETED'].includes(o.status));

  const renderOrder = (order) => (
    <div key={order._id} className="rounded-xl border border-border bg-card shadow-card p-5 hover:shadow-elevated transition-shadow">
      <div className="flex flex-col md:flex-row gap-4">
        <img src={order.cropImage} alt={order.cropName} className="w-20 h-20 rounded-lg object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2 gap-2">
            <div>
              <h3 className="font-display font-bold text-card-foreground">{order.cropName}</h3>
              <p className="text-xs text-muted-foreground">Farmer: {order.farmerName} · #{order._id.slice(-8).toUpperCase()}</p>
            </div>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColor[order.status]||''}`}>
              {orderStatusLabels[order.status]||order.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
            <div><p className="text-xs text-muted-foreground">Qty</p><p className="font-semibold">{order.quantityKg} kg</p></div>
            <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">₹{order.totalPrice.toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Advance</p><p className={`font-semibold ${order.advancePaid?'text-green-600':'text-amber-500'}`}>{order.advancePaid?`₹${order.advanceAmount?.toLocaleString()} ✓`:'Pending'}</p></div>
            <div><p className="text-xs text-muted-foreground">Remaining</p><p className={`font-semibold ${order.remainingAmount>0?'text-amber-500':'text-green-600'}`}>{order.remainingAmount>0?`₹${order.remainingAmount.toLocaleString()}`:'Paid ✓'}</p></div>
          </div>

          <OrderTracker currentStatus={order.status} />

          {/* PENDING_ADDRESS — submit address */}
          {order.status === 'PENDING_ADDRESS' && (
            <div className="mt-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-card-foreground">Delivery Address Required</p>
                    <p className="text-xs text-muted-foreground">Please provide your address to see shipping costs and proceed.</p>
                  </div>
                </div>
                <Button size="sm" className="gradient-hero text-primary-foreground shadow-lg shadow-primary/20 shrink-0" onClick={() => { setAddrOrder(order); setAddrForm({ street:'', landmark:'', city:'', state:'', pincode:'' }); }}>
                  Submit Address
                </Button>
              </div>
            </div>
          )}

          {/* AWAITING_ADVANCE_PAYMENT — pay advance */}
          {order.status === 'AWAITING_ADVANCE_PAYMENT' && (
            <div className="mt-3">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 mb-2">
                💳 Pay ₹{order.advanceAmount?.toLocaleString()} advance (15%) to confirm this order.
              </div>
              <Button size="sm" className="gradient-golden text-secondary-foreground border-0" onClick={() => handlePayAdvance(order)} disabled={paying===order._id}>
                {paying===order._id?<><Loader2 className="w-3 h-3 animate-spin mr-1"/>Processing…</>:`Pay ₹${order.advanceAmount?.toLocaleString()} Advance`}
              </Button>
            </div>
          )}

          {/* OUT_FOR_DELIVERY — pay remaining 85% */}
          {order.status === 'OUT_FOR_DELIVERY' && order.remainingAmount > 0 && (
            <div className="mt-3">
              <Button size="sm" className="gradient-golden text-secondary-foreground border-0" onClick={() => handlePayRemaining(order)} disabled={paying===order._id}>
                {paying===order._id?<><Loader2 className="w-3 h-3 animate-spin mr-1"/>Processing…</>:`Pay Remaining ₹${order.remainingAmount.toLocaleString()} (85%)`}
              </Button>
            </div>
          )}

          {/* Rate order after completion */}
          {order.status === 'COMPLETED' && (
            <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
              <div className="flex items-center gap-2">
                <Star className={`w-4 h-4 ${(order.isRatedByBuyer || ratedOrders.has(order._id)) ? 'text-secondary fill-secondary' : 'text-muted-foreground'}`} />
                <span className="text-xs font-medium">{(order.isRatedByBuyer || ratedOrders.has(order._id)) ? 'Rating submitted!' : 'How was your experience?'}</span>
              </div>
              {!(order.isRatedByBuyer || ratedOrders.has(order._id)) && (
                <Button size="sm" variant="outline" className="h-8 text-xs px-3 bg-background hover:bg-muted" onClick={() => setRateOrder(order)}>
                  Rate Order
                </Button>
              )}
            </div>
          )}

          {order.address && <p className="text-xs text-muted-foreground mt-2">📍 {order.address}</p>}
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary mr-3" /><span className="text-muted-foreground">Loading orders…</span></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-bold">My Orders</h1><p className="text-muted-foreground text-sm">Track your purchases</p></div>
        <Button variant="outline" size="sm" onClick={loadOrders}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <ShoppingBag className="w-12 h-12 opacity-30" />
          <p className="text-sm">No orders yet. Complete a bargain to create one.</p>
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
            {completedOrders.length===0 && <p className="text-center text-muted-foreground py-12">No completed orders</p>}
          </TabsContent>
        </Tabs>
      )}

      {/* Address submission dialog */}
      <Dialog open={!!addrOrder} onOpenChange={() => setAddrOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>📍 Delivery Address</DialogTitle></DialogHeader>
          <Tabs value={addrMode} onValueChange={setAddrMode}>
            <TabsList className="w-full">
              <TabsTrigger value="saved" className="flex-1">Saved Address</TabsTrigger>
              <TabsTrigger value="new" className="flex-1">New Address</TabsTrigger>
            </TabsList>

            <TabsContent value="saved" className="space-y-3 mt-4">
              {userAddress && (userAddress.street || userAddress.city) ? (
                <div className="p-3 rounded-lg border border-border bg-muted/40 text-sm space-y-1">
                  {userAddress.street   && <p>{userAddress.street}</p>}
                  {userAddress.landmark && <p className="text-muted-foreground">{userAddress.landmark}</p>}
                  <p>{[userAddress.city, userAddress.state, userAddress.pincode].filter(Boolean).join(', ')}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No saved address. Switch to "New Address".</p>
              )}
              {userAddress && (userAddress.street || userAddress.city) && (
                <Button className="w-full gradient-hero text-primary-foreground border-0" disabled={addrLoading}
                  onClick={async () => {
                    setAddrLoading(true);
                    try {
                      const { data } = await api.submitOrderAddress(addrOrder._id, {
                        street: userAddress.street||'', landmark: userAddress.landmark||'',
                        city: userAddress.city||'', state: userAddress.state||'', pincode: userAddress.pincode||'',
                      });
                      setOrders(prev => prev.map(o => o._id === data._id ? data : o));
                      setAddrOrder(null);
                      toast.success('Address saved! Pay the advance to confirm.');
                    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save address'); }
                    finally { setAddrLoading(false); }
                  }}>
                  {addrLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Use This Address'}
                </Button>
              )}
            </TabsContent>

            <TabsContent value="new" className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-sm">Enter Address</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleDetectLocation} disabled={detectingLoc} className="text-xs h-7 gap-1">
                  {detectingLoc?<><Loader2 className="w-3 h-3 animate-spin"/>Detecting…</>:<><MapPin className="w-3 h-3"/>Auto-detect</>}
                </Button>
              </div>
              <Input placeholder="Street / House No *" value={addrForm.street} onChange={e=>setAddrForm(p=>({...p,street:e.target.value}))} />
              <Input placeholder="Landmark (optional)" value={addrForm.landmark} onChange={e=>setAddrForm(p=>({...p,landmark:e.target.value}))} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="City *" value={addrForm.city} onChange={e=>setAddrForm(p=>({...p,city:e.target.value}))} />
                <Input placeholder="State *" value={addrForm.state} onChange={e=>setAddrForm(p=>({...p,state:e.target.value}))} />
              </div>
              <Input placeholder="Pincode *" value={addrForm.pincode} onChange={e=>setAddrForm(p=>({...p,pincode:e.target.value}))} maxLength={6} className="w-1/2" />
              <Button className="w-full gradient-hero text-primary-foreground border-0" onClick={handleSubmitAddress} disabled={addrLoading}>
                {addrLoading?<><Loader2 className="w-4 h-4 animate-spin mr-2"/>Saving…</>:'Save Address'}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      {rateOrder && (
        <RatingDialog 
          isOpen={!!rateOrder} 
          onClose={() => setRateOrder(null)} 
          order={rateOrder} 
          type="buyer"
          onRatingComplete={() => handleRatingComplete(rateOrder._id)}
        />
      )}
    </div>
  );
};

export default BuyerOrders;
