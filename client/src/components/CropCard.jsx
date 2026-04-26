import { MapPin, Scale, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const CropCard = ({ crop, actions, onClick }) => {
  // Use aggregate ratings from the crop object itself
  const avgRating = crop.avgRating || 0;
  const ratingCount = crop.numRatings || 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`rounded-xl border border-border bg-card shadow-card overflow-hidden hover:shadow-elevated transition-shadow ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="h-44 overflow-hidden relative">
        <img src={crop.image} alt={crop.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
        {avgRating > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full border border-border/50 shadow-sm">
            <Star className="w-3 h-3 fill-secondary text-secondary" />
            <span className="text-[10px] font-bold">{avgRating.toFixed(1)}</span>
            <span className="text-[8px] text-muted-foreground">({ratingCount})</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display font-bold text-card-foreground line-clamp-1">{crop.name}</h3>
            <p className="text-xs text-muted-foreground">{crop.farmerName}</p>
          </div>
          <Badge variant="secondary" className="bg-accent text-accent-foreground text-[10px] h-5">{crop.category}</Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 h-10">{crop.description}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{crop.location}</span>
          <span className="flex items-center gap-1"><Scale className="w-3 h-3" />Min {crop.minQuantityKg}kg</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-primary">₹{crop.pricePerKg}</span>
            <span className="text-xs text-muted-foreground">/kg</span>
          </div>
          <span className="text-xs text-success font-medium">{crop.availableQuantityKg}kg available</span>
        </div>
        {actions && <div className="mt-3 pt-3 border-t border-border flex gap-2">{actions}</div>}
      </div>
    </motion.div>
  );
};

export default CropCard;
