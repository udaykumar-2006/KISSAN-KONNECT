import { useAppStore } from "@/stores/AppStore";
import { useAuth } from "@/contexts/AuthContext";
import CropCard from "@/components/CropCard";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cropCategories } from "@/data/categoriesData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

const allCategories = ["All", ...cropCategories];

const BuyerBrowse = () => {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("default");
  const [locationFilter, setLocationFilter] = useState("");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const { crops, getCropAvgRating } = useAppStore();

  const locations = [...new Set(crops.map(c => c.location))];
  const maxPrice = Math.max(...crops.map(c => c.pricePerKg), 500);

  let filtered = crops.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.farmerName.toLowerCase().includes(search.toLowerCase());
    const matchCat = cat === "All" || c.category === cat;
    const matchLoc = !locationFilter || c.location === locationFilter;
    const matchPrice = c.pricePerKg >= priceRange[0] && c.pricePerKg <= priceRange[1];
    return matchSearch && matchCat && matchLoc && matchPrice;
  });

  if (sort === "price-low") filtered = [...filtered].sort((a, b) => a.pricePerKg - b.pricePerKg);
  else if (sort === "price-high") filtered = [...filtered].sort((a, b) => b.pricePerKg - a.pricePerKg);
  else if (sort === "qty-high") filtered = [...filtered].sort((a, b) => b.availableQuantityKg - a.availableQuantityKg);
  else if (sort === "rating-high") filtered = [...filtered].sort((a, b) => getCropAvgRating(b.id) - getCropAvgRating(a.id));
  else if (sort === "newest") filtered = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const activeFilterCount = (cat !== "All" ? 1 : 0) + (locationFilter ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0);

  const clearFilters = () => {
    setCat("All");
    setLocationFilter("");
    setPriceRange([0, maxPrice]);
    setSearch("");
    setSort("default");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Browse Crops 🛒</h1>
        <p className="text-muted-foreground text-sm">Find fresh produce near you ({filtered.length} crops available)</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search crops or farmer name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="relative">
            <SlidersHorizontal className="w-4 h-4 mr-1" /> Filters
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">{activeFilterCount}</Badge>
            )}
          </Button>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="price-low">Price: Low → High</SelectItem>
              <SelectItem value="price-high">Price: High → Low</SelectItem>
              <SelectItem value="rating-high">Rating: Highest</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="qty-high">Quantity: Most</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showFilters && (
          <div className="p-4 rounded-xl border border-border bg-card shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-card-foreground">Filters</h3>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                  <X className="w-3 h-3 mr-1" /> Clear all
                </Button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location</label>
                <Select value={locationFilter || "all"} onValueChange={v => setLocationFilter(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="All Locations" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Price Range: ₹{priceRange[0]} — ₹{priceRange[1]}
                </label>
                <Slider
                  min={0} max={maxPrice} step={5}
                  value={priceRange}
                  onValueChange={(v) => setPriceRange(v)}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {allCategories.map(c => (
            <Button
              key={c} size="sm"
              variant={cat === c ? "default" : "outline"}
              onClick={() => setCat(c)}
              className={cat === c ? "gradient-hero text-primary-foreground border-0" : ""}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(crop => (
          <CropCard
            key={crop.id} crop={crop}
            onClick={() => navigate(`/buyer/crop/${crop.id}`)}
            actions={
              <div className="flex gap-2 w-full">
                <Button size="sm" className="flex-1 gradient-hero text-primary-foreground border-0" onClick={e => { e.stopPropagation(); navigate(`/buyer/crop/${crop.id}`); }}>Buy Now</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={e => { e.stopPropagation(); navigate(`/buyer/bargains?crop=${crop.id}`); }}>Bargain</Button>
              </div>
            }
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No crops found</p>
          <p className="text-sm mt-1">Try a different search, category, or location</p>
          {activeFilterCount > 0 && (
            <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>Clear all filters</Button>
          )}
        </div>
      )}
    </div>
  );
};

export default BuyerBrowse;
