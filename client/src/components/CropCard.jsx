// import { Crop } from "@/data/cropsData";
import { useAppStore } from "@/stores/AppStore";
import { MapPin, Scale, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";



const CropCard = ({ crop, actions, onClick }) => {
  const { getCropAvgRating, getCropRatings } = useAppStore();
  const avgRating = getCropAvgRating(crop.id);
  const ratingCount = getCropRatings(crop.id).length;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`rounded-xl border border-border bg-card shadow-card overflow-hidden hover:shadow-elevated transition-shadow ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="h-44 overflow-hidden">
        <img src={crop.image} alt={crop.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display font-bold text-card-foreground">{crop.name}</h3>
            <p className="text-xs text-muted-foreground">{crop.farmerName}</p>
          </div>
          <Badge variant="secondary" className="bg-accent text-accent-foreground text-xs">{crop.category}</Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{crop.description}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{crop.location}</span>
          <span className="flex items-center gap-1"><Scale className="w-3 h-3" />Min {crop.minQuantityKg}kg</span>
        </div>
        {avgRating > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
            <span className="text-xs font-semibold text-card-foreground">{avgRating.toFixed(1)}</span>
            <span className="text-[10px] text-muted-foreground">({ratingCount})</span>
          </div>
        )}
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
