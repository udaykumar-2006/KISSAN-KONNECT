import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/AppStore";
import StarRating from "@/components/StarRating";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Scale, User, ArrowLeft, Handshake, CreditCard, Calendar } from "lucide-react";
import { useState } from "react";
import  toast  from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const CropDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { crops, createOrder, getCropAvgRating, getCropRatings } = useAppStore();
  const { userId, userName } = useAuth();
  const crop = crops.find(c => c.id === id);
  const avgRating = crop ? getCropAvgRating(crop.id) : 0;
  const ratingCount = crop ? getCropRatings(crop.id).length : 0;

  const [quantity, setQuantity] = useState("");
  const [address, setAddress] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!crop) return <div className="text-center py-16 text-muted-foreground">Crop not found</div>;

  const qty = Number(quantity) || 0;
  const total = qty * crop.pricePerKg;
  const advance = Math.round(total * 0.15);
  const onDelivery = Math.round(total * 0.75);

  const handlePlaceOrder = async () => {
    if (qty < crop.minQuantityKg) { toast.error(`Minimum quantity is ${crop.minQuantityKg}kg`); return; }
    if (!address.trim()) { toast.error("Please enter delivery address"); return; }

    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));

    const orderId = createOrder({
      cropId: crop.id,
      cropName: crop.name,
      buyerId: userId,
      buyerName: userName,
      farmerId: crop.farmerId,
      farmerName: crop.farmerName,
      pricePerKg: crop.pricePerKg,
      quantityKg: qty,
      totalPrice: total,
      advancePaid: advance,
      remainingAmount: onDelivery,
      status: "confirmed",
      address,
      createdAt: new Date().toISOString().split("T")[0],
      image: crop.image,
    });

    setLoading(false);
    setPayOpen(false);
    toast.success(`Order ${orderId} placed! Advance of ₹${advance.toLocaleString()} paid ✅`);
    navigate("/buyer/orders");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl overflow-hidden border border-border">
          <img src={crop.image} alt={crop.name} className="w-full h-80 object-cover" />
        </div>

        <div className="space-y-4">
          <div>
            <Badge className="bg-accent text-accent-foreground mb-2">{crop.category}</Badge>
            <h1 className="text-3xl font-display font-bold text-foreground">{crop.name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <User className="w-3 h-3" /> {crop.farmerName}
            </p>
            {avgRating > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <StarRating rating={Math.round(avgRating)} readonly size="sm" />
                <span className="text-sm font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})</span>
              </div>
            )}
          </div>

          <p className="text-muted-foreground">{crop.description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {crop.location}</span>
            <span className="flex items-center gap-1"><Scale className="w-4 h-4" /> Min {crop.minQuantityKg}kg</span>
            {crop.harvestDate && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Harvested: {crop.harvestDate}</span>}
          </div>

          <div className="p-4 rounded-lg bg-accent/50 border border-border">
            <p className="text-sm text-muted-foreground">Price per kg</p>
            <p className="text-3xl font-bold text-primary">₹{crop.pricePerKg}</p>
            <p className="text-xs text-success mt-1">{crop.availableQuantityKg}kg available</p>
          </div>

          <div className="flex gap-3">
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 gradient-hero text-primary-foreground border-0">
                  <CreditCard className="w-4 h-4 mr-1" /> Buy Now
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Place Order</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Quantity (kg) - Min {crop.minQuantityKg}kg</Label>
                    <Input type="number" min={crop.minQuantityKg} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder={`${crop.minQuantityKg}`} />
                  </div>
                  <div>
                    <Label>Delivery Address</Label>
                    <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address with pin code..." />
                  </div>
                  {qty >= crop.minQuantityKg && (
                    <div className="p-3 rounded-lg bg-accent/50 space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Total:</span><span className="font-bold text-card-foreground">₹{total.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Advance (15%):</span><span className="font-bold text-primary">₹{advance.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">On Delivery (75%):</span><span className="text-card-foreground">₹{onDelivery.toLocaleString()}</span></div>
                      <p className="text-[10px] text-muted-foreground mt-1">*10% platform fee</p>
                    </div>
                  )}
                  <Button
                    className="w-full gradient-golden text-secondary-foreground border-0"
                    onClick={handlePlaceOrder}
                    disabled={loading || qty < crop.minQuantityKg || !address.trim()}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" /> Processing...</span>
                    ) : (
                      `Pay ₹${advance.toLocaleString()} Advance`
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="flex-1" onClick={() => navigate(`/buyer/bargains?crop=${crop.id}`)}>
              <Handshake className="w-4 h-4 mr-1" /> Start Bargain
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropDetail;
