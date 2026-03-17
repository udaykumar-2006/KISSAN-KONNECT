import { orderStatusLabels, orderStatusFlow } from "@/data/ordersData";
import { Check, Circle, Package, Truck, MapPin, CreditCard } from "lucide-react";

const statusIcons = {
  pending_payment: <CreditCard className="w-4 h-4" />,
  confirmed: <Check className="w-4 h-4" />,
  packing: <Package className="w-4 h-4" />,
  in_transit: <Truck className="w-4 h-4" />,
  out_for_delivery: <MapPin className="w-4 h-4" />,
  delivered: <Check className="w-4 h-4" />,
};

const OrderTracker = ({ currentStatus }) => {
  const currentIdx = orderStatusFlow.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-between w-full">
      {orderStatusFlow.map((status, i) => {
        const isCompleted = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={status} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              {i > 0 && <div className={`flex-1 h-0.5 transition-colors duration-500 ${isCompleted ? "bg-primary" : "bg-border"}`} />}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                isCurrent ? "gradient-hero text-primary-foreground ring-4 ring-primary/20 scale-110" :
                isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {isCompleted ? statusIcons[status] : <Circle className="w-3 h-3" />}
              </div>
              {i < orderStatusFlow.length - 1 && <div className={`flex-1 h-0.5 transition-colors duration-500 ${i < currentIdx ? "bg-primary" : "bg-border"}`} />}
            </div>
            <span className={`text-[10px] mt-1 text-center leading-tight ${isCurrent ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              {orderStatusLabels[status]}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default OrderTracker;
