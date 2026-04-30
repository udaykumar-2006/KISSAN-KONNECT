import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '@/services/socket';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  Check, 
  X, 
  Clock, 
  MapPin, 
  CreditCard, 
  Package, 
  ChevronLeft, 
  Loader2, 
  ShieldCheck, 
  Star,
  Info,
  MoreVertical,
  MessageSquare,
  ShoppingBag,
  User as UserIcon,
  Phone,
  AlertTriangle
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '@/services/api';
import { loadRazorpay } from '@/utils/loadRazorpay';

const BargainChat = ({ bargain: initialBargain, userRole, onAccepted }) => {
  const { userId, userAddress, userName } = useAuth();
  const navigate   = useNavigate();
  const [bargain,   setBargain]   = useState(initialBargain);
  const [messages,  setMessages]  = useState(initialBargain?.messages || []);
  const [price,     setPrice]     = useState('');
  const [quantity,  setQuantity]  = useState('');
  const [sending,   setSending]   = useState(false);
  const [typingMsg, setTypingMsg] = useState('');
  const [qtyError,  setQtyError]  = useState('');
  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);

  // Ratings of the other party
  const [otherPartyRating, setOtherPartyRating] = useState({ avg: 0, count: 0 });

  // ── In-chat order flow state ──
  const [orderId,       setOrderId]       = useState(initialBargain?.orderId || null);
  const [orderData,     setOrderData]     = useState(null);
  const [orderStatus,   setOrderStatus]   = useState(initialBargain?.orderStatus || null);
  const [showAddrModal, setShowAddrModal] = useState(false);
  const [addrTab,       setAddrTab]       = useState('saved');
  const [addrForm,      setAddrForm]      = useState({ street:'', landmark:'', city:'', state:'', pincode:'' });
  const [addrLoading,   setAddrLoading]   = useState(false);
  const [payLoading,    setPayLoading]    = useState(false);

  useEffect(() => {
    if (userAddress) setAddrForm({ street: userAddress.street||'', landmark: userAddress.landmark||'', city: userAddress.city||'', state: userAddress.state||'', pincode: userAddress.pincode||'' });
  }, [userAddress]);

  const availableQty = bargain?.availableQuantityKg ?? 0;
  const minQty       = bargain?.minQuantity ?? 1;
  const roomId       = bargain?._id?.toString() || null;

  const isMyTurn = (() => {
    const l = bargain?.lastSenderRole;
    if (l === null)       return userRole === 'buyer';
    if (l === 'buyer')    return userRole === 'farmer';
    if (l === 'farmer')   return userRole === 'buyer';
    return false;
  })();

  const lastMsg = messages[messages.length - 1];

  useEffect(() => {
    if (isMyTurn && lastMsg && !price && !quantity) {
      setPrice(lastMsg.pricePerKg?.toString() || '');
      setQuantity(lastMsg.quantityKg?.toString() || '');
    }
  }, [isMyTurn, lastMsg, price, quantity]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (initialBargain) { 
        setBargain(initialBargain); 
        setMessages(initialBargain.messages || []); 
        // Fetch rating of the other person
        const other = userRole === 'farmer' ? initialBargain.buyerId : initialBargain.farmerId;
        const otherId = typeof other === 'object' ? other?._id : other;
        
        if (otherId && otherId !== 'undefined') {
            const fetchRating = userRole === 'farmer' ? api.getBuyerRatings : api.getFarmerRatings;
            fetchRating(otherId).then(res => {
                setOtherPartyRating({ avg: res.data.average, count: res.data.count });
            }).catch(() => {});
        }
    }
  }, [initialBargain?._id, userRole]);

  const handleQtyChange = (val) => {
    setQuantity(val);
    const q = Number(val);
    if (val && q > availableQty) setQtyError(`Max available: ${availableQty} kg`);
    else if (val && q < minQty)  setQtyError(`Min order: ${minQty} kg`);
    else                          setQtyError('');
  };

  useEffect(() => {
    const oid = initialBargain?.orderId || orderId;
    if (oid && !orderData) {
      api.getOrder(oid).then(({ data }) => {
        setOrderId(data._id);
        setOrderData({ totalPrice: data.totalPrice, advanceAmount: data.advanceAmount, remainingAmount: data.remainingAmount });
        setOrderStatus(data.status);
      }).catch(() => {});
    }
  }, [initialBargain?.orderId, orderId, orderData]);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();

    if (socket.connected) socket.emit('join_room', { roomId });
    const onConnect = () => socket.emit('join_room', { roomId });
    socket.on('connect', onConnect);

    const onReceive = (data) => {
      if (data.bargainId?.toString() !== bargain._id?.toString()) return;
      setMessages(prev => prev.some(m => m._id?.toString() === data.message._id?.toString()) ? prev : [...prev, data.message]);
      setBargain(prev => ({ ...prev, status: data.status || prev.status, lastSenderRole: data.lastSenderRole ?? prev.lastSenderRole, finalPrice: data.finalPrice ?? prev.finalPrice, finalQuantity: data.finalQuantity ?? prev.finalQuantity, availableQuantityKg: data.availableQuantityKg ?? prev.availableQuantityKg }));
      if (data.orderId && !orderId) setOrderId(data.orderId);
    };

    const onAcceptedEvt = (data) => {
      if (data.bargainId?.toString() !== bargain._id?.toString()) return;
      setBargain(prev => ({ ...prev, status: 'accepted', finalPrice: data.finalPrice, finalQuantity: data.finalQuantity }));
      if (data.orderId) {
        setOrderId(data.orderId);
        const total = data.totalPrice || 0;
        const adv = data.advanceAmount || 0;
        setOrderData({ totalPrice: total, advanceAmount: adv, remainingAmount: total - adv });
        setOrderStatus('PENDING_ADDRESS');
      }
      toast.success('🎉 Deal accepted!');
      onAccepted?.(data);
    };

    const onOrderCreated = (data) => {
      setOrderId(data.orderId);
      setOrderStatus(data.status);
      setOrderData({ 
        totalPrice: data.totalPrice, 
        advanceAmount: data.advanceAmount, 
        remainingAmount: data.remainingAmount,
        buyerPhone: data.buyerPhone,
        farmerPhone: data.farmerPhone,
        buyerName: data.buyerName,
        farmerName: data.farmerName
      });
      toast.success('Order Record Created! 📦');
    };

    const onRejected = (data) => {
      if (data.bargainId?.toString() !== bargain._id?.toString()) return;
      setBargain(prev => ({ ...prev, status: 'rejected' }));
      toast.error('Bargain rejected.');
    };

    const onOrderUpdated = (data) => {
      if (data.orderId?.toString() !== orderId?.toString()) return;
      setOrderStatus(data.status);
    };

    const onTyping     = ({ userName }) => { setTypingMsg(`${userName} is typing…`); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTypingMsg(''), 2500); };
    const onStopTyping = () => setTypingMsg('');
    const onError      = ({ message }) => { toast.error(message); setSending(false); };

    socket.on('receive_message',  onReceive);
    socket.on('bargain_accepted', onAcceptedEvt);
    socket.on('bargain_rejected', onRejected);
    socket.on('order_created',    onOrderCreated);
    socket.on('order_updated',    onOrderUpdated);
    socket.on('user_typing',      onTyping);
    socket.on('user_stop_typing', onStopTyping);
    socket.on('error_message',    onError);
    return () => {
      socket.off('connect',        onConnect);
      socket.off('receive_message',  onReceive);
      socket.off('bargain_accepted', onAcceptedEvt);
      socket.off('bargain_rejected', onRejected);
      socket.off('order_created',    onOrderCreated);
      socket.off('order_updated',    onOrderUpdated);
      socket.off('user_typing',      onTyping);
      socket.off('user_stop_typing', onStopTyping);
      socket.off('error_message',    onError);
    };
  }, [roomId, bargain._id, orderId]);

  const emitTyping = () => {
    const s = getSocket();
    s.emit('typing', { roomId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => s.emit('stop_typing', { roomId }), 1500);
  };

  const emitMessage = useCallback((type, p, q, text) => {
    if (type !== 'reject') {
      if (q > availableQty) { toast.error(`Only ${availableQty} kg available`); return; }
      if (q < minQty)        { toast.error(`Min qty: ${minQty} kg`); return; }
      if (p <= 0)            { toast.error('Price must be > 0'); return; }
    }
    setSending(true);
    getSocket().emit('send_message', { bargainId: bargain._id, roomId, type, pricePerKg: p, quantityKg: q, message: text });
    setTimeout(() => setSending(false), 1000);
  }, [bargain._id, roomId, availableQty, minQty]);

  const handleSendOffer = () => {
    const p = Number(price), q = Number(quantity);
    if (!p || p <= 0) { toast.error('Enter a valid price'); return; }
    if (!q)           { toast.error('Enter a quantity'); return; }
    if (qtyError)     { toast.error(qtyError); return; }
    const isFirst = userRole === 'buyer' && messages.length === 0;
    const type    = isFirst ? 'offer' : 'counter';
    emitMessage(type, p, q, userRole === 'buyer' ? `I'd like ${q}kg at ₹${p}/kg` : `Counter: ₹${p}/kg for ${q}kg`);
    setPrice(''); setQuantity(''); setQtyError('');
  };

  const handleAccept = () => {
    const lm = messages[messages.length - 1];
    if (!lm) return;
    emitMessage('accept', lm.pricePerKg, lm.quantityKg, `Deal accepted! ₹${lm.pricePerKg}/kg × ${lm.quantityKg}kg`);
  };

  const handleReject = () => {
    const lm = messages[messages.length - 1];
    emitMessage('reject', lm?.pricePerKg || 0, lm?.quantityKg || 0, 'Sorry, I cannot accept this offer.');
  };

  const renderMessage = (msg, i) => {
    const isMine = msg.senderRole === userRole;
    const cfg = {
      offer:   { icon: '💰', label: 'New Offer',     accent: 'text-primary',     hBg: isMine ? 'bg-primary/10'    : 'bg-muted/60', cBg: isMine ? 'bg-primary/5'    : 'bg-card', tBg: 'bg-primary/10'    },
      counter: { icon: '🔄', label: 'Counter Offer', accent: 'text-secondary',   hBg: isMine ? 'bg-secondary/10'  : 'bg-muted/60', cBg: isMine ? 'bg-secondary/5'  : 'bg-card', tBg: 'bg-secondary/10'  },
      accept:  { icon: '🤝', label: 'Deal Accepted', accent: 'text-green-600',   hBg: 'bg-green-500/15',           cBg: 'bg-green-500/5',                                         tBg: 'bg-green-500/10'  },
      reject:  { icon: '✗',  label: 'Declined',      accent: 'text-destructive', hBg: 'bg-destructive/10',         cBg: 'bg-destructive/5',                                        tBg: 'bg-destructive/10'},
    }[msg.type] || { icon: '💬', label: msg.type, accent: 'text-foreground', hBg: 'bg-muted/40', cBg: 'bg-card', tBg: 'bg-muted/20' };
    return (
      <motion.div key={msg._id || i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: Math.min(i*0.04, 0.3) }}
        className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`w-[280px] rounded-2xl ${isMine ? 'rounded-br-none' : 'rounded-bl-none'} ${cfg.cBg} border border-border/60 shadow-sm overflow-hidden`}>
          <div className={`px-3.5 py-2 ${cfg.hBg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <span>{cfg.icon}</span>
              <span className={`text-xs font-bold ${cfg.accent} uppercase tracking-wide`}>{cfg.label}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
          </div>
          <div className="px-3.5 py-3 space-y-2">
            <p className="text-[11px] text-muted-foreground">From: <span className="font-semibold text-card-foreground capitalize">{msg.senderRole}</span></p>
            {['offer','counter','accept'].includes(msg.type) && msg.pricePerKg > 0 && (
              <>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg bg-muted/40 px-2 py-1.5 text-center">
                    <p className="text-[10px] text-muted-foreground">PRICE</p>
                    <p className="font-bold text-card-foreground">₹{msg.pricePerKg}/kg</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-muted/40 px-2 py-1.5 text-center">
                    <p className="text-[10px] text-muted-foreground">QTY</p>
                    <p className="font-bold text-card-foreground">{msg.quantityKg} kg</p>
                  </div>
                </div>
                <div className={`rounded-lg ${cfg.tBg} px-3 py-1.5 flex justify-between`}>
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className={`font-extrabold text-sm ${cfg.accent}`}>₹{(msg.totalPrice||0).toLocaleString()}</span>
                </div>
              </>
            )}
            {msg.message && <p className="text-xs text-muted-foreground italic border-t border-border/40 pt-2">"{msg.message}"</p>}
          </div>
        </div>
      </motion.div>
    );
  };

  if (!bargain) return null;
  const isActive = bargain.status === 'active';
  const waitingFor = isMyTurn ? null : (userRole === 'buyer' ? 'farmer' : 'buyer');

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
                <img src={bargain.cropImage} alt={bargain.cropName} className="w-11 h-11 rounded-xl object-cover shadow-sm" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center border border-border shadow-sm">
                    <Package className="w-3 h-3 text-primary" />
                </div>
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-sm text-card-foreground truncate leading-tight">{bargain.cropName}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[11px] text-muted-foreground truncate">{userRole === 'farmer' ? `Buyer: ${bargain.buyerName}` : `Farmer: ${bargain.farmerName}`}</p>
                  {otherPartyRating.avg > 0 && (
                      <div className="flex items-center gap-0.5 bg-secondary/10 px-1.5 py-0.5 rounded-full border border-secondary/20">
                          <Star className="w-2.5 h-2.5 fill-secondary text-secondary" />
                          <span className="text-[10px] font-bold text-secondary-foreground">{otherPartyRating.avg.toFixed(1)}</span>
                          {otherPartyRating.avg >= 4.5 && <ShieldCheck className="w-2.5 h-2.5 text-success ml-0.5" />}
                      </div>
                  )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Base Price</p>
            <p className="font-bold text-base text-primary">₹{bargain.basePrice}<span className="text-[10px] font-normal text-muted-foreground">/kg</span></p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Badge className={bargain.status === 'active' ? 'bg-amber-500 text-white text-[10px] rounded-lg' : bargain.status === 'accepted' ? 'bg-green-600 text-white text-[10px] rounded-lg' : 'bg-destructive text-destructive-foreground text-[10px] rounded-lg'}>
            {bargain.status.toUpperCase()}
          </Badge>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${availableQty === 0 ? 'bg-destructive/10 border-destructive/30 text-destructive' : availableQty < minQty*3 ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-green-500/10 border-green-500/30 text-green-700'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${availableQty === 0 ? 'bg-destructive' : availableQty < minQty*3 ? 'bg-amber-500' : 'bg-green-600'}`} />
            {availableQty === 0 ? 'SOLD OUT' : `${availableQty} KG IN STOCK`}
          </div>
          {isActive && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${isMyTurn ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted/50 border-border text-muted-foreground'}`}>
              <Clock className={`w-3 h-3 ${isMyTurn ? 'animate-pulse' : ''}`} />
              {isMyTurn ? 'YOUR TURN' : `WAITING FOR ${waitingFor?.toUpperCase()}`}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 bg-muted/5 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 opacity-30" />
            </div>
            <p className="text-sm font-medium">{userRole === 'buyer' ? 'Send your first offer to start negotiating!' : 'Waiting for the buyer to send an offer…'}</p>
            <p className="text-xs opacity-60 mt-1 italic">Be fair and professional.</p>
          </div>
        )}
        <AnimatePresence>{messages.map((m, i) => renderMessage(m, i))}</AnimatePresence>
        {typingMsg && (
          <div className="flex justify-start mb-2">
            <div className="bg-card border border-border/50 rounded-2xl rounded-bl-none px-4 py-2 flex items-center gap-2 shadow-sm">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-medium">{typingMsg}</span>
            </div>
          </div>
        )}
        {bargain.status === 'accepted' && (
          <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="mx-auto max-w-sm rounded-2xl bg-green-500/10 border border-green-500/20 p-6 text-center mt-6 shadow-sm">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-green-600" />
            </div>
            <h4 className="font-display font-bold text-green-700 text-lg">Deal Accepted!</h4>
            <p className="text-xs text-green-600/80 mb-4">The transaction is ready to proceed.</p>
            
            {orderData && (
              <div className="mb-5 text-left bg-background/50 rounded-xl p-4 space-y-2 border border-green-500/10">
                <div className="flex justify-between text-xs text-muted-foreground font-medium"><span>Total Amount:</span><span className="font-bold text-card-foreground">₹{orderData.totalPrice?.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground font-medium"><span>Advance (15%):</span><span className="font-bold text-primary">₹{orderData.advanceAmount?.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground font-medium pt-1 border-t border-border/50"><span>Remaining:</span><span className="font-bold text-card-foreground">₹{orderData.remainingAmount?.toLocaleString()}</span></div>
                
                {/* Contact Info */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                       <UserIcon className="w-4 h-4" />
                     </div>
                     <div>
                       <p className="text-[10px] text-muted-foreground font-bold leading-none uppercase">Contact {userRole === 'buyer' ? 'Farmer' : 'Buyer'}</p>
                       <p className="text-xs font-bold text-card-foreground">{userRole === 'buyer' ? orderData.farmerName : orderData.buyerName}</p>
                     </div>
                   </div>
                   <a href={`tel:${userRole === 'buyer' ? orderData.farmerPhone : orderData.buyerPhone}`} className="p-2 rounded-xl bg-primary text-white shadow-sm hover:scale-105 transition-transform">
                     <Phone className="w-4 h-4" />
                   </a>
                </div>
              </div>
            )}
            
            {userRole === 'buyer' ? (
              <div className="space-y-3">
                {(!orderId && !initialBargain.orderId) ? (
                  <Button size="lg" className="w-full gradient-hero text-primary-foreground border-0 rounded-xl shadow-md"
                    onClick={async () => {
                      try {
                        const { data } = await api.createOrderFromBargain(bargain._id);
                        setOrderId(data._id);
                        setOrderStatus(data.status);
                        setOrderData({ totalPrice: data.totalPrice, advanceAmount: data.advanceAmount, remainingAmount: data.remainingAmount });
                        toast.success('Order created! 📦');
                      } catch (err) { toast.error('Failed to create order'); }
                    }}>
                    <Package className="w-4 h-4 mr-2" /> Create Order Record
                  </Button>
                ) : (
                  <>
                    {(!orderStatus || orderStatus === 'PENDING_ADDRESS') && (
                      <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md" onClick={() => setShowAddrModal(true)}>
                        <MapPin className="w-4 h-4 mr-2" /> Submit Delivery Address
                      </Button>
                    )}
                    {orderStatus === 'AWAITING_ADVANCE_PAYMENT' && (
                      <Button size="lg" className="w-full gradient-golden text-secondary-foreground border-0 rounded-xl shadow-md" disabled={payLoading}
                        onClick={async () => {
                          setPayLoading(true);
                          try {
                            const res = await loadRazorpay();
                            if (!res) { toast.error('Razorpay SDK failed'); return; }
                            const { data } = await api.createPaymentOrder({ orderId: orderId || initialBargain.orderId, paymentType: 'ADVANCE' });
                            const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim();
                            const options = {
                              key: razorpayKey, amount: Math.round(data.amount * 100), currency: 'INR', name: 'KissanKonnect', description: 'Advance Payment', order_id: data.order.id,
                              handler: async function (response) {
                                try {
                                  await api.verifyPayment({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, orderId: orderId || initialBargain.orderId, paymentType: 'ADVANCE' });
                                  setOrderStatus('CONFIRMED');
                                  toast.success('Advance paid! ✅');
                                } catch (err) { toast.error('Payment failed'); }
                              },
                              prefill: { name: bargain.buyerName }, theme: { color: '#16a34a' }
                            };
                            new window.Razorpay(options).open();
                          } catch (err) { toast.error('Payment failed'); } finally { setPayLoading(false); }
                        }}>
                        {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4 mr-2" />Pay Advance (15%)</>}
                      </Button>
                    )}
                    {orderStatus === 'CONFIRMED' && <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30 px-4 py-2 rounded-xl text-xs font-bold">✅ ORDER CONFIRMED</Badge>}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                 {(!orderId && !initialBargain.orderId) ? (
                   <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-medium">
                     ⏳ Waiting for order initialization...
                   </div>
                 ) : (
                   <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 text-xs font-medium flex flex-col items-center gap-2">
                     <Clock className="w-5 h-5 animate-pulse" />
                     {orderStatus === 'PENDING_ADDRESS' ? 'Waiting for buyer to submit delivery address.' : 
                      orderStatus === 'AWAITING_ADVANCE_PAYMENT' ? 'Waiting for buyer to pay advance payment.' :
                      'Order is being processed. Check the Orders tab for updates.'}
                   </div>
                 )}
              </div>
            )}
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Action Panel */}
      {isActive && availableQty > 0 && (
        <div className="p-4 border-t border-border bg-card shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          {!isMyTurn ? (
            <div className="flex items-center justify-center gap-3 py-3 text-muted-foreground bg-muted/20 rounded-xl italic text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Waiting for {waitingFor}'s response…
            </div>
          ) : (
            <div className="space-y-4">

              <div className="space-y-3">
              {userRole === 'farmer' && (
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleAccept} size="lg" disabled={sending} className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm h-12 font-bold">
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5 mr-2" />Accept Deal</>}
                  </Button>
                  <Button onClick={handleReject} size="lg" variant="outline" disabled={sending} className="rounded-xl h-12 border-destructive/30 text-destructive hover:bg-destructive/5 font-bold">
                    <X className="w-5 h-5 mr-2" />Reject
                  </Button>
                </div>
              )}
              {userRole === 'buyer' && lastMsg?.senderRole === 'farmer' && lastMsg?.type === 'counter' && (
                <Button onClick={handleAccept} size="lg" disabled={sending} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md h-12 font-bold">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5 mr-2" />Accept Farmer's Offer</>}
                </Button>
              )}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Price / Kg</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">₹</span>
                    <Input type="number" placeholder="0.00" value={price} min="1" onChange={e => { setPrice(e.target.value); emitTyping(); }} className="pl-7 rounded-xl h-11 font-bold border-muted-foreground/20 focus:ring-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Quantity (Kg)</Label>
                  <Input type="number" placeholder={`${minQty}–${availableQty}`} value={quantity} min={minQty} max={availableQty}
                    onChange={e => { handleQtyChange(e.target.value); emitTyping(); }} className={`rounded-xl h-11 font-bold border-muted-foreground/20 focus:ring-primary ${qtyError ? 'border-destructive ring-1 ring-destructive' : ''}`} />
                </div>
                <Button onClick={handleSendOffer} disabled={sending || !!qtyError} className={`h-11 rounded-xl px-5 font-bold shadow-lg shadow-primary/10 ${userRole==='buyer' ? 'gradient-hero text-primary-foreground' : 'variant-secondary'}`}>
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />{messages.length === 0 ? 'Send' : 'Counter'}</>}
                </Button>
              </div>
              {qtyError && <p className="text-[10px] text-destructive font-bold flex items-center gap-1.5 mt-1 animate-pulse"><AlertTriangle className="w-3.5 h-3.5" />{qtyError}</p>}
            </div>
          </div>
        )}
      </div>
    )}

      {/* Address Modal */}
      {userRole === 'buyer' && (
        <Dialog open={showAddrModal} onOpenChange={setShowAddrModal}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-display font-bold">📍 Delivery Location</DialogTitle>
              <DialogDescription className="sr-only">Enter your delivery address for this order</DialogDescription>
            </DialogHeader>
            <Tabs value={addrTab} onValueChange={setAddrTab} className="mt-2">
              <TabsList className="grid grid-cols-2 bg-muted/50 rounded-xl p-1">
                <TabsTrigger value="saved" className="rounded-lg text-xs font-bold">Saved Address</TabsTrigger>
                <TabsTrigger value="new" className="rounded-lg text-xs font-bold">New Address</TabsTrigger>
              </TabsList>
              <TabsContent value="saved" className="space-y-4 mt-6">
                {userAddress && (userAddress.street || userAddress.city) ? (
                  <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 text-sm space-y-1 relative group">
                    <p className="font-bold text-foreground">{userName}</p>
                    <p className="text-muted-foreground">{userAddress.street}</p>
                    <p className="text-muted-foreground font-medium">{[userAddress.city, userAddress.state, userAddress.pincode].filter(Boolean).join(', ')}</p>
                    <div className="absolute top-4 right-4 bg-primary/10 text-primary p-1.5 rounded-full"><MapPin className="w-4 h-4" /></div>
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-8 italic">No saved address found.</p>}
                {userAddress && (userAddress.street || userAddress.city) && (
                  <Button className="w-full h-12 rounded-xl gradient-hero text-primary-foreground font-bold shadow-lg shadow-primary/20" disabled={addrLoading}
                    onClick={async () => {
                      setAddrLoading(true);
                      try {
                        await api.submitOrderAddress(orderId, { street: userAddress.street||'', landmark: userAddress.landmark||'', city: userAddress.city||'', state: userAddress.state||'', pincode: userAddress.pincode||'' });
                        setOrderStatus('AWAITING_ADVANCE_PAYMENT'); setShowAddrModal(false); toast.success('Address saved!');
                      } catch (err) { toast.error('Failed to save address'); } finally { setAddrLoading(false); }
                    }}>
                    {addrLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Use This Address'}
                  </Button>
                )}
              </TabsContent>
              <TabsContent value="new" className="space-y-4 mt-6">
                <Input placeholder="Street / House No *" value={addrForm.street} onChange={e => setAddrForm(p => ({ ...p, street: e.target.value }))} className="rounded-xl h-11 bg-muted/30 border-none" />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="City *" value={addrForm.city} onChange={e => setAddrForm(p => ({ ...p, city: e.target.value }))} className="rounded-xl h-11 bg-muted/30 border-none" />
                  <Input placeholder="State *" value={addrForm.state} onChange={e => setAddrForm(p => ({ ...p, state: e.target.value }))} className="rounded-xl h-11 bg-muted/30 border-none" />
                </div>
                <Input placeholder="Pincode *" maxLength={6} value={addrForm.pincode} onChange={e => setAddrForm(p => ({ ...p, pincode: e.target.value }))} className="rounded-xl h-11 bg-muted/30 border-none w-1/2" />
                <Button className="w-full h-12 rounded-xl gradient-hero text-primary-foreground font-bold shadow-lg shadow-primary/20" disabled={addrLoading}
                  onClick={async () => {
                    if (!addrForm.street || !addrForm.city || !addrForm.state || !addrForm.pincode) { toast.error('Fill required fields'); return; }
                    setAddrLoading(true);
                    try {
                      await api.submitOrderAddress(orderId, addrForm);
                      setOrderStatus('AWAITING_ADVANCE_PAYMENT'); setShowAddrModal(false); toast.success('Address saved!');
                    } catch (err) { toast.error('Failed to save address'); } finally { setAddrLoading(false); }
                  }}>
                  {addrLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save & Continue'}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default BargainChat;
