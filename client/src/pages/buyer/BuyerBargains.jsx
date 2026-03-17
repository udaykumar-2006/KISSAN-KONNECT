import { useAppStore } from "@/stores/AppStore";
import { useAuth } from "@/contexts/AuthContext";
import BargainChat from "@/components/BargainChat";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import  toast  from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";


const BuyerBargains = () => {
  const { userId, userName, userAddress } = useAuth();
  const { bargains, crops, createBargain, createOrder } = useAppStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showChat, setShowChat] = useState(false);

  const myBargains = bargains.filter(b => b.buyerId === userId);
  const [selected, setSelected] = useState(myBargains[0]?.id || null);
  const selectedBargain = myBargains.find(b => b.id === selected);
  const crop = selectedBargain ? crops.find(c => c.id === selectedBargain.cropId) : null;

  // Show payment dialog after acceptance
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [orderAddress, setOrderAddress] = useState({ ...userAddress });
  const [payLoading, setPayLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const updateOrderAddress = (field, value) => {
    setOrderAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
          const data = await res.json();
          const a = data.address || {};
          setOrderAddress({
            street: [a.road, a.neighbourhood, a.suburb].filter(Boolean).join(", ") || "",
            landmark: a.amenity || a.building || "",
            city: a.city || a.town || a.village || a.county || "",
            state: a.state || "",
            pincode: a.postcode || "",
          });
          toast.success("Location detected! 📍");
        } catch {
          toast.error("Could not fetch address details");
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        toast.error("Location access denied");
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Auto-create bargain from crop link
  useEffect(() => {
    const cropId = searchParams.get("crop");
    if (cropId) {
      const existingBargain = myBargains.find(b => b.cropId === cropId && b.status === "active");
      if (existingBargain) {
        setSelected(existingBargain.id);
      } else {
        const targetCrop = crops.find(c => c.id === cropId);
        if (targetCrop) {
          const newId = createBargain({
            cropId: targetCrop.id,
            cropName: targetCrop.name,
            cropImage: targetCrop.image,
            buyerId: userId,
            buyerName: userName,
            farmerId: targetCrop.farmerId,
            farmerName: targetCrop.farmerName,
          });
          setSelected(newId);
          toast.success("Bargain session started! Send your first offer 💬");
        }
      }
    }
  }, [searchParams]);

  const handleAccepted = () => {
    // Auto-fill with user's saved address (copy, not reference)
    setOrderAddress({ ...userAddress });
    setShowPayDialog(true);
  };

  const handlePayAdvance = async () => {
    if (!orderAddress.street || !orderAddress.city || !orderAddress.state || !orderAddress.pincode) {
      toast.error("Please fill all required address fields");
      return;
    }
    if (!/^\d{6}$/.test(orderAddress.pincode)) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    if (!selectedBargain || !selectedBargain.finalPrice || !selectedBargain.finalQuantity) return;

    setPayLoading(true);
    await new Promise(r => setTimeout(r, 1000));

    const total = selectedBargain.finalPrice * selectedBargain.finalQuantity;
    const advance = Math.round(total * 0.15);
    const remaining = Math.round(total * 0.75);
    const targetCrop = crops.find(c => c.id === selectedBargain.cropId);
    const fullAddress = [orderAddress.street, orderAddress.landmark, orderAddress.city, orderAddress.state, orderAddress.pincode].filter(Boolean).join(", ");

    createOrder({
      cropId: selectedBargain.cropId,
      cropName: selectedBargain.cropName,
      buyerId: userId,
      buyerName: userName,
      farmerId: selectedBargain.farmerId,
      farmerName: selectedBargain.farmerName,
      pricePerKg: selectedBargain.finalPrice,
      quantityKg: selectedBargain.finalQuantity,
      totalPrice: total,
      advancePaid: advance,
      remainingAmount: remaining,
      status: "confirmed",
      address: fullAddress,
      createdAt: new Date().toISOString().split("T")[0],
      image: targetCrop?.image || selectedBargain.cropImage,
    });

    setPayLoading(false);
    setShowPayDialog(false);
    toast.success(`Order placed! Advance of ₹${advance.toLocaleString()} paid ✅`);
    navigate("/buyer/orders");
  };

  const handleSelect = (id) => {
    setSelected(id);
    if (isMobile) setShowChat(true);
  };

  const showList = !isMobile || !showChat;
  const showChatPanel = !isMobile || showChat;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {isMobile && showChat && (
          <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">My Bargains</h1>
          <p className="text-muted-foreground text-sm">Negotiate with farmers ({myBargains.filter(b => b.status === "active").length} active)</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {showList && (
          <div className="md:col-span-1 rounded-xl border border-border bg-card overflow-auto">
            {myBargains.map(b => (
              <button
                key={b.id}
                onClick={() => handleSelect(b.id)}
                className={`w-full text-left p-3 md:p-4 border-b border-border hover:bg-muted/50 transition-colors ${selected === b.id ? "bg-accent" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={b.cropImage} alt="" className="w-8 h-8 rounded object-cover" />
                    <p className="font-semibold text-sm text-card-foreground">{b.cropName}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${b.status === "active" ? "border-warning text-warning" : b.status === "accepted" ? "border-success text-success" : "border-destructive text-destructive"}`}>
                    {b.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{b.farmerName} · {b.messages.length} messages</p>
              </button>
            ))}
            {myBargains.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No bargains yet</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate("/buyer")}>
                  <Plus className="w-3 h-3 mr-1" /> Browse Crops
                </Button>
              </div>
            )}
          </div>
        )}

        {showChatPanel && (
          <div className="md:col-span-2 rounded-xl border border-border overflow-hidden h-[calc(100vh-220px)]">
            {selectedBargain && crop ? (
              <BargainChat
                bargain={selectedBargain}
                userRole="buyer"
                basePrice={crop.pricePerKg}
                minQuantity={crop.minQuantityKg}
                onAccepted={handleAccepted}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Select a bargain to view</div>
            )}
          </div>
        )}
      </div>

      {/* Pay advance after bargain accepted */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle className="font-display">Complete Your Order 🎉</DialogTitle></DialogHeader>
          {selectedBargain?.finalPrice && selectedBargain?.finalQuantity && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-sm font-semibold text-card-foreground">Deal Accepted!</p>
                <p className="text-sm text-muted-foreground">
                  ₹{selectedBargain.finalPrice}/kg × {selectedBargain.finalQuantity}kg = ₹{(selectedBargain.finalPrice * selectedBargain.finalQuantity).toLocaleString()}
                </p>
              </div>

              {/* Structured Address */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Delivery Address</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="text-xs h-7 gap-1"
                  >
                    {detectingLocation ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Detecting...</>
                    ) : (
                      <><MapPin className="w-3 h-3" /> Auto-detect</>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground -mt-1">Pre-filled from your profile. Changes here apply to this order only.</p>
                <Input placeholder="Street / House No / Area *" value={orderAddress.street} onChange={e => updateOrderAddress("street", e.target.value)} />
                <Input placeholder="Landmark (optional)" value={orderAddress.landmark} onChange={e => updateOrderAddress("landmark", e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="City *" value={orderAddress.city} onChange={e => updateOrderAddress("city", e.target.value)} />
                  <Input placeholder="State *" value={orderAddress.state} onChange={e => updateOrderAddress("state", e.target.value)} />
                </div>
                <Input placeholder="Pincode *" value={orderAddress.pincode} onChange={e => updateOrderAddress("pincode", e.target.value)} maxLength={6} className="w-1/2" />
              </div>

              <div className="p-3 rounded-lg bg-accent/50 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total:</span><span className="font-bold">₹{(selectedBargain.finalPrice * selectedBargain.finalQuantity).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Advance (15%):</span><span className="font-bold text-primary">₹{Math.round(selectedBargain.finalPrice * selectedBargain.finalQuantity * 0.15).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">On Delivery (75%):</span><span>₹{Math.round(selectedBargain.finalPrice * selectedBargain.finalQuantity * 0.75).toLocaleString()}</span></div>
              </div>
              <Button
                className="w-full gradient-golden text-secondary-foreground border-0"
                onClick={handlePayAdvance}
                disabled={payLoading || !orderAddress.street || !orderAddress.city || !orderAddress.state || !orderAddress.pincode}
              >
                {payLoading ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" /> Processing...</span>
                ) : (
                  `Pay ₹${Math.round(selectedBargain.finalPrice * selectedBargain.finalQuantity * 0.15).toLocaleString()} Advance`
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerBargains;
