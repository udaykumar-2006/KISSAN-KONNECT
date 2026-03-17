import { useState } from "react";

import { useAppStore } from "@/stores/AppStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, RotateCcw, Send, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import  toast  from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";



const BargainChat = ({ bargain, userRole, basePrice, minQuantity, onAccepted }) => {
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const { sendBargainMessage, acceptBargain, rejectBargain } = useAppStore();
  const isActive = bargain.status === "active";

  const lastMsg = bargain.messages[bargain.messages.length - 1];
  const canFarmerAct = userRole === "farmer" && lastMsg?.sender === "buyer";
  const canBuyerAct = userRole === "buyer" && lastMsg?.sender === "farmer" && lastMsg?.type !== "accept" && lastMsg?.type !== "reject";
  const canBuyerOffer = userRole === "buyer" && (!lastMsg || lastMsg.sender === "farmer");

  const handleSendOffer = () => {
    const p = Number(price);
    const q = Number(quantity);
    if (!p || p <= 0) { toast.error("Enter a valid price"); return; }
    if (!q || q < minQuantity) { toast.error(`Minimum quantity is ${minQuantity}kg`); return; }
    sendBargainMessage(bargain.id, {
      sender: userRole,
      type: userRole === "buyer" && bargain.messages.length === 0 ? "offer" : "counter",
      pricePerKg: p,
      quantityKg: q,
      totalPrice: p * q,
      message: userRole === "buyer" ? `I'd like ${q}kg at ₹${p}/kg` : `My counter: ₹${p}/kg for ${q}kg`,
    });
    setPrice("");
    setQuantity("");
    toast.success("Offer sent!");
  };

  const handleAccept = () => {
    if (!lastMsg) return;
    const sender = userRole;
    sendBargainMessage(bargain.id, {
      sender,
      type: "accept",
      pricePerKg: lastMsg.pricePerKg,
      quantityKg: lastMsg.quantityKg,
      totalPrice: lastMsg.totalPrice,
      message: `Deal accepted! ₹${lastMsg.pricePerKg}/kg for ${lastMsg.quantityKg}kg`,
    });
    acceptBargain(bargain.id, lastMsg.pricePerKg, lastMsg.quantityKg);
    toast.success("Deal accepted! 🎉");
    onAccepted?.(bargain, lastMsg.pricePerKg, lastMsg.quantityKg);
  };

  const handleReject = () => {
    sendBargainMessage(bargain.id, {
      sender: "farmer",
      type: "reject",
      pricePerKg: lastMsg?.pricePerKg || 0,
      quantityKg: lastMsg?.quantityKg || 0,
      totalPrice: lastMsg?.totalPrice || 0,
      message: "Sorry, I can't accept this offer.",
    });
    rejectBargain(bargain.id);
    toast.info("Bargain rejected");
  };

  const renderMessage = (msg, index) => {
    const isMine = msg.sender === userRole;

    const typeConfig = {
      offer: {
        cardBg: isMine ? "bg-primary/5" : "bg-card",
        headerBg: isMine ? "bg-primary/10" : "bg-muted/60",
        totalBg: "bg-primary/8",
        icon: "💰", label: "New Offer", accent: "text-primary",
      },
      counter: {
        cardBg: isMine ? "bg-secondary/5" : "bg-card",
        headerBg: isMine ? "bg-secondary/10" : "bg-muted/60",
        totalBg: "bg-secondary/8",
        icon: "🔄", label: "Counter Offer", accent: "text-secondary",
      },
      accept: {
        cardBg: "bg-success/5",
        headerBg: "bg-success/15",
        totalBg: "bg-success/10",
        icon: "🤝", label: "Deal Accepted", accent: "text-success",
      },
      reject: {
        cardBg: "bg-destructive/5",
        headerBg: "bg-destructive/10",
        totalBg: "bg-destructive/8",
        icon: "✗", label: "Declined", accent: "text-destructive",
      },
    };
    const config = typeConfig[msg.type];

    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`flex ${isMine ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`w-[280px] sm:w-[300px] rounded-2xl ${isMine ? "rounded-br-none" : "rounded-bl-none"} ${config.cardBg} border border-border/60 shadow-sm overflow-hidden`}
        >
          {/* Header */}
          <div className={`px-3.5 py-2 ${config.headerBg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{config.icon}</span>
              <span className={`text-xs font-bold ${config.accent} uppercase tracking-wide`}>{config.label}</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Body */}
          <div className="px-3.5 py-3 space-y-2.5">
            {/* Sender */}
            <p className="text-[11px] text-muted-foreground font-medium">
              From: <span className="text-card-foreground font-semibold">{msg.sender === "buyer" ? "Buyer" : "Farmer"}</span>
            </p>

            {/* Price & Qty row */}
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg bg-muted/40 px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground font-medium mb-0.5">PRICE</p>
                <p className="text-base font-bold text-card-foreground leading-tight">₹{msg.pricePerKg}</p>
                <p className="text-[10px] text-muted-foreground">per kg</p>
              </div>
              <div className="flex-1 rounded-lg bg-muted/40 px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground font-medium mb-0.5">QTY</p>
                <p className="text-base font-bold text-card-foreground leading-tight">{msg.quantityKg}</p>
                <p className="text-[10px] text-muted-foreground">kg</p>
              </div>
            </div>

            {/* Total */}
            <div className={`rounded-lg ${config.totalBg} px-3 py-2 flex items-center justify-between`}>
              <span className="text-xs font-medium text-muted-foreground">Total Amount</span>
              <span className={`text-base font-extrabold ${config.accent}`}>₹{msg.totalPrice.toLocaleString()}</span>
            </div>

            {/* Message */}
            {msg.message && (
              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-2">
                "{msg.message}"
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <img src={bargain.cropImage} alt={bargain.cropName} className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover shrink-0" />
            <div className="min-w-0">
              <h3 className="font-display font-bold text-sm md:text-base text-card-foreground truncate">{bargain.cropName}</h3>
              <p className="text-[11px] md:text-xs text-muted-foreground truncate">
                {userRole === "farmer" ? `Buyer: ${bargain.buyerName}` : `Farmer: ${bargain.farmerName}`}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] md:text-xs text-muted-foreground">Base Price</p>
            <p className="font-bold text-sm md:text-base text-primary">₹{basePrice}/kg</p>
          </div>
        </div>
        <Badge className={`mt-2 text-[10px] md:text-xs ${bargain.status === "active" ? "bg-warning text-warning-foreground" : bargain.status === "accepted" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>
          {bargain.status.toUpperCase()}
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-1 bg-muted/20">
        {bargain.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-sm">{userRole === "buyer" ? "Send your first offer below!" : "Waiting for buyer's offer..."}</p>
          </div>
        )}
        <AnimatePresence>
          {bargain.messages.map((msg, i) => renderMessage(msg, i))}
        </AnimatePresence>
      </div>

      {/* Actions */}
      {isActive && (
        <div className="p-3 md:p-4 border-t border-border bg-card">
          {userRole === "buyer" && canBuyerAct && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={handleAccept} size="sm" className="flex-1 bg-success text-success-foreground hover:bg-success/90"><Check className="w-4 h-4 mr-1" /> Accept Offer</Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-1">
                  <Input type="number" placeholder={`Price/kg`} value={price} onChange={(e) => setPrice(e.target.value)} className="flex-1" />
                  <Input type="number" placeholder={`Qty (min ${minQuantity}kg)`} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="flex-1" />
                </div>
                <Button onClick={handleSendOffer} variant="outline" size="sm" className="shrink-0 w-full sm:w-auto"><RotateCcw className="w-4 h-4 mr-1" /> Counter</Button>
              </div>
            </div>
          )}
          {userRole === "buyer" && !canBuyerAct && !canBuyerOffer && (
            <p className="text-sm text-center text-muted-foreground">Waiting for farmer's response...</p>
          )}
          {userRole === "buyer" && canBuyerOffer && !canBuyerAct && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2 flex-1">
                <Input type="number" placeholder={`Price/kg`} value={price} onChange={(e) => setPrice(e.target.value)} className="flex-1" />
                <Input type="number" placeholder={`Qty (min ${minQuantity}kg)`} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="flex-1" />
              </div>
              <Button onClick={handleSendOffer} className="gradient-hero text-primary-foreground border-0 shrink-0 w-full sm:w-auto"><Send className="w-4 h-4 mr-1" /><span className="sm:hidden">Send Offer</span></Button>
            </div>
          )}
          {userRole === "farmer" && canFarmerAct && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={handleAccept} size="sm" className="flex-1 bg-success text-success-foreground hover:bg-success/90"><Check className="w-4 h-4 mr-1" /> Accept</Button>
                <Button onClick={handleReject} size="sm" variant="destructive" className="flex-1"><X className="w-4 h-4 mr-1" /> Reject</Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-1">
                  <Input type="number" placeholder="Counter ₹/kg" value={price} onChange={(e) => setPrice(e.target.value)} className="flex-1" />
                  <Input type="number" placeholder={`Qty (${minQuantity}+)`} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="flex-1" />
                </div>
                <Button variant="outline" size="sm" onClick={handleSendOffer} className="shrink-0 w-full sm:w-auto"><RotateCcw className="w-4 h-4 mr-1" /> Counter</Button>
              </div>
            </div>
          )}
          {userRole === "farmer" && !canFarmerAct && bargain.messages.length > 0 && (
            <p className="text-sm text-center text-muted-foreground">Waiting for buyer's response...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BargainChat;
