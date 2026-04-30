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
import { Loader2, RefreshCw, ShoppingBag, MapPin, Star, Phone, CheckCircle2, CreditCard, MessageSquare, Search, ChevronDown } from 'lucide-react';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter,   setTimeFilter]   = useState('all');

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.cropName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          o.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o._id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderOrder = (order) => {
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    
    return (
      <div key={order._id} className="rounded-xl border border-border/80 bg-background overflow-hidden mb-6 shadow-sm hover:shadow-md transition-shadow">
        {/* Order Header (Amazon/Flipkart Style) */}
        <div className="bg-muted/40 px-4 py-3 border-b border-border/80 flex flex-wrap items-center justify-between gap-4 text-[13px]">
          <div className="flex gap-8">
            <div className="space-y-0.5">
              <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Order Placed</p>
              <p className="font-medium text-foreground">{orderDate}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Total</p>
              <p className="font-medium text-foreground">₹{order.totalPrice.toLocaleString()}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Ship To</p>
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

        {/* Order Body */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Image & Title */}
            <div className="flex gap-4 min-w-[300px]">
              <img src={order.cropImage} alt={order.cropName} className="w-24 h-24 rounded-lg object-cover border border-border/50 shadow-sm" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground leading-tight hover:text-primary cursor-pointer transition-colors">{order.cropName}</h3>
                <p className="text-sm text-muted-foreground">Seller: <span className="text-primary font-medium">{order.farmerName}</span></p>
                <p className="text-xs text-muted-foreground font-medium">Quantity: {order.quantityKg} kg @ ₹{order.pricePerKg}/kg</p>
                <div className="flex items-center gap-3 mt-2">
                  <a href={`tel:${order.farmerPhone}`} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 hover:bg-primary/20 transition-colors">
                    <Phone className="w-3 h-3" /> Contact Seller
                  </a>
                </div>
              </div>
            </div>

            {/* Center: Status & Progress */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${order.status==='COMPLETED' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
                <p className="text-base font-bold text-foreground">
                  {order.status === 'COMPLETED' ? `Delivered on ${new Date(order.updatedAt).toLocaleDateString()}` : orderStatusLabels[order.status]}
                </p>
              </div>
              
              <OrderTracker currentStatus={order.status} />

              {/* Status Specific Messages */}
              {order.status === 'PENDING_ADDRESS' && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                  <MapPin className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-medium">Action Required: Please provide your delivery address to start the fulfillment process.</p>
                </div>
              )}
              {order.status === 'AWAITING_ADVANCE_PAYMENT' && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
                  <CreditCard className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-medium">Payment Required: Pay ₹{order.advanceAmount?.toLocaleString()} advance (15%) to confirm with the farmer.</p>
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col gap-2 min-w-[200px]">
              {order.status === 'PENDING_ADDRESS' && (
                <Button size="sm" className="w-full gradient-hero text-primary-foreground font-bold rounded-lg shadow-sm" onClick={() => { setAddrOrder(order); setAddrForm({ street:'', landmark:'', city:'', state:'', pincode:'' }); }}>
                  Submit Address
                </Button>
              )}
              {order.status === 'AWAITING_ADVANCE_PAYMENT' && (
                <Button size="sm" className="w-full bg-[#FFD814] hover:bg-[#F7CA00] text-black border border-[#F2C200] font-medium rounded-lg shadow-sm" onClick={() => handlePayAdvance(order)} disabled={paying===order._id}>
                  {paying===order._id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Pay Advance (15%)'}
                </Button>
              )}
              {order.status === 'OUT_FOR_DELIVERY' && order.remainingAmount > 0 && (
                <Button size="sm" className="w-full bg-[#FFD814] hover:bg-[#F7CA00] text-black border border-[#F2C200] font-medium rounded-lg shadow-sm" onClick={() => handlePayRemaining(order)} disabled={paying===order._id}>
                  {paying===order._id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Pay Remaining (85%)'}
                </Button>
              )}
              
              {order.status === 'COMPLETED' && (
                <>
                  {!(order.isRatedByBuyer || ratedOrders.has(order._id)) ? (
                    <Button size="sm" variant="outline" className="w-full rounded-lg text-xs font-medium border-primary/30 text-primary hover:bg-primary/5" onClick={() => setRateOrder(order)}>Write a product review</Button>
                  ) : (
                    <p className="text-[10px] text-center text-green-600 font-bold mt-1 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3"/> Review submitted</p>
                  )}
                </>
              )}
            </div>
          </div>
          
          {order.address && (
            <div className="mt-4 pt-4 border-t border-border/50 flex items-start gap-2 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">Delivery Address: <span className="text-foreground font-medium">{order.address}</span></p>
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Orders</h1>
          <p className="text-muted-foreground mt-1">Manage your purchases and track shipments.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrders} className="w-fit">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Orders
        </Button>
      </div>

      {/* Amazon Style Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search all orders" 
            className="pl-10 h-10 rounded-lg bg-muted/20 border-border focus:ring-primary"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-muted-foreground">Period:</span>
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
            <ShoppingBag className="w-10 h-10 opacity-20" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">No orders yet</p>
            <p className="text-sm max-w-xs mx-auto">Start exploring crops and complete a deal to see your orders here.</p>
          </div>
          <Button variant="link" className="text-primary font-bold">Start Shopping</Button>
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 gap-8">
            <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 text-sm font-bold transition-none">
              Orders ({filteredOrders.filter(o => !['COMPLETED'].includes(o.status)).length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 text-sm font-bold transition-none">
              Completed ({filteredOrders.filter(o => ['COMPLETED'].includes(o.status)).length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-6 space-y-6">
            {filteredOrders.filter(o => !['COMPLETED'].includes(o.status)).map(renderOrder)}
            {filteredOrders.filter(o => !['COMPLETED'].includes(o.status)).length === 0 && (
              <p className="text-center text-muted-foreground py-20 italic">No matching orders found.</p>
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="mt-6 space-y-6">
            {filteredOrders.filter(o => ['COMPLETED'].includes(o.status)).map(renderOrder)}
            {filteredOrders.filter(o => ['COMPLETED'].includes(o.status)).length === 0 && (
              <p className="text-center text-muted-foreground py-20 italic">No matching completed orders.</p>
            )}
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
