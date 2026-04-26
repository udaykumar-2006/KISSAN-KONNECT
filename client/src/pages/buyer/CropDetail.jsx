import { useParams, useNavigate } from "react-router-dom";
import StarRating from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Scale, User, ArrowLeft, Handshake, Calendar, Loader2, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import * as api from "@/services/api";

const CropDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [crop, setCrop] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || id === ":id") return;
      try {
        setFetchLoading(true);
        const [cropRes, reviewRes] = await Promise.all([
          api.getCrop(id),
          api.getCropRatings(id)
        ]);
        setCrop(cropRes.data);
        setReviews(reviewRes.data.ratings || []);
      } catch (err) {
        toast.error("Failed to load crop details");
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span className="text-muted-foreground">Loading crop details…</span>
      </div>
    );
  }

  if (!crop) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">Crop not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Go Back
        </Button>
      </div>
    );
  }

  const handleStartBargain = () => {
    navigate(`/buyer/bargains?crop=${crop._id}`);
  };

  const avgRating = crop.avgRating || 0;
  const ratingCount = crop.numRatings || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="rounded-2xl overflow-hidden border border-border shadow-sm group">
          <img src={crop.image} alt={crop.name} className="w-full h-[400px] object-cover group-hover:scale-105 transition-transform duration-700" />
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Badge className="bg-accent text-accent-foreground">{crop.category}</Badge>
            <h1 className="text-4xl font-display font-bold text-foreground leading-tight">{crop.name}</h1>
            <div className="flex items-center gap-4 flex-wrap">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                    <User className="w-4 h-4 text-primary" /> {crop.farmerName}
                </p>
                {avgRating > 0 && (
                    <div className="flex items-center gap-2 bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/20">
                        <StarRating rating={Math.round(avgRating)} readonly size="sm" />
                        <span className="text-xs font-bold text-secondary-foreground">{avgRating.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground">({ratingCount})</span>
                    </div>
                )}
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed text-lg">{crop.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/50">
                <MapPin className="w-4 h-4 text-primary" /> 
                <span>{crop.location}</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/50">
                <Scale className="w-4 h-4 text-primary" /> 
                <span>Min {crop.minQuantityKg} kg</span>
            </div>
            {crop.harvestDate && (
              <div className="flex items-center gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/50 col-span-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Harvested: {new Date(crop.harvestDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-accent/30 to-background border border-border shadow-inner">
            <p className="text-sm text-muted-foreground font-medium mb-1">Price per kg</p>
            <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-primary">₹{crop.pricePerKg}</span>
                <span className="text-muted-foreground text-sm">/kg</span>
            </div>
            <p className={`text-sm mt-2 font-semibold flex items-center gap-1.5 ${crop.availableQuantityKg > 0 ? 'text-green-600' : 'text-destructive'}`}>
              <div className={`w-2 h-2 rounded-full ${crop.availableQuantityKg > 0 ? 'bg-green-600 animate-pulse' : 'bg-destructive'}`}></div>
              {crop.availableQuantityKg > 0 ? `${crop.availableQuantityKg} kg available in stock` : 'Sold out'}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {crop.availableQuantityKg > 0 ? (
              <Button
                className="w-full h-12 text-lg gradient-hero text-primary-foreground border-0 shadow-lg shadow-primary/20"
                onClick={handleStartBargain}
              >
                <Handshake className="w-5 h-5 mr-2" />
                Start Bargaining
              </Button>
            ) : (
              <Button disabled className="w-full h-12" variant="outline">
                Sold Out
              </Button>
            )}
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
              Secure payments & Direct farmer contact
            </p>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="space-y-6 pt-12 border-t border-border">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-primary" />
                Ratings & Reviews
            </h2>
            <Badge variant="outline" className="h-6 px-3">{reviews.length} total</Badge>
        </div>

        {reviews.length === 0 ? (
            <div className="py-12 bg-muted/20 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground italic">
                <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                <p>No reviews yet for this crop.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {reviews.map((review) => (
                    <div key={review._id} className="p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase">
                                    {review.buyerName?.charAt(0) || 'B'}
                                </div>
                                <div>
                                    <p className="text-sm font-bold">{review.buyerName}</p>
                                    <p className="text-[10px] text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <StarRating rating={review.rating} readonly size="sm" />
                        </div>
                        {review.review && (
                            <p className="text-sm text-muted-foreground leading-relaxed pl-10">
                                "{review.review}"
                            </p>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default CropDetail;
